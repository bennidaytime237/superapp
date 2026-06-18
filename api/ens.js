// ENS forward/reverse resolution via free public services with fallback.
import { z } from 'zod';
import { applyCors } from './_cors.js';
import { isValidAddress } from './_eth-utils.js';

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

async function resolveHL(name) {
  // Strip .hl suffix to get the bare username
  const user = name.endsWith('.hl') ? name.slice(0, -3) : name;
  try {
    const r = await fetch('https://api.hyperliquid.xyz/info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'userByName', user }),
    });
    if (!r.ok) return null;
    const d = await r.json();
    const addr = d?.address ?? d?.user ?? null;
    return addr && ADDRESS_RE.test(addr) ? addr : null;
  } catch {
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
