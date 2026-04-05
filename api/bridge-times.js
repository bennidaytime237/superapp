const L1 = new Set([1]);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');

  try {
    const r = await fetch('https://app.across.to/api/deposits?limit=50&status=filled');
    if (!r.ok) throw new Error(r.status);
    const deposits = await r.json();

    const buckets = { 'L1 → L1': [], 'L1 → L2': [], 'L2 → L1': [], 'L2 → L2': [] };
    for (const d of deposits) {
      if (!d.fillBlockTimestamp || !d.depositBlockTimestamp) continue;
      const secs = (new Date(d.fillBlockTimestamp) - new Date(d.depositBlockTimestamp)) / 1000;
      if (secs <= 0 || secs > 3600) continue;
      const fromL1 = L1.has(d.originChainId);
      const toL1 = L1.has(d.destinationChainId);
      const key = `${fromL1 ? 'L1' : 'L2'} → ${toL1 ? 'L1' : 'L2'}`;
      if (buckets[key].length < 5) buckets[key].push(secs);
    }

    const result = {};
    for (const [key, times] of Object.entries(buckets)) {
      const sorted = times.sort((a, b) => a - b);
      result[key] = sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)] : null;
    }

    return res.json(result);
  } catch (e) {
    console.error('Bridge times error:', e.message);
    return res.status(502).json({ error: e.message });
  }
}
