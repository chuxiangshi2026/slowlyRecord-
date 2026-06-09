/**
 * 通知适配器
 */
import { getPlatform } from './platform'

export interface NotificationAdapter {
  /** 显示通知 */
  show(title: string, body?: string): void
  /** 显示成功提示 */
  success(message: string): void
  /** 显示警告提示 */
  warning(message: string): void
  /** 显示错误提示 */
  error(message: string): void
}

class UtoolsNotification implements NotificationAdapter {
  show(title: string, body?: string): void {
    ;(window as any).utools?.showNotification?.(body || title)
  }
  success(message: string): void {
    ;(window as any).utools?.showNotification?.(message)
  }
  warning(message: string): void {
    ;(window as any).utools?.showNotification?.(message)
  }
  error(message: string): void {
    ;(window as any).utools?.showNotification?.(message)
  }
}

class WxNotification implements NotificationAdapter {
  show(title: string, body?: string): void {
    const wx = (window as any).wx
    wx.showToast({ title: body || title, icon: 'none' })
  }
  success(message: string): void {
    const wx = (window as any).wx
    wx.showToast({ title: message, icon: 'success' })
  }
  warning(message: string): void {
    const wx = (window as any).wx
    wx.showToast({ title: message, icon: 'none' })
  }
  error(message: string): void {
    const wx = (window as any).wx
    wx.showToast({ title: message, icon: 'error' })
  }
}

class DouyinNotification implements NotificationAdapter {
  show(title: string, body?: string): void {
    const tt = (window as any).tt
    tt.showToast({ title: body || title, icon: 'none' })
  }
  success(message: string): void {
    const tt = (window as any).tt
    tt.showToast({ title: message, icon: 'success' })
  }
  warning(message: string): void {
    const tt = (window as any).tt
    tt.showToast({ title: message, icon: 'none' })
  }
  error(message: string): void {
    const tt = (window as any).tt
    tt.showToast({ title: message, icon: 'error' })
  }
}

class WebNotification implements NotificationAdapter {
  show(title: string, body?: string): void {
    if (Notification.permission === 'granted') {
      new Notification(title, { body })
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          new Notification(title, { body })
        }
      })
    }
  }
  success(message: string): void {
    console.log('[Success]', message)
  }
  warning(message: string): void {
    console.warn('[Warning]', message)
  }
  error(message: string): void {
    console.error('[Error]', message)
  }
}

let _notificationAdapter: NotificationAdapter | null = null

export function getNotificationAdapter(): NotificationAdapter {
  if (_notificationAdapter) return _notificationAdapter

  const platform = getPlatform()
  switch (platform) {
    case 'utools':
      _notificationAdapter = new UtoolsNotification()
      break
    case 'mp-weixin':
      _notificationAdapter = new WxNotification()
      break
    case 'mp-douyin':
      _notificationAdapter = new DouyinNotification()
      break
    default:
      _notificationAdapter = new WebNotification()
  }
  return _notificationAdapter
}

export function setNotificationAdapter(adapter: NotificationAdapter): void {
  _notificationAdapter = adapter
}
