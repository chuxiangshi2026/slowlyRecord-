<template>
  <div class="shortcut-training-page">
    <el-card class="training-card">
      <template #header>
        <div class="training-header">
          <el-button @click="goBack">
            <el-icon><ArrowLeft /></el-icon>
            返回
          </el-button>
          <span class="training-title">
            {{ isKeyPressMode ? '🎯 按键训练' : '🧩 功能选择' }}
            - {{ store.currentCategory }}
          </span>
          <div class="training-stats">
            <el-tag type="success">✓ {{ store.correctCount }}</el-tag>
            <el-tag type="danger">✗ {{ store.wrongCount }}</el-tag>
            <el-tag type="info">
              {{ store.currentQuestionIndex + 1 }} / {{ store.questions.length }}
            </el-tag>
          </div>
        </div>
      </template>

      <!-- 进度条 -->
      <el-progress
        :percentage="store.progress"
        :stroke-width="8"
        :show-text="false"
        class="training-progress"
      />

      <!-- 准备开始 -->
      <div v-if="store.trainingPhase === 'ready'" class="phase-ready">
        <el-result icon="info" title="准备开始">
          <template #sub-title>
            <p>共 {{ store.questions.length }} 道题目</p>
            <p v-if="isKeyPressMode">
              看到功能描述后，在键盘上按下对应的快捷键
            </p>
            <p v-else>
              看到快捷键后，选择正确的功能描述
            </p>
          </template>
          <template #extra>
            <el-button type="primary" size="large" @click="startTraining">
              开始训练
            </el-button>
          </template>
        </el-result>
      </div>

      <!-- 题目区域 -->
      <div v-else-if="!store.isTrainingComplete" class="question-area">
        <!-- 功能描述区域 -->
        <div class="function-display">
          <div class="function-name">{{ currentQuestion?.functionName }}</div>
          <div class="function-desc">{{ currentQuestion?.description }}</div>
        </div>

        <!-- 按键训练模式 -->
        <template v-if="isKeyPressMode">
          <div class="keypress-area">
            <div class="setting-bar">
              <el-switch
                v-model="showKeyboardHint"
                active-text="显示按键提示"
                inactive-text="隐藏按键提示"
              />
            </div>

            <div class="prompt-area">
              <el-alert
                v-if="store.trainingPhase === 'showing'"
                title="请按下对应的快捷键"
                type="info"
                :closable="false"
                center
                show-icon
              />
              <el-alert
                v-else-if="store.trainingPhase === 'correct'"
                title="回答正确！"
                type="success"
                :closable="false"
                center
                show-icon
              />
              <el-alert
                v-else-if="store.trainingPhase === 'wrong'"
                :title="wrongMessage"
                type="error"
                :closable="false"
                center
                show-icon
              />
            </div>

            <div class="pressed-keys-display">
              <div class="keys-label">当前按键：</div>
              <div class="keys-box">
                <el-tag
                  v-for="key in displayPressedKeys"
                  :key="key"
                  size="large"
                  :type="store.trainingPhase === 'correct' ? 'success' : store.trainingPhase === 'wrong' ? 'danger' : 'info'"
                  class="pressed-key-tag"
                >
                  {{ key }}
                </el-tag>
                <span v-if="displayPressedKeys.length === 0" class="keys-placeholder">
                  等待按键...
                </span>
              </div>
            </div>

            <!-- 键盘可视化 -->
            <KeyboardVisual
              v-if="showKeyboardHint"
              :pressed-keys="store.pressedKeys"
              :target-keys="store.trainingPhase === 'showing' ? currentQuestion?.keys : []"
            />
          </div>
        </template>

        <!-- 功能选择模式 -->
        <template v-else>
          <div class="quiz-area">
            <!-- 显示快捷键 -->
            <div class="shortcut-display">
              <div
                v-for="(key, index) in currentQuestion?.keys"
                :key="index"
                class="shortcut-key"
              >
                {{ key }}
              </div>
            </div>

            <div class="prompt-area">
              <el-alert
                v-if="store.trainingPhase === 'showing'"
                title="请选择这个快捷键对应的功能描述"
                type="info"
                :closable="false"
                center
                show-icon
              />
              <el-alert
                v-else-if="store.trainingPhase === 'correct'"
                title="回答正确！"
                type="success"
                :closable="false"
                center
                show-icon
              />
              <el-alert
                v-else-if="store.trainingPhase === 'wrong'"
                title="回答错误"
                type="error"
                :closable="false"
                center
                show-icon
              />
            </div>

            <!-- 选项 -->
            <div class="options-grid">
              <el-button
                v-for="option in quizOptions"
                :key="option.id"
                :type="getOptionType(option.id)"
                size="large"
                class="option-btn"
                :disabled="store.trainingPhase !== 'showing'"
                @click="selectOption(option.id)"
              >
                <div class="option-content">
                  <div class="option-name">{{ option.functionName }}</div>
                  <div class="option-desc">{{ option.description }}</div>
                </div>
              </el-button>
            </div>

            <div class="action-area" v-if="store.trainingPhase !== 'showing'">
              <el-button type="primary" size="large" @click="nextQuestion">
                下一题
                <el-icon class="el-icon--right"><ArrowRight /></el-icon>
              </el-button>
            </div>
          </div>
        </template>
      </div>

      <!-- 训练完成 -->
      <div v-else class="training-complete">
        <el-result
          :icon="resultIcon"
          :title="resultTitle"
        >
          <template #sub-title>
            <div class="result-stats">
              <p>总题数：{{ store.questions.length }}</p>
              <p>正确：{{ store.correctCount }}</p>
              <p>错误：{{ store.wrongCount }}</p>
              <p>正确率：{{ Math.round((store.correctCount / store.questions.length) * 100) }}%</p>
            </div>
          </template>
          <template #extra>
            <el-button type="primary" @click="restartTraining">
              再练一次
            </el-button>
            <el-button @click="goBack">
              返回列表
            </el-button>
          </template>
        </el-result>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useShortcutMemoryStore } from '@/stores/shortcutMemory';
import { ElMessage } from 'element-plus';
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue';
import type { ShortcutItem } from '@/types/shortcut-memory';
import KeyboardVisual from './components/KeyboardVisual.vue';

const router = useRouter();
const route = useRoute();
const store = useShortcutMemoryStore();

const isKeyPressMode = ref(true);
const quizOptions = ref<ShortcutItem[]>([]);
const wrongMessage = ref('');
const showKeyboardHint = ref(true);
let autoNextTimer: ReturnType<typeof setTimeout> | null = null;

const currentQuestion = computed(() => store.currentQuestion);

const displayPressedKeys = computed(() => {
  return Array.from(store.pressedKeys);
});

const resultIcon = computed(() => {
  const rate = store.correctCount / store.questions.length;
  if (rate >= 0.8) return 'success';
  if (rate >= 0.5) return 'warning';
  return 'error';
});

const resultTitle = computed(() => {
  const rate = store.correctCount / store.questions.length;
  if (rate >= 0.8) return '太棒了！';
  if (rate >= 0.5) return '继续加油！';
  return '还需努力！';
});

function getOptionType(optionId: string): string {
  if (store.trainingPhase === 'showing') return 'default';
  if (optionId === currentQuestion.value?.id) return 'success';
  return 'danger';
}

function startTraining() {
  store.showCurrentQuestion();
  if (!isKeyPressMode.value) {
    quizOptions.value = store.generateQuizOptions();
  }
}

function nextQuestion() {
  store.nextQuestion();
  if (!isKeyPressMode.value && !store.isTrainingComplete) {
    quizOptions.value = store.generateQuizOptions();
  }
}

function selectOption(optionId: string) {
  const isCorrect = store.checkFunctionSelect(optionId);
  if (!isCorrect) {
    const correct = currentQuestion.value;
    wrongMessage.value = `正确答案是：${correct?.functionName}`;
  }
}

function restartTraining() {
  if (isKeyPressMode.value) {
    store.initKeyPressTraining(store.currentCategory);
  } else {
    store.initFunctionSelectTraining(store.currentCategory);
  }
}

function goBack() {
  router.push('/shortcut-memory');
}

// 键盘事件处理
function handleKeyDown(event: KeyboardEvent) {
  if (!isKeyPressMode.value || store.trainingPhase !== 'showing') return;
  if (store.isTrainingComplete) return;

  event.preventDefault();
  event.stopPropagation();

  // 处理修饰键
  if (event.ctrlKey) store.addPressedKey('ctrl');
  if (event.altKey) store.addPressedKey('alt');
  if (event.shiftKey) store.addPressedKey('shift');
  if (event.metaKey) store.addPressedKey('win');

  const key = event.key;
  // 处理普通按键（避免重复添加修饰键）
  if (!event.ctrlKey && !event.altKey && !event.shiftKey && !event.metaKey) {
    store.addPressedKey(key);
  } else if (key !== 'Control' && key !== 'Alt' && key !== 'Shift' && key !== 'Meta') {
    store.addPressedKey(key);
  }

  // 检查是否匹配
  const isCorrect = store.checkKeyPress();
  if (isCorrect) {
    // 正确：延迟 600ms 自动进入下一题
    if (autoNextTimer) clearTimeout(autoNextTimer);
    autoNextTimer = setTimeout(() => {
      nextQuestion();
    }, 600);
  } else {
    // 错误：显示错误提示，延迟 1200ms 后重新监听
    const correct = currentQuestion.value;
    wrongMessage.value = `正确答案是：${correct?.keys.join(' + ')}`;
    if (autoNextTimer) clearTimeout(autoNextTimer);
    autoNextTimer = setTimeout(() => {
      store.clearPressedKeys();
      store.trainingPhase = 'showing';
    }, 1200);
  }
}

function handleKeyUp(event: KeyboardEvent) {
  if (!isKeyPressMode.value) return;

  const key = event.key;

  // 延迟清除，让用户能看到按下的组合键
  setTimeout(() => {
    if (key === 'Control') store.removePressedKey('ctrl');
    else if (key === 'Alt') store.removePressedKey('alt');
    else if (key === 'Shift') store.removePressedKey('shift');
    else if (key === 'Meta') store.removePressedKey('win');
    else store.removePressedKey(key);
  }, 200);
}

// 监听训练完成
watch(() => store.isTrainingComplete, (complete) => {
  if (complete) {
    store.saveTrainingResult(isKeyPressMode.value ? 'keyPress' : 'functionSelect');
  }
});

onMounted(() => {
  const mode = route.query.mode as string;
  isKeyPressMode.value = mode !== 'functionSelect';

  if (!store.currentCategory) {
    router.push('/shortcut-memory');
    return;
  }

  if (isKeyPressMode.value) {
    store.initKeyPressTraining(store.currentCategory);
  } else {
    store.initFunctionSelectTraining(store.currentCategory);
  }

  window.addEventListener('keydown', handleKeyDown, true);
  window.addEventListener('keyup', handleKeyUp, true);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown, true);
  window.removeEventListener('keyup', handleKeyUp, true);
  if (autoNextTimer) clearTimeout(autoNextTimer);
});
</script>

<style scoped lang="scss">
.shortcut-training-page {
  padding: 20px;
  width: 100%;
  box-sizing: border-box;
  min-height: 100vh;
  background-color: var(--utools-bg-secondary);

  .training-card {
    background-color: var(--utools-bg-card);
    border-color: var(--utools-border-primary);
    max-width: 960px;
    margin: 0 auto;
  }

  .training-header {
    display: flex;
    align-items: center;
    gap: 16px;

    .training-title {
      font-size: 16px;
      font-weight: bold;
      color: var(--utools-text-primary);
      flex: 1;
    }

    .training-stats {
      display: flex;
      gap: 8px;
    }
  }

  .training-progress {
    margin-bottom: 20px;
  }

  .phase-ready {
    padding: 40px 0;
  }

  .question-area {
    .setting-bar {
      display: flex;
      justify-content: center;
      margin-bottom: 16px;
    }

    .function-display {
      text-align: center;
      margin-bottom: 24px;
      padding: 24px;
      background: var(--utools-bg-secondary);
      border-radius: 12px;

      .function-name {
        font-size: 24px;
        font-weight: bold;
        color: var(--utools-text-primary);
        margin-bottom: 12px;
      }

      .function-desc {
        font-size: 15px;
        color: var(--utools-text-secondary);
      }
    }

    .prompt-area {
      margin-bottom: 20px;
    }

    .pressed-keys-display {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin-bottom: 20px;
      min-height: 48px;

      .keys-label {
        font-size: 14px;
        color: var(--utools-text-secondary);
      }

      .keys-box {
        display: flex;
        gap: 8px;
        align-items: center;

        .pressed-key-tag {
          font-size: 16px;
          font-weight: bold;
          padding: 8px 16px;
        }

        .keys-placeholder {
          color: var(--utools-text-tertiary);
          font-size: 14px;
        }
      }
    }

    .shortcut-display {
      display: flex;
      justify-content: center;
      gap: 16px;
      margin-bottom: 24px;

      .shortcut-key {
        min-width: 64px;
        height: 64px;
        border: 2px solid var(--utools-primary);
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        font-weight: bold;
        color: var(--utools-primary);
        background: var(--utools-bg-secondary);
      }
    }

    .options-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      margin-bottom: 24px;

      .option-btn {
        height: auto;
        padding: 16px;
        text-align: left;

        .option-content {
          .option-name {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 6px;
          }

          .option-desc {
            font-size: 13px;
            opacity: 0.85;
            line-height: 1.4;
          }
        }
      }
    }

    .action-area {
      text-align: center;
      margin-top: 24px;
    }
  }

  .training-complete {
    padding: 40px 0;

    .result-stats {
      text-align: center;
      line-height: 1.8;
    }
  }
}

@media (max-width: 768px) {
  .shortcut-training-page {
    .options-grid {
      grid-template-columns: 1fr !important;
    }
  }
}
</style>
