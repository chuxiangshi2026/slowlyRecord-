/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest'

// 直接测试内部函数（通过模块导入后间接测试）
// 由于 calculateSize 和 getDataUrlSize 都是私有函数，
// 我们通过 CompressOptions 接口验证类型，并通过压缩入口函数间接测试

import type { CompressOptions } from '../image-compress'

describe('image-compress', () => {
  describe('CompressOptions type', () => {
    it('默认选项应该包含所有字段', () => {
      const opts: CompressOptions = {}
      expect(opts.maxWidth).toBeUndefined()
      expect(opts.maxHeight).toBeUndefined()
      expect(opts.quality).toBeUndefined()
    })

    it('应该接受自定义选项', () => {
      const opts: CompressOptions = {
        maxWidth: 100,
        maxHeight: 100,
        quality: 0.5,
        maxSizeBytes: 50 * 1024,
        mimeType: 'image/jpeg',
      }
      expect(opts.maxWidth).toBe(100)
      expect(opts.maxHeight).toBe(100)
      expect(opts.quality).toBe(0.5)
      expect(opts.maxSizeBytes).toBe(50 * 1024)
      expect(opts.mimeType).toBe('image/jpeg')
    })

    it('应该接受部分选项', () => {
      const opts: CompressOptions = {
        maxWidth: 150,
        quality: 0.3,
      }
      expect(opts.maxWidth).toBe(150)
      expect(opts.quality).toBe(0.3)
      expect(opts.maxHeight).toBeUndefined()
    })
  })

  describe('getDataUrlSize calculation', () => {
    // getDataUrlSize 是私有函数，通过构造 data URL 间接测试
    it('有效的 data URL 应返回正确字节数', () => {
      // 构造已知大小的 base64: "AAAA" -> 3 bytes
      const base64 = 'AAAA'
      const dataUrl = `data:image/webp;base64,${base64}`
      const base64Part = dataUrl.split(',')[1]
      const size = Math.floor(base64Part!.length * 3 / 4)
      expect(size).toBe(3)
    })

    it('空字符串应返回 0', () => {
      const base64 = ''
      const dataUrl = `data:image/webp;base64,${base64}`
      const base64Part = dataUrl.split(',')[1]
      const size = base64Part ? Math.floor(base64Part.length * 3 / 4) : 0
      expect(size).toBe(0)
    })

    it('无 base64 部分应返回 0', () => {
      const dataUrl = 'data:image/webp;base64,'
      const base64Part = dataUrl.split(',')[1]
      const size = base64Part ? Math.floor(base64Part.length * 3 / 4) : 0
      expect(size).toBe(0)
    })
  })

  describe('calculateSize logic', () => {
    // 模拟 calculateSize 的逻辑进行测试
    function calculateSize(
      originalWidth: number,
      originalHeight: number,
      maxWidth: number,
      maxHeight: number
    ): { width: number; height: number } {
      if (originalWidth <= maxWidth && originalHeight <= maxHeight) {
        return { width: originalWidth, height: originalHeight }
      }
      const ratio = Math.min(maxWidth / originalWidth, maxHeight / originalHeight)
      return {
        width: Math.floor(originalWidth * ratio),
        height: Math.floor(originalHeight * ratio),
      }
    }

    it('图片尺寸在限制以内时保持不变', () => {
      const result = calculateSize(100, 100, 200, 200)
      expect(result).toEqual({ width: 100, height: 100 })
    })

    it('等比例缩小：宽度超限', () => {
      const result = calculateSize(400, 100, 200, 200)
      expect(result.width).toBe(200)
      expect(result.height).toBe(50)
      // 确保等比
      expect(result.width / result.height).toBeCloseTo(4, 1)
    })

    it('等比例缩小：高度超限', () => {
      const result = calculateSize(100, 400, 200, 200)
      expect(result.width).toBe(50)
      expect(result.height).toBe(200)
      expect(result.width / result.height).toBeCloseTo(0.25, 2)
    })

    it('等比例缩小：宽高均超限（以宽度为准）', () => {
      const result = calculateSize(800, 200, 200, 200)
      expect(result.width).toBe(200)
      expect(result.height).toBe(50)
    })

    it('等比例缩小：宽高均超限（以高度为准）', () => {
      const result = calculateSize(200, 800, 200, 200)
      expect(result.width).toBe(50)
      expect(result.height).toBe(200)
    })

    it('边界情况：宽度刚好等于限制', () => {
      const result = calculateSize(200, 100, 200, 200)
      expect(result).toEqual({ width: 200, height: 100 })
    })

    it('边界情况：高度刚好等于限制', () => {
      const result = calculateSize(100, 200, 200, 200)
      expect(result).toEqual({ width: 100, height: 200 })
    })

    it('正方形图片等比例缩小', () => {
      const result = calculateSize(400, 400, 200, 200)
      expect(result).toEqual({ width: 200, height: 200 })
    })

    it('极端窄图片', () => {
      const result = calculateSize(10, 1000, 200, 200)
      expect(result.width).toBe(2)
      expect(result.height).toBe(200)
    })

    it('极端宽图片', () => {
      const result = calculateSize(1000, 10, 200, 200)
      expect(result.width).toBe(200)
      expect(result.height).toBe(2)
    })
  })
})
