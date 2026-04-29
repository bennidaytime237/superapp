// Shared fetch helper with per-attempt timeout, retry on 429, and exponential backoff.
// Retries on 429 (rate-limited) and network/abort errors. Other non-ok statuses are
// returned as-is so callers can decide how to handle them.

/**
 * @typedef {Object} FetchWithRetryOptions
 * @property {number} [retries=3]      - Maximum number of attempts.
 * @property {number} [baseDelay=1000] - Base ms delay; multiplied by attempt index for backoff.
 * @property {number} [timeout=8000]   - Per-attempt abort timeout in ms.
 */

/**
 * Fetches a URL with automatic retry on 429 and network errors.
 * @param {string} url
 * @param {RequestInit} [opts]
 * @param {FetchWithRetryOptions} [retryOpts]
 * @returns {Promise<Response>}
 */
export async function fetchWithRetry(url, opts = {}, { retries = 3, baseDelay = 1000, timeout = 8000 } = {}) {
  let lastErr;
  for (let i = 0; i < retries; i++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    try {
      const res = await fetch(url, { ...opts, signal: ctrl.signal });
      clearTimeout(timer);
      if (res.status === 429 && i < retries - 1) {
        await new Promise(r => setTimeout(r, baseDelay * (i + 1)));
        continue;
      }
      return res;
    } catch (e) {
      clearTimeout(timer);
      lastErr = e;
      if (i < retries - 1) await new Promise(r => setTimeout(r, baseDelay * (i + 1)));
    }
  }
  throw lastErr || new Error(`fetchWithRetry failed after ${retries} attempts: ${url}`);
}
