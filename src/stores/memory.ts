import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export interface TestRecord {
  mode: 'number' | 'word' | 'pattern';
  modeText: string;
  success: boolean;
  result: string;
  time: string;
}

export interface NumberStats {
  correct: number;
  wrong: number;
  maxDifficulty: number;
}

export interface WordStats {
  total: number;
  perfect: number;
  totalCorrect: number;
}

export interface PatternStats {
  correct: number;
  wrong: number;
}

export const useMemoryStore = defineStore('memory', () => {
  // ========== State ==========
  const testHistory = ref<TestRecord[]>([]);

  const numberStats = ref<NumberStats>({
    correct: 0,
    wrong: 0,
    maxDifficulty: 4
  });

  const wordStats = ref<WordStats>({
    total: 0,
    perfect: 0,
    totalCorrect: 0
  });

  const patternStats = ref<PatternStats>({
    correct: 0,
    wrong: 0
  });

  // ========== Getters ==========
  const totalTests = computed(() => testHistory.value.length);

  const overallAccuracy = computed(() => {
    const totalCorrect = numberStats.value.correct + patternStats.value.correct + wordStats.value.perfect;
    const totalTests = numberStats.value.correct + numberStats.value.wrong +
                      patternStats.value.correct + patternStats.value.wrong +
                      wordStats.value.total;
    return totalTests === 0 ? 0 : Math.round((totalCorrect / totalTests) * 100);
  });

  // ========== Actions ==========
  function updateNumberStats(isCorrect: boolean, difficulty?: number) {
    if (isCorrect) {
      numberStats.value.correct++;
      if (difficulty && difficulty > numberStats.value.maxDifficulty) {
        numberStats.value.maxDifficulty = difficulty;
      }
    } else {
      numberStats.value.wrong++;
    }
    saveStats();
  }

  function updateWordStats(totalWords: number, correctCount: number) {
    wordStats.value.total++;
    wordStats.value.totalCorrect += correctCount;
    if (correctCount === totalWords) {
      wordStats.value.perfect++;
    }
    saveStats();
  }

  function updatePatternStats(isCorrect: boolean) {
    if (isCorrect) {
      patternStats.value.correct++;
    } else {
      patternStats.value.wrong++;
    }
    saveStats();
  }

  function addHistory(record: TestRecord) {
    testHistory.value.unshift(record);
    // 只保留最近50条记录
    if (testHistory.value.length > 50) {
      testHistory.value = testHistory.value.slice(0, 50);
    }
    saveHistory();
  }

  function saveStats() {
    try {
      const stats = {
        number: numberStats.value,
        word: wordStats.value,
        pattern: patternStats.value
      };
      localStorage.setItem('memoryTest_stats', JSON.stringify(stats));
    } catch (e) {
      console.error('保存统计数据失败:', e);
    }
  }

  function saveHistory() {
    try {
      localStorage.setItem('memoryTest_history', JSON.stringify(testHistory.value));
    } catch (e) {
      console.error('保存历史记录失败:', e);
    }
  }

  function loadStats() {
    try {
      const statsJson = localStorage.getItem('memoryTest_stats');
      if (statsJson) {
        const stats = JSON.parse(statsJson);
        if (stats.number) numberStats.value = { ...numberStats.value, ...stats.number };
        if (stats.word) wordStats.value = { ...wordStats.value, ...stats.word };
        if (stats.pattern) patternStats.value = { ...patternStats.value, ...stats.pattern };
      }
    } catch (e) {
      console.error('加载统计数据失败:', e);
    }
  }

  function loadHistory() {
    try {
      const historyJson = localStorage.getItem('memoryTest_history');
      if (historyJson) {
        testHistory.value = JSON.parse(historyJson);
      }
    } catch (e) {
      console.error('加载历史记录失败:', e);
    }
  }

  function clearAllData() {
    testHistory.value = [];
    numberStats.value = { correct: 0, wrong: 0, maxDifficulty: 4 };
    wordStats.value = { total: 0, perfect: 0, totalCorrect: 0 };
    patternStats.value = { correct: 0, wrong: 0 };
    localStorage.removeItem('memoryTest_stats');
    localStorage.removeItem('memoryTest_history');
  }

  // 初始化时加载数据
  loadStats();
  loadHistory();

  return {
    // state
    testHistory,
    numberStats,
    wordStats,
    patternStats,
    // getters
    totalTests,
    overallAccuracy,
    // actions
    updateNumberStats,
    updateWordStats,
    updatePatternStats,
    addHistory,
    loadStats,
    loadHistory,
    clearAllData
  };
});
