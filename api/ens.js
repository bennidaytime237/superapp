// ENS forward/reverse resolution via free public services with fallback.
import { z } from 'zod';
import { applyCors } from './_cors.js';
import { isValidAddress, keccak256 } from './_eth-utils.js';

const ENSIdeasShape = z.object({
  address:     z.string().nullish(),
  name:        z.string().nullish(),
  displayName: z.string().nullish(),
}).passthrough();

const ENSDataShape = z.object({
  address: z.string().nullish(),
  ens:     z.string().nullish(),
  name:    z.string().nullish(),
}).passthrough();

// Accept only syntactically valid ENS names: labels of [a-z0-9-] joined by dots,
// ending in a known TLD. Keeps untrusted query input out of upstream URLs.
const ENS_NAME_RE = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const ZERO_ADDR  = '0x0000000000000000000000000000000000000000';

// Hyperliquid Names ERC721 on HyperEVM (https://hyperliquid-names.gitbook.io)
const HL_NAMES_CONTRACT = '0x1d9d87eBc14e71490bB87f1C39F65BDB979f3cb7';
const HYPEREVM_RPC      = 'https://rpc.hyperliquid.xyz/evm';

// Convert a Uint8Array to a Latin-1 string so the existing keccak256(str) can
// hash raw bytes (it uses charCodeAt & 0xff, which round-trips byte values 0-255).
function bytesToStr(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return s;
}

function hexToBytes32(hex) {
  const b = new Uint8Array(32);
  for (let i = 0; i < 32; i++) b[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return b;
}

// ERC-137 namehash — same algorithm ENS uses; Hyperliquid Names uses it as tokenId.
function namehashBytes(name) {
  let node = new Uint8Array(32);
  if (!name) return node;
  const labels = name.toLowerCase().split('.').filter(Boolean);
  for (let i = labels.length - 1; i >= 0; i--) {
    const labelHash = hexToBytes32(keccak256(labels[i]));
    const buf = new Uint8Array(64);
    buf.set(node, 0);
    buf.set(labelHash, 32);
    node = hexToBytes32(keccak256(bytesToStr(buf)));
  }
  return node;
}

async function resolveHL(name) {
  const tokenId = namehashBytes(name);
  const tokenIdHex = Array.from(tokenId).map(b => b.toString(16).padStart(2, '0')).join('');
  // ownerOf(uint256) selector = 0x6352211e
  const callData = '0x6352211e' + tokenIdHex;

  try {
    const r = await fetch(HYPEREVM_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [{ to: HL_NAMES_CONTRACT, data: callData }, 'latest'],
        id: 1,
      }),
    });
    if (!r.ok) {
      console.error('[ens] HyperEVM non-ok status', r.status, 'for name:', name);
      return null;
    }
    const json = await r.json();
    if (json.error || !json.result || json.result === '0x') return null;
    // ABI-encoded address: 32 bytes, address is the rightmost 20 bytes (40 hex chars)
    const addr = '0x' + json.result.slice(-40);
    return ADDRESS_RE.test(addr) && addr !== ZERO_ADDR ? addr : null;
  } catch (e) {
    console.error('[ens] HyperEVM call error for', name, ':', e.message);
    return null;
  }
}

async function resolveENS(name) {
  const services = [
    async () => {
      const r = await fetch(`https://api.ensideas.com/ens/resolve/${encodeURIComponent(name)}`);
      if (!r.ok) return null;
      const parsed = ENSIdeasShape.safeParse(await r.json());
      return parsed.success ? (parsed.data.address || null) : null;
    },
    async () => {
      const r = await fetch(`https://ensdata.net/${encodeURIComponent(name)}`);
      if (!r.ok) return null;
      const parsed = ENSDataShape.safeParse(await r.json());
      return parsed.success ? (parsed.data.address || null) : null;
    },
  ];

  for (const svc of services) {
    try {
      const result = await svc();
      if (result && ADDRESS_RE.test(result)) return result;
    } catch {}
  }
  return null;
}

async function reverseENS(address) {
  const services = [
    async () => {
      const r = await fetch(`https://api.ensideas.com/ens/resolve/${address}`);
      if (!r.ok) return null;
      const parsed = ENSIdeasShape.safeParse(await r.json());
      return parsed.success ? (parsed.data.name || parsed.data.displayName || null) : null;
    },
    async () => {
      const r = await fetch(`https://ensdata.net/${address}`);
      if (!r.ok) return null;
      const parsed = ENSDataShape.safeParse(await r.json());
      return parsed.success ? (parsed.data.ens || parsed.data.name || null) : null;
    },
  ];

  for (const svc of services) {
    try {
      const result = await svc();
      if (result && ENS_NAME_RE.test(result.toLowerCase())) return result;
    } catch {}
  }
  return null;
}

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');

  const { name, address } = req.query;

  try {
    if (typeof name === 'string' && ENS_NAME_RE.test(name.toLowerCase())) {
      const lower = name.toLowerCase();
      const resolved = lower.endsWith('.hl') ? await resolveHL(lower) : await resolveENS(lower);
      return res.json({ name, address: resolved });
    }
    if (typeof address === 'string' && ADDRESS_RE.test(address) && isValidAddress(address)) {
      const resolved = await reverseENS(address);
      return res.json({ address, name: resolved });
    }
    return res.status(400).json({ error: 'Provide ?name=x.eth or ?address=0x...' });
  } catch (e) {
    console.error('ENS error:', e.message);
    return res.status(500).json({ error: 'Resolution failed', name: null, address: null });
  }
}
