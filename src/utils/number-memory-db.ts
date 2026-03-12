import type {NumberImageAssociation, NumberMemoryTraining, TrainingResult} from "@/types/number-memory";
import {log} from "@/utils/logger";
import cloneDeep from "lodash.clonedeep";
import {DB_KEY_NUMBER_MEMORY} from "@/constants";

const DB_KEY_PREFIX = DB_KEY_NUMBER_MEMORY;
const TRAINING_KEY = DB_KEY_PREFIX + 'training';
const RESULT_KEY_PREFIX = DB_KEY_PREFIX + 'result_';

/**
 * 获取用户的数字记忆训练数据
 * @returns 数字记忆训练记录
 */
export function getNumberMemoryTraining(): NumberMemoryTraining | null {
  const allDocs = window.utools.db.allDocs(DB_KEY_PREFIX);
  const training = allDocs.find((doc: any) => doc.type === 'number_memory_training');
  return training as NumberMemoryTraining || null;
}

/**
 * 获取所有数字-图片关联
 * @returns 数字图片关联数组
 */
export function getAllAssociations(): NumberImageAssociation[] {
  const training = getNumberMemoryTraining();
  return training?.associations || [];
}

/**
 * 获取单个数字的图片关联
 * @param number 数字
 * @returns 数字图片关联
 */
export function getAssociationByNumber(number: number): NumberImageAssociation | undefined {
  const associations = getAllAssociations();
  return associations.find(a => a.number === number);
}

/**
 * 保存或更新数字-图片关联
 * @param association 数字图片关联
 * @returns 保存结果
 */
export async function saveAssociation(association: NumberImageAssociation): Promise<DbReturn> {
  log.i('保存数字图片关联', association);
  
  let training = getNumberMemoryTraining();
  const now = Date.now();
  
  if (!training) {
    // 创建新的训练记录
    training = {
      _id: TRAINING_KEY + Date.now(),
      type: 'number_memory_training',
      associations: [association],
      createdAt: now,
      updatedAt: now
    };
  } else {
    // 更新现有记录
    const existingIndex = training.associations.findIndex(a => a.number === association.number);
    if (existingIndex >= 0) {
      training.associations[existingIndex] = association;
    } else {
      training.associations.push(association);
    }
    training.updatedAt = now;
  }
  
  const cleanedData = cloneDeep(training);
  const result = await window.utools.db.promises.put(cleanedData);
  
  if (result.ok) {
    log.d('保存数字图片关联成功');
    training._rev = result.rev;
  } else if (result.error) {
    log.e('保存数字图片关联失败', result.message);
  }
  
  return result;
}

/**
 * 删除数字-图片关联
 * @param number 要删除的数字
 * @returns 删除结果
 */
export async function removeAssociation(number: number): Promise<DbReturn> {
  log.i('删除数字图片关联', number);
  
  const training = getNumberMemoryTraining();
  if (!training) {
    return {ok: true, id: '', rev: ''};
  }
  
  training.associations = training.associations.filter(a => a.number !== number);
  training.updatedAt = Date.now();
  
  const cleanedData = cloneDeep(training);
  const result = await window.utools.db.promises.put(cleanedData);
  
  if (result.ok) {
    log.d('删除数字图片关联成功');
    training._rev = result.rev;
  } else if (result.error) {
    log.e('删除数字图片关联失败', result.message);
  }
  
  return result;
}

/**
 * 保存训练结果
 * @param result 训练结果
 * @returns 保存结果
 */
export async function saveTrainingResult(result: Omit<TrainingResult, '_id'>): Promise<DbReturn> {
  log.i('保存训练结果', result);
  
  const resultDoc: TrainingResult = {
    ...result,
    _id: RESULT_KEY_PREFIX + Date.now()
  };
  
  const cleanedData = cloneDeep(resultDoc);
  const dbResult = await window.utools.db.promises.put(cleanedData);
  
  if (dbResult.ok) {
    log.d('保存训练结果成功');
  } else if (dbResult.error) {
    log.e('保存训练结果失败', dbResult.message);
  }
  
  return dbResult;
}

/**
 * 获取所有训练结果
 * @returns 训练结果列表
 */
export function getAllTrainingResults(): TrainingResult[] {
  const allDocs = window.utools.db.allDocs(RESULT_KEY_PREFIX);
  return allDocs
    .filter((doc: any) => doc.type === 'number_memory_result')
    .sort((a: any, b: any) => b.createdAt - a.createdAt) as TrainingResult[];
}

/**
 * 清空所有数字记忆数据
 */
export function clearAllNumberMemoryData(): void {
  const allDocs = window.utools.db.allDocs(DB_KEY_PREFIX);
  allDocs.forEach((doc: any) => {
    window.utools.db.remove(doc._id);
  });
  log.i('已清空所有数字记忆数据');
}
