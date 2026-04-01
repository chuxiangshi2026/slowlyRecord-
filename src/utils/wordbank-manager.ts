/**
 * 词库管理工具
 * 使用 utools 本地数据库存储多词库数据
 */
import type { Word } from '@/types/words';
import { v4 as uuidv4 } from 'uuid';
import { DB_KEY_WORDBANK } from '@/constants';
import cloneDeep from 'lodash.clonedeep';

// 词库数据结构
export interface WordBank {
  id: string;           // 词库唯一标识
  name: string;         // 词库名称
  words: Word[];        // 单词列表
  createdAt: number;    // 创建时间
  updatedAt: number;    // 更新时间
  isDefault?: boolean;  // 是否为默认词库（我的词库）
}

// 词库数据库文档结构
interface WordBankDoc {
  _id: string;
  _rev?: string;
  type: 'wordbank';
  data: WordBank[];
  updatedAt: number;
}

// 存储键名
const WORDBANK_DOC_ID = DB_KEY_WORDBANK;
const CURRENT_WORDBANK_KEY = 'slowly-record-current-wordbank';

/**
 * 从 utools 数据库获取词库文档
 */
function getWordBankDoc(): WordBankDoc | null {
  try {
    const doc = window.utools.db.get(WORDBANK_DOC_ID) as WordBankDoc | null;
    return doc;
  } catch (e) {
    console.error('获取词库文档失败:', e);
    return null;
  }
}

/**
 * 保存词库文档到 utools 数据库
 */
async function saveWordBankDoc(banks: WordBank[]): Promise<boolean> {
  try {
    const existingDoc = getWordBankDoc();
    const doc: WordBankDoc = {
      _id: WORDBANK_DOC_ID,
      type: 'wordbank',
      data: cloneDeep(banks),
      updatedAt: Date.now()
    };
    
    if (existingDoc?._rev) {
      doc._rev = existingDoc._rev;
    }
    
    const result = await window.utools.db.promises.put(doc);
    
    if (result.ok) {
      return true;
    } else {
      console.error('保存词库文档失败:', result.message);
      return false;
    }
  } catch (e) {
    console.error('保存词库文档异常:', e);
    return false;
  }
}

/**
 * 获取所有词库列表
 */
export function getAllWordBanks(): WordBank[] {
  const doc = getWordBankDoc();
  if (doc?.data && Array.isArray(doc.data) && doc.data.length > 0) {
    return doc.data;
  }
  
  // 如果没有数据，创建默认词库
  const defaultBank = createDefaultWordBank();
  saveWordBankDoc([defaultBank]);
  return [defaultBank];
}

/**
 * 获取当前选中的词库ID
 */
export function getCurrentWordBankId(): string {
  try {
    const id = localStorage.getItem(CURRENT_WORDBANK_KEY);
    if (id) {
      // 检查词库是否存在
      const banks = getAllWordBanks();
      if (banks.find(b => b.id === id)) {
        return id;
      }
    }
  } catch (e) {
    console.error('获取当前词库ID失败:', e);
  }
  // 返回默认词库ID
  const banks = getAllWordBanks();
  const defaultBank = banks.find(b => b.isDefault);
  return defaultBank?.id || banks[0]?.id || '';
}

/**
 * 设置当前选中的词库
 */
export function setCurrentWordBankId(id: string): void {
  try {
    localStorage.setItem(CURRENT_WORDBANK_KEY, id);
  } catch (e) {
    console.error('设置当前词库ID失败:', e);
  }
}

/**
 * 创建默认词库（我的词库）
 */
export function createDefaultWordBank(): WordBank {
  return {
    id: 'default',
    name: '我的词库',
    words: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isDefault: true
  };
}

/**
 * 创建新词库
 * @param name 词库名称
 * @param words 初始单词列表（可选）
 */
export async function createWordBank(name: string, words: Word[] = []): Promise<WordBank> {
  const bank: WordBank = {
    id: uuidv4(),
    name: name.trim() || '未命名词库',
    words: cloneDeep(words),
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  
  const banks = getAllWordBanks();
  banks.push(bank);
  await saveWordBankDoc(banks);
  
  return bank;
}

/**
 * 保存词库（新增或更新）
 */
export async function saveWordBank(bank: WordBank): Promise<boolean> {
  const banks = getAllWordBanks();
  const index = banks.findIndex(b => b.id === bank.id);
  
  bank.updatedAt = Date.now();
  
  if (index >= 0) {
    banks[index] = cloneDeep(bank);
  } else {
    banks.push(cloneDeep(bank));
  }
  
  return await saveWordBankDoc(banks);
}

/**
 * 获取指定词库
 */
export function getWordBank(id: string): WordBank | null {
  const banks = getAllWordBanks();
  return banks.find(b => b.id === id) || null;
}

/**
 * 删除词库
 * @returns 是否删除成功（默认词库不能删除）
 */
export async function deleteWordBank(id: string): Promise<boolean> {
  try {
    const bank = getWordBank(id);
    if (bank?.isDefault) {
      return false; // 默认词库不能删除
    }
    
    const banks = getAllWordBanks();
    const filtered = banks.filter(b => b.id !== id);
    
    const success = await saveWordBankDoc(filtered);
    if (!success) return false;
    
    // 如果删除的是当前选中的词库，切换到默认词库
    const currentId = getCurrentWordBankId();
    if (currentId === id) {
      const defaultBank = filtered.find(b => b.isDefault);
      setCurrentWordBankId(defaultBank?.id || filtered[0]?.id || '');
    }
    
    return true;
  } catch (e) {
    console.error('删除词库失败:', e);
    return false;
  }
}

/**
 * 更新词库名称
 */
export async function updateWordBankName(id: string, name: string): Promise<boolean> {
  const bank = getWordBank(id);
  if (!bank) return false;
  
  bank.name = name.trim() || bank.name;
  bank.updatedAt = Date.now();
  
  return await saveWordBank(bank);
}

/**
 * 更新词库单词列表
 */
export async function updateWordBankWords(id: string, words: Word[]): Promise<boolean> {
  const bank = getWordBank(id);
  if (!bank) return false;
  
  bank.words = cloneDeep(words);
  bank.updatedAt = Date.now();
  
  return await saveWordBank(bank);
}

/**
 * 从内置词库导入到指定词库
 */
export async function importFromBuiltinWordBank(
  targetBankId: string, 
  builtinBankType: string
): Promise<{ success: boolean; count: number }> {
  try {
    const { fetchWordBank } = await import('./wordbank-service');
    const words = await fetchWordBank(builtinBankType as any, { priority: 'online', useCache: true });
    
    if (words.length === 0) {
      return { success: false, count: 0 };
    }
    
    const bank = getWordBank(targetBankId);
    if (!bank) return { success: false, count: 0 };
    
    // 去重：基于 word.text 属性
    const existingTexts = new Set(bank.words.map(w => w.text.toLowerCase()));
    const uniqueWords = words.filter(w => !existingTexts.has(w.text.toLowerCase()));
    
    if (uniqueWords.length === 0) {
      return { success: true, count: 0 };
    }
    
    bank.words.push(...cloneDeep(uniqueWords));
    bank.updatedAt = Date.now();
    
    const success = await saveWordBank(bank);
    
    return { success, count: uniqueWords.length };
  } catch (e) {
    console.error('从内置词库导入失败:', e);
    return { success: false, count: 0 };
  }
}

/**
 * 导出词库为JSON
 */
export function exportWordBankToJson(id: string): string {
  const bank = getWordBank(id);
  if (!bank) return '';
  return JSON.stringify(bank.words, null, 2);
}
