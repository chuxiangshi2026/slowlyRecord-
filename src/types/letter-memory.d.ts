/**
 * 字母-图片映射类型
 * 用于字母映射表功能，支持单个字母或字母组合与图片的一一映射
 */

// 单个字母/字母组合的图片映射
export interface LetterImageAssociation {
  letter: string;           // 字母或字母组合（如 "a", "b", "ch", "sh"）
  imageUrl: string;         // 图片路径/URL（emoji 或 base64）
  description?: string;     // 图片描述（可选）
  source: 'upload' | 'preset' | 'emoji'; // 图片来源：用户上传、预设或emoji
}

// 字母映射训练记录
export interface LetterMemoryTraining {
  _id: string;
  _rev?: string;
  type: 'letter_memory_training';
  associations: LetterImageAssociation[];  // 用户的字母-图片映射列表
  createdAt: number;
  updatedAt: number;
}

// 训练结果记录
export interface LetterTrainingResult {
  _id: string;
  _rev?: string;
  type: 'letter_memory_result';
  mode: 'letterToImage' | 'imageToLetter'; // 训练模式
  totalQuestions: number;   // 总题数
  correctAnswers: number;   // 答对题数
  duration: number;         // 用时（秒）
  details: {
    letter: string;
    correct: boolean;
    responseTime: number;   // 该题响应时间（毫秒）
  }[];
  createdAt: number;
}

// 训练进度（断点续练）
export interface LetterTrainingProgress {
  _id: string;
  _rev?: string;
  type: 'letter_memory_progress';
  mode: 'letterToImage' | 'imageToLetter';
  questions: {
    question: string;
    correctAnswer: string;
    options: string[];
  }[];
  currentQuestionIndex: number;
  answerResults: {
    question: string;
    selectedImage: string | null;
    selectedLetter: string | null;
    correct: boolean;
    responseTime: number;
  }[];
  elapsedTime: number;
  hasAnswered: boolean;
  selectedAnswer: string | null;
  isCorrect: boolean;
  createdAt: number;
  updatedAt: number;
}

// 字母映射条目（用于记忆长串字母，如单词拼写）
export interface LetterMemoryEntry {
  _id: string;
  _rev?: string;
  type: 'letter_memory_entry';
  title: string;            // 标题
  content: string;          // 要记忆的字母串/单词
  tags: string[];           // 标签
  description?: string;     // 描述/备注
  createdAt: number;
  updatedAt: number;
  reviewCount: number;      // 复习次数
  lastReviewTime?: number;  // 最后复习时间
}
