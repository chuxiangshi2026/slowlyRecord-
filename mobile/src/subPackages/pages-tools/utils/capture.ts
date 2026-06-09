/**
 * 截图适配器 - 仅被分包页面引用
 * 从 adapters/ 迁移到分包目录，避免打入主包
 */

export interface CaptureResult {
  base64: string
  path?: string
}

export interface OCRResult {
  text: string
  confidence: number
}

export interface CaptureAdapter {
  capture(): Promise<CaptureResult>
  ocr(imageData: string): Promise<OCRResult[]>
}

class UniAppCaptureAdapter implements CaptureAdapter {
  async capture(): Promise<CaptureResult> {
    return new Promise((resolve, reject) => {
      uni.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: (res: any) => {
          const tempPath = res.tempFilePaths?.[0] || res.tempFiles?.[0]?.path
          if (!tempPath) {
            reject(new Error('获取图片失败'))
            return
          }

          // #ifdef MP-WEIXIN || MP-TOUTIAO
          try {
            const fs = uni.getFileSystemManager()
            const base64 = fs.readFileSync(tempPath, 'base64')
            resolve({ base64, path: tempPath })
          } catch (e) {
            reject(e)
          }
          // #endif

          // #ifdef H5 || APP-PLUS
          fetch(tempPath)
            .then(r => r.blob())
            .then(blob => {
              const reader = new FileReader()
              reader.onload = () => {
                const base64 = (reader.result as string).split(',')[1]
                resolve({ base64, path: tempPath })
              }
              reader.onerror = () => reject(new Error('读取图片失败'))
              reader.readAsDataURL(blob)
            })
            .catch(reject)
          // #endif
        },
        fail: (err: any) => reject(err || new Error('选择图片失败')),
      })
    })
  }

  async ocr(_imageData: string): Promise<OCRResult[]> {
    uni.showToast({ title: 'OCR 功能需配置云服务', icon: 'none' })
    return []
  }
}

let _captureAdapter: CaptureAdapter | null = null

export function getCaptureAdapter(): CaptureAdapter {
  if (!_captureAdapter) {
    _captureAdapter = new UniAppCaptureAdapter()
  }
  return _captureAdapter
}
