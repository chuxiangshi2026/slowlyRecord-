/**
 * 移动端工具模块 - 重导出入口
 * 保持向后兼容：从 '@/stores/useUtils' 导入时仍可用
 * 
 * ⚠️ 优化提示：建议从具体子模块直接导入，减少主包体积
 *   - 主包页面只需：import { queryOfflineDict } from '@/stores/useUtils/offline-dict'
 *   - 分包页面按需：import { translateText } from '@/stores/useUtils/translation'
 */

// 类型
export type { TranslationPlatform, TranslationResult, WordBankType, WordBankInfo, Word, LoadStrategy, OcrWordResult, MobileSyncBank, MobileSyncData, SyncResult, RestoreResult } from './useUtils/types'

// 词库
export { WORDBANK_LIST, DEFAULT_STRATEGY, loadWordBank, isWordBankCached, saveWordBankCache, getWordBankInfo, getAllWordBankInfo, downloadWordBank, clearWordBankCache, importWordsFromBank } from './useUtils/wordbank'

// 离线词典
export { queryOfflineDict, hasOfflineDict, getOfflineDictSize, queryPhoneticFromCache, getPronunciationUrl, playPronunciation } from './useUtils/offline-dict'

// 翻译
export { translateText, batchTranslate, setTranslationPlatform, getTranslationPlatform, getTranslationApiKey, setTranslationApiKey, hasCustomTranslationApiKey, TRANSLATION_PLATFORM_LINKS } from './useUtils/translation'

// 同步
export { pushToServer, pullFromServer, setSyncServerUrl, getSyncServerUrl, resetSyncServer, checkServerAvailable } from './useUtils/sync'

// 二维码
export { generateQRMatrix, drawQrCode } from './useUtils/qrcode'

// OCR
export { recognizeImageWords } from './useUtils/ocr'
