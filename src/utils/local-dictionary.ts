/**
 * 本地词典工具 - 轻量级离线翻译
 * 包含约 3000 个常用英语单词及释义
 * 支持外部词典扩展（uTools DB）
 * 支持延迟加载（适合 50000+ 词的大词典）
 */

import {loadDictionaryFromDB, queryWordFromDB, hasDictionaryInDB} from './dictionary-db';

export interface DictionaryEntry {
  word: string;
  phonetic?: string;
  explains: string[];
}

// 延迟加载缓存
let dictionaryCache: Record<string, DictionaryEntry> | null = null;
let phrasesCache: Record<string, string> | null = null;
let dictionaryLoading: Promise<Record<string, DictionaryEntry>> | null = null;
let phrasesLoading: Promise<Record<string, string>> | null = null;

/**
 * 延迟加载词典数据（只在需要时加载）
 * 支持 50000+ 词的大词典，避免启动时阻塞
 */
async function loadDictionaryLazy(): Promise<Record<string, DictionaryEntry>> {
  if (dictionaryCache) {
    return dictionaryCache;
  }
  if (dictionaryLoading) {
    return dictionaryLoading;
  }
  dictionaryLoading = import('./dictionary-data.json')
    .then(module => {
      dictionaryCache = module.default || module;
      console.log('[词典] 加载完成，词条数:', Object.keys(dictionaryCache!).length);
      return dictionaryCache!;
    })
    .catch(err => {
      console.error('[词典] 加载失败:', err);
      dictionaryLoading = null;
      return {};
    });
  return dictionaryLoading;
}

/**
 * 延迟加载短语数据
 */
async function loadPhrasesLazy(): Promise<Record<string, string>> {
  if (phrasesCache) {
    return phrasesCache;
  }
  if (phrasesLoading) {
    return phrasesLoading;
  }
  phrasesLoading = import('./phrases-data.json')
    .then(module => {
      phrasesCache = module.default || module;
      return phrasesCache!;
    })
    .catch(err => {
      console.error('[短语] 加载失败:', err);
      phrasesLoading = null;
      return {};
    });
  return phrasesLoading;
}

/**
 * 获取已加载的词典（同步，仅内部使用）
 * 如果未加载，返回空对象
 */
function getDictionarySync(): Record<string, DictionaryEntry> {
  return dictionaryCache || {};
}

/**
 * 从本地词典查询单词（异步版本，支持延迟加载）
 * @param word 要查询的单词
 * @returns 查询结果，未找到返回 null
 */
export async function queryLocalDictionaryAsync(word: string): Promise<DictionaryEntry | null> {
  const dictionary = await loadDictionaryLazy();
  return queryDictionaryWithData(word, dictionary);
}

/**
 * 从本地词典查询单词（同步版本，首次调用可能返回空）
 * @param word 要查询的单词
 * @returns 查询结果，未找到返回 null
 */
export function queryLocalDictionary(word: string): DictionaryEntry | null {
  const dictionary = getDictionarySync();

  // 如果词典未加载，触发后台加载（下次查询可用）
  if (!dictionaryCache && !dictionaryLoading) {
    loadDictionaryLazy();
  }

  return queryDictionaryWithData(word, dictionary);
}

/**
 * 使用指定词典数据查询单词
 * @param word 要查询的单词
 * @param dictionary 词典数据
 */
function queryDictionaryWithData(
  word: string,
  dictionary: Record<string, DictionaryEntry>
): DictionaryEntry | null {
  // 标准化输入：转小写，去除首尾空格
  const normalizedWord = word.toLowerCase().trim();

  // 调试日志
  console.log('[本地词典] 查询:', normalizedWord, '词典大小:', Object.keys(dictionary).length);

  // 直接查询
  const entry = dictionary[normalizedWord];
  if (entry) {
    return entry;
  }

  // 尝试去除复数形式 (-s, -es)
  if (normalizedWord.endsWith('es')) {
    const singular = normalizedWord.slice(0, -2);
    if (dictionary[singular]) {
      return dictionary[singular];
    }
  }
  if (normalizedWord.endsWith('s')) {
    const singular = normalizedWord.slice(0, -1);
    if (dictionary[singular]) {
      return dictionary[singular];
    }
  }

  // 尝试去除过去式/过去分词 (-ed)
  if (normalizedWord.endsWith('ed')) {
    const base = normalizedWord.slice(0, -2);
    if (dictionary[base]) {
      return dictionary[base];
    }
    // 尝试双写辅音字母的情况 (stopped -> stop)
    const base2 = normalizedWord.slice(0, -1);
    if (dictionary[base2]) {
      return dictionary[base2];
    }
  }

  // 尝试去除进行时 (-ing)
  if (normalizedWord.endsWith('ing')) {
    const base = normalizedWord.slice(0, -3);
    if (dictionary[base]) {
      return dictionary[base];
    }
    // 尝试去e的情况 (making -> make)
    const base2 = base + 'e';
    if (dictionary[base2]) {
      return dictionary[base2];
    }
  }

  // 内置词库未找到，尝试从外部词典（uTools DB）查询
  if (hasDictionaryInDB()) {
    const externalEntry = queryWordFromDB(normalizedWord);
    if (externalEntry) {
      return externalEntry;
    }

    // 同样尝试词形还原
    if (normalizedWord.endsWith('es')) {
      const singular = normalizedWord.slice(0, -2);
      const extEntry = queryWordFromDB(singular);
      if (extEntry) return extEntry;
    }
    if (normalizedWord.endsWith('s')) {
      const singular = normalizedWord.slice(0, -1);
      const extEntry = queryWordFromDB(singular);
      if (extEntry) return extEntry;
    }
    if (normalizedWord.endsWith('ed')) {
      const base = normalizedWord.slice(0, -2);
      const extEntry = queryWordFromDB(base);
      if (extEntry) return extEntry;
    }
    if (normalizedWord.endsWith('ing')) {
      const base = normalizedWord.slice(0, -3);
      const extEntry = queryWordFromDB(base);
      if (extEntry) return extEntry;
      const base2 = base + 'e';
      const extEntry2 = queryWordFromDB(base2);
      if (extEntry2) return extEntry2;
    }
  }

  return null;
}

/**
 * 检查本地词典是否包含某个单词
 * @param word 要检查的单词
 */
export function hasLocalWord(word: string): boolean {
  return queryLocalDictionary(word) !== null;
}

/**
 * 获取本地词典统计信息（包括外部词典）
 * @param useCache 是否使用已缓存的词典数据（默认 true）
 */
export async function getDictionaryStats(useCache = true): Promise<{
  total: number;
  localTotal: number;
  externalTotal: number;
  hasExternal: boolean;
  letterCounts: Record<string, number>
}> {
  // 确保词典已加载
  const dictionary = useCache ? getDictionarySync() : await loadDictionaryLazy();
  const words = Object.keys(dictionary);
  const letterCounts: Record<string, number> = {};

  words.forEach(word => {
    const firstLetter = word[0]?.toLowerCase() || 'unknown';
    letterCounts[firstLetter] = (letterCounts[firstLetter] || 0) + 1;
  });

  // 统计外部词典
  let externalTotal = 0;
  const hasExternal = hasDictionaryInDB();
  if (hasExternal) {
    const externalDict = loadDictionaryFromDB();
    if (externalDict) {
      externalTotal = Object.keys(externalDict).length;
      // 合并统计
      Object.keys(externalDict).forEach(word => {
        const firstLetter = word[0]?.toLowerCase() || 'unknown';
        letterCounts[firstLetter] = (letterCounts[firstLetter] || 0) + 1;
      });
    }
  }

  return {
    total: words.length + externalTotal,
    localTotal: words.length,
    externalTotal,
    hasExternal,
    letterCounts
  };
}

/**
 * 本地翻译结果接口
 */
export interface LocalTranslationResult {
  success: boolean;
  explains?: string;
  phonetic?: string;
  errorMsg?: string;
  isLocal: true; // 标记这是本地翻译结果
}

/**
 * 获取已加载的短语（同步，仅内部使用）
 */
function getPhrasesSync(): Record<string, string> {
  return phrasesCache || {};
}

/**
 * 查找短语翻译（异步版本）
 */
async function findPhraseAsync(text: string): Promise<string | undefined> {
  const phrases = await loadPhrasesLazy();
  return phrases[text];
}

/**
 * 查找短语翻译（同步版本）
 */
function findPhraseSync(text: string): string | undefined {
  const phrases = getPhrasesSync();
  // 如果未加载，触发后台加载
  if (!phrasesCache && !phrasesLoading) {
    loadPhrasesLazy();
  }
  return phrases[text];
}

/**
 * 逐词翻译句子（异步版本）
 * @param sentence 要翻译的句子
 * @param dictionary 词典数据
 * @returns 翻译结果
 */
async function translateSentenceByWordsAsync(
  sentence: string,
  dictionary: Record<string, DictionaryEntry>
): Promise<LocalTranslationResult> {
  // 清理并分割句子
  const words = sentence
    .toLowerCase()
    .replace(/[.,!?;:"'()]/g, ' ')  // 替换标点为空格
    .split(/\s+/)                    // 按空格分割
    .filter(w => w.length > 0);      // 过滤空字符串

  if (words.length === 0) {
    return {
      success: false,
      errorMsg: '无法识别的文本',
      isLocal: true
    };
  }

  // 逐个单词翻译
  const translations: string[] = [];

  for (const word of words) {
    const entry = queryDictionaryWithData(word, dictionary);
    if (entry && entry.explains.length > 0) {
      // 取第一个释义，去掉词性标记
      const meaning = entry.explains[0].replace(/^(n\.|v\.|adj\.|adv\.|prep\.|conj\.|pron\.|art\.|num\.|int\.)\s*/, '');
      translations.push(meaning);
    } else {
      // 尝试简单的词形还原（去掉常见的后缀）
      const baseForm = tryGetBaseForm(word);
      const baseEntry = baseForm ? queryDictionaryWithData(baseForm, dictionary) : null;
      if (baseEntry && baseEntry.explains.length > 0) {
        const meaning = baseEntry.explains[0].replace(/^(n\.|v\.|adj\.|adv\.|prep\.|conj\.|pron\.|art\.|num\.|int\.)\s*/, '');
        translations.push(meaning);
      } else {
        // 词库中没有，显示原单词
        translations.push(word);
      }
    }
  }

  // 拼接翻译结果
  const translatedText = translations.join('；');

  return {
    success: true,
    explains: translatedText,
    isLocal: true
  };
}

/**
 * 逐词翻译句子（同步版本）
 * @param sentence 要翻译的句子
 * @returns 翻译结果
 */
function translateSentenceByWords(sentence: string): LocalTranslationResult {
  return translateSentenceByWordsSync(sentence, getDictionarySync());
}

/**
 * 逐词翻译句子（同步实现）
 */
function translateSentenceByWordsSync(
  sentence: string,
  dictionary: Record<string, DictionaryEntry>
): LocalTranslationResult {
  // 清理并分割句子
  const words = sentence
    .toLowerCase()
    .replace(/[.,!?;:"'()]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 0);

  if (words.length === 0) {
    return {
      success: false,
      errorMsg: '无法识别的文本',
      isLocal: true
    };
  }

  const translations: string[] = [];

  for (const word of words) {
    const entry = queryDictionaryWithData(word, dictionary);
    if (entry && entry.explains.length > 0) {
      const meaning = entry.explains[0].replace(/^(n\.|v\.|adj\.|adv\.|prep\.|conj\.|pron\.|art\.|num\.|int\.)\s*/, '');
      translations.push(meaning);
    } else {
      const baseForm = tryGetBaseForm(word);
      const baseEntry = baseForm ? queryDictionaryWithData(baseForm, dictionary) : null;
      if (baseEntry && baseEntry.explains.length > 0) {
        const meaning = baseEntry.explains[0].replace(/^(n\.|v\.|adj\.|adv\.|prep\.|conj\.|pron\.|art\.|num\.|int\.)\s*/, '');
        translations.push(meaning);
      } else {
        // 词库中没有，显示原单词
        translations.push(word);
      }
    }
  }

  const translatedText = translations.join('；');

  return {
    success: true,
    explains: translatedText,
    isLocal: true
  };
}

/**
 * 尝试获取单词的基本形式（简单词形还原）
 */
function tryGetBaseForm(word: string): string | null {
  // 简单的复数/时态还原规则
  if (word.endsWith('ies') && word.length > 4) {
    return word.slice(0, -3) + 'y';  // families -> family
  }
  if (word.endsWith('es') && word.length > 3) {
    return word.slice(0, -2);  // boxes -> box
  }
  if (word.endsWith('s') && word.length > 3 && !word.endsWith('ss')) {
    return word.slice(0, -1);  // books -> book
  }
  if (word.endsWith('ing') && word.length > 5) {
    const base = word.slice(0, -3);
    return base;  // running -> run
  }
  if (word.endsWith('ed') && word.length > 4) {
    return word.slice(0, -2);  // walked -> walk
  }
  return null;
}

/**
 * 使用本地词典翻译（异步版本，推荐用于大词典）
 * @param text 要翻译的文本
 * @returns 翻译结果
 */
export async function translateWithLocalDictionaryAsync(text: string): Promise<LocalTranslationResult> {
  const trimmedText = text.trim().toLowerCase();

  // 空文本检查
  if (!trimmedText) {
    return {
      success: false,
      errorMsg: '请输入要翻译的文本',
      isLocal: true
    };
  }

  // 确保词典和短语都已加载
  const [dictionary, phrases] = await Promise.all([
    loadDictionaryLazy(),
    loadPhrasesLazy()
  ]);

  // 1. 首先检查是否是常用短语/句子（直接映射）
  const phraseTranslation = phrases[trimmedText];
  if (phraseTranslation) {
    return {
      success: true,
      explains: phraseTranslation,
      isLocal: true
    };
  }

  // 2. 如果是单个单词，直接查词典
  if (!trimmedText.includes(' ')) {
    const entry = queryDictionaryWithData(trimmedText, dictionary);
    if (entry) {
      return {
        success: true,
        explains: entry.explains.join('；'),
        phonetic: entry.phonetic,
        isLocal: true
      };
    }

    // 尝试词形还原
    const baseForm = tryGetBaseForm(trimmedText);
    if (baseForm) {
      const baseEntry = queryDictionaryWithData(baseForm, dictionary);
      if (baseEntry) {
        return {
          success: true,
          explains: baseEntry.explains.join('；'),
          phonetic: baseEntry.phonetic,
          isLocal: true
        };
      }
    }

    return {
      success: false,
      errorMsg: `词库暂未收录 "${trimmedText}"，建议切换至网络翻译`,
      isLocal: true
    };
  }

  // 3. 句子/短语：使用逐词翻译
  return translateSentenceByWordsAsync(trimmedText, dictionary);
}

/**
 * 使用本地词典翻译（同步版本，首次调用可能返回未找到）
 * @param text 要翻译的文本
 * @returns 翻译结果
 */
export function translateWithLocalDictionary(text: string): LocalTranslationResult {
  const trimmedText = text.trim().toLowerCase();

  // 空文本检查
  if (!trimmedText) {
    return {
      success: false,
      errorMsg: '请输入要翻译的文本',
      isLocal: true
    };
  }

  const dictionary = getDictionarySync();
  const phrases = getPhrasesSync();

  // 如果数据未加载，触发后台加载
  if (!dictionaryCache && !dictionaryLoading) {
    loadDictionaryLazy();
  }
  if (!phrasesCache && !phrasesLoading) {
    loadPhrasesLazy();
  }

  // 1. 首先检查是否是常用短语/句子（直接映射）
  const phraseTranslation = phrases[trimmedText];
  if (phraseTranslation) {
    return {
      success: true,
      explains: phraseTranslation,
      isLocal: true
    };
  }

  // 2. 如果是单个单词，直接查词典
  if (!trimmedText.includes(' ')) {
    const entry = queryDictionaryWithData(trimmedText, dictionary);
    if (entry) {
      return {
        success: true,
        explains: entry.explains.join('；'),
        phonetic: entry.phonetic,
        isLocal: true
      };
    }

    // 尝试词形还原
    const baseForm = tryGetBaseForm(trimmedText);
    if (baseForm) {
      const baseEntry = queryDictionaryWithData(baseForm, dictionary);
      if (baseEntry) {
        return {
          success: true,
          explains: baseEntry.explains.join('；'),
          phonetic: baseEntry.phonetic,
          isLocal: true
        };
      }
    }

    return {
      success: false,
      errorMsg: `词库暂未收录 "${trimmedText}"，建议切换至网络翻译`,
      isLocal: true
    };
  }

  // 3. 句子/短语：使用逐词翻译
  return translateSentenceByWords(trimmedText);
}

export default {
  queryLocalDictionary,
  queryLocalDictionaryAsync,
  hasLocalWord,
  getDictionaryStats,
  translateWithLocalDictionary,
  translateWithLocalDictionaryAsync,
  // 延迟加载相关
  loadDictionaryLazy,
  loadPhrasesLazy
};

// 外部词典相关函数导出（从 dictionary-db.ts 重新导出）
export {
  saveDictionaryToDB,
  loadDictionaryFromDB,
  hasDictionaryInDB,
  getDictionaryVersion,
  removeDictionaryFromDB,
  queryWordFromDB,
  importDictionaryFromJSON,
  importDictionaryFromFile,
  getExternalDictionaryCount
} from './dictionary-db';
