import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useMemoryStore } from './memory'

// 在 node 环境下提供 localStorage mock
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
    get length() { return Object.keys(store).length },
    key: (index: number) => Object.keys(store)[index] ?? null,
  }
})()

vi.stubGlobal('localStorage', localStorageMock)

describe('useMemoryStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorageMock.clear()
  })

  describe('初始状态', () => {
    it('应该有正确的初始值', () => {
      const store = useMemoryStore()

      expect(store.testHistory).toEqual([])
      expect(store.numberStats).toEqual({
        correct: 0,
        wrong: 0,
        maxDifficulty: 4
      })
      expect(store.wordStats).toEqual({
        total: 0,
        perfect: 0,
        totalCorrect: 0
      })
      expect(store.patternStats).toEqual({
        correct: 0,
        wrong: 0
      })
    })

    it('totalTests 应该返回正确的测试总数', () => {
      const store = useMemoryStore()
      expect(store.totalTests).toBe(0)

      store.addHistory({
        mode: 'number',
        modeText: '数字记忆',
        success: true,
        result: '通过',
        time: '10s'
      })

      expect(store.totalTests).toBe(1)
    })

    it('overallAccuracy 应该在无测试时返回 0', () => {
      const store = useMemoryStore()
      expect(store.overallAccuracy).toBe(0)
    })
  })

  describe('updateNumberStats', () => {
    it('正确回答应该增加 correct 计数', () => {
      const store = useMemoryStore()
      store.updateNumberStats(true)

      expect(store.numberStats.correct).toBe(1)
      expect(store.numberStats.wrong).toBe(0)
    })

    it('错误回答应该增加 wrong 计数', () => {
      const store = useMemoryStore()
      store.updateNumberStats(false)

      expect(store.numberStats.correct).toBe(0)
      expect(store.numberStats.wrong).toBe(1)
    })

    it('正确回答且难度更高时应该更新 maxDifficulty', () => {
      const store = useMemoryStore()
      store.updateNumberStats(true, 6)

      expect(store.numberStats.maxDifficulty).toBe(6)
    })

    it('正确回答但难度较低时不应更新 maxDifficulty', () => {
      const store = useMemoryStore()
      store.updateNumberStats(true, 10) // 先设置到 10
      store.updateNumberStats(true, 5)  // 然后尝试设置更低的

      expect(store.numberStats.maxDifficulty).toBe(10)
    })

    it('未提供难度时不应改变 maxDifficulty', () => {
      const store = useMemoryStore()
      store.updateNumberStats(true)

      expect(store.numberStats.maxDifficulty).toBe(4) // 保持默认值
    })

    it('错误回答时不应更新 maxDifficulty', () => {
      const store = useMemoryStore()
      store.updateNumberStats(false, 10)

      expect(store.numberStats.maxDifficulty).toBe(4) // 保持默认值
    })

    it('多次调用应该累加计数', () => {
      const store = useMemoryStore()
      store.updateNumberStats(true)
      store.updateNumberStats(true)
      store.updateNumberStats(false)
      store.updateNumberStats(true)

      expect(store.numberStats.correct).toBe(3)
      expect(store.numberStats.wrong).toBe(1)
    })

    it('maxDifficulty 应该追踪所有历史最高难度', () => {
      const store = useMemoryStore()
      store.updateNumberStats(true, 5)
      store.updateNumberStats(true, 8)
      store.updateNumberStats(true, 3)
      store.updateNumberStats(true, 12)

      expect(store.numberStats.maxDifficulty).toBe(12)
    })

    it('难度为 0 时正确回答不应更新 maxDifficulty', () => {
      const store = useMemoryStore()
      store.updateNumberStats(true, 0)

      expect(store.numberStats.maxDifficulty).toBe(4) // 0 < 4，不更新
    })
  })

  describe('updateWordStats', () => {
    it('应该增加 total 计数', () => {
      const store = useMemoryStore()
      store.updateWordStats(5, 3)

      expect(store.wordStats.total).toBe(1)
    })

    it('应该累加 totalCorrect', () => {
      const store = useMemoryStore()
      store.updateWordStats(5, 3)
      store.updateWordStats(5, 4)

      expect(store.wordStats.totalCorrect).toBe(7)
    })

    it('全部正确时应该增加 perfect 计数', () => {
      const store = useMemoryStore()
      store.updateWordStats(5, 5)

      expect(store.wordStats.perfect).toBe(1)
    })

    it('未全部正确时不应增加 perfect 计数', () => {
      const store = useMemoryStore()
      store.updateWordStats(5, 3)

      expect(store.wordStats.perfect).toBe(0)
    })

    it('0 个正确答案时不应增加 perfect 计数', () => {
      const store = useMemoryStore()
      store.updateWordStats(5, 0)

      expect(store.wordStats.perfect).toBe(0)
      expect(store.wordStats.totalCorrect).toBe(0)
    })

    it('多次调用应该累加 total 和 totalCorrect', () => {
      const store = useMemoryStore()
      store.updateWordStats(10, 8)
      store.updateWordStats(10, 6)
      store.updateWordStats(10, 10)

      expect(store.wordStats.total).toBe(3)
      expect(store.wordStats.totalCorrect).toBe(24)
      expect(store.wordStats.perfect).toBe(1)
    })
  })

  describe('updatePatternStats', () => {
    it('正确回答应该增加 correct 计数', () => {
      const store = useMemoryStore()
      store.updatePatternStats(true)

      expect(store.patternStats.correct).toBe(1)
      expect(store.patternStats.wrong).toBe(0)
    })

    it('错误回答应该增加 wrong 计数', () => {
      const store = useMemoryStore()
      store.updatePatternStats(false)

      expect(store.patternStats.correct).toBe(0)
      expect(store.patternStats.wrong).toBe(1)
    })

    it('多次调用应该累加计数', () => {
      const store = useMemoryStore()
      store.updatePatternStats(true)
      store.updatePatternStats(false)
      store.updatePatternStats(true)
      store.updatePatternStats(true)

      expect(store.patternStats.correct).toBe(3)
      expect(store.patternStats.wrong).toBe(1)
    })
  })

  describe('addHistory', () => {
    it('应该添加记录到历史列表开头', () => {
      const store = useMemoryStore()
      const record1 = {
        mode: 'number' as const,
        modeText: '数字记忆',
        success: true,
        result: '通过',
        time: '10s'
      }
      const record2 = {
        mode: 'word' as const,
        modeText: '单词记忆',
        success: false,
        result: '失败',
        time: '15s'
      }

      store.addHistory(record1)
      store.addHistory(record2)

      expect(store.testHistory[0]).toEqual(record2)
      expect(store.testHistory[1]).toEqual(record1)
    })

    it('历史记录超过 50 条时应该只保留最近的 50 条', () => {
      const store = useMemoryStore()

      // 添加 55 条记录
      for (let i = 0; i < 55; i++) {
        store.addHistory({
          mode: 'number',
          modeText: '数字记忆',
          success: true,
          result: '通过',
          time: `${i}s`
        })
      }

      expect(store.testHistory.length).toBe(50)
      // 最新的记录应该是第 54 条（从 0 开始）
      expect(store.testHistory[0].time).toBe('54s')
    })

    it('历史记录恰好 50 条时不应该丢失', () => {
      const store = useMemoryStore()

      for (let i = 0; i < 50; i++) {
        store.addHistory({
          mode: 'number',
          modeText: '数字记忆',
          success: true,
          result: '通过',
          time: `${i}s`
        })
      }

      expect(store.testHistory.length).toBe(50)
      expect(store.testHistory[0].time).toBe('49s')
      expect(store.testHistory[49].time).toBe('0s')
    })

    it('应该支持不同 mode 的记录', () => {
      const store = useMemoryStore()

      store.addHistory({ mode: 'number', modeText: '数字记忆', success: true, result: '通过', time: '10s' })
      store.addHistory({ mode: 'word', modeText: '单词记忆', success: false, result: '失败', time: '15s' })
      store.addHistory({ mode: 'pattern', modeText: '模式记忆', success: true, result: '通过', time: '8s' })

      expect(store.testHistory).toHaveLength(3)
      expect(store.testHistory[0].mode).toBe('pattern')
      expect(store.testHistory[1].mode).toBe('word')
      expect(store.testHistory[2].mode).toBe('number')
    })
  })

  describe('overallAccuracy', () => {
    it('应该正确计算总体准确率', () => {
      const store = useMemoryStore()
      // 数字：3 正确，1 错误
      store.updateNumberStats(true)
      store.updateNumberStats(true)
      store.updateNumberStats(true)
      store.updateNumberStats(false)
      // 模式：2 正确，2 错误
      store.updatePatternStats(true)
      store.updatePatternStats(true)
      store.updatePatternStats(false)
      store.updatePatternStats(false)
      // 单词：1 次完美，5 题中答对 4
      store.updateWordStats(5, 5) // perfect

      // 总正确：3(数字) + 2(模式) + 1(单词完美) = 6
      // 总测试：4(数字) + 4(模式) + 1(单词) = 9
      // 准确率：6/9 = 66.67% ≈ 67%
      expect(store.overallAccuracy).toBe(67)
    })

    it('只有数字测试时应正确计算准确率', () => {
      const store = useMemoryStore()
      store.updateNumberStats(true)
      store.updateNumberStats(true)
      store.updateNumberStats(false)

      // 2/3 = 66.67% ≈ 67%
      expect(store.overallAccuracy).toBe(67)
    })

    it('只有模式测试时应正确计算准确率', () => {
      const store = useMemoryStore()
      store.updatePatternStats(true)
      store.updatePatternStats(true)
      store.updatePatternStats(true)
      store.updatePatternStats(false)

      // 3/4 = 75%
      expect(store.overallAccuracy).toBe(75)
    })

    it('100% 准确率', () => {
      const store = useMemoryStore()
      store.updateNumberStats(true)
      store.updatePatternStats(true)

      expect(store.overallAccuracy).toBe(100)
    })

    it('0% 准确率', () => {
      const store = useMemoryStore()
      store.updateNumberStats(false)
      store.updatePatternStats(false)

      expect(store.overallAccuracy).toBe(0)
    })

    it('非完美单词测试不计入 correct 但计入 total', () => {
      const store = useMemoryStore()
      store.updateWordStats(5, 3) // 5个词答对3个，不是完美

      // 总正确: 0 + 0 + 0(非完美) = 0
      // 总测试: 0 + 0 + 1(单词) = 1
      // 准确率: 0%
      expect(store.overallAccuracy).toBe(0)
    })
  })

  describe('clearAllData', () => {
    it('应该清除所有数据', () => {
      const store = useMemoryStore()
      store.updateNumberStats(true)
      store.updateWordStats(5, 5)
      store.addHistory({
        mode: 'number',
        modeText: '数字记忆',
        success: true,
        result: '通过',
        time: '10s'
      })

      store.clearAllData()

      expect(store.testHistory).toEqual([])
      expect(store.numberStats).toEqual({
        correct: 0,
        wrong: 0,
        maxDifficulty: 4
      })
      expect(store.wordStats).toEqual({
        total: 0,
        perfect: 0,
        totalCorrect: 0
      })
      expect(store.patternStats).toEqual({
        correct: 0,
        wrong: 0
      })
    })

    it('应该清除 localStorage 中的数据', () => {
      const store = useMemoryStore()
      store.updateNumberStats(true)

      store.clearAllData()

      expect(localStorage.getItem('memoryTest_stats')).toBeNull()
      expect(localStorage.getItem('memoryTest_history')).toBeNull()
    })

    it('清除后可以重新添加数据', () => {
      const store = useMemoryStore()
      store.updateNumberStats(true)
      store.clearAllData()
      store.updateNumberStats(true)

      expect(store.numberStats.correct).toBe(1)
      expect(store.totalTests).toBe(0)
    })
  })

  describe('localStorage 持久化', () => {
    it('应该保存统计数据到 localStorage', () => {
      const store = useMemoryStore()
      store.updateNumberStats(true)

      const savedStats = localStorage.getItem('memoryTest_stats')
      expect(savedStats).not.toBeNull()

      const parsed = JSON.parse(savedStats!)
      expect(parsed.number.correct).toBe(1)
    })

    it('应该保存历史记录到 localStorage', () => {
      const store = useMemoryStore()
      const record = {
        mode: 'number' as const,
        modeText: '数字记忆',
        success: true,
        result: '通过',
        time: '10s'
      }
      store.addHistory(record)

      const savedHistory = localStorage.getItem('memoryTest_history')
      expect(savedHistory).not.toBeNull()

      const parsed = JSON.parse(savedHistory!)
      expect(parsed).toHaveLength(1)
      expect(parsed[0].mode).toBe('number')
    })

    it('应该保存所有类型的统计数据', () => {
      const store = useMemoryStore()
      store.updateNumberStats(true, 8)
      store.updateWordStats(10, 10)
      store.updatePatternStats(true)

      const savedStats = localStorage.getItem('memoryTest_stats')
      const parsed = JSON.parse(savedStats!)

      expect(parsed.number.correct).toBe(1)
      expect(parsed.number.maxDifficulty).toBe(8)
      expect(parsed.word.total).toBe(1)
      expect(parsed.word.perfect).toBe(1)
      expect(parsed.pattern.correct).toBe(1)
    })

    it('更新错误统计时也应该保存', () => {
      const store = useMemoryStore()
      store.updateNumberStats(false)

      const savedStats = localStorage.getItem('memoryTest_stats')
      const parsed = JSON.parse(savedStats!)

      expect(parsed.number.wrong).toBe(1)
    })

    it('应该能从 localStorage 恢复数据', () => {
      const store1 = useMemoryStore()
      store1.updateNumberStats(true, 7)
      store1.addHistory({
        mode: 'number',
        modeText: '数字记忆',
        success: true,
        result: '通过',
        time: '10s'
      })

      // 创建新的 store 实例，应该从 localStorage 恢复数据
      const store2 = useMemoryStore()

      expect(store2.numberStats.correct).toBe(1)
      expect(store2.numberStats.maxDifficulty).toBe(7)
      expect(store2.testHistory).toHaveLength(1)
      expect(store2.testHistory[0].mode).toBe('number')
    })
  })

  describe('loadStats 和 loadHistory', () => {
    it('loadStats 应该合并部分存储的数据', () => {
      localStorage.setItem('memoryTest_stats', JSON.stringify({
        number: { correct: 5, wrong: 2, maxDifficulty: 8 }
        // 故意不保存 word 和 pattern
      }))

      const store = useMemoryStore()

      expect(store.numberStats.correct).toBe(5)
      expect(store.numberStats.wrong).toBe(2)
      expect(store.numberStats.maxDifficulty).toBe(8)
      expect(store.wordStats.total).toBe(0) // 默认值
      expect(store.patternStats.correct).toBe(0) // 默认值
    })

    it('localStorage 数据损坏时不应崩溃', () => {
      localStorage.setItem('memoryTest_stats', 'invalid json')
      localStorage.setItem('memoryTest_history', 'invalid json')

      // 不应抛出错误
      const store = useMemoryStore()

      expect(store.numberStats.correct).toBe(0)
      expect(store.testHistory).toEqual([])
    })

    it('localStorage 为空时应使用默认值', () => {
      const store = useMemoryStore()

      expect(store.numberStats).toEqual({ correct: 0, wrong: 0, maxDifficulty: 4 })
      expect(store.wordStats).toEqual({ total: 0, perfect: 0, totalCorrect: 0 })
      expect(store.patternStats).toEqual({ correct: 0, wrong: 0 })
      expect(store.testHistory).toEqual([])
    })
  })
})
