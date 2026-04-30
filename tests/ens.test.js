import { test } from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/ens.js';

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

function jsonFetch(body, ok = true) {
  return async () => ({ ok, json: async () => body, text: async () => JSON.stringify(body) });
}

// Tests ------------------------------------------------------------------

test('ens - no params returns 400', async () => {
  const res = makeRes();
  await handler(makeReq({}), res);
  assert.strictEqual(res._status, 400);
  assert.match(res._body.error, /Provide/);
});

test('ens - invalid name (no TLD) returns 400', async () => {
  const res = makeRes();
  await handler(makeReq({ name: 'notanens' }), res);
  assert.strictEqual(res._status, 400);
});

test('ens - name with disallowed chars returns 400', async () => {
  const res = makeRes();
  await handler(makeReq({ name: 'foo/../bar.eth' }), res);
  assert.strictEqual(res._status, 400);
});

test('ens - invalid address format returns 400', async () => {
  const res = makeRes();
  await handler(makeReq({ address: '0xnotan' }), res);
  assert.strictEqual(res._status, 400);
});

test('ens - invalid EIP-55 checksum returns 400', async () => {
  const res = makeRes();
  // All mixed-case but checksum wrong
  await handler(makeReq({ address: '0x5AAeb6053F3E94C9b9A09f33669435E7Ef1BeAed' }), res);
  assert.strictEqual(res._status, 400);
});

test('ens - forward resolution returns resolved address', async () => {
  globalThis.fetch = jsonFetch({
    address: '0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed',
    name: 'vitalik.eth',
  });
  const res = makeRes();
  await handler(makeReq({ name: 'vitalik.eth' }), res);
  assert.strictEqual(res._status, 200);
  assert.strictEqual(res._body.name, 'vitalik.eth');
  assert.strictEqual(res._body.address, '0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed');
});

test('ens - forward resolution returns null address when not found', async () => {
  globalThis.fetch = jsonFetch({ address: null, name: null });
  const res = makeRes();
  await handler(makeReq({ name: 'doesnotexist12345.eth' }), res);
  assert.strictEqual(res._status, 200);
  assert.strictEqual(res._body.address, null);
});

test('ens - reverse resolution returns ENS name', async () => {
  globalThis.fetch = jsonFetch({
    address: '0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed',
    name: 'vitalik.eth',
  });
  const res = makeRes();
  await handler(makeReq({ address: '0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed' }), res);
  assert.strictEqual(res._status, 200);
  assert.strictEqual(res._body.name, 'vitalik.eth');
});

test('ens - reverse resolution returns null name when not registered', async () => {
  globalThis.fetch = jsonFetch({ address: '0xdeadbeef00000000000000000000000000000000', name: null });
  const res = makeRes();
  await handler(makeReq({ address: '0xdeadbeef00000000000000000000000000000000' }), res);
  assert.strictEqual(res._status, 200);
  assert.strictEqual(res._body.name, null);
});

test('ens - falls back to second service when first returns non-ok', async () => {
  let calls = 0;
  globalThis.fetch = async (url) => {
    calls++;
    if (url.includes('ensideas')) return { ok: false, json: async () => ({}), text: async () => '' };
    return { ok: true, json: async () => ({ address: '0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed', ens: 'vitalik.eth' }) };
  };
  const res = makeRes();
  await handler(makeReq({ address: '0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed' }), res);
  assert.ok(calls >= 2, 'Should have tried at least two services');
  assert.strictEqual(res._status, 200);
});

test('ens - sets Cache-Control header', async () => {
  globalThis.fetch = jsonFetch({ address: null, name: null });
  const res = makeRes();
  await handler(makeReq({ name: 'test.eth' }), res);
  assert.ok(res._headers['Cache-Control'], 'Cache-Control header should be set');
});
