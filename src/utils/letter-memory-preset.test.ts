import { describe, it, expect } from 'vitest'
import {
  getRecommendedImages,
  getLetterKeyword,
  getAlphabetLetters,
  getComboLetters,
  getAllPresetLetters,
  shuffleArray,
} from './letter-memory-preset'

describe('letter-memory-preset', () => {
  describe('getRecommendedImages', () => {
    it('应该返回字母的推荐图片列表', () => {
      const suggestions = getRecommendedImages('a')

      expect(suggestions.length).toBeGreaterThan(0)
      expect(suggestions[0]).toHaveProperty('name')
      expect(suggestions[0]).toHaveProperty('url')
      expect(suggestions[0]).toHaveProperty('description')
    })

    it('应该返回字母组合的推荐图片', () => {
      const suggestions = getRecommendedImages('ch')

      expect(suggestions.length).toBeGreaterThan(0)
      expect(suggestions.some(s => s.name.includes('椅子') || s.description.includes('Chair'))).toBe(true)
    })

    it('对不存在的字母应该返回空数组', () => {
      const suggestions = getRecommendedImages('xyz123')

      expect(suggestions).toEqual([])
    })

    it('应该支持所有26个字母', () => {
      const alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('')

      alphabet.forEach(letter => {
        const suggestions = getRecommendedImages(letter)
        expect(suggestions.length).toBeGreaterThan(0)
      })
    })
  })

  describe('getLetterKeyword', () => {
    it('应该返回字母的关键词', () => {
      const keyword = getLetterKeyword('a')

      expect(keyword).toContain('苹果')
      expect(keyword).toContain('apple')
    })

    it('应该返回字母组合的关键词', () => {
      const keyword = getLetterKeyword('sh')

      expect(keyword).toContain('鞋子')
      expect(keyword).toContain('shoe')
    })

    it('对不存在的字母应该返回空字符串', () => {
      const keyword = getLetterKeyword('xyz123')

      expect(keyword).toBe('')
    })
  })

  describe('getAlphabetLetters', () => {
    it('应该返回26个英文字母', () => {
      const letters = getAlphabetLetters()

      expect(letters).toHaveLength(26)
      expect(letters).toContain('a')
      expect(letters).toContain('z')
    })

    it('返回的字母应该都是小写', () => {
      const letters = getAlphabetLetters()

      letters.forEach(letter => {
        expect(letter).toBe(letter.toLowerCase())
        expect(letter).toHaveLength(1)
      })
    })
  })

  describe('getComboLetters', () => {
    it('应该返回字母组合列表', () => {
      const combos = getComboLetters()

      expect(combos.length).toBeGreaterThan(0)
      expect(combos.every(c => c.length > 1)).toBe(true)
    })

    it('应该包含常见的字母组合', () => {
      const combos = getComboLetters()

      expect(combos).toContain('ch')
      expect(combos).toContain('sh')
      expect(combos).toContain('th')
    })
  })

  describe('getAllPresetLetters', () => {
    it('应该包含所有单个字母和字母组合', () => {
      const all = getAllPresetLetters()
      const single = getAlphabetLetters()
      const combo = getComboLetters()

      expect(all.length).toBe(single.length + combo.length)
      single.forEach(letter => expect(all).toContain(letter))
      combo.forEach(c => expect(all).toContain(c))
    })
  })

  describe('shuffleArray', () => {
    it('应该打乱数组顺序', () => {
      const original = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
      const shuffled = shuffleArray(original)

      // 返回新数组，不修改原数组
      expect(shuffled).not.toBe(original)
      expect(shuffled).toHaveLength(original.length)
      expect(shuffled.sort()).toEqual(original.sort())
    })

    it('应该处理空数组', () => {
      const result = shuffleArray([])

      expect(result).toEqual([])
    })

    it('应该处理单元素数组', () => {
      const result = shuffleArray([42])

      expect(result).toEqual([42])
    })

    it('对大量数据应该产生不同的排列（概率性测试）', () => {
      // 多次打乱，至少有一次顺序不同
      const original = Array.from({ length: 10 }, (_, i) => i)
      let hasDifferentOrder = false

      for (let i = 0; i < 5; i++) {
        const shuffled = shuffleArray(original)
        if (shuffled.join(',') !== original.join(',')) {
          hasDifferentOrder = true
          break
        }
      }

      expect(hasDifferentOrder).toBe(true)
    })
  })
})
