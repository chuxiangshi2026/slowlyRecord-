<template>
  <el-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    title="跟打练习"
    width="750px"
    destroy-on-close
    class="typing-practice-dialog"
    @opened="handleOpened"
    @closed="handleClosed"
  >
    <div v-if="article" class="typing-container">
      <!-- 统计信息 -->
      <div class="stats-panel">
        <el-row :gutter="16">
          <el-col :span="6">
            <div class="stat-item">
              <div class="stat-label">速度</div>
              <div class="stat-value">{{ wpm }} <span class="unit">字/分</span></div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="stat-item">
              <div class="stat-label">正确率</div>
              <div class="stat-value" :class="accuracyClass">{{ accuracy }}<span class="unit">%</span></div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="stat-item">
              <div class="stat-label">用时</div>
              <div class="stat-value">{{ elapsedTime }} <span class="unit">秒</span></div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="stat-item">
              <div class="stat-label">进度</div>
              <div class="stat-value">{{ progress }}<span class="unit">%</span></div>
            </div>
          </el-col>
        </el-row>
      </div>

      <!-- 原文显示区域 -->
      <div class="original-text-container">
        <div class="section-title">原文</div>
        <div ref="originalTextRef" class="original-text">
          <span
            v-for="(char, index) in displayText"
            :key="index"
            :class="[
              'char',
              {
                'current': index === currentIndex,
                'correct': typedStatus[index] === 'correct',
                'incorrect': typedStatus[index] === 'incorrect',
                'pending': index > currentIndex
              }
            ]"
          >{{ char }}</span>
        </div>
      </div>

      <!-- 输入区域 -->
      <div class="input-area">
        <div class="section-title">
          跟打输入
          <el-tag v-if="isFinished" type="success" size="small" style="margin-left: 8px">已完成</el-tag>
        </div>
        <el-input
          ref="inputRef"
          v-model="userInput"
          type="textarea"
          :rows="6"
          :disabled="isFinished"
          placeholder="请在此处输入上方文本..."
          @input="handleInput"
          @keydown="handleKeydown"
        />
      </div>

      <!-- 控制按钮 -->
    <div class="controls">
        <el-button @click="handleReset">
          <el-icon><Refresh /></el-icon> 重新开始
        </el-button>
        <el-button type="primary" @click="handlePause" :disabled="isFinished">
          <el-icon><VideoPause v-if="!isPaused" /><VideoPlay v-else /></el-icon>
          {{ isPaused ? '继续' : '暂停' }}
        </el-button>
        <el-button type="success" @click="handleFinish" :disabled="isFinished || userInput.length === 0">
          <el-icon><Check /></el-icon> 完成
        </el-button>
        <el-button type="warning" @click="loadProgress" :disabled="!hasSavedProgress">
          恢复进度
        </el-button>
      </div>

      <!-- 结果显示 -->
      <div v-if="isFinished" class="result-panel">
        <el-divider />
        <el-result
          :icon="resultIcon"
          :title="resultTitle"
          :sub-title="resultSubtitle"
        >
          <template #extra>
            <el-button type="primary" @click="handleReset">再练一次</el-button>
            <el-button @click="handleClose">返回</el-button>
          </template>
        </el-result>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { ElMessage } from 'element-plus';
import { Refresh, VideoPause, VideoPlay, Check } from '@element-plus/icons-vue';
import { useTextMemoryStore } from '@/stores/textMemory';
import type { TextArticle } from '@/types/text-memory';

const textStore = useTextMemoryStore();

interface Props {
  modelValue: boolean;
  article: TextArticle | null;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
}>();

// 限制显示的文本长度（太长的文章不适合跟打）
const MAX_TEXT_LENGTH = 500;

// 响应式数据
const userInput = ref('');
const currentIndex = ref(0);
const typedStatus = ref<('correct' | 'incorrect' | 'pending')[]>([]);
const isFinished = ref(false);
const isPaused = ref(false);
const startTime = ref<number | null>(null);
const elapsedTime = ref(0);
const timer = ref<number | null>(null);
const wpm = ref(0);

// Refs
const inputRef = ref<HTMLInputElement | null>(null);
const originalTextRef = ref<HTMLElement | null>(null);

// 处理后的文本（限制长度）
const displayText = computed(() => {
  if (!props.article) return '';
  return props.article.content.slice(0, MAX_TEXT_LENGTH);
});

// 进度百分比
const progress = computed(() => {
  if (displayText.value.length === 0) return 0;
  return Math.round((currentIndex.value / displayText.value.length) * 100);
});

// 正确率
const accuracy = computed(() => {
  const typed = typedStatus.value.filter(s => s !== 'pending');
  if (typed.length === 0) return 100;
  const correct = typed.filter(s => s === 'correct').length;
  return Math.round((correct / typed.length) * 100);
});

// 正确率样式
const accuracyClass = computed(() => {
  if (accuracy.value >= 95) return 'excellent';
  if (accuracy.value >= 80) return 'good';
  if (accuracy.value >= 60) return 'fair';
  return 'poor';
});

// 结果图标
const resultIcon = computed(() => {
  if (accuracy.value >= 95) return 'success';
  if (accuracy.value >= 80) return 'success';
  if (accuracy.value >= 60) return 'warning';
  return 'error';
});

// 结果标题
const resultTitle = computed(() => {
  if (accuracy.value >= 95) return '太棒了！';
  if (accuracy.value >= 80) return '做得很好！';
  if (accuracy.value >= 60) return '继续加油！';
  return '还需要练习';
});

// 结果副标题
const resultSubtitle = computed(() => {
  return `速度: ${wpm.value} 字/分 | 正确率: ${accuracy.value}% | 用时: ${elapsedTime.value} 秒`;
});

// 监听对话框打开
watch(() => props.modelValue, (newVal) => {
  if (newVal && props.article) {
    // 尝试加载上次的进度
    const savedProgress = textStore.getLearningProgress(props.article._id, 'typing');
    if (savedProgress?.progress?.userInput && !savedProgress.progress.isFinished) {
      restoreProgress(savedProgress.progress);
      ElMessage.info('已恢复上次的练习进度');
    } else {
      resetPractice();
    }
  }
});

// 是否有保存的进度
const hasSavedProgress = computed(() => {
  if (!props.article) return false;
  const progress = textStore.getLearningProgress(props.article._id, 'typing');
  return !!progress?.progress?.userInput && !progress?.progress?.isFinished;
});

// 恢复进度
function restoreProgress(savedProgress: any) {
  userInput.value = savedProgress.userInput || '';
  typedStatus.value = savedProgress.typedStatus || [];
  currentIndex.value = savedProgress.currentIndex || 0;
  elapsedTime.value = savedProgress.elapsedTime || 0;
  wpm.value = savedProgress.wpm || 0;
  isFinished.value = false;
  isPaused.value = false;
}

// 对话框打开后的处理
function handleOpened() {
  nextTick(() => {
    inputRef.value?.focus();
    initTypedStatus();
  });
}

// 对话框关闭后的处理
function handleClosed() {
  stopTimer();
}

// 初始化打字状态
function initTypedStatus() {
  typedStatus.value = new Array(displayText.value.length).fill('pending');
}

// 处理输入
function handleInput() {
  if (!startTime.value && !isPaused.value && !isFinished.value) {
    startTimer();
  }

  const input = userInput.value;
  const original = displayText.value;

  // 更新每个字符的状态
  for (let i = 0; i < original.length; i++) {
    if (i < input.length) {
      typedStatus.value[i] = input[i] === original[i] ? 'correct' : 'incorrect';
    } else {
      typedStatus.value[i] = 'pending';
    }
  }

  // 更新当前索引
  currentIndex.value = input.length;

  // 计算 WPM
  if (startTime.value) {
    const minutes = elapsedTime.value / 60;
    if (minutes > 0) {
      wpm.value = Math.round(input.length / minutes);
    }
  }

  // 滚动原文到可视区域
  scrollToCurrentChar();

  // 检查是否完成
  if (input.length >= original.length) {
    handleFinish();
  }
}

// 处理键盘事件
function handleKeydown(e: KeyboardEvent) {
  // 阻止默认的退格行为，我们自己处理
  if (e.key === 'Backspace' && currentIndex.value <= 0) {
    e.preventDefault();
  }
}

// 滚动到当前字符
function scrollToCurrentChar() {
  nextTick(() => {
    const container = originalTextRef.value;
    if (!container) return;

    const currentChar = container.querySelector('.char.current') as HTMLElement;
    if (currentChar) {
      currentChar.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });
}

// 开始计时
function startTimer() {
  startTime.value = Date.now();
  timer.value = window.setInterval(() => {
    if (!isPaused.value) {
      elapsedTime.value = Math.floor((Date.now() - startTime.value!) / 1000);
    }
  }, 1000);
}

// 停止计时
function stopTimer() {
  if (timer.value) {
    clearInterval(timer.value);
    timer.value = null;
  }
}

// 暂停/继续
function handlePause() {
  if (isFinished.value) return;
  isPaused.value = !isPaused.value;
  if (!isPaused.value) {
    inputRef.value?.focus();
  }
}

// 完成练习
function handleFinish() {
  if (isFinished.value) return;
  isFinished.value = true;
  stopTimer();
  
  // 保存练习记录
  savePracticeRecord();
}

// 保存练习记录
async function savePracticeRecord() {
  if (!props.article) return;
  
  const record = {
    articleId: props.article._id,
    articleTitle: props.article.title,
    wpm: wpm.value,
    accuracy: accuracy.value,
    elapsedTime: elapsedTime.value,
    date: Date.now()
  };

  // 从 localStorage 读取历史记录
  const history = JSON.parse(localStorage.getItem('typing_practice_history') || '[]');
  history.unshift(record);
  // 只保留最近 50 条记录
  if (history.length > 50) {
    history.pop();
  }
  localStorage.setItem('typing_practice_history', JSON.stringify(history));

  // 保存当前进度到 store
  const progress = {
    userInput: userInput.value,
    typedStatus: typedStatus.value,
    currentIndex: currentIndex.value,
    elapsedTime: elapsedTime.value,
    wpm: wpm.value,
    isFinished: isFinished.value
  };
  await textStore.saveLearningProgress(props.article._id, 'typing', progress);
}

// 加载进度
function loadProgress() {
  if (!props.article) return;
  
  const savedProgress = textStore.getLearningProgress(props.article._id, 'typing');
  if (savedProgress?.progress?.userInput && !savedProgress.progress.isFinished) {
    restoreProgress(savedProgress.progress);
    ElMessage.success('进度已恢复');
  } else {
    ElMessage.warning('没有找到保存的进度');
  }
}

// 重置练习
function handleReset() {
  resetPractice();
  nextTick(() => {
    inputRef.value?.focus();
  });
}

// 重置状态
function resetPractice() {
  userInput.value = '';
  currentIndex.value = 0;
  isFinished.value = false;
  isPaused.value = false;
  startTime.value = null;
  elapsedTime.value = 0;
  wpm.value = 0;
  stopTimer();
  initTypedStatus();
}

// 关闭对话框
function handleClose() {
  emit('update:modelValue', false);
}
</script>

<style scoped lang="scss">
.typing-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.stats-panel {
  background: var(--utools-bg-secondary);
  border-radius: 8px;
  padding: 12px 16px;

  .stat-item {
    text-align: center;

    .stat-label {
      font-size: 12px;
      color: var(--utools-text-secondary);
      margin-bottom: 4px;
    }

    .stat-value {
      font-size: 24px;
      font-weight: 600;
      color: var(--utools-text-primary);

      .unit {
        font-size: 12px;
        font-weight: normal;
        color: var(--utools-text-secondary);
        margin-left: 2px;
      }

      &.excellent {
        color: var(--utools-success);
      }

      &.good {
        color: #67c23a;
      }

      &.fair {
        color: var(--utools-warning);
      }

      &.poor {
        color: var(--utools-danger);
      }
    }
  }
}

.section-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--utools-text-secondary);
  margin-bottom: 8px;
}

.original-text-container {
  background: var(--utools-bg-secondary);
  border-radius: 8px;
  padding: 16px;

  .original-text {
    font-size: 18px;
    line-height: 2;
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
    white-space: pre-wrap;
    word-break: break-all;
    max-height: 200px;
    overflow-y: auto;

    .char {
      padding: 2px 1px;
      border-radius: 2px;
      transition: all 0.1s;

      &.pending {
        color: var(--utools-text-secondary);
      }

      &.current {
        background: var(--utools-primary);
        color: white;
        animation: blink 1s infinite;
      }

      &.correct {
        color: var(--utools-success);
        background: rgba(103, 194, 58, 0.1);
      }

      &.incorrect {
        color: var(--utools-danger);
        background: rgba(245, 108, 108, 0.1);
        text-decoration: underline;
      }
    }
  }
}

@keyframes blink {
  0%, 50% {
    opacity: 1;
  }
  51%, 100% {
    opacity: 0.7;
  }
}

.input-area {
  :deep(.el-textarea__inner) {
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
    font-size: 16px;
    line-height: 1.8;
  }
}

.controls {
  display: flex;
  justify-content: center;
  gap: 12px;
}

.result-panel {
  margin-top: 8px;
}
</style>
