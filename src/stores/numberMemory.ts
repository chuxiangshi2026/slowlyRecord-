import { ref, computed } from "vue";
import { defineStore } from "pinia";
import type { NumberImageAssociation, TrainingResult } from "@/types/number-memory";
import {
  getAllAssociations,
  getAssociationByNumber,
  saveAssociation,
  removeAssociation,
  saveTrainingResult,
  getAllTrainingResults
} from "@/utils/number-memory-db";
import {
  getRecommendedImages,
  getNumberKeyword,
  getRandomNumbers,
  shuffleArray
} from "@/utils/number-memory-preset";
import { log } from "@/utils/logger";

export const useNumberMemoryStore = defineStore("numberMemory", () => {
  // State
  const associations = ref<NumberImageAssociation[]>([]);
  const isLoading = ref(false);

  // Getters
  const associationCount = computed(() => associations.value.length);
  
  const hasAssociations = computed(() => associations.value.length > 0);
  
  const getAssociation = (number: string) => {
    return associations.value.find(a => a.number === number);
  };
  
  const hasAssociation = (number: string) => {
    return associations.value.some(a => a.number === number);
  };

  // Actions
  /**
   * 加载所有数字-图片关联
   */
  function loadAssociations() {
    isLoading.value = true;
    try {
      associations.value = getAllAssociations();
      log.i('加载数字记忆关联', associations.value.length);
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * 添加或更新数字-图片关联
   */
  async function addAssociation(number: string, imageUrl: string, source: 'upload' | 'preset', description?: string) {
    const association: NumberImageAssociation = {
      number,
      imageUrl,
      source,
      description
    };
    
    const result = await saveAssociation(association);
    if (result.ok) {
      loadAssociations();
    }
    return result;
  }

  /**
   * 删除数字-图片关联
   */
  async function deleteAssociation(number: string) {
    const result = await removeAssociation(number);
    if (result.ok) {
      loadAssociations();
    }
    return result;
  }

  /**
   * 获取数字的推荐图片
   */
  function getRecommendations(number: string) {
    const num = parseInt(number, 10);
    return getRecommendedImages(num);
  }

  /**
   * 获取数字关键词
   */
  function getKeyword(number: string) {
    const num = parseInt(number, 10);
    return getNumberKeyword(num);
  }

  /**
   * 生成数字→图片测试题目
   * @param count 题目数量
   */
  function generateNumberToImageQuiz(count: number = 5) {
    if (associations.value.length === 0) {
      return [];
    }
    
    // 随机选择已保存的数字
    const shuffled = shuffleArray(associations.value);
    const selected = shuffled.slice(0, Math.min(count, shuffled.length));
    
    return selected.map(correct => {
      // 生成干扰项（其他数字的图片）
      const otherImages = associations.value
        .filter(a => a.number !== correct.number)
        .map(a => ({ number: a.number, imageUrl: a.imageUrl }));
      
      const distractors = shuffleArray(otherImages).slice(0, 3);
      const options = shuffleArray([...distractors, { number: correct.number, imageUrl: correct.imageUrl }]);
      
      return {
        question: correct.number,
        correctAnswer: correct.imageUrl,
        options: options.map(o => o.imageUrl)
      };
    });
  }

  /**
   * 生成图片→数字测试题目
   * @param count 题目数量
   */
  function generateImageToNumberQuiz(count: number = 5) {
    if (associations.value.length === 0) {
      return [];
    }
    
    // 随机选择已保存的数字
    const shuffled = shuffleArray(associations.value);
    const selected = shuffled.slice(0, Math.min(count, shuffled.length));
    
    return selected.map(correct => {
      // 生成干扰项（其他数字）
      const otherNumbers = associations.value
        .filter(a => a.number !== correct.number)
        .map(a => a.number);
      
      const distractors = shuffleArray(otherNumbers).slice(0, 3);
      const options = shuffleArray([...distractors, correct.number]);
      
      return {
        question: correct.imageUrl,
        correctAnswer: correct.number,
        options
      };
    });
  }

  /**
   * 保存训练结果
   */
  async function saveResult(
    mode: 'numberToImage' | 'imageToNumber',
    totalQuestions: number,
    correctAnswers: number,
    duration: number,
    details: { number: string; correct: boolean; responseTime: number }[]
  ) {
    const result: Omit<TrainingResult, '_id'> = {
      type: 'number_memory_result',
      mode,
      totalQuestions,
      correctAnswers,
      duration,
      details,
      createdAt: Date.now()
    };
    
    return await saveTrainingResult(result);
  }

  /**
   * 获取训练历史
   */
  function getTrainingHistory() {
    return getAllTrainingResults();
  }

  /**
   * 获取随机数字（用于练习）
   * @param count 数量
   * @param range 范围: 'single' (0-9), 'double' (10-99), 'all' (0-99), 默认 'all'
   */
  function getRandomPresetNumbers(count: number, range: 'single' | 'double' | 'all' = 'all') {
    return getRandomNumbers(count, range);
  }

  // 初始化时加载数据
  loadAssociations();

  return {
    associations,
    isLoading,
    associationCount,
    hasAssociations,
    getAssociation,
    hasAssociation,
    loadAssociations,
    addAssociation,
    deleteAssociation,
    getRecommendations,
    getKeyword,
    generateNumberToImageQuiz,
    generateImageToNumberQuiz,
    saveResult,
    getTrainingHistory,
    getRandomPresetNumbers
  };
});
