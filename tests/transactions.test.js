import { test } from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/transactions.js';

// Helpers ----------------------------------------------------------------

function makeRes() {
  const res = {
    _status: 200,
    _body: null,
    _headers: {},
    status(code) { this._status = code; return this; },
    json(body)   { this._body = body; return this; },
    setHeader(k, v) { this._headers[k] = v; },
    end() {},
  };
  return res;
}

function makeReq(query = {}) {
  return { query, method: 'GET', headers: {} };
}

const VALID_ADDRESS = '0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed';
const BRIDGE2 = '0x2Df1c51E09aECF9cacB7bc98cB1742757f163dF7';

// A minimal valid deposit from the Across API
function makeDeposit(overrides = {}) {
  return {
    depositTxHash:         '0xabc',
    fillTxHash:            '0xdef',
    inputToken:            '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC on Eth
    outputToken:           '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // USDC on Arb
    originChainId:         1,
    destinationChainId:    42161,
    depositor:             VALID_ADDRESS,
    recipient:             VALID_ADDRESS,
    inputAmount:           '1000000', // 1 USDC (6 decimals)
    outputAmount:          '999000', // 0.999 USDC
    depositBlockTimestamp: 1700000000, // unix seconds
    fillBlockTimestamp:    1700000060,
    status:                'filled',
    bridgeFeeUsd:          '0.1',
    swapFeeUsd:            '0.05',
    message:               '0x',
    ...overrides,
  };
}

function acrossOk(deposits) {
  return async () => ({
    ok: true,
    status: 200,
    text: async () => '',
    json: async () => deposits,
  });
}

// Tests ------------------------------------------------------------------

test('transactions - missing address returns 400', async () => {
  const res = makeRes();
  await handler(makeReq({}), res);
  assert.strictEqual(res._status, 400);
});

test('transactions - malformed address returns 400', async () => {
  const res = makeRes();
  await handler(makeReq({ address: 'not-an-address' }), res);
  assert.strictEqual(res._status, 400);
});

test('transactions - Across API failure returns 502', async () => {
  globalThis.fetch = async () => ({ ok: false, status: 500, text: async () => 'error' });
  const res = makeRes();
  await handler(makeReq({ address: VALID_ADDRESS }), res);
  assert.strictEqual(res._status, 502);
  assert.deepStrictEqual(res._body.deposits, []);
});

test('transactions - valid deposit is transformed correctly', async () => {
  globalThis.fetch = acrossOk([makeDeposit()]);
  const res = makeRes();
  await handler(makeReq({ address: VALID_ADDRESS }), res);

  assert.strictEqual(res._status, 200);
  const [dep] = res._body.deposits;

  assert.strictEqual(dep.type, 'bridge');
  assert.strictEqual(dep.fromToken, 'USDC');
  assert.strictEqual(dep.toToken, 'USDC');
  assert.strictEqual(dep.fromChain, 'Ethereum');
  assert.strictEqual(dep.toChain, 'Arbitrum');
  assert.strictEqual(dep.amount, '1');
  assert.strictEqual(dep.depositTxHash, '0xabc');
  assert.strictEqual(dep.fillTxHash, '0xdef');
  assert.strictEqual(dep.status, 'filled');
});

test('transactions - fill duration is calculated from timestamps', async () => {
  globalThis.fetch = acrossOk([makeDeposit()]);
  const res = makeRes();
  await handler(makeReq({ address: VALID_ADDRESS }), res);
  const [dep] = res._body.deposits;
  assert.strictEqual(dep.fillDuration, 60); // 60 seconds
});

test('transactions - bridge fees are summed into totalFeeUsd', async () => {
  globalThis.fetch = acrossOk([makeDeposit({ bridgeFeeUsd: '0.10', swapFeeUsd: '0.05' })]);
  const res = makeRes();
  await handler(makeReq({ address: VALID_ADDRESS }), res);
  const [dep] = res._body.deposits;
  assert.ok(Math.abs(dep.totalFeeUsd - 0.15) < 1e-9, `Expected 0.15, got ${dep.totalFeeUsd}`);
});

test('transactions - BRIDGE2 recipient maps toChain to Hyperliquid', async () => {
  globalThis.fetch = acrossOk([makeDeposit({ recipient: BRIDGE2 })]);
  const res = makeRes();
  await handler(makeReq({ address: VALID_ADDRESS }), res);
  const [dep] = res._body.deposits;
  assert.strictEqual(dep.toChain, 'Hyperliquid');
});

test('transactions - non-0x message sets isSage true', async () => {
  globalThis.fetch = acrossOk([makeDeposit({ message: '0x1234abcd' })]);
  const res = makeRes();
  await handler(makeReq({ address: VALID_ADDRESS }), res);
  const [dep] = res._body.deposits;
  assert.strictEqual(dep.isSage, true);
});

test('transactions - 0x message sets isSage false', async () => {
  globalThis.fetch = acrossOk([makeDeposit({ message: '0x' })]);
  const res = makeRes();
  await handler(makeReq({ address: VALID_ADDRESS }), res);
  const [dep] = res._body.deposits;
  assert.strictEqual(dep.isSage, false);
});

test('transactions - deposits are sorted newest first', async () => {
  globalThis.fetch = acrossOk([
    makeDeposit({ depositBlockTimestamp: 1700000000 }),
    makeDeposit({ depositBlockTimestamp: 1700001000 }),
    makeDeposit({ depositBlockTimestamp: 1700000500 }),
  ]);
  const res = makeRes();
  await handler(makeReq({ address: VALID_ADDRESS }), res);
  const timestamps = res._body.deposits.map(d => d.timestamp);
  assert.ok(timestamps[0] > timestamps[1], 'First deposit should be newest');
  assert.ok(timestamps[1] > timestamps[2], 'Second deposit should be newer than third');
});

test('transactions - malformed deposit is skipped', async () => {
  globalThis.fetch = acrossOk([
    makeDeposit(), // valid
    'not-an-object', // malformed — Zod will reject this
  ]);
  const res = makeRes();
  await handler(makeReq({ address: VALID_ADDRESS }), res);
  assert.strictEqual(res._body.deposits.length, 1);
});

test('transactions - empty deposit list returns empty array', async () => {
  globalThis.fetch = acrossOk([]);
  const res = makeRes();
  await handler(makeReq({ address: VALID_ADDRESS }), res);
  assert.strictEqual(res._status, 200);
  assert.deepStrictEqual(res._body.deposits, []);
});

test('transactions - unknown token address uses truncated symbol', async () => {
  globalThis.fetch = acrossOk([makeDeposit({ inputToken: '0xUnknown000000000000000000000000000000001' })]);
  const res = makeRes();
  await handler(makeReq({ address: VALID_ADDRESS }), res);
  const [dep] = res._body.deposits;
  // resolveToken falls back to address.slice(0,6) + '…'
  assert.ok(dep.fromToken.includes('…'), `Expected truncated symbol, got "${dep.fromToken}"`);
});

test('transactions - deposits wrapped in object with deposits key', async () => {
  // Across may return { deposits: [...] } instead of a bare array
  globalThis.fetch = async () => ({
    ok: true, status: 200, text: async () => '',
    json: async () => ({ deposits: [makeDeposit()] }),
  });
  const res = makeRes();
  await handler(makeReq({ address: VALID_ADDRESS }), res);
  assert.strictEqual(res._body.deposits.length, 1);
});

test('transactions - sets Cache-Control header', async () => {
  globalThis.fetch = acrossOk([]);
  const res = makeRes();
  await handler(makeReq({ address: VALID_ADDRESS }), res);
  assert.ok(res._headers['Cache-Control']);
});
