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

export type ECLevel = 'M' | 'H'

const ECC_PER_BLOCK_M = [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26]
const NUM_BLOCKS_M    = [-1,  1,  1,  1,  2,  2,  4,  4,  4,  5,  5]

const ECC_PER_BLOCK_H = [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28]
const NUM_BLOCKS_H    = [-1,  1,  1,  2,  4,  4,  4,  5,  6,  8,  8]

const FORMAT_BITS: Record<ECLevel, number> = { M: 0, H: 2 }

function eccPerBlock(level: ECLevel): number[] { return level === 'H' ? ECC_PER_BLOCK_H : ECC_PER_BLOCK_M }
function numBlocks(level: ECLevel): number[] { return level === 'H' ? NUM_BLOCKS_H : NUM_BLOCKS_M }

// Alignment pattern centers per version (empty = no alignment)
const ALIGN_CENTERS: Record<number, number[]> = {
  2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30],
  6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50],
}

// Remainder bits per version
const REMAINDER_BITS = [-1, 0, 7, 7, 7, 7, 7, 0, 0, 0, 0]

// Data codeword capacity per version at the given EC level
function getNumDataCw(ver: number, level: ECLevel): number {
  const rawBits = getRawModules(ver)
  const total = Math.floor(rawBits / 8)
  return total - eccPerBlock(level)[ver] * numBlocks(level)[ver]
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

// Byte-mode character-count indicator width (bits).
// Per ISO/IEC 18004: 8 bits for versions 1–9, 16 bits for versions 10–26.
function charCountBits(ver: number): number {
  return ver >= 10 ? 16 : 8
}

// Byte mode capacity at the given EC level
function byteCapacity(ver: number, level: ECLevel): number {
  const dc = getNumDataCw(ver, level)
  return Math.floor((dc * 8 - 4 - charCountBits(ver)) / 8)
}

export function maxUrlBytes(level: ECLevel = 'M'): number {
  return byteCapacity(10, level)
}

export function chooseVersion(urlLen: number, level: ECLevel = 'M'): number {
  for (let v = 1; v <= 10; v++) {
    if (urlLen <= byteCapacity(v, level)) return v
  }
  throw new Error(`URL too long (max ${byteCapacity(10, level)} bytes for version 10-${level})`)
}

// ── Encoding ──────────────────────────────────────────────────────────────────
function encodeData(url: string, ver: number, level: ECLevel): number[] {
  const raw = Array.from(new TextEncoder().encode(url))
  const n = raw.length
  const numDc = getNumDataCw(ver, level)
  const cap = numDc * 8

  const bits: number[] = []
  // Mode: byte = 0b0100
  bits.push(0, 1, 0, 0)
  // Char count: 8 bits for versions 1–9, 16 bits for versions 10+
  const ccBits = charCountBits(ver)
  for (let i = ccBits - 1; i >= 0; i--) bits.push((n >> i) & 1)
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

function interleave(dataCw: number[], ver: number, level: ECLevel): number[] {
  const nb = numBlocks(level)[ver]
  const ecPerBlock = eccPerBlock(level)[ver]
  const numDc = getNumDataCw(ver, level)
  const dcPerBlock = Math.floor(numDc / nb)
  const extraBlocks = numDc % nb // blocks with dcPerBlock+1 data codewords

  // Split into blocks (handle unequal sizes)
  const blocksData: number[][] = []
  let offset = 0
  for (let b = 0; b < nb; b++) {
    const size = dcPerBlock + (b >= nb - extraBlocks ? 1 : 0)
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

  // Reserve version info areas (required for version 7+, two 6x3 blocks)
  if (ver >= 7) {
    for (let i = 0; i < 18; i++) {
      const a = size - 11 + (i % 3)
      const b = Math.floor(i / 3)
      setM(b, a, false)
      setM(a, b, false)
    }
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

// ── Version information (required for version 7+) ────────────────────────────
// Distinct from format info above: encodes the version number itself via its
// own BCH(18,6) code (generator 0x1F25), unmasked, in two 6x3 blocks near the
// top-right and bottom-left finders. Without it, symbols v7+ are ambiguous by
// size alone and compliant readers (including iOS Camera) refuse to decode.
function computeVersionBits(ver: number): number {
  let rem = ver
  for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >> 11) * 0x1f25)
  return (ver << 12) | rem
}

function placeVersion(mat: boolean[][], verBits: number, size: number) {
  for (let i = 0; i < 18; i++) {
    const bit = ((verBits >> i) & 1) === 1
    const a = size - 11 + (i % 3)
    const b = Math.floor(i / 3)
    mat[b][a] = bit
    mat[a][b] = bit
  }
}

// ── Main export ───────────────────────────────────────────────────────────────
export interface QRResult {
  matrix: boolean[][]
  version: number
  size: number
}

export function generateQR(url: string, level: ECLevel = 'M'): QRResult {
  const urlBytes = new TextEncoder().encode(url)
  const ver = chooseVersion(urlBytes.length, level)
  const size = ver * 4 + 17

  // Encode data
  const dataCw = encodeData(url, ver, level)
  const allCw = interleave(dataCw, ver, level)

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
  const fmtBits = computeFormatBits(FORMAT_BITS[level], bestMask)
  placeFormat(bestMat!, fmtBits, size)

  // Place version info (version 7+ only)
  if (ver >= 7) {
    const verBits = computeVersionBits(ver)
    placeVersion(bestMat!, verBits, size)
  }

  return { matrix: bestMat!, version: ver, size }
}

// ── Logo overlay ──────────────────────────────────────────────────────────────
// Two independent constraints bound how large a centered square logo can be:
//
// 1. Geometry: the box must not reach into any of the three 8×8 finder-pattern
//    corners (finder + separator + adjacent format-info strip). For a logo
//    box of `m` modules centered in a `size`×`size` symbol, this requires
//    m <= size - 16.
// 2. Error-correction budget: Level H recovers ~30% corrupted codewords: we
//    cap the cleared *area* at 20% (half the theoretical ceiling) so the
//    quiet zone, alignment patterns, and mask noise all have headroom.
//
// The binding constraint differs by version — small symbols (v1-3, i.e. short
// URLs) are geometry-bound; larger ones are EC-bound. Always take the tighter
// of the two so neither guarantee is violated.
const MAX_LOGO_AREA_RATIO = 0.20
const FINDER_CLEARANCE = 8 // rows/cols occupied by a finder pattern + separator

export function maxLogoRatio(version: number): number {
  const size = version * 4 + 17
  const geometryLimit = Math.max(0, (size - 2 * FINDER_CLEARANCE) / size)
  const ecLimit = Math.sqrt(MAX_LOGO_AREA_RATIO)
  return Math.min(geometryLimit, ecLimit)
}

export interface LogoOptions {
  /** data: URI or external URL for the logo image */
  src: string
  /** fraction (0–maxLogoRatio()) of the QR's module grid the logo's square backing spans */
  ratio: number
}

// ── SVG export ────────────────────────────────────────────────────────────────
export function qrToSVG(qr: QRResult, moduleSize = 10, quiet = 4, logo?: LogoOptions): string {
  const { matrix, size } = qr
  const total = (size + quiet * 2) * moduleSize

  const clampedRatio = logo ? Math.min(logo.ratio, maxLogoRatio(qr.version)) : 0
  const logoModules = clampedRatio * size
  const logoStart = (size - logoModules) / 2
  const logoEnd = logoStart + logoModules

  const rects: string[] = []
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!matrix[r][c]) continue
      if (logo && r >= logoStart - 0.5 && r <= logoEnd - 0.5 && c >= logoStart - 0.5 && c <= logoEnd - 0.5) continue
      const x = (c + quiet) * moduleSize
      const y = (r + quiet) * moduleSize
      rects.push(`M${x},${y}h${moduleSize}v${moduleSize}h-${moduleSize}z`)
    }
  }

  let logoMarkup = ''
  if (logo) {
    const boxPx = logoModules * moduleSize
    const originPx = (logoStart + quiet) * moduleSize
    const pad = boxPx * 0.08
    logoMarkup = `
<rect x="${originPx}" y="${originPx}" width="${boxPx}" height="${boxPx}" rx="${boxPx * 0.16}" fill="white"/>
<image href="${logo.src}" x="${originPx + pad}" y="${originPx + pad}" width="${boxPx - pad * 2}" height="${boxPx - pad * 2}" preserveAspectRatio="xMidYMid slice" clip-path="inset(0 round ${(boxPx - pad * 2) * 0.12}px)"/>`
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" width="${total}" height="${total}" shape-rendering="crispEdges">
<rect width="${total}" height="${total}" fill="white"/>
<path fill="black" d="${rects.join('')}"/>${logoMarkup}
</svg>`
}
