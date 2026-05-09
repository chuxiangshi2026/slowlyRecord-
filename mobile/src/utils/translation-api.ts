/**
 * 翻译 API - 移动端适配版
 * 使用 uni.request 替代 axios
 */

export interface TranslationResult {
  translatedText: string
  platform: string
}

/**
 * 翻译文本（简化版）
 * @param text 要翻译的文本
 * @param from 源语言（默认：auto）
 * @param to 目标语言（默认：zh）
 */
export async function translateText(
  text: string,
  from: string = 'auto',
  to: string = 'zh'
): Promise<TranslationResult> {
  // 使用免费的翻译 API（示例：使用 Google Translate 的简单接口）
  // 实际项目中应该使用后端代理或官方 API
  return new Promise((resolve, reject) => {
    uni.request({
      url: 'https://translate.googleapis.com/translate_a/single',
      method: 'GET',
      data: {
        client: 'gtx',
        sl: from,
        tl: to,
        dt: 't',
        q: text
      },
      success: (res) => {
        try {
          const result = res.data as any
          const translatedText = result[0]?.[0]?.[0] || text
          resolve({
            translatedText,
            platform: 'google'
          })
        } catch (e) {
          reject(new Error('解析翻译结果失败'))
        }
      },
      fail: (err) => {
        reject(new Error(`翻译失败: ${err.errMsg || '未知错误'}`))
      }
    })
  })
}

/**
 * 批量翻译（简化版）
 */
export async function batchTranslate(
  texts: string[],
  from: string = 'auto',
  to: string = 'zh'
): Promise<string[]> {
  const results: string[] = []
  for (const text of texts) {
    try {
      const result = await translateText(text, from, to)
      results.push(result.translatedText)
    } catch {
      results.push(text) // 失败时返回原文
    }
  }
  return results
}

/**
 * 获取发音 URL（使用有道词典的发音接口）
 */
export function getPronunciationUrl(word: string, lang: 'en' | 'us' = 'us'): string {
  const type = lang === 'us' ? '1' : '2'
  return `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=${type}`
}

/**
 * 播放发音
 */
export function playPronunciation(word: string, lang: 'en' | 'us' = 'us'): void {
  const url = getPronunciationUrl(word, lang)
  const audio = uni.createInnerAudioContext()
  audio.src = url
  audio.play()
}
