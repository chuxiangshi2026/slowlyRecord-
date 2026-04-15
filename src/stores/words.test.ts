import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import type { Word } from '@/types/words'

// Mock localStorage
global.localStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn()
} as unknown as Storage

// Mock wordbank-manager
vi.mock('@/utils/wordbank-manager.ts', () => ({
  getAllWordBanks: vi.fn(),
  getCurrentWordBankId: vi.fn(),
  setCurrentWordBankId: vi.fn(),
  getWordBank: vi.fn(),
  saveWordBank: vi.fn(),
  createDefaultWordBank: vi.fn(() => ({
    id: 'default',
    name: '我的词库',
    words: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isDefault: true
  }))
}))

// Mock db-util
vi.mock('@/utils/db-util.ts', () => ({
  addAndUpdateDbWord: vi.fn(() => Promise.resolve()),
  cleanDbWord: vi.fn(),
  listDbWords: vi.fn(() => []),
  removeDbWordById: vi.fn(),
  updateDbWordList: vi.fn()
}))

// Mock user-set-db-util
vi.mock('@/utils/user-set-db-util.ts', () => ({
  addAndUpdateSetDb: vi.fn(),
  getSetDb: vi.fn(() => null)
}))

// Mock logger
vi.mock('@/utils/logger.ts', () => ({
  log: {
    i: vi.fn(),
    e: vi.fn(),
    w: vi.fn()
  }
}))

import {
  getWordBank,
  saveWordBank,
  type WordBank
} from '@/utils/wordbank-manager.ts'

// 动态导入 store 以避免在 mock 之前加载
describe('useWordsStore', () => {
  let useWordsStore: typeof import('./words').useWordsStore

  beforeEach(async () => {
    setActivePinia(createPinia())
    vi.resetAllMocks()
    // 动态导入 store
    useWordsStore = (await import('./words')).useWordsStore
  })

  describe('初始状态', () => {
    it('应该有正确的初始值', () => {
      const store = useWordsStore()

      expect(store.words).toEqual([])
      expect(store.currentWordBankId).toBe('')
      expect(store.currentWordBank).toBeNull()
      expect(store.count).toBe(0)
      expect(store.forgetCount).toBe(0)
      expect(store.rememberCount).toBe(0)
      expect(store.reviewCount).toBe(0)
    })
  })

  describe('单词列表操作', () => {
    it('应该能直接修改单词列表', () => {
      const store = useWordsStore()
      const mockWords: Word[] = [
        {
          _id: '1',
          text: 'hello',
          explains: '你好',
          isReview: true,
          ctime: new Date(),
          learnDate: new Date(),
          level: 1,
          explainedHidden: false,
          remember: false
        }
      ]

      // 直接修改响应式引用
      store.words = mockWords

      expect(store.words).toEqual(mockWords)
      expect(store.count).toBe(1)
    })
  })

  describe('词库切换', () => {
    it('应该成功切换词库', async () => {
      const store = useWordsStore()
      const mockBank: WordBank = {
        id: 'test-bank',
        name: '测试词库',
        words: [
          {
            _id: '1',
            text: 'test',
            explains: '测试',
            isReview: true,
            ctime: new Date(),
            learnDate: new Date(),
            level: 1,
            explainedHidden: false,
            remember: false
          }
        ],
        createdAt: Date.now(),
        updatedAt: Date.now()
      }

      vi.mocked(getWordBank).mockResolvedValue(mockBank)

      const result = await store.switchWordBank('test-bank')

      expect(result).toBe(true)
      expect(store.currentWordBankId).toBe('test-bank')
      expect(store.currentWordBank).toEqual(mockBank)
      expect(store.words.length).toBe(1)
    })

    it('切换词库失败时应该返回 false', async () => {
      const store = useWordsStore()

      vi.mocked(getWordBank).mockResolvedValue(null)

      const result = await store.switchWordBank('non-existent')

      expect(result).toBe(false)
    })
  })

  describe('添加和更新单词', () => {
    it('应该添加新单词到当前词库', async () => {
      const store = useWordsStore()
      const mockBank: WordBank = {
        id: 'default',
        name: '我的词库',
        words: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isDefault: true
      }

      store.currentWordBankId = 'default'
      store.currentWordBank = mockBank

      const newWord: Word = {
        _id: '1',
        text: 'hello',
        explains: '你好',
        isReview: true,
        ctime: new Date(),
        learnDate: new Date(),
        level: 1,
        explainedHidden: false,
        remember: false
      }

      vi.mocked(saveWordBank).mockResolvedValue(true)

      await store.addAndUpdateWord(newWord)

      expect(store.words.length).toBe(1)
      expect(store.words[0].text).toBe('hello')
      expect(mockBank.words.length).toBe(1)
      expect(saveWordBank).toHaveBeenCalledWith(mockBank)
    })

    it('应该更新已存在的单词', async () => {
      const store = useWordsStore()
      const existingWord: Word = {
        _id: '1',
        text: 'hello',
        explains: '你好',
        isReview: true,
        ctime: new Date(),
        learnDate: new Date(),
        level: 1,
        explainedHidden: false,
        remember: false
      }

      const mockBank: WordBank = {
        id: 'default',
        name: '我的词库',
        words: [{ ...existingWord }],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isDefault: true
      }

      store.currentWordBankId = 'default'
      store.currentWordBank = mockBank
      store.words = [{ ...existingWord }]

      const updatedWord: Word = {
        ...existingWord,
        explains: '你好啊',
        level: 2
      }

      vi.mocked(saveWordBank).mockResolvedValue(true)

      await store.addAndUpdateWord(updatedWord)

      expect(store.words[0].explains).toBe('你好啊')
      expect(store.words[0].level).toBe(2)
    })
  })

  describe('删除单词', () => {
    it('应该从词库中删除单词', async () => {
      const store = useWordsStore()
      const wordToDelete: Word = {
        _id: '1',
        text: 'hello',
        explains: '你好',
        isReview: true,
        ctime: new Date(),
        learnDate: new Date(),
        level: 1,
        explainedHidden: false,
        remember: false
      }

      const mockBank: WordBank = {
        id: 'default',
        name: '我的词库',
        words: [wordToDelete],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isDefault: true
      }

      store.currentWordBankId = 'default'
      store.currentWordBank = mockBank
      store.words = [wordToDelete]

      vi.mocked(saveWordBank).mockResolvedValue(true)

      await store.deleteWord(0)

      expect(store.words.length).toBe(0)
      expect(mockBank.words.length).toBe(0)
    })

    it('删除不存在的索引应该不报错', async () => {
      const store = useWordsStore()
      store.words = []

      await expect(store.deleteWord(0)).resolves.not.toThrow()
      expect(store.words.length).toBe(0)
    })
  })

  describe('计算属性', () => {
    it('应该正确计算待复习单词数', () => {
      const store = useWordsStore()
      store.words = [
        { _id: '1', text: 'a', explains: 'a', isReview: true, ctime: new Date(), learnDate: new Date(), level: 1, explainedHidden: false, remember: false },
        { _id: '2', text: 'b', explains: 'b', isReview: false, ctime: new Date(), learnDate: new Date(), level: 1, explainedHidden: false, remember: false },
        { _id: '3', text: 'c', explains: 'c', isReview: true, ctime: new Date(), learnDate: new Date(), level: 1, explainedHidden: false, remember: false }
      ]

      expect(store.forgetCount).toBe(2)
    })

    it('应该正确计算已记住单词数', () => {
      const store = useWordsStore()
      store.words = [
        { _id: '1', text: 'a', explains: 'a', isReview: false, ctime: new Date(), learnDate: new Date(), level: 12, explainedHidden: false, remember: true },
        { _id: '2', text: 'b', explains: 'b', isReview: false, ctime: new Date(), learnDate: new Date(), level: 1, explainedHidden: false, remember: false },
        { _id: '3', text: 'c', explains: 'c', isReview: false, ctime: new Date(), learnDate: new Date(), level: 12, explainedHidden: false, remember: true }
      ]

      expect(store.rememberCount).toBe(2)
    })
  })

  describe('findWord', () => {
    it('应该能找到存在的单词', () => {
      const store = useWordsStore()
      const targetWord: Word = {
        _id: '1',
        text: 'hello',
        explains: '你好',
        isReview: true,
        ctime: new Date(),
        learnDate: new Date(),
        level: 1,
        explainedHidden: false,
        remember: false
      }

      store.words = [targetWord]

      const found = store.findWord('hello')

      expect(found).toBeDefined()
      expect(found?.text).toBe('hello')
    })

    it('应该返回 undefined 当单词不存在', () => {
      const store = useWordsStore()
      store.words = []

      const found = store.findWord('nonexistent')

      expect(found).toBeUndefined()
    })
  })
})
