import { test } from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/balances.js';

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

function makeReq(query = {}, method = 'GET') {
  return { query, method, headers: {} };
}

// Return a JSON-RPC response for the given hex value
function rpcOk(result) {
  return {
    ok: true,
    json: async () => ({ jsonrpc: '2.0', id: 1, result }),
  };
}

// Tests ------------------------------------------------------------------

test('balances - missing address returns 400', async () => {
  const req = makeReq({});
  const res = makeRes();
  await handler(req, res);
  assert.strictEqual(res._status, 400);
  assert.match(res._body.error, /invalid address/i);
});

test('balances - malformed address returns 400', async () => {
  const req = makeReq({ address: 'not-an-address' });
  const res = makeRes();
  await handler(req, res);
  assert.strictEqual(res._status, 400);
});

test('balances - invalid EIP-55 checksum returns 400', async () => {
  // All mixed-case but checksum is wrong (flipped first char case)
  const req = makeReq({ address: '0x5AAeb6053F3E94C9b9A09f33669435E7Ef1BeAed' });
  const res = makeRes();
  await handler(req, res);
  assert.strictEqual(res._status, 400);
});

test('balances - OPTIONS preflight returns 204', async () => {
  const req = makeReq({ address: '0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed' }, 'OPTIONS');
  const res = makeRes();
  let ended = false;
  res.end = () => { ended = true; };
  await handler(req, res);
  assert.ok(ended);
});

test('balances - valid lowercase address returns results object', async () => {
  // 0.1 ETH in hex = 0x16345785d8a0000
  globalThis.fetch = async (_url, opts) => {
    const body = JSON.parse(opts.body);
    const result = body.method === 'eth_getBalance' ? '0x16345785d8a0000' : '0x0';
    return rpcOk(result);
  };

  const req = makeReq({ address: '0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed' });
  const res = makeRes();
  await handler(req, res);

  assert.strictEqual(res._status, 200);
  assert.ok(res._body !== null);
  // Chain 1 (Ethereum) should have ETH since we returned 0.1 ETH
  assert.ok(res._body[1], 'Chain 1 should be in results');
  assert.ok(typeof res._body[1].ETH === 'number');
  assert.ok(Math.abs(res._body[1].ETH - 0.1) < 1e-9, 'ETH balance should be ~0.1');
});

test('balances - zero balances are excluded from results', async () => {
  globalThis.fetch = async () => rpcOk('0x0');

  const req = makeReq({ address: '0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed' });
  const res = makeRes();
  await handler(req, res);

  assert.strictEqual(res._status, 200);
  // All zero — no chains should appear in results
  assert.strictEqual(Object.keys(res._body).length, 0);
});

test('balances - RPC errors are silently skipped', async () => {
  // Return a JSON-RPC error (not a network throw) so the AbortController timer
  // is cleared normally — avoids a 5 s hang from dangling setTimeout handles.
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({ jsonrpc: '2.0', id: 1, error: { message: 'execution reverted' } }),
  });

  const req = makeReq({ address: '0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed' });
  const res = makeRes();
  await handler(req, res);

  // Should still succeed (return 200 with empty object) even when all RPCs fail
  assert.strictEqual(res._status, 200);
  assert.deepStrictEqual(res._body, {});
});

test('balances - sets Cache-Control header', async () => {
  globalThis.fetch = async () => rpcOk('0x0');

  const req = makeReq({ address: '0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed' });
  const res = makeRes();
  await handler(req, res);

  assert.ok(res._headers['Cache-Control'], 'Cache-Control header should be set');
});
