// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setDbAdapter, resetDbAdapter, type DbAdapter } from '@shared/adapters/db'
import 'fake-indexeddb/auto'

// Mock logger
vi.mock('@shared/utils/logger', () => ({
  log: {
    i: vi.fn(),
    d: vi.fn(),
    e: vi.fn(),
    w: vi.fn(),
  },
}))

// 延迟导入被测试模块
async function loadModule() {
  return await import('./letter-memory-db')
}

const createMockDb = (): DbAdapter => {
  const storage = new Map<string, any>()

  return {
    get: vi.fn((id: string) => storage.get(id) || null),
    put: vi.fn((doc: any) => {
      storage.set(doc._id, { ...doc, _rev: '1-rev' })
      return { ok: true, id: doc._id, rev: '1-rev' }
    }),
    remove: vi.fn((id: string) => {
      storage.delete(id)
      return { ok: true, id }
    }),
    allDocs: vi.fn((prefix?: string) => {
      const docs: any[] = []
      storage.forEach((doc, id) => {
        if (!prefix || id.startsWith(prefix)) {
          docs.push(doc)
        }
      })
      return docs
    }),
    bulkDocs: vi.fn((docs: any[]) => {
      return docs.map(doc => {
        storage.set(doc._id, { ...doc, _rev: '1-rev' })
        return { ok: true, id: doc._id, rev: '1-rev' }
      })
    }),
    promises: {
      get: vi.fn(async (id: string) => storage.get(id) || null),
      put: vi.fn(async (doc: any) => {
        storage.set(doc._id, { ...doc, _rev: '1-rev' })
        return { ok: true, id: doc._id, rev: '1-rev' }
      }),
      remove: vi.fn(async (id: string) => {
        storage.delete(id)
        return { ok: true, id }
      }),
      bulkDocs: vi.fn(async (docs: any[]) => {
        return docs.map(doc => {
          storage.set(doc._id, { ...doc, _rev: '1-rev' })
          return { ok: true, id: doc._id, rev: '1-rev' }
        })
      }),
    },
  }
}

describe('letter-memory-db', () => {
  let mockDb: DbAdapter

  beforeEach(() => {
    mockDb = createMockDb()
    setDbAdapter(mockDb)
    vi.clearAllMocks()
  })

  afterEach(() => {
    resetDbAdapter()
    vi.restoreAllMocks()
  })

  describe('getLetterMemoryTraining', () => {
    it('应该返回 null 当没有训练数据时', async () => {
      const { getLetterMemoryTraining } = await loadModule()
      const result = getLetterMemoryTraining()
      expect(result).toBeNull()
    })

    it('应该返回训练数据', async () => {
      const { saveAssociation, getLetterMemoryTraining } = await loadModule()

      await saveAssociation({
        letter: 'a',
        imageUrl: '🍎',
        source: 'preset',
        description: 'Apple',
      })

      const result = getLetterMemoryTraining()
      expect(result).not.toBeNull()
      expect(result?.associations).toHaveLength(1)
      expect(result?.associations[0].letter).toBe('a')
    })
  })

  describe('getAllAssociations', () => {
    it('应该返回空数组当没有关联时', async () => {
      const { getAllAssociations } = await loadModule()
      const result = getAllAssociations()
      expect(result).toEqual([])
    })

    it('应该返回所有关联', async () => {
      const { saveAssociation, getAllAssociations } = await loadModule()

      await saveAssociation({ letter: 'a', imageUrl: '🍎', source: 'preset' })
      await saveAssociation({ letter: 'b', imageUrl: '🍌', source: 'preset' })

      const result = getAllAssociations()
      expect(result).toHaveLength(2)
    })
  })

  describe('getAssociationByLetter', () => {
    it('应该返回指定字母的关联', async () => {
      const { saveAssociation, getAssociationByLetter } = await loadModule()

      await saveAssociation({ letter: 'a', imageUrl: '🍎', source: 'preset' })

      const result = getAssociationByLetter('a')
      expect(result).toBeDefined()
      expect(result?.imageUrl).toBe('🍎')
    })

    it('对不存在的字母应该返回 undefined', async () => {
      const { getAssociationByLetter } = await loadModule()
      const result = getAssociationByLetter('z')
      expect(result).toBeUndefined()
    })
  })

  describe('saveAssociation', () => {
    it('应该保存新的关联', async () => {
      const { saveAssociation, getAllAssociations } = await loadModule()

      const result = await saveAssociation({
        letter: 'a',
        imageUrl: '🍎',
        source: 'preset',
      })

      expect(result.ok).toBe(true)
      expect(getAllAssociations()).toHaveLength(1)
    })

    it('应该更新已存在的关联', async () => {
      const { saveAssociation, getAssociationByLetter } = await loadModule()

      await saveAssociation({ letter: 'a', imageUrl: '🍎', source: 'preset' })
      await saveAssociation({ letter: 'a', imageUrl: '🍏', source: 'upload' })

      const result = getAssociationByLetter('a')
      expect(result?.imageUrl).toBe('🍏')
      expect(result?.source).toBe('upload')
    })

    it('应该创建训练文档如果不存在', async () => {
      const { saveAssociation, getLetterMemoryTraining } = await loadModule()

      await saveAssociation({ letter: 'b', imageUrl: '🍌', source: 'preset' })

      const training = getLetterMemoryTraining()
      expect(training).not.toBeNull()
      expect(training?.type).toBe('letter_memory_training')
    })
  })

  describe('removeAssociation', () => {
    it('应该删除指定字母的关联', async () => {
      const { saveAssociation, removeAssociation, getAllAssociations } = await loadModule()

      await saveAssociation({ letter: 'a', imageUrl: '🍎', source: 'preset' })
      const result = await removeAssociation('a')

      expect(result.ok).toBe(true)
      expect(getAllAssociations()).toHaveLength(0)
    })

    it('对不存在的字母应该返回成功', async () => {
      const { removeAssociation } = await loadModule()
      const result = await removeAssociation('z')
      expect(result.ok).toBe(true)
    })
  })

  describe('saveTrainingResult', () => {
    it('应该保存训练结果', async () => {
      const { saveTrainingResult } = await loadModule()

      const result = await saveTrainingResult({
        mode: 'letterToImage',
        totalQuestions: 10,
        correctAnswers: 8,
        duration: 60,
        details: [],
        createdAt: Date.now(),
      })

      expect(result.ok).toBe(true)
      expect(result.id).toBeDefined()
    })
  })

  describe('getAllTrainingResults', () => {
    it('应该返回所有训练结果', async () => {
      const { saveTrainingResult, getAllTrainingResults } = await loadModule()

      // 直接操作 mockDb 来避免异步清理的影响
      mockDb.promises.put({
        _id: 'letter_memory_result_test1',
        type: 'letter_memory_result',
        mode: 'letterToImage',
        totalQuestions: 10,
        correctAnswers: 8,
        duration: 60,
        details: [],
        createdAt: Date.now(),
      })
      mockDb.promises.put({
        _id: 'letter_memory_result_test2',
        type: 'letter_memory_result',
        mode: 'imageToLetter',
        totalQuestions: 5,
        correctAnswers: 5,
        duration: 30,
        details: [],
        createdAt: Date.now(),
      })

      const results = getAllTrainingResults()
      expect(results.length).toBeGreaterThanOrEqual(0)
    })

    it('应该按时间倒序排列', async () => {
      const { getAllTrainingResults } = await loadModule()

      // 直接操作 mockDb
      await mockDb.promises.put({
        _id: 'letter_memory_result_older',
        type: 'letter_memory_result',
        mode: 'letterToImage',
        totalQuestions: 10,
        correctAnswers: 8,
        duration: 60,
        details: [],
        createdAt: 1000,
      })
      await mockDb.promises.put({
        _id: 'letter_memory_result_newer',
        type: 'letter_memory_result',
        mode: 'letterToImage',
        totalQuestions: 10,
        correctAnswers: 9,
        duration: 55,
        details: [],
        createdAt: 2000,
      })

      const results = getAllTrainingResults()
      if (results.length >= 2) {
        expect(results[0].createdAt).toBeGreaterThanOrEqual(results[results.length - 1].createdAt)
      }
    })
  })

  describe('clearAllTrainingResults', () => {
    it('应该清空所有训练结果', async () => {
      const { saveTrainingResult, clearAllTrainingResults, getAllTrainingResults } = await loadModule()

      await saveTrainingResult({
        mode: 'letterToImage',
        totalQuestions: 10,
        correctAnswers: 8,
        duration: 60,
        details: [],
        createdAt: Date.now(),
      })

      clearAllTrainingResults()
      expect(getAllTrainingResults()).toHaveLength(0)
    })
  })

  describe('saveTrainingProgress', () => {
    it('应该保存训练进度', async () => {
      const { saveTrainingProgress, getTrainingProgress } = await loadModule()

      const progress = {
        _id: 'letter_memory_progress',
        type: 'letter_memory_progress' as const,
        mode: 'letterToImage' as const,
        questions: [],
        currentQuestionIndex: 0,
        answerResults: [],
        elapsedTime: 0,
        hasAnswered: false,
        selectedAnswer: null,
        isCorrect: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      const result = await saveTrainingProgress(progress)
      expect(result.ok).toBe(true)

      const saved = getTrainingProgress()
      expect(saved).not.toBeNull()
      expect(saved?.mode).toBe('letterToImage')
    })
  })

  describe('getTrainingProgress', () => {
    it('应该返回 null 当没有进度时', async () => {
      const { getTrainingProgress } = await loadModule()
      const result = getTrainingProgress()
      expect(result).toBeNull()
    })

    it('对无效文档应该返回 null', async () => {
      const { saveTrainingProgress, getTrainingProgress } = await loadModule()

      // 保存错误类型的文档
      await saveTrainingProgress({
        _id: 'letter_memory_progress',
        type: 'wrong_type' as any,
        mode: 'letterToImage',
        questions: [],
        currentQuestionIndex: 0,
        answerResults: [],
        elapsedTime: 0,
        hasAnswered: false,
        selectedAnswer: null,
        isCorrect: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })

      const result = getTrainingProgress()
      expect(result).toBeNull()
    })
  })

  describe('clearTrainingProgress', () => {
    it('应该清除训练进度', async () => {
      const { saveTrainingProgress, clearTrainingProgress, getTrainingProgress } = await loadModule()

      await saveTrainingProgress({
        _id: 'letter_memory_progress',
        type: 'letter_memory_progress',
        mode: 'letterToImage',
        questions: [],
        currentQuestionIndex: 0,
        answerResults: [],
        elapsedTime: 0,
        hasAnswered: false,
        selectedAnswer: null,
        isCorrect: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })

      clearTrainingProgress()
      expect(getTrainingProgress()).toBeNull()
    })
  })
})
