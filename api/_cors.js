// Shared CORS + OPTIONS helper.
// Set ALLOWED_ORIGINS env var (comma-separated) to lock cross-origin access.
// If unset, same-origin requests work (browser omits Origin) and cross-origin
// requests are rejected by the browser because no Access-Control-Allow-Origin
// header is emitted.

const ALLOWED = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

export function applyCors(req, res) {
  const origin = req.headers.origin;
  if (origin && ALLOWED.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }
  return false;
}
