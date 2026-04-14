import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useMemoryStore } from './memory'

describe('useMemoryStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    // 清除 localStorage
    localStorage.clear()
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
  })
})
