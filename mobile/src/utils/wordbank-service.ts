/**
 * 词库服务 - 移动端适配版
 * 使用 uni.request 从远程加载词库数据
 */

export type WordBankType =
  | 'cet4'
  | 'cet6'
  | 'kaogong'
  | 'kaoyan'
  | 'ielts'
  | 'toefl'
  | 'gre'
  | 'gmat'
  | 'bec'
  | 'level4'
  | 'level8'
  | 'zsb'
  | 'sat'

export interface WordBankInfo {
  id: WordBankType
  name: string
  description: string
  wordCount: number
  icon?: string
}

export interface Word {
  word: string
  meaning: string
  phonetic?: string
  example?: string
}

export interface LoadStrategy {
  priority: 'local' | 'online'
  useCache: boolean
  timeout: number
}

export const DEFAULT_STRATEGY: LoadStrategy = {
  priority: 'local',
  useCache: true,
  timeout: 5000,
}

export const WORDBANK_LIST: WordBankInfo[] = [
  { id: 'cet4', name: '四级词汇', description: '大学英语四级核心词汇', wordCount: 0 },
  { id: 'cet6', name: '六级词汇', description: '大学英语六级核心词汇', wordCount: 0 },
  { id: 'bec', name: '商务英语', description: '商务英语考试核心词汇', wordCount: 0 },
  { id: 'gmat', name: 'GMAT词汇', description: 'GMAT考试核心词汇', wordCount: 0 },
  { id: 'gre', name: 'GRE词汇', description: 'GRE考试核心词汇', wordCount: 0 },
  { id: 'ielts', name: '雅思词汇', description: '雅思考试核心词汇', wordCount: 0 },
  { id: 'kaogong', name: '考公词汇', description: '公务员考试英语词汇', wordCount: 0 },
  { id: 'kaoyan', name: '考研词汇', description: '研究生入学考试核心词汇', wordCount: 0 },
  { id: 'level4', name: '专业四级', description: '英语专业四级核心词汇', wordCount: 0 },
  { id: 'level8', name: '专业八级', description: '英语专业八级核心词汇', wordCount: 0 },
  { id: 'sat', name: 'SAT词汇', description: 'SAT考试核心词汇', wordCount: 0 },
  { id: 'toefl', name: '托福词汇', description: '托福考试核心词汇', wordCount: 0 },
  { id: 'zsb', name: '专升本词汇', description: '专升本英语考试核心词汇', wordCount: 0 },
]

const CACHE_KEY_PREFIX = 'wordbank_cache_v2_'
const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000

interface CacheData {
  timestamp: number
  words: Word[]
}

/**
 * 从缓存获取词库
 */
function getFromCache(type: WordBankType): Word[] | null {
  try {
    const cacheStr = uni.getStorageSync(CACHE_KEY_PREFIX + type)
    if (!cacheStr) return null

    const cache: CacheData = JSON.parse(cacheStr)
    if (Date.now() - cache.timestamp > CACHE_EXPIRY) {
      uni.removeStorageSync(CACHE_KEY_PREFIX + type)
      return null
    }
    return cache.words
  } catch {
    return null
  }
}

/**
 * 保存到缓存
 */
function saveToCache(type: WordBankType, words: Word[]): void {
  try {
    const cache: CacheData = {
      timestamp: Date.now(),
      words,
    }
    uni.setStorageSync(CACHE_KEY_PREFIX + type, JSON.stringify(cache))
  } catch (e) {
    console.error('缓存词库失败:', e)
  }
}

/**
 * 从远程加载词库
 * 使用本地 public/wordbanks 目录或远程服务器
 */
export async function loadWordBank(
  type: WordBankType,
  strategy: LoadStrategy = DEFAULT_STRATEGY
): Promise<Word[]> {
  // 先检查缓存
  if (strategy.useCache) {
    const cached = getFromCache(type)
    if (cached && cached.length > 0) {
      return cached
    }
  }

  // 从远程加载
  return new Promise((resolve, reject) => {
    uni.request({
      url: `/wordbanks/${type}.json`,
      method: 'GET',
      timeout: strategy.timeout,
      success: (res) => {
        if (res.statusCode === 200 && res.data) {
          const words = (Array.isArray(res.data) ? res.data : []) as Word[]
          if (strategy.useCache) {
            saveToCache(type, words)
          }
          resolve(words)
        } else {
          reject(new Error(`加载词库失败: ${res.statusCode}`))
        }
      },
      fail: (err) => {
        reject(new Error(`加载词库失败: ${err.errMsg || '未知错误'}`))
      },
    })
  })
}

/**
 * 获取词库信息（包含实际单词数量）
 */
export async function getWordBankInfo(type: WordBankType): Promise<WordBankInfo | null> {
  const info = WORDBANK_LIST.find((w) => w.id === type)
  if (!info) return null

  try {
    const words = await loadWordBank(type, { ...DEFAULT_STRATEGY, useCache: true })
    return { ...info, wordCount: words.length }
  } catch {
    return info
  }
}

/**
 * 获取所有词库信息
 */
export async function getAllWordBankInfo(): Promise<WordBankInfo[]> {
  const results: WordBankInfo[] = []
  for (const info of WORDBANK_LIST) {
    try {
      const words = await loadWordBank(info.id, { ...DEFAULT_STRATEGY, useCache: true })
      results.push({ ...info, wordCount: words.length })
    } catch {
      results.push(info)
    }
  }
  return results
}

/**
 * 检查词库是否已缓存
 */
export function isWordBankCached(type: WordBankType): boolean {
  try {
    const cacheStr = uni.getStorageSync(CACHE_KEY_PREFIX + type)
    if (!cacheStr) return false
    const cache: CacheData = JSON.parse(cacheStr)
    return Date.now() - cache.timestamp < CACHE_EXPIRY && cache.words.length > 0
  } catch {
    return false
  }
}

/**
 * 下载词库（移动端从远程加载并缓存）
 */
export async function downloadWordBank(type: WordBankType): Promise<Word[]> {
  return loadWordBank(type, { ...DEFAULT_STRATEGY, useCache: true })
}

/**
 * 清除词库缓存
 */
export function clearWordBankCache(type?: WordBankType): void {
  if (type) {
    uni.removeStorageSync(CACHE_KEY_PREFIX + type)
  } else {
    const keys = uni.getStorageInfoSync().keys || []
    for (const key of keys) {
      if (key.startsWith(CACHE_KEY_PREFIX)) {
        uni.removeStorageSync(key)
      }
    }
  }
}

/**
 * 批量导入单词到个人词库
 */
export async function importWordsFromBank(
  type: WordBankType,
  count: number = 50
): Promise<Word[]> {
  const words = await loadWordBank(type)
  return words.slice(0, count)
}
