/**
 * 二维码生成 - 重量级模块，已迁移到分包
 * 纯 JS QR 码矩阵生成 + Canvas 绘制
 */

function encodeUTF8(str: string): number[] {
  const result: number[] = []
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i)
    if (code < 0x80) result.push(code)
    else if (code < 0x800) result.push(0xC0 | (code >> 6), 0x80 | (code & 0x3F))
    else if (code >= 0xD800 && code <= 0xDBFF) {
      const hi = code, lo = str.charCodeAt(++i)
      const cp = ((hi - 0xD800) << 10) + (lo - 0xDC00) + 0x10000
      result.push(0xF0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3F), 0x80 | ((cp >> 6) & 0x3F), 0x80 | (cp & 0x3F))
    } else result.push(0xE0 | (code >> 12), 0x80 | ((code >> 6) & 0x3F), 0x80 | (code & 0x3F))
  }
  return result
}

const BYTE_CAPACITY_M = [0,14,26,42,62,84,106,122,152,180,213,251,287,331,362,412,450,504,560,624,666,711,779,857,911,997,1059,1125,1190,1264,1370,1452,1538,1628,1722,1809,1911,1989,2099,2213]

function getByteCapacity(version: number): number { return BYTE_CAPACITY_M[version] || 0 }

function drawFinderPattern(matrix: boolean[][], reserved: boolean[][], row: number, col: number) {
  for (let r = -1; r <= 7; r++) for (let c = -1; c <= 7; c++) {
    const tr = row + r, tc = col + c
    if (tr < 0 || tc < 0 || tr >= matrix.length || tc >= matrix.length) continue
    reserved[tr][tc] = true
    if ((0<=r&&r<=6&&(c===0||c===6))||(0<=c&&c<=6&&(r===0||r===6))||(2<=r&&r<=4&&2<=c&&c<=4)) matrix[tr][tc]=true
    else matrix[tr][tc]=false
  }
}

function drawAlignmentPattern(matrix: boolean[][], reserved: boolean[][], row: number, col: number) {
  for (let r = -2; r <= 2; r++) for (let c = -2; c <= 2; c++) {
    const tr = row + r, tc = col + c; reserved[tr][tc] = true
    if (r===-2||r===2||c===-2||c===2||(r===0&&c===0)) matrix[tr][tc]=true; else matrix[tr][tc]=false
  }
}

function getAlignmentPositions(version: number): number[] {
  if (version === 1) return []
  const positions = [6], size = version * 4 + 17, last = size - 7
  const count = Math.floor(version / 7) + 2
  const step = version === 32 ? 26 : Math.ceil((last - 6) / (count - 1) / 2) * 2
  for (let i = 1; i < count - 1; i++) positions.push(6 + step * i)
  positions.push(last); return positions
}

function encodeData(data: number[], version: number): number[] {
  const bits: number[] = [], dataLen = data.length
  bits.push(0,1,0,0)
  const ccBits = version < 10 ? 8 : 16
  for (let i = ccBits - 1; i >= 0; i--) bits.push((dataLen >> i) & 1)
  for (const byte of data) for (let i = 7; i >= 0; i--) bits.push((byte >> i) & 1)
  const totalBits = getByteCapacity(version) * 8
  for (let i = 0; i < 4 && bits.length < totalBits; i++) bits.push(0)
  while (bits.length % 8 !== 0 && bits.length < totalBits) bits.push(0)
  const padBytes = [0xEC, 0x11]; let pi = 0
  while (bits.length < totalBits) { for (let i = 7; i >= 0; i--) bits.push((padBytes[pi] >> i) & 1); pi = (pi + 1) % 2 }
  return bits
}

const RS_BLOCK_TABLE = [
  [1,26,19],[1,26,16],[1,26,13],[1,26,9],[1,44,34],[1,44,28],[1,44,22],[1,44,16],
  [1,70,55],[1,70,44],[2,35,17],[2,35,13],[1,100,80],[2,50,32],[2,50,24],[4,25,9],
  [1,134,108],[2,67,43],[2,33,15,2,34,16],[2,33,11,2,34,12],[2,86,68],[4,43,27],[4,43,19],[4,43,15],
  [2,98,78],[4,49,31],[2,32,14,4,33,15],[4,39,13,1,40,14],[2,121,97],[2,60,38,2,61,39],[4,40,18,2,41,19],[4,40,14,2,41,15],
  [2,146,116],[3,58,36,2,59,37],[4,36,16,4,37,17],[4,36,12,4,37,13],[2,86,68,2,87,69],[4,69,43,1,70,44],[6,43,19,2,44,20],[6,43,15,2,44,16],
  [4,101,81],[1,80,50,4,81,51],[4,50,22,4,51,23],[3,36,12,8,37,13],[2,116,92,2,117,93],[6,58,36,2,59,37],[4,46,20,6,47,21],[7,42,14,4,43,15],
  [4,133,107],[8,59,37,1,60,38],[8,44,20,4,45,21],[12,33,11,4,34,12],[3,145,115,1,146,116],[4,64,40,5,65,41],[11,36,16,5,37,17],[11,36,12,5,37,13],
  [5,109,87,1,110,88],[5,65,41,5,66,42],[5,54,24,7,55,25],[11,36,12,7,37,13],[5,122,98,1,123,99],[7,73,45,3,74,46],[15,43,19,2,44,20],[3,45,15,13,46,16],
  [1,135,107,5,136,108],[10,74,46,1,75,47],[1,50,22,15,51,23],[2,42,14,17,43,15],[5,150,120,1,151,121],[9,69,43,4,70,44],[17,50,22,1,51,23],[2,42,14,19,43,15],
  [3,141,113,4,142,114],[3,70,44,11,71,45],[17,47,21,4,48,22],[9,39,13,16,40,14],[3,135,107,5,136,108],[3,67,41,13,68,42],[15,54,24,5,55,25],[15,43,15,10,44,16],
  [4,144,116,4,145,117],[17,68,42],[17,50,22,6,51,23],[19,46,16,6,47,17],[2,139,111,7,140,112],[17,74,46],[7,54,24,16,55,25],[34,37,13],
  [4,151,121,5,152,122],[4,75,47,14,76,48],[11,54,24,14,55,25],[16,45,15,14,46,16],[6,147,117,4,148,118],[6,73,45,14,74,46],[11,54,24,16,55,25],[30,46,16,2,47,17],
  [8,132,106,4,133,107],[8,75,47,13,76,48],[7,54,24,22,55,25],[22,45,15,13,46,16],[10,142,114,2,143,115],[19,74,46,4,75,47],[28,50,22,6,51,23],[33,46,16,4,47,17],
  [8,152,122,4,153,123],[22,73,45,3,74,46],[8,53,23,26,54,24],[12,45,15,28,46,16],[3,147,117,10,148,118],[3,73,45,23,74,46],[4,54,24,31,55,25],[11,45,15,31,46,16],
  [7,146,116,7,147,117],[21,73,45,7,74,46],[1,53,23,37,54,24],[19,45,15,26,46,16],[5,145,115,10,146,116],[19,75,47,10,76,48],[15,54,24,25,55,25],[23,45,15,25,46,16],
  [13,145,115,3,146,116],[2,74,46,29,75,47],[42,54,24,1,55,25],[23,45,15,28,46,16],[17,145,115],[10,74,46,23,75,47],[10,54,24,35,55,25],[19,45,15,35,46,16],
  [17,145,115,1,146,116],[14,74,46,21,75,47],[29,54,24,19,55,25],[11,45,15,46,46,16],[13,145,115,6,146,116],[14,74,46,23,75,47],[44,54,24,7,55,25],[59,46,16,1,47,17],
  [12,151,121,7,152,122],[12,75,47,26,76,48],[39,54,24,14,55,25],[22,45,15,41,46,16],[6,151,121,14,152,122],[6,75,47,34,76,48],[46,54,24,10,55,25],[2,45,15,64,46,16],
  [17,152,122,4,153,123],[29,74,46,14,75,47],[49,54,24,10,55,25],[24,45,15,46,46,16],[4,152,122,18,153,123],[13,74,46,32,75,47],[48,54,24,14,55,25],[42,45,15,32,46,16],
  [20,147,117,4,148,118],[40,75,47,7,76,48],[43,54,24,22,55,25],[10,45,15,67,46,16],[19,148,118,6,149,119],[18,75,47,31,76,48],[34,54,24,34,55,25],[20,45,15,61,46,16]
]

function getFormatBits(ecl: number, maskPattern: number): number {
  const data = (ecl << 3) | maskPattern; let bits = data << 10
  for (let i = 0; i < 15; i++) if ((bits >>> (14 - i)) & 1) bits ^= (0x537 << (9 - i))
  return ((data << 10) | bits) ^ 0x5412
}

function getVersionBits(version: number): number {
  let d = version << 12
  for (let i = 0; i < 18; i++) if (d & (1 << (17 - i))) d ^= (0x1F25 << (17 - i - 12))
  return (version << 12) | d
}

function writeFormatInfo(matrix: boolean[][], size: number, formatBits: number) {
  for (let i = 0; i < 15; i++) {
    const bit = ((formatBits >> i) & 1) === 1
    if (i < 6) matrix[8][i] = bit; else if (i < 8) matrix[8][i + 1] = bit; else matrix[8][size - 15 + i] = bit
    if (i < 8) matrix[size - 1 - i][8] = bit; else matrix[14 - i][8] = bit
  }
}

function writeVersionInfo(matrix: boolean[][], size: number, versionBits: number) {
  for (let i = 0; i < 18; i++) {
    const bit = ((versionBits >> i) & 1) === 1
    const r = Math.floor(i / 3), c = size - 11 + (i % 3)
    matrix[r][c] = bit; matrix[c][r] = bit
  }
}

export function generateQRMatrix(text: string): boolean[][] {
  const data = encodeUTF8(text)
  let version = 1
  for (; version <= 40; version++) { if (getByteCapacity(version) >= data.length) break }
  if (version > 40) throw new Error('数据太长，无法生成二维码')
  const size = version * 4 + 17
  const matrix = Array.from({ length: size }, () => Array(size).fill(false))
  const reserved = Array.from({ length: size }, () => Array(size).fill(false))
  drawFinderPattern(matrix, reserved, 0, 0)
  drawFinderPattern(matrix, reserved, 0, size - 7)
  drawFinderPattern(matrix, reserved, size - 7, 0)
  const alignPos = getAlignmentPositions(version)
  for (const r of alignPos) for (const c of alignPos) { if (reserved[r][c]) continue; drawAlignmentPattern(matrix, reserved, r, c) }
  for (let i = 8; i < size - 8; i++) { if (!reserved[6][i]) { matrix[6][i] = i % 2 === 0; reserved[6][i] = true } if (!reserved[i][6]) { matrix[i][6] = i % 2 === 0; reserved[i][6] = true } }
  for (let i = 0; i < 9; i++) { reserved[8][i] = true; reserved[i][8] = true; reserved[8][size - 8 + i] = true; reserved[size - 8 + i][8] = true }
  reserved[size - 8][8] = true
  if (version >= 7) for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) { reserved[i][size - 11 + j] = true; reserved[size - 11 + j][i] = true }
  const dataBits = encodeData(data, version)
  let bitIdx = 0, upward = true
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5
    for (let vert = 0; vert < size; vert++) {
      const row = upward ? size - 1 - vert : vert
      for (let c = 0; c < 2; c++) { const col = right - c; if (col < 0 || reserved[row][col]) continue; if (bitIdx < dataBits.length) { matrix[row][col] = dataBits[bitIdx] === 1; bitIdx++ } }
    }
    upward = !upward
  }
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (!reserved[r][c] && (r + c) % 2 === 0) matrix[r][c] = !matrix[r][c]
  writeFormatInfo(matrix, size, getFormatBits(0, 0))
  if (version >= 7) writeVersionInfo(matrix, size, getVersionBits(version))
  return matrix
}

export function drawQrCode(canvasId: string, text: string, componentInstance?: any, options?: { size?: number; margin?: number }) {
  const size = options?.size || 180, margin = options?.margin || 2
  const matrix = generateQRMatrix(text)
  const cellSize = Math.floor((size - margin * 2) / matrix.length)
  const actualSize = cellSize * matrix.length + margin * 2
  const ctx = uni.createCanvasContext(canvasId, componentInstance)
  ctx.setFillStyle('#ffffff'); ctx.fillRect(0, 0, actualSize, actualSize)
  ctx.setFillStyle('#000000')
  for (let r = 0; r < matrix.length; r++) for (let c = 0; c < matrix[r].length; c++) if (matrix[r][c]) ctx.fillRect(margin + c * cellSize, margin + r * cellSize, cellSize, cellSize)
  ctx.draw()
}
