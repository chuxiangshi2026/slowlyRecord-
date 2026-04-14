import { describe, it, expect } from 'vitest'
import { serializer } from './json-serialize-util'

describe('serializer', () => {
  describe('serialize', () => {
    it('应该正确序列化普通对象', () => {
      const data = { name: 'test', value: 123 }
      const result = serializer.serialize(data)
      expect(result).toBe('{"name":"test","value":123}')
    })

    it('应该正确序列化包含 Date 的对象', () => {
      const date = new Date('2024-01-15T08:30:00.000Z')
      const data = { name: 'test', createdAt: date }
      const result = serializer.serialize(data)
      const parsed = JSON.parse(result)
      expect(parsed.name).toBe('test')
      expect(parsed.createdAt).toEqual({
        __type__: 'Date',
        __value__: '2024-01-15T08:30:00.000Z'
      })
    })

    it('应该正确序列化嵌套对象中的 Date', () => {
      const date = new Date('2024-06-20T14:30:00.000Z')
      const data = {
        user: {
          name: '张三',
          createdAt: date
        },
        items: [1, 2, 3]
      }
      const result = serializer.serialize(data)
      const parsed = JSON.parse(result)
      expect(parsed.user.createdAt).toEqual({
        __type__: 'Date',
        __value__: '2024-06-20T14:30:00.000Z'
      })
    })

    it('应该正确序列化数组', () => {
      const data = [1, 2, 3, 'test']
      const result = serializer.serialize(data)
      expect(result).toBe('[1,2,3,"test"]')
    })

    it('应该正确序列化 null', () => {
      const result = serializer.serialize(null)
      expect(result).toBe('null')
    })
  })

  describe('parse', () => {
    it('应该正确解析普通 JSON 字符串', () => {
      const json = '{"name":"test","value":123}'
      const result = serializer.parse(json) as { name: string; value: number }
      expect(result.name).toBe('test')
      expect(result.value).toBe(123)
    })

    it('应该正确还原 Date 对象', () => {
      const json = '{"name":"test","createdAt":{"__type__":"Date","__value__":"2024-01-15T08:30:00.000Z"}}'
      const result = serializer.parse(json) as { name: string; createdAt: Date }
      expect(result.name).toBe('test')
      expect(result.createdAt instanceof Date).toBe(true)
      expect(result.createdAt.toISOString()).toBe('2024-01-15T08:30:00.000Z')
    })

    it('应该正确解析嵌套的 Date 对象', () => {
      const json = '{"user":{"name":"张三","createdAt":{"__type__":"Date","__value__":"2024-06-20T14:30:00.000Z"}}}'
      const result = serializer.parse(json) as { user: { name: string; createdAt: Date } }
      expect(result.user.name).toBe('张三')
      expect(result.user.createdAt instanceof Date).toBe(true)
    })

    it('应该正确处理 null', () => {
      const result = serializer.parse('null')
      expect(result).toBeNull()
    })
  })

  describe('序列化和反序列化的对称性', () => {
    it('序列化后再解析应该还原原始数据', () => {
      const original = {
        name: '测试',
        createdAt: new Date('2024-01-15T08:30:00.000Z'),
        count: 42
      }
      const serialized = serializer.serialize(original)
      const parsed = serializer.parse(serialized) as typeof original

      expect(parsed.name).toBe(original.name)
      expect(parsed.count).toBe(original.count)
      expect(parsed.createdAt instanceof Date).toBe(true)
      expect(parsed.createdAt.toISOString()).toBe(original.createdAt.toISOString())
    })
  })
})
