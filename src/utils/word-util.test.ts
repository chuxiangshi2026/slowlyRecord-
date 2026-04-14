import { describe, it, expect, vi, beforeEach } from 'vitest'
import { parseFileContent, filterWordsForJsonExport, filterWordsForTextExport, validateImportedWords } from './word-util'
import type { Word } from '@/types/words'

// 模拟 uuid
vi.mock('uuid', () => ({
  v4: vi.fn().mockReturnValue('test-uuid-123')
}))

// 模拟 constants
vi.mock('@/constants', () => ({
  DB_KEY: 'word_'
}))

describe('parseFileContent', () => {
  it('应该正确解析简单的单词列表', () => {
    const content = 'hello\nworld\ntest'
    const result = parseFileContent(content)

    expect(result).toHaveLength(3)
    expect(result[0].text).toBe('hello')
    expect(result[1].text).toBe('world')
    expect(result[2].text).toBe('test')
  })

  it('应该正确处理 Windows 换行符', () => {
    const content = 'hello\r\nworld\r\ntest'
    const result = parseFileContent(content)

    expect(result).toHaveLength(3)
    expect(result[0].text).toBe('hello')
    expect(result[1].text).toBe('world')
  })

  it('应该过滤空行', () => {
    const content = 'hello\n\n\nworld\n   \ntest'
    const result = parseFileContent(content)

    expect(result).toHaveLength(3)
  })

  it('应该正确解析 CSV 格式', () => {
    const content = 'hello,你好,true,false,2024-01-15 10:30:00,2024-01-15 10:30:00,3'
    const result = parseFileContent(content)

    expect(result).toHaveLength(1)
    expect(result[0].text).toBe('hello')
    expect(result[0].explains).toBe('你好')
    expect(result[0].explainedHidden).toBe(true)
    expect(result[0].isReview).toBe(false)
    expect(result[0].level).toBe(3)
  })

  it('应该正确处理无效的等级值', () => {
    const content = 'hello,你好,true,true,2024-01-15 10:30:00,2024-01-15 10:30:00,invalid'
    const result = parseFileContent(content)

    expect(result[0].level).toBe(1) // 默认值
  })

  it('应该正确处理超出范围的等级值', () => {
    const content = 'hello,你好,true,true,2024-01-15 10:30:00,2024-01-15 10:30:00,15'
    const result = parseFileContent(content)

    expect(result[0].level).toBe(1) // 超出范围使用默认值
  })

  it('应该正确处理负的等级值', () => {
    const content = 'hello,你好,true,true,2024-01-15 10:30:00,2024-01-15 10:30:00,-1'
    const result = parseFileContent(content)

    expect(result[0].level).toBe(1) // 负值使用默认值
  })

  it('应该正确解析日期字符串', () => {
    const content = 'hello,你好,true,true,2024-06-20 14:30:00,2024-06-21 15:45:00,2'
    const result = parseFileContent(content)

    expect(result[0].ctime).toBeInstanceOf(Date)
    expect(result[0].learnDate).toBeInstanceOf(Date)
  })

  it('应该正确处理没有可选字段的 CSV', () => {
    const content = 'hello'
    const result = parseFileContent(content)

    expect(result[0].text).toBe('hello')
    expect(result[0].explains).toBe('')
    expect(result[0].explainedHidden).toBe(false)
    expect(result[0].isReview).toBe(true)
  })

  it('应该为每个单词生成唯一 ID', () => {
    const content = 'hello\nworld'
    const result = parseFileContent(content)

    expect(result[0]._id).toBe('word_test-uuid-123')
    expect(result[1]._id).toBe('word_test-uuid-123')
  })
})

describe('filterWordsForJsonExport', () => {
  it('应该正确过滤单词属性用于 JSON 导出', () => {
    const words: Word[] = [
      {
        text: 'hello',
        explains: '你好',
        explainedHidden: false,
        isReview: true,
        ctime: new Date('2024-01-15T10:30:00'),
        learnDate: new Date('2024-01-15T10:30:00'),
        level: 3,
        _id: 'word_123',
        image: '',
        phonetic: '',
        remember: false,
        pronunciation: ''
      }
    ]

    const result = filterWordsForJsonExport(words)

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      text: 'hello',
      explains: '你好',
      explainedHidden: false,
      isReview: true,
      ctime: '2024-01-15 10:30:00',
      learnDate: '2024-01-15 10:30:00',
      level: 3
    })
  })

  it('应该正确处理多个单词', () => {
    const words: Word[] = [
      {
        text: 'hello',
        explains: '你好',
        explainedHidden: false,
        isReview: true,
        ctime: new Date('2024-01-15T10:30:00'),
        learnDate: new Date('2024-01-15T10:30:00'),
        level: 1,
        _id: 'word_1',
        image: '',
        phonetic: '',
        remember: false,
        pronunciation: ''
      },
      {
        text: 'world',
        explains: '世界',
        explainedHidden: true,
        isReview: false,
        ctime: new Date('2024-01-16T11:30:00'),
        learnDate: new Date('2024-01-16T11:30:00'),
        level: 2,
        _id: 'word_2',
        image: '',
        phonetic: '',
        remember: true,
        pronunciation: ''
      }
    ]

    const result = filterWordsForJsonExport(words)

    expect(result).toHaveLength(2)
    expect(result[0].text).toBe('hello')
    expect(result[1].text).toBe('world')
  })

  it('应该正确处理空数组', () => {
    const result = filterWordsForJsonExport([])
    expect(result).toEqual([])
  })
})

describe('filterWordsForTextExport', () => {
  it('应该正确格式化为 CSV 格式', () => {
    const words: Word[] = [
      {
        text: 'hello',
        explains: '你好',
        explainedHidden: false,
        isReview: true,
        ctime: new Date('2024-01-15T10:30:00'),
        learnDate: new Date('2024-01-15T10:30:00'),
        level: 3,
        _id: 'word_123',
        image: '',
        phonetic: '',
        remember: false,
        pronunciation: ''
      }
    ]

    const result = filterWordsForTextExport(words)

    expect(result).toBe('hello, 你好,false,true, 2024-01-15 10:30:00, 2024-01-15 10:30:00, 3')
  })

  it('应该正确处理多个单词，用换行符分隔', () => {
    const words: Word[] = [
      {
        text: 'hello',
        explains: '你好',
        explainedHidden: false,
        isReview: true,
        ctime: new Date('2024-01-15T10:30:00'),
        learnDate: new Date('2024-01-15T10:30:00'),
        level: 1,
        _id: 'word_1',
        image: '',
        phonetic: '',
        remember: false,
        pronunciation: ''
      },
      {
        text: 'world',
        explains: '世界',
        explainedHidden: true,
        isReview: false,
        ctime: new Date('2024-01-16T11:30:00'),
        learnDate: new Date('2024-01-16T11:30:00'),
        level: 2,
        _id: 'word_2',
        image: '',
        phonetic: '',
        remember: true,
        pronunciation: ''
      }
    ]

    const result = filterWordsForTextExport(words)
    const lines = result.split('\n')

    expect(lines).toHaveLength(2)
    expect(lines[0]).toContain('hello')
    expect(lines[1]).toContain('world')
  })

  it('应该正确处理空数组', () => {
    const result = filterWordsForTextExport([])
    expect(result).toBe('')
  })
})

describe('validateImportedWords', () => {
  it('应该过滤掉缺少 text 字段的单词', () => {
    const words = [
      { explains: '你好', level: 1 },
      { text: 'hello', explains: '你好', level: 1 }
    ]

    const result = validateImportedWords(words)

    expect(result).toHaveLength(1)
    expect(result[0].text).toBe('hello')
  })

  it('应该为缺少的字段提供默认值', () => {
    const words = [{ text: 'hello' }]

    const result = validateImportedWords(words)

    expect(result[0]).toMatchObject({
      text: 'hello',
      _id: 'word_test-uuid-123',
      image: '',
      phonetic: '',
      explainedHidden: false,
      isReview: true,
      level: 1,
      remember: false,
      explains: '',
      pronunciation: ''
    })
  })

  it('应该保留已有的字段值', () => {
    const words = [{
      text: 'hello',
      explains: '你好',
      level: 5,
      remember: true,
      phonetic: '/həˈloʊ/'
    }]

    const result = validateImportedWords(words)

    expect(result[0].explains).toBe('你好')
    expect(result[0].level).toBe(5)
    expect(result[0].remember).toBe(true)
    expect(result[0].phonetic).toBe('/həˈloʊ/')
  })

  it('应该将字符串日期转换为 Date 对象', () => {
    const words = [{
      text: 'hello',
      ctime: '2024-01-15T10:30:00.000Z',
      learnDate: '2024-01-15T10:30:00.000Z'
    }]

    const result = validateImportedWords(words)

    expect(result[0].ctime).toBeInstanceOf(Date)
    expect(result[0].learnDate).toBeInstanceOf(Date)
  })

  it('应该限制 level 在 0-12 范围内', () => {
    const words = [
      { text: 'a', level: -1 },
      { text: 'b', level: 0 },
      { text: 'c', level: 12 },
      { text: 'd', level: 15 }
    ]

    const result = validateImportedWords(words)

    expect(result[0].level).toBe(1) // 负值变为默认值
    expect(result[1].level).toBe(0) // 边界值保留
    expect(result[2].level).toBe(12) // 边界值保留
    expect(result[3].level).toBe(1) // 超出范围变为默认值
  })

  it('应该正确处理空数组', () => {
    const result = validateImportedWords([])
    expect(result).toEqual([])
  })
})
