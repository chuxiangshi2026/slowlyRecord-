import { describe, it, expect } from 'vitest'
import {
  analyzeWord,
  getComponentClass,
  getComponentLabel,
  generateDetailedTooltip,
  generateSimpleTooltip,
  type WordComponent
} from './word-analysis'

describe('analyzeWord', () => {
  it('应该处理空字符串', () => {
    const result = analyzeWord('')
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ text: '', type: 'whole' })
  })

  it('应该处理单字符单词', () => {
    const result = analyzeWord('a')
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ text: 'a', type: 'whole' })
  })

  it('应该识别前缀 un-', () => {
    const result = analyzeWord('unhappy')
    expect(result.some(c => c.type === 'prefix' && c.text.toLowerCase() === 'un')).toBe(true)
  })

  it('应该识别后缀 -able', () => {
    const result = analyzeWord('readable')
    expect(result.some(c => c.type === 'suffix' && c.text.toLowerCase() === 'able')).toBe(true)
  })

  it('应该识别词根', () => {
    const result = analyzeWord('transport')
    expect(result.some(c => c.type === 'root')).toBe(true)
  })

  it('应该保持原始大小写', () => {
    const result = analyzeWord('UNHAPPY')
    const prefix = result.find(c => c.type === 'prefix')
    expect(prefix?.text).toBe('UN')
  })

  it('应该处理复杂单词', () => {
    const result = analyzeWord('unhappiness')
    expect(result.length).toBeGreaterThan(1)
  })

  it('应该处理无词根词缀的单词', () => {
    const result = analyzeWord('xyz')
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('whole')
  })

  it('应该处理包含多个成分的单词', () => {
    const result = analyzeWord('uncomfortable')
    // 应该识别前缀 un- 和后缀 -able
    const hasPrefix = result.some(c => c.type === 'prefix')
    const hasSuffix = result.some(c => c.type === 'suffix')
    expect(hasPrefix || hasSuffix).toBe(true)
  })

  it('应该正确处理短单词', () => {
    const result = analyzeWord('ab')
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('whole')
  })

  it('应该为识别的成分包含数据', () => {
    const result = analyzeWord('unhappy')
    const prefix = result.find(c => c.type === 'prefix')
    expect(prefix?.data).toBeDefined()
    expect(prefix?.data?.meaning).toBeDefined()
  })
})

describe('getComponentClass', () => {
  it('应该返回正确的 CSS 类名', () => {
    expect(getComponentClass('root')).toBe('word-root')
    expect(getComponentClass('prefix')).toBe('word-prefix')
    expect(getComponentClass('suffix')).toBe('word-suffix')
    expect(getComponentClass('subword')).toBe('word-subword')
    expect(getComponentClass('whole')).toBe('word-whole')
  })
})

describe('getComponentLabel', () => {
  it('应该返回正确的中文标签', () => {
    expect(getComponentLabel('root')).toBe('词根')
    expect(getComponentLabel('prefix')).toBe('前缀')
    expect(getComponentLabel('suffix')).toBe('后缀')
    expect(getComponentLabel('subword')).toBe('子单词')
    expect(getComponentLabel('whole')).toBe('完整单词')
  })
})

describe('generateDetailedTooltip', () => {
  it('应该为单个成分返回空字符串', () => {
    const components: WordComponent[] = [{ text: 'hello', type: 'whole' }]
    const result = generateDetailedTooltip(components)
    expect(result).toBe('')
  })

  it('应该生成详细的提示信息', () => {
    const components: WordComponent[] = [
      { text: 'un', type: 'prefix', data: { text: 'un', meaning: '不，无，相反', description: 'not, opposite of' } },
      { text: 'happy', type: 'subword' }
    ]
    const result = generateDetailedTooltip(components)
    expect(result).toContain('前缀')
    expect(result).toContain('un')
    expect(result).toContain('不，无，相反')
  })

  it('应该跳过 whole 和 subword 类型', () => {
    const components: WordComponent[] = [
      { text: 'un', type: 'prefix', data: { text: 'un', meaning: '不，无，相反' } },
      { text: 'happy', type: 'subword' },
      { text: 'unhappy', type: 'whole' }
    ]
    const result = generateDetailedTooltip(components)
    expect(result).toContain('前缀')
    expect(result).not.toContain('子单词')
    expect(result).not.toContain('完整单词')
  })

  it('应该包含示例单词', () => {
    const components: WordComponent[] = [
      { text: 'un', type: 'prefix', data: { text: 'un', meaning: '不，无，相反', examples: ['unhappy', 'unable'] } }
    ]
    const result = generateDetailedTooltip(components)
    expect(result).toContain('例:')
  })

  it('应该处理无数据的成分', () => {
    const components: WordComponent[] = [
      { text: 'test', type: 'prefix' }
    ]
    const result = generateDetailedTooltip(components)
    expect(result).toContain('前缀')
    expect(result).toContain('test')
  })
})

describe('generateSimpleTooltip', () => {
  it('应该为单个成分返回空字符串', () => {
    const components: WordComponent[] = [{ text: 'hello', type: 'whole' }]
    const result = generateSimpleTooltip(components)
    expect(result).toBe('')
  })

  it('应该生成简洁的提示信息', () => {
    const components: WordComponent[] = [
      { text: 'un', type: 'prefix', data: { text: 'un', meaning: '不，无，相反' } },
      { text: 'happy', type: 'subword' }
    ]
    const result = generateSimpleTooltip(components)
    expect(result).toContain('un: 不，无，相反')
  })

  it('应该使用 | 分隔多个成分', () => {
    const components: WordComponent[] = [
      { text: 'un', type: 'prefix', data: { text: 'un', meaning: '不，无，相反' } },
      { text: 'able', type: 'suffix', data: { text: 'able', meaning: '可...的，能...的' } }
    ]
    const result = generateSimpleTooltip(components)
    expect(result).toContain('|')
  })

  it('应该跳过无数据的成分', () => {
    const components: WordComponent[] = [
      { text: 'un', type: 'prefix', data: { text: 'un', meaning: '不，无，相反' } },
      { text: 'test', type: 'prefix' }
    ]
    const result = generateSimpleTooltip(components)
    expect(result).not.toContain('test')
  })
})
