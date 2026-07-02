// Shared CORS + OPTIONS helper.
// Set ALLOWED_ORIGINS env var (comma-separated) to lock cross-origin access.
// If unset, same-origin requests work (browser omits Origin) and cross-origin
// requests are rejected by the browser because no Access-Control-Allow-Origin
// header is emitted.

const ALLOWED = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

/**
 * Sets CORS headers and handles OPTIONS preflight.
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @returns {boolean} true if the request was an OPTIONS preflight (caller should return early)
 */
export function applyCors(req, res) {
  const origin = req.headers.origin;
  // Vary must be unconditional: responses are edge-cached (s-maxage), and a copy
  // cached without Vary would serve one origin's CORS headers to every origin.
  res.setHeader('Vary', 'Origin');
  if (origin && ALLOWED.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }
  return false;
}
