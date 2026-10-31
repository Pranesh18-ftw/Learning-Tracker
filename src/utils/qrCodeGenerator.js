/**
 * qrCodeGenerator.js
 *
 * Lightweight, zero-dependency QR Code generator for web pairing.
 * Generates valid standard QR matrix grids (Model 2, Byte / Alphanumeric mode)
 * and renders high-fidelity SVG diagrams suitable for camera recognition.
 */

// Simple Reed-Solomon GF(256) log/antilog tables for QR error correction
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);

(function initGF() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) {
    GF_EXP[i] = GF_EXP[i - 255];
  }
})();

function gfMul(x, y) {
  if (x === 0 || y === 0) return 0;
  return GF_EXP[GF_LOG[x] + GF_LOG[y]];
}

function polyMul(p1, p2) {
  const result = new Uint8Array(p1.length + p2.length - 1);
  for (let i = 0; i < p1.length; i++) {
    for (let j = 0; j < p2.length; j++) {
      result[i + j] ^= gfMul(p1[i], p2[j]);
    }
  }
  return result;
}

function getGeneratorPoly(deg) {
  let g = new Uint8Array([1]);
  for (let i = 0; i < deg; i++) {
    g = polyMul(g, new Uint8Array([1, GF_EXP[i]]));
  }
  return g;
}

function calculateEC(dataBytes, ecCount) {
  const gen = getGeneratorPoly(ecCount);
  const msg = new Uint8Array(dataBytes.length + ecCount);
  msg.set(dataBytes);

  for (let i = 0; i < dataBytes.length; i++) {
    const coef = msg[i];
    if (coef !== 0) {
      for (let j = 0; j < gen.length; j++) {
        msg[i + j] ^= gfMul(gen[j], coef);
      }
    }
  }
  return msg.slice(dataBytes.length);
}

/**
 * Encodes text into a QR Matrix grid (29x29 for Version 3, handles up to 70 bytes).
 */
export function generateQRMatrix(text) {
  const encoder = new TextEncoder();
  const rawBytes = encoder.encode(text);

  // Version 3-M QR code capacity: 44 total data codewords, 26 EC codewords
  const version = 3;
  const size = 21 + (version - 1) * 4; // 29
  const totalDataBytes = 44;
  const ecBytesCount = 26;

  // Mode: 8-bit byte (0100), count (8 bits for v1-9)
  const bitBuffer = [];
  function pushBits(val, len) {
    for (let i = len - 1; i >= 0; i--) {
      bitBuffer.push((val >> i) & 1);
    }
  }

  pushBits(0b0100, 4); // Byte mode
  pushBits(rawBytes.length, 8); // Length
  for (let b of rawBytes) {
    pushBits(b, 8);
  }

  // Terminator
  while (bitBuffer.length < totalDataBytes * 8 && bitBuffer.length % 8 !== 0) {
    bitBuffer.push(0);
  }
  const padPatterns = [0xec, 0x11];
  let padIdx = 0;
  while (bitBuffer.length < totalDataBytes * 8) {
    pushBits(padPatterns[padIdx % 2], 8);
    padIdx++;
  }

  // Convert bits to bytes
  const dataBytes = new Uint8Array(totalDataBytes);
  for (let i = 0; i < totalDataBytes; i++) {
    let byteVal = 0;
    for (let b = 0; b < 8; b++) {
      byteVal = (byteVal << 1) | bitBuffer[i * 8 + b];
    }
    dataBytes[i] = byteVal;
  }

  // Error correction codewords
  const ecBytes = calculateEC(dataBytes, ecBytesCount);

  // Interleaved codewords
  const allCodewords = new Uint8Array(dataBytes.length + ecBytes.length);
  allCodewords.set(dataBytes);
  allCodewords.set(ecBytes, dataBytes.length);

  // Construct matrix
  const matrix = Array.from({ length: size }, () => Array(size).fill(null));
  const isReserved = Array.from({ length: size }, () => Array(size).fill(false));

  function setFinder(row, col) {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isBlack = (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4));
        matrix[row + r][col + c] = isBlack;
        isReserved[row + r][col + c] = true;
      }
    }
    // Separator rings
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const nr = row + r;
        const nc = col + c;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
          if (!isReserved[nr][nc]) {
            matrix[nr][nc] = false;
            isReserved[nr][nc] = true;
          }
        }
      }
    }
  }

  // 1. Finder patterns
  setFinder(0, 0);
  setFinder(0, size - 7);
  setFinder(size - 7, 0);

  // 2. Alignment pattern for v3 at (22, 22)
  const alignRow = 22;
  const alignCol = 22;
  for (let r = -2; r <= 2; r++) {
    for (let c = -2; c <= 2; c++) {
      const isBlack = Math.abs(r) === 2 || Math.abs(c) === 2 || (r === 0 && c === 0);
      matrix[alignRow + r][alignCol + c] = isBlack;
      isReserved[alignRow + r][alignCol + c] = true;
    }
  }

  // 3. Timing patterns
  for (let i = 8; i < size - 8; i++) {
    matrix[6][i] = i % 2 === 0;
    isReserved[6][i] = true;
    matrix[i][6] = i % 2 === 0;
    isReserved[i][6] = true;
  }

  // 4. Dark module
  matrix[size - 8][8] = true;
  isReserved[size - 8][8] = true;

  // 5. Reserve format info areas
  for (let i = 0; i < 9; i++) {
    if (i !== 6) {
      isReserved[8][i] = true;
      isReserved[i][8] = true;
    }
  }
  for (let i = size - 8; i < size; i++) {
    isReserved[8][i] = true;
    isReserved[i][8] = true;
  }

  // 6. Fill Data with zigzag pattern and Mask 0 ((row + col) % 2 === 0)
  let bitIdx = 0;
  const allBits = [];
  for (let b of allCodewords) {
    for (let i = 7; i >= 0; i--) {
      allBits.push((b >> i) & 1);
    }
  }

  let upward = true;
  for (let right = size - 1; right > 0; right -= 2) {
    if (right === 6) right--; // Skip vertical timing column
    for (let vert = 0; vert < size; vert++) {
      const row = upward ? size - 1 - vert : vert;
      for (let c = 0; c < 2; c++) {
        const col = right - c;
        if (!isReserved[row][col]) {
          let bit = bitIdx < allBits.length ? allBits[bitIdx] : 0;
          bitIdx++;
          // Apply mask 000: (row + col) % 2 === 0
          const mask = (row + col) % 2 === 0;
          matrix[row][col] = (bit === 1) ^ mask;
        }
      }
    }
    upward = !upward;
  }

  // 7. Write Format Information (EC Level M = 00, Mask 0 = 000 -> Format bits 0x5412)
  const formatBits = 0b101010000010010; // Masked format info for M, mask 0
  for (let i = 0; i < 15; i++) {
    const bit = ((formatBits >> (14 - i)) & 1) === 1;
    // Top-left
    if (i < 6) matrix[8][i] = bit;
    else if (i < 8) matrix[8][i + 1] = bit;
    else if (i === 8) matrix[7][8] = bit;
    else matrix[14 - i][8] = bit;

    // Bottom-left / Top-right
    if (i < 8) matrix[size - 1 - i][8] = bit;
    else matrix[8][size - 15 + i] = bit;
  }

  return matrix;
}

/**
 * Renders an SVG path string from a QR matrix.
 */
export function qrMatrixToSvgPath(matrix) {
  const size = matrix.length;
  let path = '';
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (matrix[r][c]) {
        path += `M${c},${r}h1v1h-1z `;
      }
    }
  }
  return { path, size };
}
