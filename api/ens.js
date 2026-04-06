// Minimal Keccak-256 implementation (no deps)
function keccak256(input) {
  const RC = [1n,0x8082n,0x800000000000808an,0x8000000080008000n,0x808bn,0x80000001n,0x8000000080008081n,0x8000000000008009n,0x8an,0x88n,0x80008009n,0x8000000an,0x8000808bn,0x800000000000008bn,0x8000000000008089n,0x8000000000008003n,0x8000000000008002n,0x8000000000000080n,0x800an,0x800000008000000an,0x8000000080008081n,0x8000000000008080n,0x80000001n,0x8000000080008008n];
  const ROTC = [1,3,6,10,15,21,28,36,45,55,2,14,27,41,56,8,25,43,62,18,39,61,20,44];
  const PI = [10,7,11,17,18,3,5,16,8,21,24,4,15,23,19,13,12,2,20,14,22,9,6,1];
  const state = new BigUint64Array(25);
  const buf = typeof input === 'string' ? new TextEncoder().encode(input) : new Uint8Array(input);
  const rate = 136;
  const padded = new Uint8Array(Math.ceil((buf.length + 1) / rate) * rate);
  padded.set(buf); padded[buf.length] = 0x01; padded[padded.length - 1] |= 0x80;
  for (let off = 0; off < padded.length; off += rate) {
    for (let i = 0; i < rate / 8; i++) {
      const v = new DataView(padded.buffer, off + i * 8, 8);
      state[i] ^= v.getBigUint64(0, true);
    }
    // Keccak-f[1600]
    for (let r = 0; r < 24; r++) {
      const C = new BigUint64Array(5), D = new BigUint64Array(5);
      for (let x = 0; x < 5; x++) C[x] = state[x] ^ state[x+5] ^ state[x+10] ^ state[x+15] ^ state[x+20];
      for (let x = 0; x < 5; x++) { D[x] = C[(x+4)%5] ^ ((C[(x+1)%5] << 1n) | (C[(x+1)%5] >> 63n)); for (let y = 0; y < 25; y += 5) state[y+x] ^= D[x]; }
      let cur = state[1];
      for (let i = 0; i < 24; i++) { const j = PI[i]; const tmp = state[j]; const rc = BigInt(ROTC[i]); state[j] = (cur << rc) | (cur >> (64n - rc)); cur = tmp; }
      for (let y = 0; y < 25; y += 5) { const t = new BigUint64Array(5); for (let x = 0; x < 5; x++) t[x] = state[y+x]; for (let x = 0; x < 5; x++) state[y+x] = t[x] ^ (~t[(x+1)%5] & t[(x+2)%5]); }
      state[0] ^= RC[r];
    }
  }
  const out = new Uint8Array(32);
  const view = new DataView(out.buffer);
  for (let i = 0; i < 4; i++) view.setBigUint64(i * 8, state[i], true);
  return '0x' + [...out].map(b => b.toString(16).padStart(2, '0')).join('');
}

function namehash(name) {
  let node = new Uint8Array(32); // 0x00...00
  if (!name) return '0x' + [...node].map(b => b.toString(16).padStart(2, '0')).join('');
  const labels = name.split('.');
  for (let i = labels.length - 1; i >= 0; i--) {
    const labelHash = keccak256(labels[i]).slice(2);
    const combined = '0x' + [...node].map(b => b.toString(16).padStart(2, '0')).join('') + labelHash;
    const hashHex = keccak256(hexToBytes(combined.slice(2)));
    node = hexToBytes(hashHex.slice(2));
  }
  return '0x' + [...node].map(b => b.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  return bytes;
}

const RPC = 'https://eth.drpc.org';
const ENS_REGISTRY = '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e';

async function rpcCall(to, data) {
  const res = await fetch(RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_call', params: [{ to, data }, 'latest'] }),
  });
  const json = await res.json();
  return json.result;
}

// Forward: ENS name → address
async function resolveENS(name) {
  const node = namehash(name);
  // Get resolver: resolver(bytes32)
  const resolverData = '0x0178b8bf' + node.slice(2);
  const resolverResult = await rpcCall(ENS_REGISTRY, resolverData);
  if (!resolverResult || resolverResult === '0x' || resolverResult === '0x' + '0'.repeat(64)) return null;
  const resolver = '0x' + resolverResult.slice(26);
  if (resolver === '0x0000000000000000000000000000000000000000') return null;
  // Get addr: addr(bytes32)
  const addrData = '0x3b3b57de' + node.slice(2);
  const addrResult = await rpcCall(resolver, addrData);
  if (!addrResult || addrResult === '0x' || addrResult === '0x' + '0'.repeat(64)) return null;
  return '0x' + addrResult.slice(26);
}

// Reverse: address → ENS name
async function reverseENS(address) {
  const addr = address.toLowerCase().replace('0x', '');
  const reverseName = addr + '.addr.reverse';
  const node = namehash(reverseName);
  const resolverData = '0x0178b8bf' + node.slice(2);
  const resolverResult = await rpcCall(ENS_REGISTRY, resolverData);
  if (!resolverResult || resolverResult === '0x' || resolverResult === '0x' + '0'.repeat(64)) return null;
  const resolver = '0x' + resolverResult.slice(26);
  if (resolver === '0x0000000000000000000000000000000000000000') return null;
  // name(bytes32)
  const nameData = '0x691f3431' + node.slice(2);
  const nameResult = await rpcCall(resolver, nameData);
  if (!nameResult || nameResult === '0x' || nameResult.length < 130) return null;
  // ABI decode string
  try {
    const len = parseInt(nameResult.slice(130, 194), 16);
    const hex = nameResult.slice(194, 194 + len * 2);
    return Buffer.from(hex, 'hex').toString('utf8') || null;
  } catch { return null; }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');

  const { name, address } = req.query;

  try {
    if (name && name.endsWith('.eth')) {
      const resolved = await resolveENS(name);
      return res.json({ name, address: resolved });
    }
    if (address && /^0x[0-9a-fA-F]{40}$/.test(address)) {
      const resolved = await reverseENS(address);
      return res.json({ address, name: resolved });
    }
    return res.status(400).json({ error: 'Provide ?name=x.eth or ?address=0x...' });
  } catch (e) {
    console.error('ENS error:', e.message);
    return res.status(500).json({ error: e.message });
  }
}
