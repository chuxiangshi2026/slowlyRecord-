import { describe, it, expect, beforeEach, vi } from 'vitest'
import { isOverDailyLimit, incrementUsageCounter, getCurrentUsageCount } from './usage-counter'

// Mock constants
vi.mock('@/constants', () => ({
  USAGE_LIMITS: {
    OCR_DAILY_LIMIT: 5,
    TENCENT_OCR_DAILY_LIMIT: 10,
    TRANSLATION_DAILY_LIMIT: 500,
  }
}))

// Mock words store (for hasCustomApiKey)
vi.mock('@/stores/words.ts', () => ({
  useWordsStore: vi.fn(() => ({
    getApiKey: vi.fn(() => ({ appkey: '', key: '' })),
  }))
}))

vi.mock('@/utils/pic-translate.ts', () => ({
  ocrTranslateMultiPlatform: vi.fn(),
  OcrResult: undefined,
}))

vi.mock('@/config.ts', () => ({
  AppInfo: {}
}))

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

// Mock Date to control "today"
let mockDate = '2024-06-15'
vi.spyOn(Date.prototype, 'toISOString').mockImplementation(function(this: Date) {
  return `${mockDate}T00:00:00.000Z`
})

describe('usage-counter', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
    mockDate = '2024-06-15'
  })

  describe('isOverDailyLimit', () => {
    it('没有记录时不应超限', () => {
      expect(isOverDailyLimit('ocr')).toBe(false)
      expect(isOverDailyLimit('translation')).toBe(false)
    })

    it('今天计数未超限不应返回 true', () => {
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify({ date: mockDate, count: 3 }))
      expect(isOverDailyLimit('ocr')).toBe(false) // limit is 5
    })

    it('今天计数已超限应返回 true', () => {
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify({ date: mockDate, count: 5 }))
      expect(isOverDailyLimit('ocr')).toBe(true) // limit is 5
    })

    it('ocr 功能限制为 5 次', () => {
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify({ date: mockDate, count: 6 }))
      expect(isOverDailyLimit('ocr')).toBe(true)
    })

    it('tencent_ocr 功能限制为 10 次', () => {
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify({ date: mockDate, count: 10 }))
      expect(isOverDailyLimit('tencent_ocr')).toBe(true)
    })

    it('translation 功能限制为 500 次', () => {
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify({ date: mockDate, count: 500 }))
      expect(isOverDailyLimit('translation')).toBe(true)
    })

    it('translation 计数 499 不应超限', () => {
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify({ date: mockDate, count: 499 }))
      expect(isOverDailyLimit('translation')).toBe(false)
    })

    it('非今天的记录不应超限（隔天重置）', () => {
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify({ date: '2024-06-14', count: 100 }))
      expect(isOverDailyLimit('ocr')).toBe(false)
    })

    it('JSON 解析失败不应超限', () => {
      localStorageMock.getItem.mockReturnValueOnce('invalid json')
      expect(isOverDailyLimit('ocr')).toBe(false)
    })

    it('不同 feature 应使用不同的 storeKey', () => {
      localStorageMock.getItem.mockReturnValueOnce(null) // ocr
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify({ date: mockDate, count: 100 })) // translation

      expect(isOverDailyLimit('ocr')).toBe(false)
      expect(isOverDailyLimit('translation')).toBe(false)
    })
  })

  describe('incrementUsageCounter', () => {
    it('首次使用应返回 1', () => {
      const count = incrementUsageCounter('ocr')
      expect(count).toBe(1)
    })

    it('应该在现有计数上递增', () => {
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify({ date: mockDate, count: 3 }))
      const count = incrementUsageCounter('ocr')
      expect(count).toBe(4)
    })

    it('非今天的记录应从 1 开始计数', () => {
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify({ date: '2024-06-14', count: 10 }))
      const count = incrementUsageCounter('ocr')
      expect(count).toBe(1)
    })

    it('应该保存计数和日期到 localStorage', () => {
      incrementUsageCounter('translation')
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'usage_translation_counter',
        expect.stringContaining(mockDate)
      )
    })

    it('JSON 解析失败应从 1 开始', () => {
      localStorageMock.getItem.mockReturnValueOnce('invalid json')
      const count = incrementUsageCounter('ocr')
      expect(count).toBe(1)
    })

    it('应该使用正确的 storeKey', () => {
      incrementUsageCounter('batch_translation')
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'usage_batch_translation_counter',
        expect.any(String)
      )
    })
  })

  describe('getCurrentUsageCount', () => {
    it('没有记录应返回 0', () => {
      expect(getCurrentUsageCount('ocr')).toBe(0)
    })

    it('应该返回今天的计数', () => {
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify({ date: mockDate, count: 3 }))
      expect(getCurrentUsageCount('ocr')).toBe(3)
    })

    it('非今天的记录应返回 0', () => {
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify({ date: '2024-06-14', count: 10 }))
      expect(getCurrentUsageCount('ocr')).toBe(0)
    })

    it('JSON 解析失败应返回 0', () => {
      localStorageMock.getItem.mockReturnValueOnce('invalid json')
      expect(getCurrentUsageCount('ocr')).toBe(0)
    })

    it('count 为 0 应返回 0', () => {
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify({ date: mockDate, count: 0 }))
      expect(getCurrentUsageCount('ocr')).toBe(0)
    })
  })

  describe('综合场景', () => {
    it('完整的使用计数流程', () => {
      // 第一次使用
      expect(isOverDailyLimit('ocr')).toBe(false)
      expect(getCurrentUsageCount('ocr')).toBe(0)

      // 增加计数
      incrementUsageCounter('ocr')
      expect(getCurrentUsageCount('ocr')).toBe(1)
      expect(isOverDailyLimit('ocr')).toBe(false)

      // 多次增加
      for (let i = 0; i < 4; i++) {
        incrementUsageCounter('ocr')
      }
      expect(getCurrentUsageCount('ocr')).toBe(5)
      expect(isOverDailyLimit('ocr')).toBe(true)
    })

    it('不同功能的计数应互不影响', () => {
      incrementUsageCounter('ocr')
      incrementUsageCounter('ocr')
      incrementUsageCounter('translation')

      expect(getCurrentUsageCount('ocr')).toBe(2)
      expect(getCurrentUsageCount('translation')).toBe(1)
    })
  })
})
