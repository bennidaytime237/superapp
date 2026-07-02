// ──────────────────────────────────────────────────────────────────────────
// qr.js — self-contained QR code generator + styled canvas renderer.
//
// No external dependencies / no network. Implements byte-mode encoding with
// automatic version selection and Reed–Solomon error correction (default
// level H, ~30% recovery — enough to overlay a centre logo without breaking
// scannability).
//
// Public API:
//   SageQR.render(canvas, text, opts)
//     opts: { color, bg, logo (Image|null), logoScale, margin, ecLevel }
//
// QR core ported from Kazuhiko Arase's qrcode-generator (MIT / public domain),
// trimmed to byte mode.
// ──────────────────────────────────────────────────────────────────────────
(function (global) {
  'use strict';

  // ── Galois field (GF(256)) math for Reed–Solomon ──────────────────────────
  const EXP = new Array(256);
  const LOG = new Array(256);
  for (let i = 0; i < 8; i++) EXP[i] = 1 << i;
  for (let i = 8; i < 256; i++) EXP[i] = EXP[i - 4] ^ EXP[i - 5] ^ EXP[i - 6] ^ EXP[i - 8];
  for (let i = 0; i < 255; i++) LOG[EXP[i]] = i;
  const gexp = (n) => { while (n < 0) n += 255; while (n >= 255) n -= 255; return EXP[n]; };
  const glog = (n) => LOG[n];

  function Poly(num, shift) {
    let offset = 0;
    while (offset < num.length && num[offset] === 0) offset++;
    this.num = new Array(num.length - offset + shift);
    for (let i = 0; i < num.length - offset; i++) this.num[i] = num[i + offset];
  }
  Poly.prototype.get = function (i) { return this.num[i]; };
  Poly.prototype.len = function () { return this.num.length; };
  Poly.prototype.multiply = function (e) {
    const num = new Array(this.len() + e.len() - 1).fill(0);
    for (let i = 0; i < this.len(); i++)
      for (let j = 0; j < e.len(); j++)
        num[i + j] ^= gexp(glog(this.get(i)) + glog(e.get(j)));
    return new Poly(num, 0);
  };
  Poly.prototype.mod = function (e) {
    if (this.len() - e.len() < 0) return this;
    const ratio = glog(this.get(0)) - glog(e.get(0));
    const num = this.num.slice();
    for (let i = 0; i < e.len(); i++) num[i] ^= gexp(glog(e.get(i)) + ratio);
    return new Poly(num, 0).mod(e);
  };
  function rsPoly(ecLen) {
    let p = new Poly([1], 0);
    for (let i = 0; i < ecLen; i++) p = p.multiply(new Poly([1, gexp(i)], 0));
    return p;
  }

  // ── Bit buffer ─────────────────────────────────────────────────────────────
  function BitBuffer() { this.buffer = []; this.length = 0; }
  BitBuffer.prototype.put = function (num, len) {
    for (let i = 0; i < len; i++) this.putBit(((num >>> (len - i - 1)) & 1) === 1);
  };
  BitBuffer.prototype.putBit = function (bit) {
    const idx = Math.floor(this.length / 8);
    if (this.buffer.length <= idx) this.buffer.push(0);
    if (bit) this.buffer[idx] |= 0x80 >>> (this.length % 8);
    this.length++;
  };

  // ── RS block layout per (version, ecLevel). Levels: L,M,Q,H ──────────────────
  // Each entry: [totalCount, dataCount] repeated; flattened blocks list builder.
  // Table source: qrcode-generator RS_BLOCK_TABLE.
  const EC = { L: 0, M: 1, Q: 2, H: 3 };
  // Full RS block table for versions 1..40, rows ordered L,M,Q,H.
  const RS_BLOCK_TABLE = [
    [1,26,19],[1,26,16],[1,26,13],[1,26,9],
    [1,44,34],[1,44,28],[1,44,22],[1,44,16],
    [1,70,55],[1,70,44],[2,35,17],[2,35,13],
    [1,100,80],[2,50,32],[2,50,24],[4,25,9],
    [1,134,108],[2,67,43],[2,33,15,2,34,16],[2,33,11,2,34,12],
    [2,86,68],[4,43,27],[4,43,19],[4,43,15],
    [2,98,78],[4,49,31],[2,32,14,4,33,15],[4,39,13,1,40,14],
    [2,121,97],[2,60,38,2,61,39],[4,40,18,2,41,19],[4,40,14,2,41,15],
    [2,146,116],[3,58,36,2,59,37],[4,36,16,4,37,17],[4,36,12,4,37,13],
    [2,86,68,2,87,69],[4,69,43,1,70,44],[6,43,19,2,44,20],[6,43,15,2,44,16],
    [4,101,81],[1,80,50,4,81,51],[4,50,22,4,51,23],[3,36,12,8,37,13],
    [2,116,92,2,117,93],[6,58,36,2,59,37],[4,46,20,6,47,21],[7,42,14,4,43,15],
    [4,133,107],[8,59,37,1,60,38],[8,44,20,4,45,21],[12,33,11,4,34,12],
    [3,145,115,1,146,116],[4,64,40,5,65,41],[11,36,16,5,37,17],[11,36,12,5,37,13],
    [5,109,87,1,110,88],[5,65,41,5,66,42],[5,54,24,7,55,25],[11,36,12,7,37,13],
    [5,122,98,1,123,99],[7,73,45,3,74,46],[15,43,19,2,44,20],[3,45,15,13,46,16],
    [1,135,107,5,136,108],[10,74,46,1,75,47],[1,50,22,15,51,23],[2,42,14,17,43,15],
    [5,150,120,1,151,121],[9,69,43,4,70,44],[17,50,22,1,51,23],[2,42,14,19,43,15],
    [3,141,113,4,142,114],[3,70,44,11,71,45],[17,47,21,4,48,22],[9,39,13,16,40,14],
    [3,135,107,5,136,108],[3,67,41,13,68,42],[15,54,24,5,55,25],[15,43,15,10,44,16],
    [4,144,116,4,145,117],[17,68,42],[17,50,22,6,51,23],[19,46,16,6,47,17],
    [2,139,111,7,140,112],[17,74,46],[7,54,24,16,55,25],[34,37,13],
    [4,151,121,5,152,122],[4,75,47,14,76,48],[11,54,24,14,55,25],[16,45,15,14,46,16],
    [6,147,117,4,148,118],[6,73,45,14,74,46],[11,54,24,16,55,25],[30,46,16,2,47,17],
    [8,132,106,4,133,107],[8,75,47,13,76,48],[7,54,24,22,55,25],[22,45,15,13,46,16],
    [10,142,114,2,143,115],[19,74,46,4,75,47],[28,50,22,6,51,23],[33,46,16,4,47,17],
    [8,152,122,4,153,123],[22,73,45,3,74,46],[8,53,23,26,54,24],[12,45,15,28,46,16],
    [3,147,117,10,148,118],[3,73,45,23,74,46],[4,54,24,31,55,25],[11,45,15,31,46,16],
    [7,146,116,7,147,117],[21,73,45,7,74,46],[1,53,23,37,54,24],[19,45,15,26,46,16],
    [5,145,115,10,146,116],[19,75,47,10,76,48],[15,54,24,25,55,25],[23,45,15,25,46,16],
    [13,145,115,3,146,116],[2,74,46,29,75,47],[42,54,24,1,55,25],[23,45,15,28,46,16],
    [17,145,115],[10,74,46,23,75,47],[10,54,24,35,55,25],[19,45,15,35,46,16],
    [17,145,115,1,146,116],[14,74,46,21,75,47],[29,54,24,19,55,25],[11,45,15,46,46,16],
    [13,145,115,6,146,116],[14,74,46,23,75,47],[44,54,24,7,55,25],[59,46,16,1,47,17],
    [12,151,121,7,152,122],[12,75,47,26,76,48],[39,54,24,14,55,25],[22,45,15,41,46,16],
    [6,151,121,14,152,122],[6,75,47,34,76,48],[46,54,24,10,55,25],[2,45,15,64,46,16],
    [17,152,122,4,153,123],[29,74,46,14,75,47],[49,54,24,10,55,25],[24,45,15,46,46,16],
    [4,152,122,18,153,123],[13,74,46,32,75,47],[48,54,24,14,55,25],[42,45,15,32,46,16],
    [20,147,117,4,148,118],[40,75,47,7,76,48],[43,54,24,22,55,25],[10,45,15,67,46,16],
    [19,148,118,6,149,119],[18,75,47,31,76,48],[34,54,24,34,55,25],[20,45,15,61,46,16]
  ];
  function rsBlocks(version, ecLevel) {
    const row = RS_BLOCK_TABLE[(version - 1) * 4 + ecLevel];
    const list = [];
    for (let i = 0; i < row.length; i += 3) {
      const count = row[i], total = row[i + 1], data = row[i + 2];
      for (let j = 0; j < count; j++) list.push({ total, data });
    }
    return list;
  }

  // ── Capacity (byte-mode data codewords) to pick smallest version ────────────
  function totalDataCount(version, ecLevel) {
    return rsBlocks(version, ecLevel).reduce((s, b) => s + b.data, 0);
  }

  // ── Module placement helpers ────────────────────────────────────────────────
  const PATTERN_POSITION = [
    [], [6,18], [6,22], [6,26], [6,30], [6,34], [6,22,38], [6,24,42],
    [6,26,46], [6,28,50], [6,30,54], [6,32,58], [6,34,62], [6,26,46,66],
    [6,26,48,70], [6,26,50,74], [6,30,54,78], [6,30,56,82], [6,30,58,86],
    [6,34,62,90], [6,28,50,72,94], [6,26,50,74,98], [6,30,54,78,102],
    [6,28,54,80,106], [6,32,58,84,110], [6,30,58,86,114], [6,34,62,90,118],
    [6,26,50,74,98,122], [6,30,54,78,102,126], [6,26,52,78,104,130],
    [6,30,56,82,108,134], [6,34,60,86,112,138], [6,30,58,86,114,142],
    [6,34,62,90,118,146], [6,30,54,78,102,126,150], [6,24,50,76,102,128,154],
    [6,28,54,80,106,132,158], [6,32,58,84,110,136,162], [6,26,54,82,110,138,166],
    [6,30,58,86,114,142,170]
  ];
  function bch(d, poly) {
    let data = d;
    while (bchDigit(data) - bchDigit(poly) >= 0) data ^= poly << (bchDigit(data) - bchDigit(poly));
    return data;
  }
  function bchDigit(data) { let d = 0; while (data !== 0) { d++; data >>>= 1; } return d; }
  const G15 = (1<<10)|(1<<8)|(1<<5)|(1<<4)|(1<<2)|(1<<1)|1;
  const G18 = (1<<12)|(1<<11)|(1<<10)|(1<<9)|(1<<8)|(1<<5)|(1<<2)|1;
  const G15_MASK = (1<<14)|(1<<12)|(1<<10)|(1<<4)|(1<<1);
  function bchTypeInfo(data) { return (((data << 10) | bch(data << 10, G15)) ^ G15_MASK); }
  function bchTypeNumber(data) { return (data << 12) | bch(data << 12, G18); }

  function QRModel(version, ecLevel) {
    this.version = version;
    this.ecLevel = ecLevel;
    this.size = version * 4 + 17;
    this.modules = null;
  }
  QRModel.prototype.make = function (data) {
    this.dataCache = createData(this.version, this.ecLevel, data);
    let bestPattern = 0, minLost = Infinity;
    for (let p = 0; p < 8; p++) {
      this.makeImpl(true, p);
      const lost = lostPoint(this);
      if (lost < minLost) { minLost = lost; bestPattern = p; }
    }
    this.makeImpl(false, bestPattern);
  };
  QRModel.prototype.makeImpl = function (test, maskPattern) {
    const size = this.size;
    this.modules = Array.from({ length: size }, () => new Array(size).fill(null));
    this.setupFinder(0, 0);
    this.setupFinder(size - 7, 0);
    this.setupFinder(0, size - 7);
    this.setupAlign();
    this.setupTiming();
    this.setupTypeInfo(test, maskPattern);
    if (this.version >= 7) this.setupTypeNumber(test);
    this.mapData(this.dataCache, maskPattern);
  };
  QRModel.prototype.setupFinder = function (row, col) {
    for (let r = -1; r <= 7; r++) {
      if (row + r <= -1 || this.size <= row + r) continue;
      for (let c = -1; c <= 7; c++) {
        if (col + c <= -1 || this.size <= col + c) continue;
        const on = (0 <= r && r <= 6 && (c === 0 || c === 6)) ||
                   (0 <= c && c <= 6 && (r === 0 || r === 6)) ||
                   (2 <= r && r <= 4 && 2 <= c && c <= 4);
        this.modules[row + r][col + c] = on;
      }
    }
  };
  QRModel.prototype.setupTiming = function () {
    for (let r = 8; r < this.size - 8; r++) if (this.modules[r][6] === null) this.modules[r][6] = r % 2 === 0;
    for (let c = 8; c < this.size - 8; c++) if (this.modules[6][c] === null) this.modules[6][c] = c % 2 === 0;
  };
  QRModel.prototype.setupAlign = function () {
    const pos = PATTERN_POSITION[this.version - 1];
    for (let i = 0; i < pos.length; i++) for (let j = 0; j < pos.length; j++) {
      const row = pos[i], col = pos[j];
      if (this.modules[row][col] !== null) continue;
      for (let r = -2; r <= 2; r++) for (let c = -2; c <= 2; c++)
        this.modules[row + r][col + c] = (r === -2 || r === 2 || c === -2 || c === 2 || (r === 0 && c === 0));
    }
  };
  QRModel.prototype.setupTypeNumber = function (test) {
    const bits = bchTypeNumber(this.version);
    for (let i = 0; i < 18; i++) {
      const mod = !test && ((bits >> i) & 1) === 1;
      this.modules[Math.floor(i / 3)][i % 3 + this.size - 8 - 3] = mod;
      this.modules[i % 3 + this.size - 8 - 3][Math.floor(i / 3)] = mod;
    }
  };
  QRModel.prototype.setupTypeInfo = function (test, maskPattern) {
    // Format info encodes the EC level with standard indicator bits, which
    // differ from our internal RS-table index (L,M,Q,H = 0,1,2,3).
    const FORMAT_EC = [1, 0, 3, 2]; // index L,M,Q,H -> indicator 01,00,11,10
    const data = (FORMAT_EC[this.ecLevel] << 3) | maskPattern;
    const bits = bchTypeInfo(data);
    for (let i = 0; i < 15; i++) {
      const mod = !test && ((bits >> i) & 1) === 1;
      if (i < 6) this.modules[i][8] = mod;
      else if (i < 8) this.modules[i + 1][8] = mod;
      else this.modules[this.size - 15 + i][8] = mod;
      if (i < 8) this.modules[8][this.size - i - 1] = mod;
      else if (i < 9) this.modules[8][15 - i - 1 + 1] = mod;
      else this.modules[8][15 - i - 1] = mod;
    }
    this.modules[this.size - 8][8] = !test;
  };
  QRModel.prototype.mapData = function (data, maskPattern) {
    let inc = -1, row = this.size - 1, bitIndex = 7, byteIndex = 0;
    const maskFn = MASK[maskPattern];
    for (let col = this.size - 1; col > 0; col -= 2) {
      if (col === 6) col--;
      for (;;) {
        for (let c = 0; c < 2; c++) {
          if (this.modules[row][col - c] === null) {
            let dark = false;
            if (byteIndex < data.length) dark = ((data[byteIndex] >>> bitIndex) & 1) === 1;
            if (maskFn(row, col - c)) dark = !dark;
            this.modules[row][col - c] = dark;
            bitIndex--;
            if (bitIndex === -1) { byteIndex++; bitIndex = 7; }
          }
        }
        row += inc;
        if (row < 0 || this.size <= row) { row -= inc; inc = -inc; break; }
      }
    }
  };

  const MASK = [
    (i, j) => (i + j) % 2 === 0,
    (i) => i % 2 === 0,
    (i, j) => j % 3 === 0,
    (i, j) => (i + j) % 3 === 0,
    (i, j) => (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0,
    (i, j) => ((i * j) % 2) + ((i * j) % 3) === 0,
    (i, j) => (((i * j) % 2) + ((i * j) % 3)) % 2 === 0,
    (i, j) => (((i * j) % 3) + ((i + j) % 2)) % 2 === 0
  ];

  function lostPoint(qr) {
    const size = qr.size, m = qr.modules;
    let lost = 0;
    for (let row = 0; row < size; row++) for (let col = 0; col < size; col++) {
      let same = 0; const dark = m[row][col];
      for (let r = -1; r <= 1; r++) { if (row + r < 0 || size <= row + r) continue;
        for (let c = -1; c <= 1; c++) { if (col + c < 0 || size <= col + c || (r === 0 && c === 0)) continue;
          if (dark === m[row + r][col + c]) same++; } }
      if (same > 5) lost += 3 + same - 5;
    }
    for (let row = 0; row < size - 1; row++) for (let col = 0; col < size - 1; col++) {
      let count = 0;
      if (m[row][col]) count++; if (m[row + 1][col]) count++;
      if (m[row][col + 1]) count++; if (m[row + 1][col + 1]) count++;
      if (count === 0 || count === 4) lost += 3;
    }
    for (let row = 0; row < size; row++) for (let col = 0; col < size - 6; col++) {
      if (m[row][col] && !m[row][col+1] && m[row][col+2] && m[row][col+3] && m[row][col+4] && !m[row][col+5] && m[row][col+6]) lost += 40;
    }
    for (let col = 0; col < size; col++) for (let row = 0; row < size - 6; row++) {
      if (m[row][col] && !m[row+1][col] && m[row+2][col] && m[row+3][col] && m[row+4][col] && !m[row+5][col] && m[row+6][col]) lost += 40;
    }
    let darkCount = 0;
    for (let col = 0; col < size; col++) for (let row = 0; row < size; row++) if (m[row][col]) darkCount++;
    const ratio = Math.abs((100 * darkCount) / size / size - 50) / 5;
    lost += ratio * 10;
    return lost;
  }

  function createData(version, ecLevel, dataBytes) {
    const buffer = new BitBuffer();
    buffer.put(4, 4); // byte mode
    const lenBits = version < 10 ? 8 : 16;
    buffer.put(dataBytes.length, lenBits);
    for (let i = 0; i < dataBytes.length; i++) buffer.put(dataBytes[i], 8);

    const blocks = rsBlocks(version, ecLevel);
    const totalData = blocks.reduce((s, b) => s + b.data, 0);
    if (buffer.length + 4 <= totalData * 8) buffer.put(0, 4);
    while (buffer.length % 8 !== 0) buffer.putBit(false);
    while (buffer.buffer.length < totalData) { buffer.buffer.push(0xEC); buffer.buffer.push(0x11); }
    buffer.buffer = buffer.buffer.slice(0, totalData);

    // Split into blocks, compute EC, interleave.
    const dcdata = [], ecdata = [];
    let offset = 0, maxDc = 0, maxEc = 0;
    for (const b of blocks) {
      const ecCount = b.total - b.data;
      const dc = buffer.buffer.slice(offset, offset + b.data);
      offset += b.data;
      dcdata.push(dc); maxDc = Math.max(maxDc, dc.length);
      const rs = rsPoly(ecCount);
      const raw = new Poly(dc, rs.len() - 1);
      const mod = raw.mod(rs);
      const ec = new Array(rs.len() - 1);
      for (let i = 0; i < ec.length; i++) {
        const idx = i + mod.len() - ec.length;
        ec[i] = idx >= 0 ? mod.get(idx) : 0;
      }
      ecdata.push(ec); maxEc = Math.max(maxEc, ec.length);
    }
    const result = [];
    for (let i = 0; i < maxDc; i++) for (let b = 0; b < dcdata.length; b++) if (i < dcdata[b].length) result.push(dcdata[b][i]);
    for (let i = 0; i < maxEc; i++) for (let b = 0; b < ecdata.length; b++) if (i < ecdata[b].length) result.push(ecdata[b][i]);
    return result;
  }

  function utf8Bytes(str) {
    const out = [];
    for (let i = 0; i < str.length; i++) {
      let c = str.charCodeAt(i);
      if (c < 0x80) out.push(c);
      else if (c < 0x800) { out.push(0xC0 | (c >> 6), 0x80 | (c & 0x3F)); }
      else if (c >= 0xD800 && c <= 0xDBFF) {
        const c2 = str.charCodeAt(i + 1);
        if (c2 >= 0xDC00 && c2 <= 0xDFFF) {
          i++;
          c = 0x10000 + ((c & 0x3FF) << 10) + (c2 & 0x3FF);
          out.push(0xF0 | (c >> 18), 0x80 | ((c >> 12) & 0x3F), 0x80 | ((c >> 6) & 0x3F), 0x80 | (c & 0x3F));
        } else {
          // Unpaired high surrogate — encode U+FFFD instead of corrupting the payload
          out.push(0xEF, 0xBF, 0xBD);
        }
      } else if (c >= 0xDC00 && c <= 0xDFFF) {
        // Unpaired low surrogate
        out.push(0xEF, 0xBF, 0xBD);
      } else { out.push(0xE0 | (c >> 12), 0x80 | ((c >> 6) & 0x3F), 0x80 | (c & 0x3F)); }
    }
    return out;
  }

  function build(text, ecLevel) {
    const bytes = utf8Bytes(text);
    const lvl = EC[ecLevel] ?? EC.H;
    let version = 1;
    for (; version <= 40; version++) {
      const cap = totalDataCount(version, lvl);
      const lenBits = version < 10 ? 8 : 16;
      const need = 4 + lenBits + bytes.length * 8;
      if (need <= cap * 8) break;
    }
    if (version > 40) throw new Error('QR data too long');
    const qr = new QRModel(version, lvl);
    qr.make(bytes);
    return qr;
  }

  // ── Styled canvas renderer ──────────────────────────────────────────────────
  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function isFinder(r, c, size) {
    return (r < 7 && c < 7) || (r < 7 && c >= size - 7) || (r >= size - 7 && c < 7);
  }

  function render(canvas, text, opts) {
    opts = opts || {};
    const color = opts.color || '#667b68';
    const bg = opts.bg || '#ffffff';
    const margin = opts.margin != null ? opts.margin : 4;
    const ecLevel = opts.ecLevel || 'H';

    const qr = build(text, ecLevel);
    const size = qr.size;
    const total = size + margin * 2;
    const dpr = global.devicePixelRatio || 1;
    // Prefer a fixed on-screen size so the QR looks consistent across versions.
    const px = opts.targetSize ? Math.max(3, Math.floor(opts.targetSize / total)) : (opts.pixelSize || 9);
    const dim = total * px;

    canvas.width = dim * dpr;
    canvas.height = dim * dpr;
    canvas.style.width = dim + 'px';
    canvas.style.height = dim + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    // Background (rounded card).
    ctx.fillStyle = bg;
    roundRect(ctx, 0, 0, dim, dim, px * 2);
    ctx.fill();

    const off = margin * px;
    ctx.fillStyle = color;

    // Carve a clear zone for the centre logo (~24% of module grid).
    const logoModules = opts.logo ? Math.floor(size * 0.26) : 0;
    const logoStart = Math.floor((size - logoModules) / 2);
    const logoEnd = logoStart + logoModules;
    const inLogo = (r, c) => opts.logo && r >= logoStart && r < logoEnd && c >= logoStart && c < logoEnd;

    // Draw finder patterns as smooth rounded squares.
    const drawFinder = (r0, c0) => {
      const x = off + c0 * px, y = off + r0 * px;
      ctx.fillStyle = color;
      roundRect(ctx, x, y, px * 7, px * 7, px * 2.2); ctx.fill();
      ctx.fillStyle = bg;
      roundRect(ctx, x + px, y + px, px * 5, px * 5, px * 1.6); ctx.fill();
      ctx.fillStyle = color;
      roundRect(ctx, x + px * 2, y + px * 2, px * 3, px * 3, px * 1.0); ctx.fill();
    };

    // Data modules as rounded dots.
    ctx.fillStyle = color;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (!qr.modules[r][c]) continue;
        if (isFinder(r, c, size)) continue;
        if (inLogo(r, c)) continue;
        const x = off + c * px, y = off + r * px;
        ctx.beginPath();
        ctx.arc(x + px / 2, y + px / 2, px * 0.46, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    drawFinder(0, 0);
    drawFinder(0, size - 7);
    drawFinder(size - 7, 0);

    // Centre logo on a soft rounded badge.
    if (opts.logo) {
      const badge = logoModules * px;
      const bx = off + logoStart * px, by = off + logoStart * px;
      const pad = px * 1.2;
      ctx.fillStyle = bg;
      roundRect(ctx, bx - pad, by - pad, badge + pad * 2, badge + pad * 2, px * 2.4);
      ctx.fill();
      try {
        const lw = badge, lh = badge;
        const img = opts.logo;
        const ar = img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 0.53;
        let dw = lw, dh = lw / ar;
        if (dh > lh) { dh = lh; dw = lh * ar; }
        ctx.drawImage(img, bx + (lw - dw) / 2, by + (lh - dh) / 2, dw, dh);
      } catch (e) { /* image not ready */ }
    }
  }

  global.SageQR = { render, build };
})(typeof window !== 'undefined' ? window : this);
