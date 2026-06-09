/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getThemeAdapter, setThemeAdapter, type ThemeAdapter, type ThemeMode } from '../theme'
import { resetPlatformCache, setPlatform } from '../platform'

describe('theme adapter', () => {
  beforeEach(() => {
    setThemeAdapter(null as any)
    resetPlatformCache()
    // 重置 DOM 状态
    document.documentElement.classList.remove('utools-dark', 'dark')
    // Mock window.matchMedia for jsdom
    if (!window.matchMedia) {
      Object.defineProperty(window, 'matchMedia', {
        value: vi.fn().mockImplementation((query: string) => ({
          matches: false,
          media: query,
          onchange: null,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          addListener: vi.fn(),
          removeListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
        writable: true,
        configurable: true,
      })
    }
  })

  describe('setThemeAdapter / getThemeAdapter', () => {
    it('应该允许手动设置适配器', () => {
      const mockAdapter: ThemeAdapter = {
        getTheme: () => 'light',
        onThemeChange: () => () => {},
        applyTheme: () => {},
      }
      setThemeAdapter(mockAdapter)
      expect(getThemeAdapter()).toBe(mockAdapter)
    })

    it('手动设置后返回相同实例', () => {
      const mockAdapter: ThemeAdapter = {
        getTheme: () => 'light',
        onThemeChange: () => () => {},
        applyTheme: () => {},
      }
      setThemeAdapter(mockAdapter)
      const a1 = getThemeAdapter()
      const a2 = getThemeAdapter()
      expect(a1).toBe(a2)
    })
  })

  describe('WebThemeAdapter', () => {
    beforeEach(() => {
      setPlatform('web')
      setThemeAdapter(null as any)
      document.documentElement.classList.remove('dark')
    })

    it('在 web 平台下返回 WebThemeAdapter 实例', () => {
      const adapter = getThemeAdapter()
      expect(adapter).toBeDefined()
      expect(typeof adapter.getTheme).toBe('function')
      expect(typeof adapter.onThemeChange).toBe('function')
      expect(typeof adapter.applyTheme).toBe('function')
    })

    it('getTheme 返回 light 或 dark', () => {
      const adapter = getThemeAdapter()
      const theme = adapter.getTheme()
      expect(['light', 'dark']).toContain(theme)
    })

    it('applyTheme dark 应添加 dark class', () => {
      const adapter = getThemeAdapter()
      adapter.applyTheme('dark')
      expect(document.documentElement.classList.contains('dark')).toBe(true)
    })

    it('applyTheme light 应移除 dark class', () => {
      document.documentElement.classList.add('dark')
      const adapter = getThemeAdapter()
      adapter.applyTheme('light')
      expect(document.documentElement.classList.contains('dark')).toBe(false)
    })

    it('applyTheme auto 且暗色时添加 dark class', () => {
      // Mock matchMedia to return dark
      const originalMatchMedia = window.matchMedia
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))

      const adapter = getThemeAdapter()
      adapter.applyTheme('auto')
      expect(document.documentElement.classList.contains('dark')).toBe(true)

      window.matchMedia = originalMatchMedia
    })

    it('onThemeChange 返回清理函数', () => {
      const adapter = getThemeAdapter()
      const unsubscribe = adapter.onThemeChange(() => {})
      expect(typeof unsubscribe).toBe('function')
      unsubscribe()
    })
  })

  describe('UtoolsThemeAdapter', () => {
    beforeEach(() => {
      setPlatform('utools')
      setThemeAdapter(null as any)
      document.body.classList.remove('utools-dark')
      document.documentElement.classList.remove('utools-dark', 'dark')
      ;(window as any).utools = {
        onThemeChange: vi.fn(),
      }
    })

    afterEach(() => {
      delete (window as any).utools
    })

    it('在 utools 平台下返回 UtoolsThemeAdapter 实例', () => {
      const adapter = getThemeAdapter()
      expect(adapter).toBeDefined()
    })

    it('getTheme 检测 body.utools-dark class', () => {
      const adapter = getThemeAdapter()
      // 默认没有 dark class
      expect(adapter.getTheme()).toBe('light')
      // 添加 class
      document.body.classList.add('utools-dark')
      expect(adapter.getTheme()).toBe('dark')
    })

    it('applyTheme dark 添加 utools-dark 和 dark class', () => {
      const adapter = getThemeAdapter()
      adapter.applyTheme('dark')
      expect(document.documentElement.classList.contains('utools-dark')).toBe(true)
      expect(document.documentElement.classList.contains('dark')).toBe(true)
    })

    it('applyTheme light 移除 utools-dark 和 dark class', () => {
      document.documentElement.classList.add('utools-dark', 'dark')
      const adapter = getThemeAdapter()
      adapter.applyTheme('light')
      expect(document.documentElement.classList.contains('utools-dark')).toBe(false)
      expect(document.documentElement.classList.contains('dark')).toBe(false)
    })

    it('onThemeChange 注册 MutationObserver 和 utools 回调', () => {
      const adapter = getThemeAdapter()
      const callback = vi.fn()
      const unsubscribe = adapter.onThemeChange(callback)
      expect(typeof unsubscribe).toBe('function')
      expect((window as any).utools.onThemeChange).toHaveBeenCalled()
      unsubscribe()
    })
  })

  describe('工厂方法缓存', () => {
    it('多次调用返回相同实例', () => {
      setPlatform('web')
      setThemeAdapter(null as any)
      const a1 = getThemeAdapter()
      const a2 = getThemeAdapter()
      expect(a1).toBe(a2)
    })
  })

  describe('WxThemeAdapter', () => {
    beforeEach(() => {
      setPlatform('mp-weixin')
      setThemeAdapter(null as any)
      ;(window as any).wx = {
        getSystemInfoSync: vi.fn(() => ({ theme: 'light' })),
        onThemeChange: vi.fn(),
        offThemeChange: vi.fn(),
        setPageStyle: vi.fn(),
      }
    })

    afterEach(() => {
      delete (window as any).wx
    })

    it('在 mp-weixin 平台下返回 WxThemeAdapter 实例', () => {
      const adapter = getThemeAdapter()
      expect(adapter).toBeDefined()
      expect(typeof adapter.getTheme).toBe('function')
    })

    it('getTheme 返回系统主题 light', () => {
      const adapter = getThemeAdapter()
      expect(adapter.getTheme()).toBe('light')
    })

    it('getTheme 返回系统主题 dark', () => {
      ;(window as any).wx.getSystemInfoSync = vi.fn(() => ({ theme: 'dark' }))
      setThemeAdapter(null as any)
      const adapter = getThemeAdapter()
      expect(adapter.getTheme()).toBe('dark')
    })

    it('getTheme 异常时返回 light', () => {
      ;(window as any).wx.getSystemInfoSync = vi.fn(() => { throw new Error('fail') })
      setThemeAdapter(null as any)
      const adapter = getThemeAdapter()
      expect(adapter.getTheme()).toBe('light')
    })

    it('onThemeChange 注册 wx.onThemeChange 回调', () => {
      const adapter = getThemeAdapter()
      const callback = vi.fn()
      adapter.onThemeChange(callback)
      expect((window as any).wx.onThemeChange).toHaveBeenCalled()
    })

    it('onThemeChange 返回取消函数', () => {
      const adapter = getThemeAdapter()
      const unsubscribe = adapter.onThemeChange(() => {})
      expect(typeof unsubscribe).toBe('function')
      unsubscribe()
    })

    it('applyTheme 不报错', () => {
      const adapter = getThemeAdapter()
      expect(() => adapter.applyTheme('dark')).not.toThrow()
    })
  })

  describe('DouyinThemeAdapter', () => {
    beforeEach(() => {
      setPlatform('mp-douyin')
      setThemeAdapter(null as any)
      ;(window as any).tt = {
        getSystemInfoSync: vi.fn(() => ({ theme: 'light' })),
        onThemeChange: vi.fn(),
        offThemeChange: vi.fn(),
        setPageStyle: vi.fn(),
      }
    })

    afterEach(() => {
      delete (window as any).tt
    })

    it('在 mp-douyin 平台下返回 DouyinThemeAdapter 实例', () => {
      const adapter = getThemeAdapter()
      expect(adapter).toBeDefined()
      expect(typeof adapter.getTheme).toBe('function')
    })

    it('getTheme 返回系统主题 light', () => {
      const adapter = getThemeAdapter()
      expect(adapter.getTheme()).toBe('light')
    })

    it('getTheme 返回系统主题 dark', () => {
      ;(window as any).tt.getSystemInfoSync = vi.fn(() => ({ theme: 'dark' }))
      setThemeAdapter(null as any)
      const adapter = getThemeAdapter()
      expect(adapter.getTheme()).toBe('dark')
    })

    it('getTheme 异常时返回 light', () => {
      ;(window as any).tt.getSystemInfoSync = vi.fn(() => { throw new Error('fail') })
      setThemeAdapter(null as any)
      const adapter = getThemeAdapter()
      expect(adapter.getTheme()).toBe('light')
    })

    it('onThemeChange 注册 tt.onThemeChange 回调', () => {
      const adapter = getThemeAdapter()
      const callback = vi.fn()
      adapter.onThemeChange(callback)
      expect((window as any).tt.onThemeChange).toHaveBeenCalled()
    })

    it('onThemeChange 返回取消函数', () => {
      const adapter = getThemeAdapter()
      const unsubscribe = adapter.onThemeChange(() => {})
      expect(typeof unsubscribe).toBe('function')
      unsubscribe()
    })

    it('onThemeChange 在 tt 不支持时降级返回空函数', () => {
      delete (window as any).tt.onThemeChange
      setThemeAdapter(null as any)
      const adapter = getThemeAdapter()
      const unsubscribe = adapter.onThemeChange(() => {})
      expect(typeof unsubscribe).toBe('function')
      unsubscribe() // 不应报错
    })

    it('applyTheme 不报错', () => {
      const adapter = getThemeAdapter()
      expect(() => adapter.applyTheme('dark')).not.toThrow()
    })
  })
})
