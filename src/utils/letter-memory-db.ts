import type { LetterImageAssociation, LetterMemoryTraining, LetterTrainingResult, LetterTrainingProgress } from "@/types/letter-memory";
import { log } from "@/utils/logger";
import cloneDeep from "lodash.clonedeep";
import { DB_KEY_LETTER_MEMORY } from "@/constants";
import { getDbAdapter } from "@/adapters/db";

const DB_KEY_PREFIX = DB_KEY_LETTER_MEMORY;
const TRAINING_KEY = DB_KEY_PREFIX + 'training';
const RESULT_KEY_PREFIX = DB_KEY_PREFIX + 'result_';
const PROGRESS_KEY = DB_KEY_PREFIX + 'progress';

// 获取数据库适配器
function getDb() {
  return getDbAdapter();
}

// 基础 CouchDB 文档类型
interface BaseCouchDoc {
  _id: string;
  _rev?: string;
  type: string;
  createdAt?: number;
}

/**
 * 获取用户的字母映射训练数据
 */
export function getLetterMemoryTraining(): LetterMemoryTraining | null {
  const allDocs = getDb().allDocs(DB_KEY_PREFIX) as BaseCouchDoc[];
  const training = allDocs.find((doc) => doc.type === 'letter_memory_training');
  return training as LetterMemoryTraining || null;
}

/**
 * 获取所有字母-图片关联
 */
export function getAllAssociations(): LetterImageAssociation[] {
  const training = getLetterMemoryTraining();
  return training?.associations || [];
}

/**
 * 获取单个字母的图片关联
 */
export function getAssociationByLetter(letter: string): LetterImageAssociation | undefined {
  const associations = getAllAssociations();
  return associations.find(a => a.letter === letter);
}

/**
 * 保存或更新字母-图片关联
 */
export async function saveAssociation(association: LetterImageAssociation): Promise<DbReturn> {
  log.i('保存字母图片关联', association);

  let training = getLetterMemoryTraining();
  const now = Date.now();

  if (!training) {
    training = {
      _id: TRAINING_KEY + Date.now(),
      type: 'letter_memory_training',
      associations: [association],
      createdAt: now,
      updatedAt: now
    };
  } else {
    const existingIndex = training.associations.findIndex(a => a.letter === association.letter);
    if (existingIndex >= 0) {
      training.associations[existingIndex] = association;
    } else {
      training.associations.push(association);
    }
    training.updatedAt = now;
  }

  const cleanedData = cloneDeep(training);
  if (training._rev) {
    cleanedData._rev = training._rev;
  }

  const result = await getDb().promises.put(cleanedData);

  if (result.ok) {
    log.d('保存字母图片关联成功');
    training._rev = result.rev;
  } else if (result.error) {
    log.e('保存字母图片关联失败', result.message);
  }

  return result;
}

/**
 * 删除字母-图片关联
 */
export async function removeAssociation(letter: string): Promise<DbReturn> {
  log.i('删除字母图片关联', letter);

  const training = getLetterMemoryTraining();
  if (!training) {
    return { ok: true, id: '', rev: '' };
  }

  training.associations = training.associations.filter(a => a.letter !== letter);
  training.updatedAt = Date.now();

  const cleanedData = cloneDeep(training);
  if (training._rev) {
    cleanedData._rev = training._rev;
  }

  const result = await getDb().promises.put(cleanedData);

  if (result.ok) {
    log.d('删除字母图片关联成功');
    training._rev = result.rev;
  } else if (result.error) {
    log.e('删除字母图片关联失败', result.message);
  }

  return result;
}

/**
 * 保存训练结果（只保留最近三条）
 */
export async function saveTrainingResult(result: Omit<LetterTrainingResult, '_id'>): Promise<DbReturn> {
  log.i('保存字母训练结果', result);

  const resultDoc: LetterTrainingResult = {
    ...result,
    _id: RESULT_KEY_PREFIX + Date.now()
  };

  const cleanedData = cloneDeep(resultDoc);
  const dbResult = await getDb().promises.put(cleanedData);

  if (dbResult.ok) {
    log.d('保存字母训练结果成功');
    cleanupOldTrainingResults(3);
  } else if (dbResult.error) {
    log.e('保存字母训练结果失败', dbResult.message);
  }

  return dbResult;
}

/**
 * 清理旧的训练结果，只保留最近 N 条
 */
function cleanupOldTrainingResults(keepCount: number): void {
  const allDocs = getDb().allDocs(RESULT_KEY_PREFIX) as BaseCouchDoc[];
  const results = allDocs
    .filter((doc): doc is LetterTrainingResult => doc.type === 'letter_memory_result')
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));

  if (results.length > keepCount) {
    const toDelete = results.slice(keepCount);
    toDelete.forEach((doc) => {
      try {
        getDb().remove(doc._id);
      } catch (error) {
        log.e(`删除字母训练结果异常: ${doc._id}`, error);
      }
    });
  }
}

/**
 * 获取所有训练结果
 */
export function getAllTrainingResults(): LetterTrainingResult[] {
  const allDocs = getDb().allDocs(RESULT_KEY_PREFIX) as BaseCouchDoc[];
  return allDocs
    .filter((doc): doc is LetterTrainingResult => doc.type === 'letter_memory_result')
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
}

/**
 * 清空所有训练结果
 */
export function clearAllTrainingResults(): void {
  const allDocs = getDb().allDocs(RESULT_KEY_PREFIX) as BaseCouchDoc[];
  allDocs.forEach((doc) => {
    if (doc.type === 'letter_memory_result') {
      try {
        getDb().remove(doc._id);
      } catch (error) {
        log.e(`删除字母训练结果异常: ${doc._id}`, error);
      }
    }
  });
}

/**
 * 保存训练进度
 */
export async function saveTrainingProgress(progress: LetterTrainingProgress): Promise<DbReturn> {
  const cleanedData = cloneDeep(progress);
  return await getDb().promises.put(cleanedData);
}

/**
 * 获取训练进度
 */
export function getTrainingProgress(): LetterTrainingProgress | null {
  try {
    const doc = getDb().get(PROGRESS_KEY);
    if (!doc || typeof doc !== 'object' || doc.type !== 'letter_memory_progress') {
      return null;
    }
    return doc as LetterTrainingProgress;
  } catch (error) {
    log.e('获取字母训练进度失败', error);
    return null;
  }
}

/**
 * 清除训练进度
 */
export function clearTrainingProgress(): void {
  try {
    const doc = getDb().get(PROGRESS_KEY);
    if (doc?._id) {
      getDb().remove(doc._id);
    }
  } catch (error) {
    log.e('清除字母训练进度异常', error);
  }
}
