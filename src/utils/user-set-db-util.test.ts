/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getSetDb, addAndUpdateSetDb, removeSetDb } from './user-set-db-util'

// Mock DB adapter
const mockAllDocs = vi.fn()
const mockGet = vi.fn()
const mockRemove = vi.fn()
const mockPromisesPut = vi.fn()

vi.mock('@/adapters/db', () => ({
  getDbAdapter: () => ({
    get: mockGet,
    allDocs: mockAllDocs,
    remove: mockRemove,
    promises: {
      put: mockPromisesPut,
    },
  }),
}))

// Mock logger
vi.mock('@/utils/logger', () => ({
  log: {
    d: vi.fn(),
    i: vi.fn(),
    w: vi.fn(),
    e: vi.fn(),
  },
}))

const DB_KEY_USER_SET = 'user-set'

describe('user-set-db-util', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getSetDb', () => {
    it('应该返回用户设置', () => {
      const mockUserSet = {
        _id: DB_KEY_USER_SET,
        _rev: 'rev1',
        theme: 'dark',
        fontSize: 14,
      }
      mockAllDocs.mockReturnValue([mockUserSet])

      const result = getSetDb()

      expect(result).toEqual(mockUserSet)
      expect(mockAllDocs).toHaveBeenCalledWith(DB_KEY_USER_SET)
    })

    it('数据库为空时返回 null', () => {
      mockAllDocs.mockReturnValue([])

      const result = getSetDb()

      expect(result).toBeNull()
    })

    it('静默模式不输出日志', () => {
      const mockUserSet = { _id: DB_KEY_USER_SET }
      mockAllDocs.mockReturnValue([mockUserSet])

      const result = getSetDb(true)

      expect(result).toEqual(mockUserSet)
    })
  })

  describe('addAndUpdateSetDb', () => {
    it('应该成功保存设置', async () => {
      const userSet: any = {
        _id: DB_KEY_USER_SET,
        theme: 'light',
        fontSize: 16,
      }
      mockPromisesPut.mockResolvedValue({ ok: true, rev: 'new-rev' })

      const result = await addAndUpdateSetDb(userSet)

      expect(result.ok).toBe(true)
      expect(mockPromisesPut).toHaveBeenCalled()
      // 应更新 _rev
      expect(userSet._rev).toBe('new-rev')
    })

    it('userSet 为 null 时返回错误', async () => {
      const result = await addAndUpdateSetDb(null)

      expect(result.ok).toBe(false)
      expect(result.error).toBe(true)
      expect(mockPromisesPut).not.toHaveBeenCalled()
    })

    it('保存失败时返回错误信息', async () => {
      const userSet: any = { _id: DB_KEY_USER_SET }
      mockPromisesPut.mockResolvedValue({
        ok: false,
        error: true,
        message: 'Save error',
      })

      const result = await addAndUpdateSetDb(userSet)

      expect(result.ok).toBe(false)
      expect(result.error).toBe(true)
    })
  })

  describe('removeSetDb', () => {
    it('应该成功删除设置', () => {
      mockRemove.mockReturnValue({ ok: true })

      removeSetDb('test-id')

      expect(mockRemove).toHaveBeenCalledWith('test-id')
    })

    it('删除失败时输出错误日志', () => {
      mockRemove.mockReturnValue({
        ok: false,
        error: true,
        message: 'Remove error',
      })

      // 不应抛出异常
      expect(() => removeSetDb('test-id')).not.toThrow()
      expect(mockRemove).toHaveBeenCalledWith('test-id')
    })
  })
})
