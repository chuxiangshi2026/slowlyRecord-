/// <reference types="vite/client" />
//此文件为Vite引入必要的env定义

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}
