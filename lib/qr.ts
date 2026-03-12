/**
 * QR Code Generator — pure TypeScript, zero dependencies.
 * Based on the verified algorithm from Nayuki's QR Code generator (MIT license).
 * Supports Version 1–10, Error Correction Level M.
 */

// ── GF(256) arithmetic ────────────────────────────────────────────────────────
const EXP = new Uint8Array(512)
const LOG = new Uint8Array(256)
;(() => {
  let x = 1
  for (let i = 0; i < 255; i++) {
    EXP[i] = x
    LOG[x] = i
    x <<= 1
    if (x & 256) x ^= 285
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255]
})()

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0
  return EXP[(LOG[a] + LOG[b]) % 255]
}

function gfPolyMul(p: number[], q: number[]): number[] {
  const r = new Array(p.length + q.length - 1).fill(0)
  for (let i = 0; i < p.length; i++)
    for (let j = 0; j < q.length; j++)
      r[i + j] ^= gfMul(p[i], q[j])
  return r
}

function rsGenerator(n: number): number[] {
  let g = [1]
  for (let i = 0; i < n; i++) g = gfPolyMul(g, [1, EXP[i]])
  return g
}

function rsEncode(data: number[], nEc: number): number[] {
  const gen = rsGenerator(nEc)
  const msg = [...data, ...new Array(nEc).fill(0)]
  for (let i = 0; i < data.length; i++) {
    const coef = msg[i]
    if (coef) for (let j = 0; j < gen.length; j++) msg[i + j] ^= gfMul(gen[j], coef)
  }
  return msg.slice(data.length)
}

// ── Version / EC tables (Nayuki verified) ────────────────────────────────────
// Index 0 unused; index = version number

const ECC_PER_BLOCK_M = [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26]
const NUM_BLOCKS_M    = [-1,  1,  1,  1,  2,  2,  4,  4,  4,  5,  5]

// Alignment pattern centers per version (empty = no alignment)
const ALIGN_CENTERS: Record<number, number[]> = {
  2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30],
  6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50],
}

// Remainder bits per version
const REMAINDER_BITS = [-1, 0, 7, 7, 7, 7, 7, 0, 0, 0, 0]

// Data codeword capacity per version at M level
function getNumDataCw(ver: number): number {
  const rawBits = getRawModules(ver)
  const total = Math.floor(rawBits / 8)
  return total - ECC_PER_BLOCK_M[ver] * NUM_BLOCKS_M[ver]
}

function getRawModules(ver: number): number {
  let result = (16 * ver + 128) * ver + 64
  if (ver >= 2) {
    const na = Math.floor(ver / 7) + 2
    result -= (25 * na - 10) * na - 55
    if (ver >= 7) result -= 36
  }
  return result
}

// Byte mode capacity at M level
function byteCapacity(ver: number): number {
  const dc = getNumDataCw(ver)
  return Math.floor((dc * 8 - 4 - 8) / 8)
}

export function chooseVersion(urlLen: number): number {
  for (let v = 1; v <= 10; v++) {
    if (urlLen <= byteCapacity(v)) return v
  }
  throw new Error(`URL too long (max ${byteCapacity(10)} bytes for version 10-M)`)
}

// ── Encoding ──────────────────────────────────────────────────────────────────
function encodeData(url: string, ver: number): number[] {
  const raw = Array.from(new TextEncoder().encode(url))
  const n = raw.length
  const numDc = getNumDataCw(ver)
  const cap = numDc * 8

  const bits: number[] = []
  // Mode: byte = 0b0100
  bits.push(0, 1, 0, 0)
  // Char count: 8 bits for versions 1–9
  for (let i = 7; i >= 0; i--) bits.push((n >> i) & 1)
  // Data bytes
  for (const b of raw)
    for (let i = 7; i >= 0; i--) bits.push((b >> i) & 1)
  // Terminator
  for (let k = 0; k < Math.min(4, cap - bits.length); k++) bits.push(0)
  // Pad to byte boundary
  while (bits.length % 8) bits.push(0)
  // Padding codewords
  const pads = [0xec, 0x11]
  let pi = 0
  while (bits.length < cap) {
    for (let i = 7; i >= 0; i--) bits.push((pads[pi] >> i) & 1)
    pi = (pi + 1) % 2
  }

  const cw: number[] = []
  for (let i = 0; i < numDc * 8; i += 8)
    cw.push(parseInt(bits.slice(i, i + 8).join(''), 2))
  return cw
}

function interleave(dataCw: number[], ver: number): number[] {
  const numBlocks = NUM_BLOCKS_M[ver]
  const ecPerBlock = ECC_PER_BLOCK_M[ver]
  const numDc = getNumDataCw(ver)
  const dcPerBlock = Math.floor(numDc / numBlocks)
  const extraBlocks = numDc % numBlocks // blocks with dcPerBlock+1 data codewords

  // Split into blocks (handle unequal sizes)
  const blocksData: number[][] = []
  let offset = 0
  for (let b = 0; b < numBlocks; b++) {
    const size = dcPerBlock + (b >= numBlocks - extraBlocks ? 1 : 0)
    blocksData.push(dataCw.slice(offset, offset + size))
    offset += size
  }
  const blocksEc = blocksData.map(b => rsEncode(b, ecPerBlock))

  const maxDc = Math.max(...blocksData.map(b => b.length))
  const result: number[] = []
  for (let i = 0; i < maxDc; i++)
    for (const b of blocksData) if (i < b.length) result.push(b[i])
  for (let i = 0; i < ecPerBlock; i++)
    for (const b of blocksEc) result.push(b[i])
  return result
}

// ── Matrix construction ───────────────────────────────────────────────────────
function buildMatrix(ver: number): { matrix: (boolean | null)[][]; fn: boolean[][] } {
  const size = ver * 4 + 17
  const matrix: (boolean | null)[][] = Array.from({ length: size }, () => new Array(size).fill(null))
  const fn: boolean[][] = Array.from({ length: size }, () => new Array(size).fill(false))

  function setM(r: number, c: number, v: boolean) {
    matrix[r][c] = v
    fn[r][c] = true
  }

  function addFinder(row: number, col: number) {
    for (let dr = 0; dr < 7; dr++)
      for (let dc = 0; dc < 7; dc++)
        setM(row + dr, col + dc,
          dr === 0 || dr === 6 || dc === 0 || dc === 6 || (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4))
  }

  addFinder(0, 0)
  addFinder(0, size - 7)
  addFinder(size - 7, 0)

  // Separators
  for (let i = 0; i < 8; i++) {
    if (!fn[7][i])          setM(7, i, false)
    if (!fn[i][7])          setM(i, 7, false)
    if (!fn[7][size-8+i])   setM(7, size - 8 + i, false)
    if (!fn[i][size-8])     setM(i, size - 8, false)
    if (!fn[size-8+i][7])   setM(size - 8 + i, 7, false)
    if (!fn[size-8][i])     setM(size - 8, i, false)
  }

  // Timing
  for (let i = 8; i < size - 8; i++) {
    if (!fn[6][i]) setM(6, i, i % 2 === 0)
    if (!fn[i][6]) setM(i, 6, i % 2 === 0)
  }

  // Dark module
  setM(size - 8, 8, true)

  // Alignment patterns
  const coords = ALIGN_CENTERS[ver] ?? []
  for (const r of coords) {
    for (const c of coords) {
      // Skip positions overlapping finder patterns
      if ((r <= 8 && c <= 8) || (r <= 8 && c >= size - 8) || (r >= size - 8 && c <= 8)) continue
      for (let dr = -2; dr <= 2; dr++)
        for (let dc = -2; dc <= 2; dc++)
          if (!fn[r + dr][c + dc])
            setM(r + dr, c + dc,
              Math.abs(dr) === 2 || Math.abs(dc) === 2 || (dr === 0 && dc === 0))
    }
  }

  // Reserve format info areas
  for (let i = 0; i < 9; i++) {
    if (!fn[i][8]) setM(i, 8, false)
    if (!fn[8][i]) setM(8, i, false)
  }
  for (let i = size - 8; i < size; i++) {
    if (!fn[i][8]) setM(i, 8, false)
    if (!fn[8][i]) setM(8, i, false)
  }

  return { matrix, fn }
}

function placeData(matrix: (boolean | null)[][], fn: boolean[][], bits: number[], ver: number) {
  const size = ver * 4 + 17
  let bitIdx = 0
  let right = size - 1
  let goingUp = true

  while (right >= 1) {
    if (right === 6) { right--; continue }
    const cols = [right, right - 1]
    const rows = goingUp
      ? Array.from({ length: size }, (_, i) => size - 1 - i)
      : Array.from({ length: size }, (_, i) => i)
    for (const row of rows) {
      for (const col of cols) {
        if (!fn[row][col]) {
          matrix[row][col] = bitIdx < bits.length ? bits[bitIdx++] === 1 : false
        }
      }
    }
    goingUp = !goingUp
    right -= 2
  }
}

// ── Masking ───────────────────────────────────────────────────────────────────
function maskBit(pat: number, r: number, c: number): boolean {
  switch (pat) {
    case 0: return (r + c) % 2 === 0
    case 1: return r % 2 === 0
    case 2: return c % 3 === 0
    case 3: return (r + c) % 3 === 0
    case 4: return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0
    case 5: return (r * c) % 2 + (r * c) % 3 === 0
    case 6: return ((r * c) % 2 + (r * c) % 3) % 2 === 0
    default: return ((r + c) % 2 + (r * c) % 3) % 2 === 0
  }
}

function applyMask(matrix: (boolean | null)[][], fn: boolean[][], pat: number): boolean[][] {
  const size = matrix.length
  return matrix.map((row, r) =>
    row.map((v, c) => {
      const val = v ?? false
      return !fn[r][c] && maskBit(pat, r, c) ? !val : val
    })
  )
}

function penaltyScore(mat: boolean[][]): number {
  const size = mat.length
  let score = 0

  // Rule 1: 5+ same color runs
  for (let r = 0; r < size; r++) {
    let run = 1
    for (let c = 1; c < size; c++) {
      if (mat[r][c] === mat[r][c - 1]) { run++; if (run === 5) score += 3; else if (run > 5) score++ }
      else run = 1
    }
  }
  for (let c = 0; c < size; c++) {
    let run = 1
    for (let r = 1; r < size; r++) {
      if (mat[r][c] === mat[r - 1][c]) { run++; if (run === 5) score += 3; else if (run > 5) score++ }
      else run = 1
    }
  }

  // Rule 2: 2×2 same color blocks
  for (let r = 0; r < size - 1; r++)
    for (let c = 0; c < size - 1; c++)
      if (mat[r][c] === mat[r][c+1] && mat[r][c] === mat[r+1][c] && mat[r][c] === mat[r+1][c+1])
        score += 3

  // Rule 3: finder-like patterns
  const p1 = [true,false,true,true,true,false,true,false,false,false,false]
  const p2 = [false,false,false,false,true,false,true,true,true,false,true]
  for (let r = 0; r < size; r++) {
    for (let c = 0; c <= size - 11; c++) {
      const seg = mat[r].slice(c, c + 11)
      if (seg.every((v, i) => v === p1[i]) || seg.every((v, i) => v === p2[i])) score += 40
    }
  }
  for (let c = 0; c < size; c++) {
    const col = mat.map(r => r[c])
    for (let r = 0; r <= size - 11; r++) {
      const seg = col.slice(r, r + 11)
      if (seg.every((v, i) => v === p1[i]) || seg.every((v, i) => v === p2[i])) score += 40
    }
  }

  // Rule 4: dark module ratio
  const dark = mat.flat().filter(Boolean).length
  const k = Math.abs(Math.floor(dark * 20 / (size * size)) - 10)
  score += k * 10

  return score
}

// ── Format information ────────────────────────────────────────────────────────
function computeFormatBits(eclFmtBits: number, maskPat: number): number {
  const data = (eclFmtBits << 3) | maskPat
  let rem = data
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >> 9) * 0x537)
  return (data << 10 | rem) ^ 0x5412
}

function placeFormat(mat: boolean[][], fmtBits: number, size: number) {
  // First copy: around top-left finder
  // Nayuki order: bit i placed at position i (LSB first going along the finder edge)
  const tl: [number, number][] = [
    [0,8],[1,8],[2,8],[3,8],[4,8],[5,8],
    [7,8],[8,8],[8,7],[8,5],[8,4],[8,3],[8,2],[8,1],[8,0]
  ]
  for (let i = 0; i < 15; i++)
    mat[tl[i][0]][tl[i][1]] = ((fmtBits >> i) & 1) === 1

  // Second copy: top-right + bottom-left
  const tr: [number, number][] = [
    [8,size-1],[8,size-2],[8,size-3],[8,size-4],[8,size-5],[8,size-6],[8,size-7],
    [size-7,8],[size-6,8],[size-5,8],[size-4,8],[size-3,8],[size-2,8],[size-1,8]
  ]
  // Note: second copy has 14 positions (bit 14 position is the dark module, always 1)
  for (let i = 0; i < 14; i++)
    mat[tr[i][0]][tr[i][1]] = ((fmtBits >> i) & 1) === 1

  // Dark module is always dark
  mat[size - 8][8] = true
}

// ── Main export ───────────────────────────────────────────────────────────────
export interface QRResult {
  matrix: boolean[][]
  version: number
  size: number
}

export function generateQR(url: string): QRResult {
  const urlBytes = new TextEncoder().encode(url)
  const ver = chooseVersion(urlBytes.length)
  const size = ver * 4 + 17

  // Encode data
  const dataCw = encodeData(url, ver)
  const allCw = interleave(dataCw, ver)

  // Build bit stream
  const finalBits: number[] = []
  for (const cw of allCw)
    for (let i = 7; i >= 0; i--) finalBits.push((cw >> i) & 1)
  // Remainder bits
  for (let i = 0; i < REMAINDER_BITS[ver]; i++) finalBits.push(0)

  // Build matrix
  const { matrix, fn } = buildMatrix(ver)
  placeData(matrix, fn, finalBits, ver)

  // Choose best mask
  let bestMask = 0, bestScore = Infinity, bestMat: boolean[][] | null = null
  for (let mp = 0; mp < 8; mp++) {
    const m = applyMask(matrix, fn, mp)
    const s = penaltyScore(m)
    if (s < bestScore) { bestMask = mp; bestScore = s; bestMat = m }
  }

  // Place format info
  const fmtBits = computeFormatBits(0, bestMask) // EC level M = formatBits 0
  placeFormat(bestMat!, fmtBits, size)

  return { matrix: bestMat!, version: ver, size }
}

// ── SVG export ────────────────────────────────────────────────────────────────
export function qrToSVG(qr: QRResult, moduleSize = 10, quiet = 4): string {
  const { matrix, size } = qr
  const total = (size + quiet * 2) * moduleSize

  const rects: string[] = []
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (matrix[r][c]) {
        const x = (c + quiet) * moduleSize
        const y = (r + quiet) * moduleSize
        rects.push(`M${x},${y}h${moduleSize}v${moduleSize}h-${moduleSize}z`)
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" width="${total}" height="${total}" shape-rendering="crispEdges">
<rect width="${total}" height="${total}" fill="white"/>
<path fill="black" d="${rects.join('')}"/>
</svg>`
}
