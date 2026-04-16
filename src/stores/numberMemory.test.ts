import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useNumberMemoryStore } from './numberMemory'
import type { NumberImageAssociation } from '@/types/number-memory'

// Mock number-memory-db
vi.mock('@/utils/number-memory-db', () => ({
  getAllAssociations: vi.fn(() => []),
  getAssociationByNumber: vi.fn(() => null),
  saveAssociation: vi.fn(() => Promise.resolve({ ok: true })),
  removeAssociation: vi.fn(() => Promise.resolve({ ok: true })),
  saveTrainingResult: vi.fn(() => Promise.resolve({ ok: true })),
  getAllTrainingResults: vi.fn(() => []),
}))

// Mock number-memory-preset
vi.mock('@/utils/number-memory-preset', () => ({
  getRecommendedImages: vi.fn((num: number) => {
    if (num < 0 || num > 99) return []
    return [{ name: 'test', url: 'emoji', description: 'test' }]
  }),
  getNumberKeyword: vi.fn((num: number) => {
    if (num < 0 || num > 99) return ''
    return 'test-keyword'
  }),
  getRandomNumbers: vi.fn((count: number) => {
    return Array.from({ length: Math.min(count, 100) }, (_, i) => i)
  }),
  shuffleArray: vi.fn(<T>(array: T[]): T[] => {
    // 返回原数组的浅拷贝，但稍微打乱顺序以便测试
    return [...array]
  }),
}))

// Mock logger
vi.mock('@/utils/logger', () => ({
  log: { i: vi.fn(), w: vi.fn(), e: vi.fn() }
}))

import { getAllAssociations, saveAssociation, removeAssociation, saveTrainingResult, getAllTrainingResults } from '@/utils/number-memory-db'
import { getRecommendedImages, getNumberKeyword, getRandomNumbers, shuffleArray } from '@/utils/number-memory-preset'

const mockAssociations: NumberImageAssociation[] = [
  { number: '0', imageUrl: 'img0', source: 'preset', description: '零' },
  { number: '1', imageUrl: 'img1', source: 'preset', description: '一' },
  { number: '2', imageUrl: 'img2', source: 'upload', description: '二' },
  { number: '3', imageUrl: 'img3', source: 'preset', description: '三' },
  { number: '4', imageUrl: 'img4', source: 'upload', description: '四' },
]

describe('useNumberMemoryStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetAllMocks()
    vi.mocked(getAllAssociations).mockReturnValue([])
  })

  describe('初始状态', () => {
    it('应该有空的关联列表', () => {
      const store = useNumberMemoryStore()
      expect(store.associations).toEqual([])
    })

    it('isLoading 应为 false', () => {
      const store = useNumberMemoryStore()
      // loadAssociations 执行后应回到 false
      expect(store.isLoading).toBe(false)
    })

    it('associationCount 应为 0', () => {
      const store = useNumberMemoryStore()
      expect(store.associationCount).toBe(0)
    })

    it('hasAssociations 应为 false', () => {
      const store = useNumberMemoryStore()
      expect(store.hasAssociations).toBe(false)
    })
  })

  describe('loadAssociations', () => {
    it('应该从数据库加载关联数据', () => {
      vi.mocked(getAllAssociations).mockReturnValue(mockAssociations)
      const store = useNumberMemoryStore()
      store.loadAssociations()
      expect(store.associations).toEqual(mockAssociations)
      expect(store.associationCount).toBe(5)
      expect(store.hasAssociations).toBe(true)
    })

    it('加载空数据时应保持空列表', () => {
      vi.mocked(getAllAssociations).mockReturnValue([])
      const store = useNumberMemoryStore()
      store.loadAssociations()
      expect(store.associations).toEqual([])
    })
  })

  describe('getters', () => {
    it('getAssociation 应返回匹配的关联', () => {
      vi.mocked(getAllAssociations).mockReturnValue(mockAssociations)
      const store = useNumberMemoryStore()
      store.loadAssociations()
      expect(store.getAssociation('0')).toEqual(mockAssociations[0])
    })

    it('getAssociation 不存在的数字应返回 undefined', () => {
      vi.mocked(getAllAssociations).mockReturnValue(mockAssociations)
      const store = useNumberMemoryStore()
      store.loadAssociations()
      expect(store.getAssociation('99')).toBeUndefined()
    })

    it('hasAssociation 应正确判断是否存在关联', () => {
      vi.mocked(getAllAssociations).mockReturnValue(mockAssociations)
      const store = useNumberMemoryStore()
      store.loadAssociations()
      expect(store.hasAssociation('0')).toBe(true)
      expect(store.hasAssociation('99')).toBe(false)
    })
  })

  describe('addAssociation', () => {
    it('应该调用 saveAssociation 并重新加载', async () => {
      const store = useNumberMemoryStore()
      const result = await store.addAssociation('5', 'img5', 'preset', '五')
      expect(saveAssociation).toHaveBeenCalled()
      expect(result.ok).toBe(true)
    })

    it('保存失败时不应重新加载', async () => {
      vi.mocked(saveAssociation).mockResolvedValueOnce({ ok: false } as any)
      const store = useNumberMemoryStore()
      const result = await store.addAssociation('5', 'img5', 'preset')
      expect(result.ok).toBe(false)
    })
  })

  describe('deleteAssociation', () => {
    it('应该调用 removeAssociation 并重新加载', async () => {
      const store = useNumberMemoryStore()
      const result = await store.deleteAssociation('0')
      expect(removeAssociation).toHaveBeenCalledWith('0')
      expect(result.ok).toBe(true)
    })

    it('删除失败时不应重新加载', async () => {
      vi.mocked(removeAssociation).mockResolvedValueOnce({ ok: false } as any)
      const store = useNumberMemoryStore()
      const result = await store.deleteAssociation('0')
      expect(result.ok).toBe(false)
    })
  })

  describe('getRecommendations', () => {
    it('应该调用 getRecommendedImages 并传递数字', () => {
      const store = useNumberMemoryStore()
      store.getRecommendations('5')
      expect(getRecommendedImages).toHaveBeenCalledWith(5)
    })

    it('非数字字符串应传递 NaN', () => {
      const store = useNumberMemoryStore()
      store.getRecommendations('abc')
      expect(getRecommendedImages).toHaveBeenCalledWith(NaN)
    })
  })

  describe('getKeyword', () => {
    it('应该调用 getNumberKeyword 并传递数字', () => {
      const store = useNumberMemoryStore()
      store.getKeyword('7')
      expect(getNumberKeyword).toHaveBeenCalledWith(7)
    })
  })

  describe('generateNumberToImageQuiz', () => {
    it('没有关联数据时应返回空数组', () => {
      vi.mocked(getAllAssociations).mockReturnValue([])
      const store = useNumberMemoryStore()
      expect(store.generateNumberToImageQuiz()).toEqual([])
    })

    it('应该生成正确数量的题目', () => {
      vi.mocked(getAllAssociations).mockReturnValue(mockAssociations)
      // shuffleArray mock 返回原顺序
      const store = useNumberMemoryStore()
      store.loadAssociations()
      const quiz = store.generateNumberToImageQuiz(3)
      expect(quiz).toHaveLength(3)
    })

    it('请求数量超过关联数时应返回全部关联数量的题目', () => {
      vi.mocked(getAllAssociations).mockReturnValue(mockAssociations)
      const store = useNumberMemoryStore()
      store.loadAssociations()
      const quiz = store.generateNumberToImageQuiz(10)
      expect(quiz).toHaveLength(5) // 只有 5 个关联
    })

    it('每道题应包含 4 个选项', () => {
      vi.mocked(getAllAssociations).mockReturnValue(mockAssociations)
      const store = useNumberMemoryStore()
      store.loadAssociations()
      const quiz = store.generateNumberToImageQuiz(3)
      quiz.forEach(question => {
        expect(question.options).toHaveLength(4)
      })
    })

    it('正确答案应在选项中', () => {
      vi.mocked(getAllAssociations).mockReturnValue(mockAssociations)
      const store = useNumberMemoryStore()
      store.loadAssociations()
      const quiz = store.generateNumberToImageQuiz(3)
      quiz.forEach(question => {
        expect(question.options).toContain(question.correctAnswer)
      })
    })

    it('题目应包含 question 和 correctAnswer 字段', () => {
      vi.mocked(getAllAssociations).mockReturnValue(mockAssociations)
      const store = useNumberMemoryStore()
      store.loadAssociations()
      const quiz = store.generateNumberToImageQuiz(1)
      expect(quiz[0].question).toBeDefined()
      expect(quiz[0].correctAnswer).toBeDefined()
    })
  })

  describe('generateImageToNumberQuiz', () => {
    it('没有关联数据时应返回空数组', () => {
      vi.mocked(getAllAssociations).mockReturnValue([])
      const store = useNumberMemoryStore()
      expect(store.generateImageToNumberQuiz()).toEqual([])
    })

    it('应该生成正确数量的题目', () => {
      vi.mocked(getAllAssociations).mockReturnValue(mockAssociations)
      const store = useNumberMemoryStore()
      store.loadAssociations()
      const quiz = store.generateImageToNumberQuiz(3)
      expect(quiz).toHaveLength(3)
    })

    it('每道题应包含 4 个选项', () => {
      vi.mocked(getAllAssociations).mockReturnValue(mockAssociations)
      const store = useNumberMemoryStore()
      store.loadAssociations()
      const quiz = store.generateImageToNumberQuiz(3)
      quiz.forEach(question => {
        expect(question.options).toHaveLength(4)
      })
    })

    it('正确答案应在选项中', () => {
      vi.mocked(getAllAssociations).mockReturnValue(mockAssociations)
      const store = useNumberMemoryStore()
      store.loadAssociations()
      const quiz = store.generateImageToNumberQuiz(3)
      quiz.forEach(question => {
        expect(question.options).toContain(question.correctAnswer)
      })
    })
  })

  describe('saveResult', () => {
    it('应该调用 saveTrainingResult', async () => {
      const store = useNumberMemoryStore()
      await store.saveResult('numberToImage', 10, 8, 120, [])
      expect(saveTrainingResult).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'number_memory_result',
          mode: 'numberToImage',
          totalQuestions: 10,
          correctAnswers: 8,
          duration: 120,
          details: []
        })
      )
    })
  })

  describe('getTrainingHistory', () => {
    it('应该调用 getAllTrainingResults', () => {
      const store = useNumberMemoryStore()
      store.getTrainingHistory()
      expect(getAllTrainingResults).toHaveBeenCalled()
    })
  })

  describe('getRandomPresetNumbers', () => {
    it('应该调用 getRandomNumbers', () => {
      const store = useNumberMemoryStore()
      store.getRandomPresetNumbers(5, 'single')
      expect(getRandomNumbers).toHaveBeenCalledWith(5, 'single')
    })

    it('默认 range 应为 all', () => {
      const store = useNumberMemoryStore()
      store.getRandomPresetNumbers(5)
      expect(getRandomNumbers).toHaveBeenCalledWith(5, 'all')
    })
  })
})
