import type { DbAdapter, DbDoc, DbReturn } from './db'

const STORAGE_PREFIX = 'slowlyrecord_'
const CHUNK_SIZE = 900 * 1024

export class MiniProgramDbAdapter implements DbAdapter {
  private prefix: string

  promises = {
    get: <T extends {} = Record<string, any>>(id: string): Promise<DbDoc<T> | null> => {
      return Promise.resolve(this.get<T>(id))
    },
    put: (doc: DbDoc): Promise<DbReturn> => {
      return Promise.resolve(this.put(doc))
    },
    remove: (doc: string | DbDoc): Promise<DbReturn> => {
      return Promise.resolve(this.remove(doc))
    },
    bulkDocs: (docs: DbDoc[]): Promise<DbReturn[]> => {
      return Promise.resolve(this.bulkDocs(docs))
    },
  }

  constructor(prefix: string = STORAGE_PREFIX) {
    this.prefix = prefix
  }

  private getKey(id: string): string {
    return `${this.prefix}${id}`
  }

  private saveWithChunks<T>(doc: DbDoc<T>): DbReturn {
    const key = this.getKey(doc._id)
    const dataStr = JSON.stringify(doc)

    if (dataStr.length <= CHUNK_SIZE) {
      try {
        uni.setStorageSync(key, doc)
        return { id: doc._id, rev: doc._rev || '1', ok: true }
      } catch (e) {
        return { id: doc._id, rev: doc._rev || '1', ok: false, error: true, message: String(e) }
      }
    }

    const chunks: string[] = []
    for (let i = 0; i < dataStr.length; i += CHUNK_SIZE) {
      chunks.push(dataStr.slice(i, i + CHUNK_SIZE))
    }

    const chunkInfo = {
      _id: doc._id,
      _rev: doc._rev || '1',
      _chunks: chunks.length,
      _chunkKeys: chunks.map((_, index) => `${key}__chunk__${index}`)
    }

    try {
      uni.setStorageSync(key, chunkInfo)
      chunks.forEach((chunk, index) => {
        uni.setStorageSync(`${key}__chunk__${index}`, chunk)
      })
      return { id: doc._id, rev: chunkInfo._rev, ok: true }
    } catch (e) {
      return { id: doc._id, rev: doc._rev || '1', ok: false, error: true, message: String(e) }
    }
  }

  private readWithChunksSync<T>(key: string): DbDoc<T> | null {
    try {
      const data = uni.getStorageSync(key)
      if (!data) return null

      if (data._chunks && data._chunkKeys) {
        let fullData = ''
        for (const chunkKey of data._chunkKeys) {
          const chunk = uni.getStorageSync(chunkKey)
          if (chunk === undefined || chunk === null) return null
          fullData += chunk
        }
        return JSON.parse(fullData) as DbDoc<T>
      }

      return data as DbDoc<T>
    } catch (e) {
      console.error('读取数据失败:', e)
      return null
    }
  }

  get<T extends {} = Record<string, any>>(id: string): DbDoc<T> | null {
    return this.readWithChunksSync<T>(this.getKey(id))
  }

  put(doc: DbDoc): DbReturn {
    return this.saveWithChunks(doc)
  }

  remove(doc: string | DbDoc): DbReturn {
    const id = typeof doc === 'string' ? doc : doc._id
    const key = this.getKey(id)
    try {
      const existing = uni.getStorageSync(key)
      if (existing && existing._chunks && existing._chunkKeys) {
        for (const chunkKey of existing._chunkKeys) {
          uni.removeStorageSync(chunkKey)
        }
      }
      uni.removeStorageSync(key)
      return { id, rev: '1', ok: true }
    } catch (e) {
      return { id, rev: '1', ok: false, error: true, message: String(e) }
    }
  }

  allDocs<T extends {} = Record<string, any>>(key?: string): DbDoc<T>[] {
    const items: DbDoc<T>[] = []
    try {
      const res = uni.getStorageInfoSync()
      const keys = res.keys || []

      for (const k of keys) {
        if (k.startsWith(this.prefix) && !k.includes('__chunk__')) {
          const doc = this.readWithChunksSync<T>(k)
          if (doc && (!key || doc._id.startsWith(key))) {
            items.push(doc)
          }
        }
      }
    } catch (e) {
      console.error('获取所有文档失败:', e)
    }
    return items
  }

  bulkDocs(docs: DbDoc[]): DbReturn[] {
    return docs.map(doc => this.put(doc))
  }
}
