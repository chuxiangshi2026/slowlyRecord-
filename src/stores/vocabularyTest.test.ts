import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import {
  useVocabularyTestStore,
  WORD_BANK_LEVELS,
  READING_LEVELS,
  READING_PLANS
} from './vocabularyTest'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
  }
})()
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock })

describe('vocabularyTest constants', () => {
  describe('WORD_BANK_LEVELS', () => {
    it('应该包含 7 个难度等级', () => {
      expect(WORD_BANK_LEVELS).toHaveLength(7)
    })

    it('每个等级应有必要的字段', () => {
      WORD_BANK_LEVELS.forEach(level => {
        expect(level.id).toBeTruthy()
        expect(level.name).toBeTruthy()
        expect(level.minWords).toBeGreaterThan(0)
        expect(level.maxWords).toBeGreaterThan(level.minWords)
        expect(level.avgDifficulty).toBeGreaterThan(0)
        expect(level.description).toBeTruthy()
      })
    })

    it('等级应按难度递增排列', () => {
      for (let i = 1; i < WORD_BANK_LEVELS.length; i++) {
        expect(WORD_BANK_LEVELS[i].avgDifficulty).toBeGreaterThanOrEqual(
          WORD_BANK_LEVELS[i - 1].avgDifficulty
        )
      }
    })
  })

  describe('READING_LEVELS', () => {
    it('应该包含 7 个阅读水平', () => {
      expect(READING_LEVELS).toHaveLength(7)
    })

    it('每个阅读水平应有推荐书籍', () => {
      READING_LEVELS.forEach(level => {
        expect(level.recommendations.length).toBeGreaterThan(0)
      })
    })

    it('阅读水平应该按词汇量递增排列', () => {
      for (let i = 1; i < READING_LEVELS.length; i++) {
        expect(READING_LEVELS[i].minVocab).toBeGreaterThanOrEqual(
          READING_LEVELS[i - 1].maxVocab
        )
      }
    })
  })

  describe('READING_PLANS', () => {
    it('每个阅读水平都应有对应的阅读计划', () => {
      READING_LEVELS.forEach(level => {
        expect(READING_PLANS[level.name]).toBeDefined()
      })
    })

    it('每个阅读计划应有必要的字段', () => {
      Object.values(READING_PLANS).forEach(plan => {
        expect(plan.duration).toBeTruthy()
        expect(plan.dailyPages).toBeGreaterThan(0)
        expect(plan.booksPerMonth).toBeGreaterThan(0)
        expect(plan.suggestedTypes).toBeInstanceOf(Array)
        expect(plan.tips).toBeInstanceOf(Array)
      })
    })
  })
})

describe('useVocabularyTestStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  describe('初始状态', () => {
    it('应该有空的测试历史', () => {
      const store = useVocabularyTestStore()
      expect(store.testHistory).toEqual([])
    })

    it('hasTestHistory 应为 false', () => {
      const store = useVocabularyTestStore()
      expect(store.hasTestHistory).toBe(false)
    })

    it('latestTest 应为 null', () => {
      const store = useVocabularyTestStore()
      expect(store.latestTest).toBeNull()
    })

    it('averageVocabulary 应为 0', () => {
      const store = useVocabularyTestStore()
      expect(store.averageVocabulary).toBe(0)
    })

    it('vocabularyTrend 应为 null', () => {
      const store = useVocabularyTestStore()
      expect(store.vocabularyTrend).toBeNull()
    })
  })

  describe('calculateVocabulary', () => {
    it('空数据应返回 0', () => {
      const store = useVocabularyTestStore()
      expect(store.calculateVocabulary({}, {})).toBe(0)
    })

    it('单个等级全对应返回合理的词汇量', () => {
      const store = useVocabularyTestStore()
      const result = store.calculateVocabulary({ cet4: 40 }, { cet4: 40 })
      // 全对时，accuracy=1, levelMastery=min(1*1.2,1)=1
      // levelEstimate = 3500 + (4500-3500)*1 = 4500
      // 权重=3, result = round(4500*3/3) = 4500, max(4500, 1500) = 4500
      expect(result).toBe(4500)
    })

    it('单个等级全错应返回不低于 1500 的词汇量', () => {
      const store = useVocabularyTestStore()
      const result = store.calculateVocabulary({ cet4: 0 }, { cet4: 40 })
      // accuracy=0, levelMastery=0, levelEstimate=3500
      // result = round(3500*3/3) = 3500, max(3500, 1500) = 3500
      expect(result).toBe(3500)
    })

    it('单个等级部分正确应返回介于 min 和 max 之间的值', () => {
      const store = useVocabularyTestStore()
      const result = store.calculateVocabulary({ cet4: 20 }, { cet4: 40 })
      expect(result).toBeGreaterThanOrEqual(WORD_BANK_LEVELS[0].minWords)
      expect(result).toBeLessThanOrEqual(WORD_BANK_LEVELS[0].maxWords)
    })

    it('多个等级加权计算', () => {
      const store = useVocabularyTestStore()
      const result = store.calculateVocabulary({ cet4: 40, cet6: 30 }, { cet4: 40, cet6: 40 })
      expect(result).toBeGreaterThan(0)
    })

    it('未测试的等级不计入计算', () => {
      const store = useVocabularyTestStore()
      const result1 = store.calculateVocabulary({ cet4: 40 }, { cet4: 40 })
      const result2 = store.calculateVocabulary({ cet4: 40, gre: 0 }, { cet4: 40, gre: 0 })
      // gre total=0 不参与计算，结果应相同
      expect(result1).toBe(result2)
    })

    it('正确率超过80%时 levelMastery 应被限制为 1（1.2倍容错）', () => {
      const store = useVocabularyTestStore()
      // accuracy = 0.9, levelMastery = min(0.9*1.2, 1) = min(1.08, 1) = 1
      const result = store.calculateVocabulary({ cet4: 36 }, { cet4: 40 })
      // levelMastery = 1, levelEstimate = 4500
      expect(result).toBe(4500)
    })

    it('结果不应低于 1500', () => {
      const store = useVocabularyTestStore()
      const result = store.calculateVocabulary({ cet4: 0 }, { cet4: 40 })
      expect(result).toBeGreaterThanOrEqual(1500)
    })

    it('高级等级全对应返回较大的词汇量', () => {
      const store = useVocabularyTestStore()
      const result = store.calculateVocabulary({ gre: 40 }, { gre: 40 })
      // gre maxWords=15000
      expect(result).toBe(15000)
    })
  })

  describe('getReadingLevel', () => {
    it('0 词汇量应返回初级入门', () => {
      const store = useVocabularyTestStore()
      expect(store.getReadingLevel(0).name).toBe('初级入门')
    })

    it('1000 词汇量应返回初级入门', () => {
      const store = useVocabularyTestStore()
      expect(store.getReadingLevel(1000).name).toBe('初级入门')
    })

    it('2000 词汇量应返回初级进阶', () => {
      const store = useVocabularyTestStore()
      expect(store.getReadingLevel(2000).name).toBe('初级进阶')
    })

    it('3500 词汇量应返回中级水平', () => {
      const store = useVocabularyTestStore()
      expect(store.getReadingLevel(3500).name).toBe('中级水平')
    })

    it('5000 词汇量应返回中高级', () => {
      const store = useVocabularyTestStore()
      expect(store.getReadingLevel(5000).name).toBe('中高级')
    })

    it('7000 词汇量应返回高级水平', () => {
      const store = useVocabularyTestStore()
      expect(store.getReadingLevel(7000).name).toBe('高级水平')
    })

    it('10000 词汇量应返回精通水平', () => {
      const store = useVocabularyTestStore()
      expect(store.getReadingLevel(10000).name).toBe('精通水平')
    })

    it('15000 词汇量应返回专家水平', () => {
      const store = useVocabularyTestStore()
      expect(store.getReadingLevel(15000).name).toBe('专家水平')
    })

    it('99999 词汇量应返回专家水平（兜底）', () => {
      const store = useVocabularyTestStore()
      expect(store.getReadingLevel(99999).name).toBe('专家水平')
    })

    it('每个阅读水平应有推荐书籍', () => {
      const store = useVocabularyTestStore()
      for (let i = 0; i <= 20000; i += 1000) {
        const level = store.getReadingLevel(i)
        expect(level.recommendations.length).toBeGreaterThan(0)
      }
    })
  })

  describe('getReadingPlan', () => {
    it('应该返回对应水平的阅读计划', () => {
      const store = useVocabularyTestStore()
      const plan = store.getReadingPlan('中级水平')
      expect(plan.duration).toBe('6-12个月')
      expect(plan.dailyPages).toBe(15)
    })

    it('无效水平名称应返回默认中级水平计划', () => {
      const store = useVocabularyTestStore()
      const plan = store.getReadingPlan('不存在的水平')
      expect(plan.duration).toBe('6-12个月')
    })

    it('空字符串应返回默认中级水平计划', () => {
      const store = useVocabularyTestStore()
      const plan = store.getReadingPlan('')
      expect(plan).toEqual(READING_PLANS['中级水平'])
    })
  })

  describe('saveTestResult', () => {
    it('应该保存测试记录并添加到历史', () => {
      const store = useVocabularyTestStore()
      const record = store.saveTestResult(
        ['cet4'],
        { cet4: 30 },
        { cet4: 40 }
      )
      expect(record.estimatedVocabulary).toBeGreaterThan(0)
      expect(record.readingLevel).toBeTruthy()
      expect(store.testHistory).toHaveLength(1)
      expect(store.hasTestHistory).toBe(true)
    })

    it('新记录应添加到历史最前面', () => {
      const store = useVocabularyTestStore()
      store.saveTestResult(['cet4'], { cet4: 30 }, { cet4: 40 })
      store.saveTestResult(['cet6'], { cet6: 30 }, { cet6: 40 })
      expect(store.testHistory).toHaveLength(2)
      expect(store.testHistory[0].testedLevels).toContain('cet6')
    })

    it('历史记录最多保留 20 条', () => {
      const store = useVocabularyTestStore()
      for (let i = 0; i < 25; i++) {
        store.saveTestResult(['cet4'], { cet4: 30 }, { cet4: 40 })
      }
      expect(store.testHistory).toHaveLength(20)
    })

    it('保存时应写入 localStorage', () => {
      const store = useVocabularyTestStore()
      store.saveTestResult(['cet4'], { cet4: 30 }, { cet4: 40 })
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'vocabularyTest_history',
        expect.any(String)
      )
    })
  })

  describe('getters', () => {
    it('latestTest 应返回最新的测试记录', () => {
      const store = useVocabularyTestStore()
      store.saveTestResult(['cet4'], { cet4: 30 }, { cet4: 40 })
      store.saveTestResult(['gre'], { gre: 30 }, { gre: 40 })
      expect(store.latestTest).toBe(store.testHistory[0])
      expect(store.latestTest!.testedLevels).toContain('gre')
    })

    it('averageVocabulary 应计算平均值', () => {
      const store = useVocabularyTestStore()
      store.saveTestResult(['cet4'], { cet4: 40 }, { cet4: 40 })
      store.saveTestResult(['gre'], { gre: 40 }, { gre: 40 })
      const avg = store.averageVocabulary
      expect(avg).toBeGreaterThan(0)
    })

    it('vocabularyTrend 在只有一条记录时应为 null', () => {
      const store = useVocabularyTestStore()
      store.saveTestResult(['cet4'], { cet4: 30 }, { cet4: 40 })
      expect(store.vocabularyTrend).toBeNull()
    })

    it('vocabularyTrend 应正确计算趋势变化', () => {
      const store = useVocabularyTestStore()
      store.saveTestResult(['cet4'], { cet4: 10 }, { cet4: 40 })
      store.saveTestResult(['cet4'], { cet4: 40 }, { cet4: 40 })
      const trend = store.vocabularyTrend
      expect(trend).not.toBeNull()
      expect(trend!.change).toBeGreaterThan(0)
    })

    it('vocabularyTrend 词汇量下降时应返回负值', () => {
      const store = useVocabularyTestStore()
      store.saveTestResult(['gre'], { gre: 40 }, { gre: 40 })
      store.saveTestResult(['cet4'], { cet4: 10 }, { cet4: 40 })
      const trend = store.vocabularyTrend
      expect(trend).not.toBeNull()
      expect(trend!.change).toBeLessThan(0)
    })
  })

  describe('clearHistory', () => {
    it('应该清空测试历史', () => {
      const store = useVocabularyTestStore()
      store.saveTestResult(['cet4'], { cet4: 30 }, { cet4: 40 })
      store.clearHistory()
      expect(store.testHistory).toEqual([])
      expect(store.hasTestHistory).toBe(false)
    })

    it('应该从 localStorage 中删除数据', () => {
      const store = useVocabularyTestStore()
      store.saveTestResult(['cet4'], { cet4: 30 }, { cet4: 40 })
      store.clearHistory()
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('vocabularyTest_history')
    })
  })

  describe('loadHistory', () => {
    it('应该从 localStorage 加载历史记录', () => {
      const mockData = [{
        id: '1',
        date: '2024-01-01T00:00:00.000Z',
        testedLevels: ['cet4'],
        correctByLevel: { cet4: 30 },
        totalByLevel: { cet4: 40 },
        estimatedVocabulary: 4500,
        readingLevel: '中级水平',
        readingLevelDesc: '能读懂大部分日常英语和简化版名著'
      }]
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(mockData))

      const store = useVocabularyTestStore()
      store.loadHistory()

      expect(store.testHistory).toHaveLength(1)
      expect(store.testHistory[0].estimatedVocabulary).toBe(4500)
    })

    it('localStorage 数据损坏时应处理错误', () => {
      localStorageMock.getItem.mockReturnValueOnce('invalid json')
      const store = useVocabularyTestStore()
      // 不应抛出异常
      expect(() => store.loadHistory()).not.toThrow()
    })
  })
})
