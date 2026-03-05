<template>
  <div class="memory-test-container">
    <div class="test-header">
      <h2>记忆力测试</h2>
      <div class="mode-selector">
        <el-radio-group v-model="testMode" size="small">
          <el-radio-button label="number">数字记忆</el-radio-button>
          <el-radio-button label="word">单词记忆</el-radio-button>
          <el-radio-button label="pattern">图案记忆</el-radio-button>
        </el-radio-group>
      </div>
    </div>

    <!-- 数字记忆模式 -->
    <div v-if="testMode === 'number'" class="test-section">
      <div class="difficulty-selector">
        <span>难度：</span>
        <el-radio-group v-model="numberDifficulty" size="small">
          <el-radio-button :label="4">4位</el-radio-button>
          <el-radio-button :label="6">6位</el-radio-button>
          <el-radio-button :label="8">8位</el-radio-button>
          <el-radio-button :label="12">12位</el-radio-button>
          <el-radio-button :label="20">20位</el-radio-button>
        </el-radio-group>
      </div>

      <div class="game-area">
        <div v-if="gameState === 'idle'" class="start-screen">
          <el-icon :size="64" color="#409EFF"><Timer /></el-icon>
          <p>准备好挑战你的记忆力了吗？</p>
          <el-button type="primary" size="large" @click="startNumberTest">开始测试</el-button>
        </div>

        <div v-else-if="gameState === 'memorize'" class="memorize-screen">
          <div class="timer-bar">
            <div class="timer-progress" :style="{ width: timerProgress + '%' }"></div>
          </div>
          <div class="number-display">{{ currentNumber }}</div>
          <p class="hint">请记住这串数字</p>
        </div>

        <div v-else-if="gameState === 'recall'" class="recall-screen">
          <p class="hint">请输入你记住的数字</p>
          <el-input
            v-model="userInput"
            :maxlength="numberDifficulty"
            placeholder="输入数字..."
            size="large"
            class="recall-input"
            @keyup.enter="submitAnswer"
          />
          <div class="button-group">
            <el-button type="primary" size="large" @click="submitAnswer">提交答案</el-button>
            <el-button size="large" @click="giveUp">放弃</el-button>
          </div>
        </div>

        <div v-else-if="gameState === 'result'" class="result-screen">
          <div class="result-icon">
            <el-icon v-if="isCorrect" :size="80" color="#67C23A"><CircleCheck /></el-icon>
            <el-icon v-else :size="80" color="#F56C6C"><CircleClose /></el-icon>
          </div>
          <div class="result-text">
            <h3>{{ isCorrect ? '回答正确！' : '回答错误' }}</h3>
            <p v-if="!isCorrect" class="correct-answer">正确答案是: <strong>{{ currentNumber }}</strong></p>
            <p v-if="!isCorrect">你输入的是: <strong>{{ userInput }}</strong></p>
          </div>
          <el-button type="primary" size="large" @click="startNumberTest">再试一次</el-button>
        </div>
      </div>

      <div class="stats-panel">
        <div class="stat-item">
          <span class="stat-label">正确次数</span>
          <span class="stat-value success">{{ numberStats.correct }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">错误次数</span>
          <span class="stat-value error">{{ numberStats.wrong }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">正确率</span>
          <span class="stat-value">{{ numberAccuracy }}%</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">最高难度</span>
          <span class="stat-value">{{ numberStats.maxDifficulty }}位</span>
        </div>
      </div>
    </div>

    <!-- 单词记忆模式 -->
    <div v-else-if="testMode === 'word'" class="test-section">
      <div class="difficulty-selector">
        <span>难度：</span>
        <el-radio-group v-model="wordDifficulty" size="small">
          <el-radio-button :label="3">3个</el-radio-button>
          <el-radio-button :label="5">5个</el-radio-button>
          <el-radio-button :label="8">8个</el-radio-button>
          <el-radio-button :label="12">12个</el-radio-button>
        </el-radio-group>
      </div>

      <div class="game-area">
        <div v-if="gameState === 'idle'" class="start-screen">
          <el-icon :size="64" color="#409EFF"><Document /></el-icon>
          <p>记住显示的单词，然后回忆它们</p>
          <el-button type="primary" size="large" @click="startWordTest">开始测试</el-button>
        </div>

        <div v-else-if="gameState === 'memorize'" class="memorize-screen">
          <div class="timer-bar">
            <div class="timer-progress" :style="{ width: timerProgress + '%' }"></div>
          </div>
          <div class="word-list-display">
            <el-tag v-for="(word, index) in currentWords" :key="index" size="large" type="primary">
              {{ word }}
            </el-tag>
          </div>
          <p class="hint">请记住这些单词</p>
        </div>

        <div v-else-if="gameState === 'recall'" class="recall-screen">
          <p class="hint">请输入你记住的单词（用逗号分隔）</p>
          <el-input
            v-model="userWordInput"
            type="textarea"
            :rows="3"
            placeholder="输入单词，用逗号分隔..."
            size="large"
            class="recall-input"
          />
          <div class="button-group">
            <el-button type="primary" size="large" @click="submitWordAnswer">提交答案</el-button>
            <el-button size="large" @click="giveUp">放弃</el-button>
          </div>
        </div>

        <div v-else-if="gameState === 'result'" class="result-screen">
          <div class="result-icon">
            <el-icon v-if="wordResult.correctCount === currentWords.length" :size="80" color="#67C23A"><CircleCheck /></el-icon>
            <el-icon v-else :size="80" color="#E6A23C"><Warning /></el-icon>
          </div>
          <div class="result-text">
            <h3>测试结果</h3>
            <p>答对 <strong>{{ wordResult.correctCount }}</strong> / {{ currentWords.length }} 个</p>
            <div v-if="wordResult.missedWords.length > 0" class="missed-words">
              <p>漏掉的单词: <el-tag v-for="word in wordResult.missedWords" :key="word" type="danger" size="small">{{ word }}</el-tag></p>
            </div>
            <div v-if="wordResult.wrongWords.length > 0" class="wrong-words">
              <p>错误的单词: <el-tag v-for="word in wordResult.wrongWords" :key="word" type="warning" size="small">{{ word }}</el-tag></p>
            </div>
          </div>
          <el-button type="primary" size="large" @click="startWordTest">再试一次</el-button>
        </div>
      </div>

      <div class="stats-panel">
        <div class="stat-item">
          <span class="stat-label">总测试次数</span>
          <span class="stat-value">{{ wordStats.total }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">满分次数</span>
          <span class="stat-value success">{{ wordStats.perfect }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">平均正确率</span>
          <span class="stat-value">{{ wordAccuracy }}%</span>
        </div>
      </div>
    </div>

    <!-- 图案记忆模式 -->
    <div v-else-if="testMode === 'pattern'" class="test-section">
      <div class="difficulty-selector">
        <span>难度：</span>
        <el-radio-group v-model="patternDifficulty" size="small">
          <el-radio-button :label="4">4格</el-radio-button>
          <el-radio-button :label="6">6格</el-radio-button>
          <el-radio-button :label="9">9格</el-radio-button>
          <el-radio-button :label="16">16格</el-radio-button>
        </el-radio-group>
      </div>

      <div class="game-area">
        <div v-if="gameState === 'idle'" class="start-screen">
          <el-icon :size="64" color="#409EFF"><Grid /></el-icon>
          <p>记住闪烁的格子位置</p>
          <el-button type="primary" size="large" @click="startPatternTest">开始测试</el-button>
        </div>

        <div v-else-if="gameState === 'memorize'" class="memorize-screen">
          <div class="timer-bar">
            <div class="timer-progress" :style="{ width: timerProgress + '%' }"></div>
          </div>
          <div class="pattern-grid" :style="gridStyle">
            <div
              v-for="i in patternDifficulty"
              :key="i"
              class="grid-cell"
              :class="{ active: patternSequence.includes(i - 1) }"
            ></div>
          </div>
          <p class="hint">请记住闪烁的格子</p>
        </div>

        <div v-else-if="gameState === 'recall'" class="recall-screen">
          <p class="hint">请点击你记住的格子位置（按顺序）</p>
          <div class="pattern-grid" :style="gridStyle">
            <div
              v-for="i in patternDifficulty"
              :key="i"
              class="grid-cell clickable"
              :class="{ selected: userPatternSelection.includes(i - 1) }"
              @click="selectPatternCell(i - 1)"
            >
              {{ getPatternOrder(i - 1) }}
            </div>
          </div>
          <div class="button-group">
            <el-button type="primary" size="large" @click="submitPatternAnswer" :disabled="userPatternSelection.length !== patternSequence.length">提交答案</el-button>
            <el-button size="large" @click="giveUp">放弃</el-button>
            <el-button size="large" @click="clearPatternSelection">清除</el-button>
          </div>
        </div>

        <div v-else-if="gameState === 'result'" class="result-screen">
          <div class="result-icon">
            <el-icon v-if="isPatternCorrect" :size="80" color="#67C23A"><CircleCheck /></el-icon>
            <el-icon v-else :size="80" color="#F56C6C"><CircleClose /></el-icon>
          </div>
          <div class="result-text">
            <h3>{{ isPatternCorrect ? '回答正确！' : '回答错误' }}</h3>
            <p>正确顺序: {{ patternSequence.map(x => x + 1).join(' → ') }}</p>
            <p v-if="!isPatternCorrect">你的选择: {{ userPatternSelection.map(x => x + 1).join(' → ') }}</p>
          </div>
          <el-button type="primary" size="large" @click="startPatternTest">再试一次</el-button>
        </div>
      </div>

      <div class="stats-panel">
        <div class="stat-item">
          <span class="stat-label">正确次数</span>
          <span class="stat-value success">{{ patternStats.correct }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">错误次数</span>
          <span class="stat-value error">{{ patternStats.wrong }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">正确率</span>
          <span class="stat-value">{{ patternAccuracy }}%</span>
        </div>
      </div>
    </div>

    <!-- 历史记录 -->
    <div class="history-section">
      <h3>最近测试记录</h3>
      <el-timeline v-if="testHistory.length > 0">
        <el-timeline-item
          v-for="(record, index) in testHistory.slice(0, 10)"
          :key="index"
          :type="record.success ? 'success' : 'danger'"
          :timestamp="record.time"
        >
          <span class="history-mode">{{ record.modeText }}</span>
          <span class="history-result" :class="{ success: record.success, error: !record.success }">
            {{ record.result }}
          </span>
        </el-timeline-item>
      </el-timeline>
      <el-empty v-else description="暂无测试记录" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Timer, Document, Grid, CircleCheck, CircleClose, Warning } from '@element-plus/icons-vue';
import { useMemoryStore } from '@/stores/memory';

const memoryStore = useMemoryStore();

// 测试模式
const testMode = ref<'number' | 'word' | 'pattern'>('number');

// 游戏状态
const gameState = ref<'idle' | 'memorize' | 'recall' | 'result'>('idle');

// ========== 数字记忆 ==========
const numberDifficulty = ref(6);
const currentNumber = ref('');
const userInput = ref('');
const isCorrect = ref(false);

// ========== 单词记忆 ==========
const wordDifficulty = ref(5);
const currentWords = ref<string[]>([]);
const userWordInput = ref('');
const wordResult = ref({
  correctCount: 0,
  missedWords: [] as string[],
  wrongWords: [] as string[]
});

// 常用简单单词库
const commonWords = [
  'apple', 'book', 'cat', 'dog', 'egg', 'fish', 'goat', 'hat', 'ice', 'jump',
  'kite', 'lion', 'moon', 'nose', 'orange', 'pen', 'queen', 'rat', 'sun', 'tree',
  'umbrella', 'van', 'water', 'box', 'yellow', 'zebra', 'bird', 'car', 'duck', 'eye',
  'fan', 'grape', 'hand', 'igloo', 'juice', 'key', 'leaf', 'milk', 'nest', 'owl',
  'pig', 'quiz', 'rose', 'star', 'tiger', 'uncle', 'violin', 'wolf', 'fox', 'yarn'
];

// ========== 图案记忆 ==========
const patternDifficulty = ref(9);
const patternSequence = ref<number[]>([]);
const userPatternSelection = ref<number[]>([]);
const isPatternCorrect = ref(false);

// ========== 计时器 ==========
const timerProgress = ref(100);
let timerInterval: NodeJS.Timeout | null = null;

// ========== 统计 ==========
const numberStats = computed(() => memoryStore.numberStats);
const wordStats = computed(() => memoryStore.wordStats);
const patternStats = computed(() => memoryStore.patternStats);
const testHistory = computed(() => memoryStore.testHistory);

const numberAccuracy = computed(() => {
  const total = numberStats.value.correct + numberStats.value.wrong;
  return total === 0 ? 0 : Math.round((numberStats.value.correct / total) * 100);
});

const wordAccuracy = computed(() => {
  const total = wordStats.value.total;
  if (total === 0) return 0;
  const avgRate = wordStats.value.totalCorrect / (total * wordDifficulty.value);
  return Math.round(avgRate * 100);
});

const patternAccuracy = computed(() => {
  const total = patternStats.value.correct + patternStats.value.wrong;
  return total === 0 ? 0 : Math.round((patternStats.value.correct / total) * 100);
});

const gridStyle = computed(() => {
  const cols = Math.sqrt(patternDifficulty.value);
  return {
    gridTemplateColumns: `repeat(${cols}, 1fr)`,
    gridTemplateRows: `repeat(${cols}, 1fr)`
  };
});

// ========== 数字记忆功能 ==========
function generateRandomNumber(length: number): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += Math.floor(Math.random() * 10);
  }
  return result;
}

function startNumberTest() {
  currentNumber.value = generateRandomNumber(numberDifficulty.value);
  userInput.value = '';
  gameState.value = 'memorize';
  startTimer(3000 + numberDifficulty.value * 500); // 根据难度调整记忆时间
}

// ========== 单词记忆功能 ==========
function getRandomWords(count: number): string[] {
  const shuffled = [...commonWords].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function startWordTest() {
  currentWords.value = getRandomWords(wordDifficulty.value);
  userWordInput.value = '';
  gameState.value = 'memorize';
  startTimer(4000 + wordDifficulty.value * 1000);
}

function submitWordAnswer() {
  const userWords = userWordInput.value
    .toLowerCase()
    .split(/[,，\s]+/)
    .map(w => w.trim())
    .filter(w => w.length > 0);

  const targetWords = currentWords.value.map(w => w.toLowerCase());
  const correctCount = userWords.filter(w => targetWords.includes(w)).length;
  const missedWords = targetWords.filter(w => !userWords.includes(w));
  const wrongWords = userWords.filter(w => !targetWords.includes(w));

  wordResult.value = {
    correctCount,
    missedWords,
    wrongWords
  };

  // 更新统计
  memoryStore.updateWordStats(wordDifficulty.value, correctCount);
  memoryStore.addHistory({
    mode: 'word',
    modeText: `单词记忆 (${wordDifficulty.value}个)`,
    success: correctCount === wordDifficulty.value,
    result: `${correctCount}/${wordDifficulty.value}`,
    time: new Date().toLocaleString()
  });

  gameState.value = 'result';
}

// ========== 图案记忆功能 ==========
function generatePatternSequence(size: number): number[] {
  const sequenceLength = Math.floor(Math.sqrt(size)) + 1;
  const positions: number[] = [];
  while (positions.length < sequenceLength) {
    const pos = Math.floor(Math.random() * size);
    if (!positions.includes(pos)) {
      positions.push(pos);
    }
  }
  return positions;
}

function startPatternTest() {
  patternSequence.value = generatePatternSequence(patternDifficulty.value);
  userPatternSelection.value = [];
  gameState.value = 'memorize';
  startTimer(3000 + patternSequence.value.length * 800);
}

function selectPatternCell(index: number) {
  if (userPatternSelection.value.includes(index)) {
    userPatternSelection.value = userPatternSelection.value.filter(i => i !== index);
  } else if (userPatternSelection.value.length < patternSequence.value.length) {
    userPatternSelection.value.push(index);
  }
}

function getPatternOrder(index: number): string {
  const order = userPatternSelection.value.indexOf(index);
  return order >= 0 ? String(order + 1) : '';
}

function clearPatternSelection() {
  userPatternSelection.value = [];
}

function submitPatternAnswer() {
  isPatternCorrect.value = JSON.stringify(patternSequence.value) === JSON.stringify(userPatternSelection.value);

  memoryStore.updatePatternStats(isPatternCorrect.value);
  memoryStore.addHistory({
    mode: 'pattern',
    modeText: `图案记忆 (${patternDifficulty.value}格)`,
    success: isPatternCorrect.value,
    result: isPatternCorrect.value ? '正确' : '错误',
    time: new Date().toLocaleString()
  });

  gameState.value = 'result';
}

// ========== 通用功能 ==========
function startTimer(duration: number) {
  timerProgress.value = 100;
  const step = 100 / (duration / 50);

  if (timerInterval) clearInterval(timerInterval);

  timerInterval = setInterval(() => {
    timerProgress.value -= step;
    if (timerProgress.value <= 0) {
      timerProgress.value = 0;
      clearInterval(timerInterval!);
      gameState.value = 'recall';
    }
  }, 50);
}

function submitAnswer() {
  if (!userInput.value) {
    ElMessage.warning('请输入答案');
    return;
  }
  isCorrect.value = userInput.value === currentNumber.value;

  // 更新统计
  if (isCorrect.value) {
    memoryStore.updateNumberStats(true, numberDifficulty.value);
  } else {
    memoryStore.updateNumberStats(false);
  }

  memoryStore.addHistory({
    mode: 'number',
    modeText: `数字记忆 (${numberDifficulty.value}位)`,
    success: isCorrect.value,
    result: isCorrect.value ? '正确' : '错误',
    time: new Date().toLocaleString()
  });

  gameState.value = 'result';
}

function giveUp() {
  if (timerInterval) clearInterval(timerInterval);
  gameState.value = 'idle';
}

// 清理计时器
onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval);
});
</script>

<style scoped lang="scss">
.memory-test-container {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.test-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;

  h2 {
    margin: 0;
    color: #303133;
  }
}

.test-section {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.difficulty-selector {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #ebeef5;

  span {
    color: #606266;
    font-size: 14px;
  }
}

.game-area {
  min-height: 300px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.start-screen {
  text-align: center;

  p {
    margin: 20px 0;
    color: #606266;
  }
}

.memorize-screen {
  width: 100%;
  text-align: center;
}

.timer-bar {
  width: 100%;
  height: 4px;
  background: #e4e7ed;
  border-radius: 2px;
  margin-bottom: 30px;
  overflow: hidden;
}

.timer-progress {
  height: 100%;
  background: linear-gradient(90deg, #67c23a, #409eff);
  border-radius: 2px;
  transition: width 0.05s linear;
}

.number-display {
  font-size: 48px;
  font-weight: bold;
  letter-spacing: 10px;
  color: #303133;
  margin: 30px 0;
  font-family: 'Courier New', monospace;
}

.word-list-display {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  justify-content: center;
  margin: 30px 0;

  .el-tag {
    font-size: 18px;
    padding: 8px 16px;
  }
}

.pattern-grid {
  display: grid;
  gap: 10px;
  margin: 30px auto;
  width: fit-content;
}

.grid-cell {
  width: 60px;
  height: 60px;
  background: #e4e7ed;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: bold;
  transition: all 0.3s;

  &.active {
    background: #409eff;
    transform: scale(1.1);
  }

  &.clickable {
    cursor: pointer;

    &:hover {
      background: #d9ecff;
    }
  }

  &.selected {
    background: #67c23a;
    color: white;
  }
}

.hint {
  color: #909399;
  font-size: 14px;
  margin-top: 20px;
}

.recall-screen {
  width: 100%;
  max-width: 400px;
  text-align: center;
}

.recall-input {
  margin: 20px 0;

  :deep(.el-input__inner) {
    font-size: 24px;
    letter-spacing: 5px;
    text-align: center;
  }
}

.button-group {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.result-screen {
  text-align: center;

  .result-icon {
    margin-bottom: 20px;
  }

  .result-text {
    margin-bottom: 30px;

    h3 {
      margin: 0 0 10px;
      color: #303133;
    }

    .correct-answer {
      color: #67c23a;
      font-size: 18px;
      margin: 10px 0;
    }

    .missed-words, .wrong-words {
      margin-top: 15px;

      p {
        color: #606266;
        margin-bottom: 8px;
      }

      .el-tag {
        margin: 0 4px;
      }
    }
  }
}

.stats-panel {
  display: flex;
  justify-content: space-around;
  padding-top: 20px;
  margin-top: 20px;
  border-top: 1px solid #ebeef5;
}

.stat-item {
  text-align: center;

  .stat-label {
    display: block;
    color: #909399;
    font-size: 12px;
    margin-bottom: 5px;
  }

  .stat-value {
    display: block;
    font-size: 20px;
    font-weight: bold;
    color: #303133;

    &.success {
      color: #67c23a;
    }

    &.error {
      color: #f56c6c;
    }
  }
}

.history-section {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);

  h3 {
    margin: 0 0 20px;
    color: #303133;
  }
}

.history-mode {
  color: #606266;
  margin-right: 10px;
}

.history-result {
  font-weight: bold;

  &.success {
    color: #67c23a;
  }

  &.error {
    color: #f56c6c;
  }
}
</style>
