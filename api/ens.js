// ENS resolution via public ENS subgraph + Ethereum RPC fallback

const ENS_SUBGRAPH = 'https://gateway.thegraph.com/api/subgraphs/id/5XqPmWe6gjyrJtFn9cLy237i4cWw2j9HcUJEXsP5qGtH';
const RPC = 'https://eth.drpc.org';

async function resolveViaRPC(name) {
  // Use the ENS Universal Resolver (0xce01f8eee7E0a9588864d3F0CBb9c2f1c694Dda4)
  // resolve(bytes dnsName, bytes data) where data = addr(bytes32 node)
  // This is complex to encode without keccak, so we skip this fallback for now
  return null;
}

async function resolveENS(name) {
  // Try multiple free ENS resolution services
  const services = [
    async () => {
      const r = await fetch(`https://api.ensideas.com/ens/resolve/${encodeURIComponent(name)}`);
      if (!r.ok) return null;
      const d = await r.json();
      return d.address || null;
    },
    async () => {
      const r = await fetch(`https://ensdata.net/${encodeURIComponent(name)}`);
      if (!r.ok) return null;
      const d = await r.json();
      return d.address || null;
    },
    async () => {
      // Use eth_call with ENS name directly via a provider that supports it
      const r = await fetch(RPC, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_call', params: [{
          to: '0xce01f8eee7E0a9588864d3F0CBb9c2f1c694Dda4', // Universal Resolver
          data: encodeResolve(name),
        }, 'latest'] }),
      });
      const d = await r.json();
      if (d.result && d.result.length >= 130) {
        const addr = '0x' + d.result.slice(-40);
        if (addr !== '0x0000000000000000000000000000000000000000') return addr;
      }
      return null;
    },
  ];

  for (const svc of services) {
    try {
      const result = await svc();
      if (result) return result;
    } catch {}
  }
  return null;
}

async function reverseENS(address) {
  const services = [
    async () => {
      const r = await fetch(`https://api.ensideas.com/ens/resolve/${address}`);
      if (!r.ok) return null;
      const d = await r.json();
      return d.name || d.displayName || null;
    },
    async () => {
      const r = await fetch(`https://ensdata.net/${address}`);
      if (!r.ok) return null;
      const d = await r.json();
      return d.ens || d.name || null;
    },
  ];

  for (const svc of services) {
    try {
      const result = await svc();
      if (result) return result;
    } catch {}
  }
  return null;
}

// Minimal DNS-encode for Universal Resolver (doesn't need keccak)
function encodeResolve(name) {
  // We'd need to DNS-encode the name and ABI-encode the call
  // This is complex, so return null to skip this fallback
  return '0x';
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');

  const { name, address } = req.query;

  try {
    if (name && name.includes('.')) {
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
    return res.status(500).json({ error: e.message, name: null, address: null });
  }
}
