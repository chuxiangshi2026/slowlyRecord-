/**
 * 移动端 TTS 适配器
 * 独立于主项目，避免引入浏览器 API（new Audio、SpeechSynthesis 等）
 */

export interface TtsAdapter {
  speak(text: string, options?: { lang?: string; rate?: number; pitch?: number }): void
  stop(): void
  playAudio(url: string): Promise<void>
}

class MiniProgramTtsAdapter implements TtsAdapter {
  private innerAudio: any = null

  speak(_text: string, _options?: { lang?: string; rate?: number; pitch?: number }): void {
    console.warn('MiniProgramTtsAdapter.speak: Use playAudio with TTS URL instead')
  }

  stop(): void {
    if (this.innerAudio) {
      this.innerAudio.stop()
      this.innerAudio = null
    }
  }

  async playAudio(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.innerAudio = uni.createInnerAudioContext()
      this.innerAudio!.src = url
      this.innerAudio!.onEnded(() => { this.innerAudio = null; resolve() })
      this.innerAudio!.onError((err) => { this.innerAudio = null; reject(err) })
      this.innerAudio!.play()
    })
  }
}

let _ttsAdapter: TtsAdapter | null = null

export function getTtsAdapter(): TtsAdapter {
  if (!_ttsAdapter) {
    _ttsAdapter = new MiniProgramTtsAdapter()
  }
  return _ttsAdapter
}

export function setTtsAdapter(adapter: TtsAdapter): void {
  _ttsAdapter = adapter
}
