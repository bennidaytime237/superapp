// Keccak-256 and EIP-55 address utilities (no external dependencies)

const RC_LO = [
  0x00000001, 0x00008082, 0x0000808A, 0x80008000, 0x0000808B, 0x80000001,
  0x80008081, 0x00008009, 0x0000008A, 0x00000088, 0x80008009, 0x8000000A,
  0x8000808B, 0x0000008B, 0x00008089, 0x00008003, 0x00008002, 0x00000080,
  0x0000800A, 0x8000000A, 0x80008081, 0x00008080, 0x80000001, 0x80008008,
];
const RC_HI = [
  0, 0, 0x80000000, 0x80000000, 0, 0,
  0x80000000, 0x80000000, 0, 0, 0, 0,
  0, 0x80000000, 0x80000000, 0x80000000, 0x80000000, 0x80000000,
  0, 0x80000000, 0x80000000, 0x80000000, 0, 0x80000000,
];
const ROTATE = [
   0,  1, 62, 28, 27,
  36, 44,  6, 55, 20,
   3, 10, 43, 25, 39,
  41, 45, 15, 21,  8,
  18,  2, 61, 56, 14,
];
const PI = [
   0, 10, 20,  5, 15,
  16,  1, 11, 21,  6,
   7, 17,  2, 12, 22,
  23,  8, 18,  3, 13,
  14, 24,  9, 19,  4,
];

function keccakF(s) {
  const C = new Int32Array(10);
  const D = new Int32Array(10);
  const B = new Int32Array(50);

  for (let round = 0; round < 24; round++) {
    for (let x = 0; x < 5; x++) {
      C[2*x]   = s[2*x] ^ s[2*x+10] ^ s[2*x+20] ^ s[2*x+30] ^ s[2*x+40];
      C[2*x+1] = s[2*x+1] ^ s[2*x+11] ^ s[2*x+21] ^ s[2*x+31] ^ s[2*x+41];
    }
    for (let x = 0; x < 5; x++) {
      const cx1lo = C[((x+1)%5)*2], cx1hi = C[((x+1)%5)*2+1];
      D[2*x]   = C[((x+4)%5)*2]   ^ ((cx1lo << 1) | (cx1hi >>> 31));
      D[2*x+1] = C[((x+4)%5)*2+1] ^ ((cx1hi << 1) | (cx1lo >>> 31));
    }
    for (let i = 0; i < 25; i++) { s[2*i] ^= D[(i%5)*2]; s[2*i+1] ^= D[(i%5)*2+1]; }

    for (let i = 0; i < 25; i++) {
      let r = ROTATE[i];
      const lo = s[2*i], hi = s[2*i+1], dst = PI[i] * 2;
      if (r === 0) {
        B[dst] = lo; B[dst+1] = hi;
      } else if (r < 32) {
        B[dst]   = (lo << r) | (hi >>> (32-r));
        B[dst+1] = (hi << r) | (lo >>> (32-r));
      } else if (r === 32) {
        B[dst] = hi; B[dst+1] = lo;
      } else {
        r -= 32;
        B[dst]   = (hi << r) | (lo >>> (32-r));
        B[dst+1] = (lo << r) | (hi >>> (32-r));
      }
    }

    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        const i0 = (x + 5*y) * 2, i1 = ((x+1)%5 + 5*y) * 2, i2 = ((x+2)%5 + 5*y) * 2;
        s[i0]   = B[i0]   ^ (~B[i1]   & B[i2]);
        s[i0+1] = B[i0+1] ^ (~B[i1+1] & B[i2+1]);
      }
    }

    s[0] ^= RC_LO[round]; s[1] ^= RC_HI[round];
  }
}

export function keccak256(str) {
  const msgLen = str.length;
  const rate = 136;
  const padLen = rate - (msgLen % rate);
  const padded = new Uint8Array(msgLen + padLen);
  for (let i = 0; i < msgLen; i++) padded[i] = str.charCodeAt(i) & 0xff;
  padded[msgLen] = 0x01;
  padded[padded.length - 1] |= 0x80;

  const s = new Int32Array(50);
  for (let block = 0; block < padded.length; block += rate) {
    for (let lane = 0; lane < 17; lane++) {
      const b = block + lane * 8;
      s[lane*2]   ^= (padded[b] | (padded[b+1]<<8) | (padded[b+2]<<16) | (padded[b+3]<<24));
      s[lane*2+1] ^= (padded[b+4] | (padded[b+5]<<8) | (padded[b+6]<<16) | (padded[b+7]<<24));
    }
    keccakF(s);
  }

  let hex = '';
  for (let lane = 0; lane < 4; lane++) {
    const lo = s[lane*2] >>> 0, hi = s[lane*2+1] >>> 0;
    for (let b = 0; b < 4; b++) hex += ('0' + ((lo >> (b*8)) & 0xff).toString(16)).slice(-2);
    for (let b = 0; b < 4; b++) hex += ('0' + ((hi >> (b*8)) & 0xff).toString(16)).slice(-2);
  }
  return hex;
}

export function checksumAddress(addr) {
  const lower = addr.slice(2).toLowerCase();
  const hash = keccak256(lower);
  let out = '0x';
  for (let i = 0; i < 40; i++) out += parseInt(hash[i], 16) >= 8 ? lower[i].toUpperCase() : lower[i];
  return out;
}

// Accepts all-lowercase (no checksum) or correctly checksummed mixed-case.
export function isValidAddress(addr) {
  if (!/^0x[0-9a-fA-F]{40}$/.test(addr)) return false;
  const hex = addr.slice(2);
  if (hex === hex.toLowerCase() || hex === hex.toUpperCase()) return true;
  return checksumAddress(addr) === addr;
}
