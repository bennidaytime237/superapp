import { test } from 'node:test';
import assert from 'node:assert/strict';
import { keccak256, checksumAddress, isValidAddress } from '../api/_eth-utils.js';

// ---------------------------------------------------------------------------
// keccak256 — test against known Ethereum hash vectors
// ---------------------------------------------------------------------------

test('keccak256 - empty string', () => {
  assert.strictEqual(
    keccak256(''),
    'c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470',
  );
});

test('keccak256 - "hello"', () => {
  assert.strictEqual(
    keccak256('hello'),
    '1c8aff950685c2ed4bc3174f3472287b56d9517b9c948127319a09a7a36deac8',
  );
});

test('keccak256 - returns 64-char lowercase hex', () => {
  const result = keccak256('test');
  assert.match(result, /^[0-9a-f]{64}$/);
});

// ---------------------------------------------------------------------------
// checksumAddress — test against EIP-55 spec examples
// ---------------------------------------------------------------------------

test('checksumAddress - EIP-55 spec example 1', () => {
  assert.strictEqual(
    checksumAddress('0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed'),
    '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed',
  );
});

test('checksumAddress - EIP-55 spec example 2', () => {
  assert.strictEqual(
    checksumAddress('0xfb6916095ca1df60bb79ce92ce3ea74c37c5d359'),
    '0xfB6916095ca1df60bB79Ce92cE3Ea74c37c5d359',
  );
});

test('checksumAddress - EIP-55 spec example 3', () => {
  assert.strictEqual(
    checksumAddress('0xdbf03b407c01e7cd3cbea99509d93f8dddc8c6fb'),
    '0xdbF03B407c01E7cD3CBea99509d93f8DDDC8C6FB',
  );
});

test('checksumAddress - is idempotent', () => {
  const addr = '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed';
  assert.strictEqual(checksumAddress(addr), addr);
});

// ---------------------------------------------------------------------------
// isValidAddress
// ---------------------------------------------------------------------------

test('isValidAddress - all lowercase is valid', () => {
  assert.ok(isValidAddress('0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed'));
});

test('isValidAddress - all uppercase is valid', () => {
  assert.ok(isValidAddress('0x5AAEB6053F3E94C9B9A09F33669435E7EF1BEAED'));
});

test('isValidAddress - correct EIP-55 checksum is valid', () => {
  assert.ok(isValidAddress('0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed'));
});

test('isValidAddress - wrong mixed-case checksum is rejected', () => {
  // Flip one character's case to break the checksum
  assert.strictEqual(isValidAddress('0x5AAeb6053F3E94C9b9A09f33669435E7Ef1BeAed'), false);
});

test('isValidAddress - address too short', () => {
  assert.strictEqual(isValidAddress('0x5aaeb6053f'), false);
});

test('isValidAddress - missing 0x prefix', () => {
  assert.strictEqual(isValidAddress('5aaeb6053f3e94c9b9a09f33669435e7ef1beaed'), false);
});

test('isValidAddress - empty string', () => {
  assert.strictEqual(isValidAddress(''), false);
});

test('isValidAddress - non-hex characters rejected', () => {
  assert.strictEqual(isValidAddress('0xgggggggggggggggggggggggggggggggggggggggg'), false);
});

test('isValidAddress - 0x only', () => {
  assert.strictEqual(isValidAddress('0x'), false);
});

test('isValidAddress - 41 hex chars rejected', () => {
  assert.strictEqual(isValidAddress('0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed0'), false);
});
