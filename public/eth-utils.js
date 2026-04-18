(function (global) {
  'use strict';

  // Round constants (lo, hi per round, little-endian uint64)
  var RC_LO = [
    0x00000001, 0x00008082, 0x0000808A, 0x80008000, 0x0000808B, 0x80000001,
    0x80008081, 0x00008009, 0x0000008A, 0x00000088, 0x80008009, 0x8000000A,
    0x8000808B, 0x0000008B, 0x00008089, 0x00008003, 0x00008002, 0x00000080,
    0x0000800A, 0x8000000A, 0x80008081, 0x00008080, 0x80000001, 0x80008008,
  ];
  var RC_HI = [
    0, 0, 0x80000000, 0x80000000, 0, 0,
    0x80000000, 0x80000000, 0, 0, 0, 0,
    0, 0x80000000, 0x80000000, 0x80000000, 0x80000000, 0x80000000,
    0, 0x80000000, 0x80000000, 0x80000000, 0, 0x80000000,
  ];

  // Rotation offsets per lane index (x + 5*y)
  var ROTATE = [
     0,  1, 62, 28, 27,
    36, 44,  6, 55, 20,
     3, 10, 43, 25, 39,
    41, 45, 15, 21,  8,
    18,  2, 61, 56, 14,
  ];

  // Pi permutation: PI[src] = dst lane index
  var PI = [
     0, 10, 20,  5, 15,
    16,  1, 11, 21,  6,
     7, 17,  2, 12, 22,
    23,  8, 18,  3, 13,
    14, 24,  9, 19,  4,
  ];

  function keccakF(s) {
    var C = new Int32Array(10);
    var D = new Int32Array(10);
    var B = new Int32Array(50);
    var x, y, i, r, lo, hi, dst, cx1lo, cx1hi, i0, i1, i2;

    for (var round = 0; round < 24; round++) {
      // Theta: C[x] = XOR of all lanes in column x
      for (x = 0; x < 5; x++) {
        C[2*x]   = s[2*x] ^ s[2*x+10] ^ s[2*x+20] ^ s[2*x+30] ^ s[2*x+40];
        C[2*x+1] = s[2*x+1] ^ s[2*x+11] ^ s[2*x+21] ^ s[2*x+31] ^ s[2*x+41];
      }
      for (x = 0; x < 5; x++) {
        cx1lo = C[((x+1)%5)*2]; cx1hi = C[((x+1)%5)*2+1];
        D[2*x]   = C[((x+4)%5)*2]   ^ ((cx1lo << 1) | (cx1hi >>> 31));
        D[2*x+1] = C[((x+4)%5)*2+1] ^ ((cx1hi << 1) | (cx1lo >>> 31));
      }
      for (i = 0; i < 25; i++) { s[2*i] ^= D[(i%5)*2]; s[2*i+1] ^= D[(i%5)*2+1]; }

      // Rho + Pi
      for (i = 0; i < 25; i++) {
        r = ROTATE[i]; lo = s[2*i]; hi = s[2*i+1]; dst = PI[i] * 2;
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

      // Chi
      for (y = 0; y < 5; y++) {
        for (x = 0; x < 5; x++) {
          i0 = (x + 5*y) * 2; i1 = ((x+1)%5 + 5*y) * 2; i2 = ((x+2)%5 + 5*y) * 2;
          s[i0]   = B[i0]   ^ (~B[i1]   & B[i2]);
          s[i0+1] = B[i0+1] ^ (~B[i1+1] & B[i2+1]);
        }
      }

      // Iota
      s[0] ^= RC_LO[round]; s[1] ^= RC_HI[round];
    }
  }

  function keccak256(str) {
    var i, b, lane;
    var msgLen = str.length;
    var rate = 136; // keccak-256: 1088-bit rate
    var padLen = rate - (msgLen % rate);
    var padded = new Uint8Array(msgLen + padLen);
    for (i = 0; i < msgLen; i++) padded[i] = str.charCodeAt(i) & 0xff;
    padded[msgLen] = 0x01;
    padded[padded.length - 1] |= 0x80;

    var s = new Int32Array(50);
    for (var block = 0; block < padded.length; block += rate) {
      for (lane = 0; lane < 17; lane++) {
        b = block + lane * 8;
        s[lane*2]   ^= (padded[b] | (padded[b+1]<<8) | (padded[b+2]<<16) | (padded[b+3]<<24));
        s[lane*2+1] ^= (padded[b+4] | (padded[b+5]<<8) | (padded[b+6]<<16) | (padded[b+7]<<24));
      }
      keccakF(s);
    }

    var hex = '';
    for (lane = 0; lane < 4; lane++) {
      var lo = s[lane*2] >>> 0, hi = s[lane*2+1] >>> 0;
      for (b = 0; b < 4; b++) hex += ('0' + ((lo >> (b*8)) & 0xff).toString(16)).slice(-2);
      for (b = 0; b < 4; b++) hex += ('0' + ((hi >> (b*8)) & 0xff).toString(16)).slice(-2);
    }
    return hex;
  }

  function checksumAddress(addr) {
    var lower = addr.slice(2).toLowerCase();
    var hash = keccak256(lower);
    var out = '0x';
    for (var i = 0; i < 40; i++) {
      out += parseInt(hash[i], 16) >= 8 ? lower[i].toUpperCase() : lower[i];
    }
    return out;
  }

  // Accepts all-lowercase (no checksum info) or correct mixed-case checksum.
  function isValidAddress(addr) {
    if (!/^0x[0-9a-fA-F]{40}$/.test(addr)) return false;
    var hex = addr.slice(2);
    if (hex === hex.toLowerCase() || hex === hex.toUpperCase()) return true;
    return checksumAddress(addr) === addr;
  }

  global.EthUtils = { keccak256: keccak256, checksumAddress: checksumAddress, isValidAddress: isValidAddress };
})(window);
