/**
 * 数字-图片关联类型
 * 用于数字记忆训练
 */

// 单个数字的图片关联
export interface NumberImageAssociation {
  number: number;           // 数字 (0-99)
  imageUrl: string;         // 图片路径/URL
  description?: string;     // 图片描述（可选）
  source: 'upload' | 'preset'; // 图片来源：用户上传或预设
}

// 数字记忆训练记录
export interface NumberMemoryTraining {
  _id: string;
  _rev?: string;
  type: 'number_memory_training';
  associations: NumberImageAssociation[];  // 用户的数字-图片关联列表
  createdAt: number;
  updatedAt: number;
}

// 训练结果记录
export interface TrainingResult {
  _id: string;
  _rev?: string;
  type: 'number_memory_result';
  mode: 'numberToImage' | 'imageToNumber'; // 训练模式
  totalQuestions: number;   // 总题数
  correctAnswers: number;   // 答对题数
  duration: number;         // 用时（秒）
  details: {
    number: number;
    correct: boolean;
    responseTime: number;   // 该题响应时间（毫秒）
  }[];
  createdAt: number;
}

// 预设图片映射
export interface PresetImageMap {
  [key: number]: {
    keyword: string;        // 关联关键词（基于发音/外形）
    suggestions: {          // 推荐图片列表
      name: string;
      url: string;
      description: string;
    }[];
  };
}
