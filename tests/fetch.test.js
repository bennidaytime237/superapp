import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { fetchWithRetry } from '../api/_fetch.js';

const OPTS = { retries: 3, baseDelay: 1, timeout: 500 };

function mockFetch(responses) {
  let i = 0;
  return async (_url, _opts) => {
    const r = responses[Math.min(i++, responses.length - 1)];
    if (r instanceof Error) throw r;
    return r;
  };
}

test('fetchWithRetry - returns response on first success', async () => {
  globalThis.fetch = mockFetch([{ status: 200, ok: true }]);
  const res = await fetchWithRetry('http://x', {}, OPTS);
  assert.strictEqual(res.status, 200);
});

test('fetchWithRetry - returns non-429 error responses immediately', async () => {
  let calls = 0;
  globalThis.fetch = async () => { calls++; return { status: 500, ok: false }; };
  const res = await fetchWithRetry('http://x', {}, OPTS);
  assert.strictEqual(res.status, 500);
  assert.strictEqual(calls, 1);
});

test('fetchWithRetry - retries on 429 and succeeds', async () => {
  globalThis.fetch = mockFetch([
    { status: 429, ok: false },
    { status: 429, ok: false },
    { status: 200, ok: true },
  ]);
  const res = await fetchWithRetry('http://x', {}, OPTS);
  assert.strictEqual(res.status, 200);
});

test('fetchWithRetry - returns last 429 when all retries exhausted', async () => {
  globalThis.fetch = mockFetch([
    { status: 429, ok: false },
    { status: 429, ok: false },
  ]);
  const res = await fetchWithRetry('http://x', {}, { retries: 2, baseDelay: 1, timeout: 500 });
  assert.strictEqual(res.status, 429);
});

test('fetchWithRetry - retries on network error then succeeds', async () => {
  globalThis.fetch = mockFetch([
    new Error('network fail'),
    { status: 200, ok: true },
  ]);
  const res = await fetchWithRetry('http://x', {}, OPTS);
  assert.strictEqual(res.status, 200);
});

test('fetchWithRetry - throws after all network errors', async () => {
  globalThis.fetch = async () => { throw new Error('network fail'); };
  await assert.rejects(
    () => fetchWithRetry('http://x', {}, { retries: 2, baseDelay: 1, timeout: 500 }),
    /network fail/,
  );
});

test('fetchWithRetry - passes options to fetch', async () => {
  let captured;
  globalThis.fetch = async (url, opts) => {
    captured = { url, opts };
    return { status: 200, ok: true };
  };
  await fetchWithRetry('http://x', { headers: { 'X-Foo': 'bar' } }, OPTS);
  assert.strictEqual(captured.url, 'http://x');
  assert.strictEqual(captured.opts.headers['X-Foo'], 'bar');
});
