import { setDbAdapter } from './db'
import { MiniProgramDbAdapter } from './db-miniprogram'

/**
 * 注册移动端适配器
 */
export function registerMobileAdapters() {
  setDbAdapter(new MiniProgramDbAdapter())
}
