// Shared Zod schemas + array parser for Across API payloads (used by radar.js
// and routes.js).
import { z } from 'zod';

export const AcrossChain = z.object({
  chainId:     z.number(),
  name:        z.string().optional(),
  logoURI:     z.string().nullish(),
  explorerUrl: z.string().nullish(),
}).passthrough();

export const AcrossToken = z.object({
  symbol:   z.string(),
  chainId:  z.number().optional(),
  address:  z.string().optional(),
  decimals: z.number().optional(),
  logoURI:  z.string().nullish(),
}).passthrough();

/**
 * Parses an array item-by-item, keeping valid entries and logging the rest.
 * @template T
 * @param {import('zod').ZodType<T>} schema
 * @param {unknown} data
 * @param {string} label
 * @returns {T[]}
 */
export function parseArr(schema, data, label) {
  if (!Array.isArray(data)) return [];
  return data.reduce((acc, item) => {
    const r = schema.safeParse(item);
    if (r.success) acc.push(r.data);
    else console.warn(`[${label}] Skipping malformed entry:`, r.error.issues?.[0]?.message);
    return acc;
  }, []);
}
