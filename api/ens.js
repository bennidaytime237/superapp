// ENS forward/reverse resolution via free public services with fallback.
import { z } from 'zod';
import { applyCors } from './_cors.js';
import { fetchWithRetry } from './_fetch.js';
import { isValidAddress } from './_eth-utils.js';

// One attempt per service with a hard timeout: a stalled upstream must fail
// fast so the fallback service still fits inside the function budget.
const FETCH_OPTS = { retries: 1, timeout: 4000 };

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

// Resolution results distinguish "a service answered and found nothing"
// (cacheable) from "no service could be reached" (must NOT be cached, or a
// transient upstream outage poisons the edge cache for valid names).

async function resolveHL(name) {
  // Strip .hl suffix to get the bare username
  const user = name.endsWith('.hl') ? name.slice(0, -3) : name;
  try {
    const r = await fetchWithRetry('https://api.hyperliquid.xyz/info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'userByName', user }),
    }, FETCH_OPTS);
    if (!r.ok) return { value: null, answered: false };
    const d = await r.json();
    // Hyperliquid returns the address as a plain string; also handle object shapes defensively
    const addr = typeof d === 'string' ? d : (d?.address ?? d?.user ?? null);
    return { value: addr && ADDRESS_RE.test(addr) ? addr : null, answered: true };
  } catch {
    return { value: null, answered: false };
  }
}

async function tryServices(services, isValid) {
  let answered = false;
  for (const svc of services) {
    try {
      const result = await svc();
      answered = true;
      if (result.value && isValid(result.value)) return { value: result.value, answered: true };
    } catch {}
  }
  return { value: null, answered };
}

function resolveENS(name) {
  return tryServices([
    async () => {
      const r = await fetchWithRetry(`https://api.ensideas.com/ens/resolve/${encodeURIComponent(name)}`, {}, FETCH_OPTS);
      if (!r.ok) throw new Error(`ensideas ${r.status}`);
      const parsed = ENSIdeasShape.safeParse(await r.json());
      return { value: parsed.success ? (parsed.data.address || null) : null };
    },
    async () => {
      const r = await fetchWithRetry(`https://ensdata.net/${encodeURIComponent(name)}`, {}, FETCH_OPTS);
      if (!r.ok) throw new Error(`ensdata ${r.status}`);
      const parsed = ENSDataShape.safeParse(await r.json());
      return { value: parsed.success ? (parsed.data.address || null) : null };
    },
  ], v => ADDRESS_RE.test(v));
}

function reverseENS(address) {
  return tryServices([
    async () => {
      const r = await fetchWithRetry(`https://api.ensideas.com/ens/resolve/${address}`, {}, FETCH_OPTS);
      if (!r.ok) throw new Error(`ensideas ${r.status}`);
      const parsed = ENSIdeasShape.safeParse(await r.json());
      return { value: parsed.success ? (parsed.data.name || parsed.data.displayName || null) : null };
    },
    async () => {
      const r = await fetchWithRetry(`https://ensdata.net/${address}`, {}, FETCH_OPTS);
      if (!r.ok) throw new Error(`ensdata ${r.status}`);
      const parsed = ENSDataShape.safeParse(await r.json());
      return { value: parsed.success ? (parsed.data.ens || parsed.data.name || null) : null };
    },
  ], v => ENS_NAME_RE.test(v.toLowerCase()));
}

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  const { name, address } = req.query;
  // Cache header is applied only to successful resolutions — error responses
  // must not be marked publicly cacheable.
  const cacheOk = () => res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');

  try {
    if (typeof name === 'string' && ENS_NAME_RE.test(name.toLowerCase())) {
      const lower = name.toLowerCase();
      const { value, answered } = lower.endsWith('.hl') ? await resolveHL(lower) : await resolveENS(lower);
      // Only cache answers a service actually gave; a null caused by every
      // upstream being unreachable must not be cached as "name not found".
      if (answered || value) cacheOk();
      else res.setHeader('Cache-Control', 'no-store');
      return res.json({ name, address: value });
    }
    if (typeof address === 'string' && ADDRESS_RE.test(address) && isValidAddress(address)) {
      const { value, answered } = await reverseENS(address);
      if (answered || value) cacheOk();
      else res.setHeader('Cache-Control', 'no-store');
      return res.json({ address, name: value });
    }
    return res.status(400).json({ error: 'Provide ?name=x.eth or ?address=0x...' });
  } catch (e) {
    console.error('ENS error:', e.message);
    return res.status(500).json({ error: 'Resolution failed', name: null, address: null });
  }
}
