/**
 * SlowlyRecord 同步服务器 - 最简实现
 *
 * 部署方式（3 选 1）：
 *
 * 1. CloudBase 云函数：
 *    - 将此文件上传为云函数 sync
 *    - 无需额外配置
 *
 * 2. Vercel Serverless：
 *    - 改文件名为 api/sync.ts，加 export default
 *    - vercel deploy 即可
 *
 * 3. 独立 Node 服务：
 *    - node sync-server.mjs 启动
 *    - 默认监听 3000 端口
 *
 * API：
 *   POST   /sync       → 上传加密数据，返回 { code }（一次性，阅后即焚）
 *   GET    /sync/:code → 下载加密数据，返回 { e } 或 404（阅后即焚）
 *   DELETE /sync/:code → 删除数据
 *   GET    /ping       → 健康检查
 *
 * 注意：客户端已做 AES-256-GCM 加密，服务端只存密文，无需关心数据内容
 */

// ============ 存储层（可替换为 Redis/SQLite/MySQL） ============

interface SyncRecord {
  e: string          // 加密数据
  createdAt: number  // 创建时间
}

/** 内存存储（重启丢失，适合临时同步） */
const store = new Map<string, SyncRecord>()

/** 数据过期时间（毫秒），默认 24 小时 */
const TTL = 24 * 60 * 60 * 1000

/** 清理过期数据 */
function cleanup() {
  const now = Date.now()
  for (const [code, record] of store) {
    const age = now - record.createdAt
    if (age > TTL) {
      store.delete(code)
    }
  }
}

// 每 10 分钟清理一次
setInterval(cleanup, 10 * 60 * 1000)

// ============ 生成同步码 ============

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let code = ''
  const arr = new Uint8Array(8)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(arr)
  } else {
    for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256)
  }
  for (let i = 0; i < 8; i++) {
    code += chars[arr[i] % chars.length]
  }
  return code
}

// ============ HTTP 处理 ============

function jsonBody(req: any): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk: Buffer) => { body += chunk.toString() })
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}) }
      catch { reject(new Error('Invalid JSON')) }
    })
    req.on('error', reject)
  })
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

function jsonResponse(res: any, statusCode: number, data: any) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    ...CORS_HEADERS,
  })
  res.end(JSON.stringify(data))
}

/**
 * 处理 HTTP 请求（与框架无关）
 */
export async function handleRequest(method: string, path: string, body?: any): Promise<{ status: number; data: any }> {
  // CORS preflight
  if (method === 'OPTIONS') {
    return { status: 204, data: null }
  }

  // GET /ping
  if (method === 'GET' && path === '/ping') {
    return { status: 200, data: { ok: true } }
  }

  // POST /sync - 上传（阅后即焚）
  if (method === 'POST' && path === '/sync') {
    if (!body || !body.e) {
      return { status: 400, data: { error: 'Missing encrypted data' } }
    }

    const code = generateCode()
    store.set(code, { e: body.e, createdAt: Date.now() })

    console.log(`[sync] uploaded, code=${code}, size=${body.e.length}`)
    return { status: 200, data: { code } }
  }

  // GET /sync/:code - 下载（阅后即焚）
  const getMatch = path.match(/^\/sync\/([A-Za-z0-9_-]+)$/)
  if (method === 'GET' && getMatch) {
    const code = getMatch[1]
    const record = store.get(code)

    if (!record) {
      return { status: 404, data: { error: 'Not found or expired' } }
    }

    // 阅后即焚
    store.delete(code)
    console.log(`[sync] downloaded and deleted, code=${code}`)

    return { status: 200, data: { e: record.e } }
  }

  // DELETE /sync/:code - 手动删除
  const deleteMatch = path.match(/^\/sync\/([A-Za-z0-9_-]+)$/)
  if (method === 'DELETE' && deleteMatch) {
    const code = deleteMatch[1]
    store.delete(code)
    console.log(`[sync] deleted, code=${code}`)
    return { status: 200, data: { deleted: true } }
  }

  return { status: 404, data: { error: 'Not found' } }
}

// ============ CloudBase 云函数入口 ============

exports.main = async (event: any) => {
  const { method, path, body } = event
  const result = await handleRequest(method || 'GET', path || '/', body)
  return result.data
}

// ============ Vercel Serverless 入口 ============

// export default async function handler(req: any, res: any) {
//   const result = await handleRequest(req.method, req.url?.split('?')[0] || '/', req.body)
//   res.status(result.status).json(result.data)
// }

// ============ 独立 Node 服务 ============

// 取消注释以下代码即可用 node sync-server.mjs 启动

/*
import { createServer } from 'http'

const PORT = process.env.PORT || 3000

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url!, `http://localhost:${PORT}`)
    const body = req.method === 'POST' ? await jsonBody(req) : undefined
    const result = await handleRequest(req.method!, url.pathname, body)
    jsonResponse(res, result.status, result.data)
  } catch (e) {
    console.error('[sync] error', e)
    jsonResponse(res, 500, { error: 'Internal error' })
  }
})

server.listen(PORT, () => {
  console.log(`[sync] server listening on http://localhost:${PORT}`)
  console.log(`[sync] TTL = ${TTL / 1000 / 60 / 60} hours`)
})
*/
