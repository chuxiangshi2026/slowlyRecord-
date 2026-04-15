import { describe, it, expect } from 'vitest'
import { formatDateTime } from './date-util'

describe('formatDateTime', () => {
  describe('Date 对象输入', () => {
    it('应该正确格式化 Date 对象', () => {
      const date = new Date(2024, 0, 15, 9, 30, 45) // 2024-01-15 09:30:45
      const result = formatDateTime(date)
      expect(result).toBe('2024-01-15 09:30:45')
    })

    it('应该正确处理月份补零', () => {
      const date = new Date(2024, 11, 5, 1, 2, 3) // 2024-12-05 01:02:03
      const result = formatDateTime(date)
      expect(result).toBe('2024-12-05 01:02:03')
    })

    it('应该正确处理跨年日期', () => {
      const date = new Date(1999, 11, 31, 23, 59, 59)
      const result = formatDateTime(date)
      expect(result).toBe('1999-12-31 23:59:59')
    })

    it('应该正确处理边界值 - 零时零分零秒', () => {
      const date = new Date(2024, 0, 1, 0, 0, 0)
      const result = formatDateTime(date)
      expect(result).toBe('2024-01-01 00:00:00')
    })

    it('应该正确处理闰年日期', () => {
      const date = new Date(2024, 1, 29, 12, 0, 0) // 2024是闰年
      const result = formatDateTime(date)
      expect(result).toBe('2024-02-29 12:00:00')
    })
  })

  describe('字符串输入', () => {
    it('应该正确处理字符串日期输入', () => {
      const dateStr = '2024-06-20T14:30:00'
      const result = formatDateTime(dateStr)
      expect(result).toBe('2024-06-20 14:30:00')
    })

    it('应该正确处理 ISO 字符串格式', () => {
      const isoString = '2024-03-15T08:15:30.000Z'
      const result = formatDateTime(isoString)
      // 注意：ISO 字符串会被转换为本地时间
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
    })

    it('应该正确处理日期字符串格式 YYYY-MM-DD', () => {
      const result = formatDateTime('2024-06-20')
      // 'YYYY-MM-DD' 字符串在 new Date() 中会被当作 UTC 时间，需验证本地时间格式
      expect(result).toMatch(/^2024-06-2[01] \d{2}:\d{2}:\d{2}$/)
    })
  })

  describe('时间戳输入', () => {
    it('应该正确处理时间戳输入', () => {
      const timestamp = new Date(2024, 5, 20, 14, 30, 0).getTime()
      const result = formatDateTime(timestamp)
      expect(result).toBe('2024-06-20 14:30:00')
    })

    it('应该正确处理 0 时间戳', () => {
      const result = formatDateTime(0)
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
    })
  })

  describe('格式验证', () => {
    it('返回值应该始终匹配 YYYY-MM-DD HH:mm:ss 格式', () => {
      const inputs = [
        new Date(2024, 0, 1, 0, 0, 0),
        new Date(2024, 6, 15, 12, 30, 45),
        new Date(1999, 11, 31, 23, 59, 59),
        Date.now()
      ]
      const pattern = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/

      for (const input of inputs) {
        expect(formatDateTime(input)).toMatch(pattern)
      }
    })

    it('月、日、时、分、秒应该始终为两位数', () => {
      const date = new Date(2024, 0, 1, 0, 0, 0) // 2024-01-01 00:00:00
      const result = formatDateTime(date)
      const parts = result.split(/[- :]/)
      expect(parts[1]).toBe('01') // 月
      expect(parts[2]).toBe('01') // 日
      expect(parts[3]).toBe('00') // 时
      expect(parts[4]).toBe('00') // 分
      expect(parts[5]).toBe('00') // 秒
    })
  })

  describe('无效输入', () => {
    it('应该处理 Invalid Date', () => {
      const result = formatDateTime(new Date('invalid'))
      // Invalid Date 的 getFullYear() 返回 NaN
      expect(result).toBe('NaN-NaN-NaN NaN:NaN:NaN')
    })
  })
})
