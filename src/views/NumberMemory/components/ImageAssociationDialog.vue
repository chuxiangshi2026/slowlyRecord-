<template>
  <el-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    title="🖼️ 图片联想记忆"
    width="800px"
    destroy-on-close
    class="image-association-dialog"
  >
    <div v-if="entry" class="association-container">
      <!-- 头部信息 -->
      <div class="header-info">
        <h3>{{ entry.title }}</h3>
        <div class="numbers-display">{{ entry.numbers }}</div>
      </div>

      <!-- 显示模式切换 -->
      <div class="mode-toggle">
        <el-radio-group v-model="displayMode">
          <el-radio-button label="sequential">顺序展示</el-radio-button>
          <el-radio-button label="grid">网格展示</el-radio-button>
          <el-radio-button label="story">故事模式</el-radio-button>
        </el-radio-group>
      </div>

      <!-- 顺序展示模式 -->
      <div v-if="displayMode === 'sequential'" class="sequential-mode">
        <div class="progress-bar">
          <el-progress :percentage="progressPercentage" :stroke-width="20" />
          <span class="progress-text">{{ currentIndex + 1 }} / {{ numberArray.length }}</span>
        </div>

        <div class="current-display">
          <div class="number-highlight">{{ currentNumber }}</div>
          <div v-if="currentAssociation" class="association-display">
            <img 
              v-if="isBase64Image(currentAssociation.imageUrl)" 
              :src="currentAssociation.imageUrl" 
              alt="关联图片" 
              class="association-image"
            />
            <div v-else class="association-emoji">{{ currentAssociation.imageUrl }}</div>
            <div v-if="currentAssociation.description" class="association-desc">
              {{ currentAssociation.description }}
            </div>
          </div>
          <div v-else class="no-association">
            <el-empty description="该数字暂无图片关联" :image-size="100">
              <el-button type="primary" @click="goToSetting">
                去设置关联
              </el-button>
            </el-empty>
          </div>
        </div>

        <div class="navigation-controls">
          <el-button 
            @click="prevNumber" 
            :disabled="currentIndex === 0"
            size="large"
          >
            <el-icon><ArrowLeft /></el-icon>
            上一个
          </el-button>
          <el-button
            v-if="isPlaying"
            type="warning"
            @click="pauseAutoPlay"
            size="large"
          >
            <el-icon><VideoPause /></el-icon>
            暂停
          </el-button>
          <el-button
            v-else
            type="primary"
            @click="startAutoPlay"
            :disabled="currentIndex === numberArray.length - 1"
            size="large"
          >
            <el-icon><VideoPlay /></el-icon>
            {{ currentIndex === 0 ? '自动播放' : '继续' }}
          </el-button>
          <el-button 
            @click="nextNumber" 
            :disabled="currentIndex === numberArray.length - 1"
            size="large"
          >
            下一个
            <el-icon><ArrowRight /></el-icon>
          </el-button>
        </div>

        <div class="speed-control">
          <span>播放速度：</span>
          <el-slider v-model="playSpeed" :min="1" :max="10" style="width: 200px" />
          <span>{{ playSpeed }}秒/个</span>
        </div>
      </div>

      <!-- 网格展示模式 -->
      <div v-else-if="displayMode === 'grid'" class="grid-mode">
        <div class="grid-container">
          <div
            v-for="(item, index) in numberAssociations"
            :key="index"
            class="grid-item"
            :class="{ 'has-image': item.association, 'no-image': !item.association }"
          >
            <div class="grid-number">{{ item.number }}</div>
            <div v-if="item.association" class="grid-image">
              <img 
                v-if="isBase64Image(item.association.imageUrl)" 
                :src="item.association.imageUrl" 
                alt="关联图片" 
              />
              <span v-else class="grid-emoji">{{ item.association.imageUrl }}</span>
            </div>
            <div v-else class="grid-placeholder">
              <el-icon><Picture /></el-icon>
              <span>未设置</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 故事模式 -->
      <div v-else class="story-mode">
        <div class="story-content">
          <p class="story-intro">将数字转化为图片故事：</p>
          <div class="story-flow">
            <div
              v-for="(item, index) in numberAssociations"
              :key="index"
              class="story-item"
            >
              <div class="story-number">{{ item.number }}</div>
              <div v-if="item.association" class="story-image">
                <img 
                  v-if="isBase64Image(item.association.imageUrl)" 
                  :src="item.association.imageUrl" 
                  alt="关联图片" 
                />
                <span v-else class="story-emoji">{{ item.association.imageUrl }}</span>
              </div>
              <div v-else class="story-missing">?</div>
              <div v-if="index < numberAssociations.length - 1" class="story-arrow">→</div>
            </div>
          </div>
        </div>
        <div class="story-tips">
          <el-alert
            title="记忆提示"
            type="info"
            :closable="false"
          >
            <p>将每个数字对应的图片串联成一个有趣的故事，可以帮助你更好地记忆数字序列。</p>
            <p>例如：{{ storyExample }}</p>
          </el-alert>
        </div>
      </div>

      <!-- 统计信息 -->
      <div class="stats-bar">
        <el-tag type="info">共 {{ numberArray.length }} 位数字</el-tag>
        <el-tag :type="associationRate === 100 ? 'success' : 'warning'">
          关联完成度 {{ associationRate }}% ({{ associatedCount }}/{{ numberArray.length }})
        </el-tag>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useNumberMemoryStore } from '@/stores/numberMemory';
import type { NumberMemoryEntry, NumberImageAssociation } from '@/types/number-memory';
import { ArrowLeft, ArrowRight, VideoPlay, VideoPause, Picture } from '@element-plus/icons-vue';

interface Props {
  modelValue: boolean;
  entry: NumberMemoryEntry | null;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
}>();

const router = useRouter();
const store = useNumberMemoryStore();

// 显示模式
const displayMode = ref<'sequential' | 'grid' | 'story'>('sequential');

// 顺序展示模式状态
const currentIndex = ref(0);
const isPlaying = ref(false);
const playSpeed = ref(2);
let autoPlayTimer: number | null = null;

// 计算数字数组（优先使用两位数）
const numberArray = computed(() => {
  if (!props.entry) return [];
  // 将数字字符串分割成两位数数组
  const numbers = props.entry.numbers.split('').filter(n => /\d/.test(n));
  const result: string[] = [];
  
  for (let i = 0; i < numbers.length; i += 2) {
    if (i + 1 < numbers.length) {
      // 有两位，组成两位数
      result.push(numbers[i] + numbers[i + 1]);
    } else {
      // 只剩一位
      result.push(numbers[i]);
    }
  }
  
  return result;
});

// 数字与关联的映射
const numberAssociations = computed(() => {
  return numberArray.value.map(num => {
    const association = store.getAssociation(num);
    return {
      number: num,
      association: association || null
    };
  });
});

// 当前数字
const currentNumber = computed(() => numberArray.value[currentIndex.value] || '');

// 当前关联
const currentAssociation = computed((): NumberImageAssociation | null => {
  return store.getAssociation(currentNumber.value) || null;
});

// 进度百分比
const progressPercentage = computed(() => {
  if (numberArray.value.length === 0) return 0;
  return Math.round(((currentIndex.value + 1) / numberArray.value.length) * 100);
});

// 关联统计
const associatedCount = computed(() => {
  return numberAssociations.value.filter(item => item.association).length;
});

const associationRate = computed(() => {
  if (numberArray.value.length === 0) return 0;
  return Math.round((associatedCount.value / numberArray.value.length) * 100);
});

// 故事示例
const storyExample = computed(() => {
  const examples: Record<string, string> = {
    '0': '铃铛',
    '1': '树',
    '2': '鹅',
    '3': '山',
    '4': '旗',
    '5': '钩',
    '6': '哨',
    '7': '锄',
    '8': '葫芦',
    '9': '酒'
  };
  return numberArray.value.slice(0, 3).map(n => examples[n] || n).join(' → ');
});

// 判断是否为 base64 图片
function isBase64Image(url: string): boolean {
  return url?.startsWith('data:image/') || false;
}

// 上一个
function prevNumber() {
  if (currentIndex.value > 0) {
    currentIndex.value--;
  }
}

// 下一个
function nextNumber() {
  if (currentIndex.value < numberArray.value.length - 1) {
    currentIndex.value++;
  } else {
    stopAutoPlay();
  }
}

// 开始自动播放
function startAutoPlay() {
  isPlaying.value = true;
  autoPlayTimer = window.setInterval(() => {
    if (currentIndex.value < numberArray.value.length - 1) {
      currentIndex.value++;
    } else {
      stopAutoPlay();
    }
  }, playSpeed.value * 1000);
}

// 暂停自动播放
function pauseAutoPlay() {
  stopAutoPlay();
}

// 停止自动播放
function stopAutoPlay() {
  isPlaying.value = false;
  if (autoPlayTimer) {
    clearInterval(autoPlayTimer);
    autoPlayTimer = null;
  }
}

// 跳转到设置页面
function goToSetting() {
  emit('update:modelValue', false);
  router.push('/number-memory');
}

// 监听对话框显示
watch(() => props.modelValue, (visible) => {
  if (visible) {
    currentIndex.value = 0;
    displayMode.value = 'sequential';
  } else {
    stopAutoPlay();
  }
});

// 组件卸载时清理
onUnmounted(() => {
  stopAutoPlay();
});
</script>

<style scoped lang="scss">
.association-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.header-info {
  text-align: center;
  padding: 16px;
  background: var(--utools-bg-secondary);
  border-radius: 8px;

  h3 {
    margin: 0 0 10px 0;
    color: var(--utools-text-primary);
  }

  .numbers-display {
    font-size: 28px;
    font-weight: bold;
    color: var(--utools-primary);
    letter-spacing: 6px;
    font-family: monospace;
  }
}

.mode-toggle {
  display: flex;
  justify-content: center;
}

// 顺序展示模式
.sequential-mode {
  .progress-bar {
    display: flex;
    align-items: center;
    gap: 15px;

    .el-progress {
      flex: 1;
    }

    .progress-text {
      font-weight: bold;
      color: var(--utools-primary);
      min-width: 60px;
      text-align: right;
    }
  }

  .current-display {
    min-height: 300px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 30px;
    background: var(--utools-bg-secondary);
    border-radius: 12px;

    .number-highlight {
      font-size: 72px;
      font-weight: bold;
      color: var(--utools-primary);
      margin-bottom: 30px;
      font-family: monospace;
    }

    .association-display {
      text-align: center;

      .association-image {
        width: 200px;
        height: 200px;
        object-fit: contain;
        border-radius: 12px;
        border: 3px solid var(--utools-border-primary);
      }

      .association-emoji {
        font-size: 120px;
        line-height: 200px;
      }

      .association-desc {
        margin-top: 15px;
        color: var(--utools-text-secondary);
        font-size: 14px;
      }
    }

    .no-association {
      text-align: center;
    }
  }

  .navigation-controls {
    display: flex;
    justify-content: center;
    gap: 15px;
  }

  .speed-control {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    color: var(--utools-text-secondary);
  }
}

// 网格展示模式
.grid-mode {
  .grid-container {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 15px;
    max-height: 400px;
    overflow-y: auto;
    padding: 10px;
  }

  .grid-item {
    border: 2px solid var(--utools-border-primary);
    border-radius: 8px;
    padding: 10px;
    text-align: center;
    background: var(--utools-bg-card);

    &.has-image {
      border-color: var(--utools-success);
    }

    &.no-image {
      border-color: var(--utools-warning);
      opacity: 0.7;
    }

    .grid-number {
      font-size: 24px;
      font-weight: bold;
      color: var(--utools-primary);
      margin-bottom: 8px;
      font-family: monospace;
    }

    .grid-image {
      img {
        width: 60px;
        height: 60px;
        object-fit: contain;
        border-radius: 4px;
      }

      .grid-emoji {
        font-size: 48px;
        line-height: 60px;
      }
    }

    .grid-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      color: var(--utools-text-tertiary);

      .el-icon {
        font-size: 32px;
        margin-bottom: 4px;
      }

      span {
        font-size: 12px;
      }
    }
  }
}

// 故事模式
.story-mode {
  .story-content {
    padding: 20px;
    background: var(--utools-bg-secondary);
    border-radius: 8px;

    .story-intro {
      margin: 0 0 15px 0;
      color: var(--utools-text-secondary);
    }

    .story-flow {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 10px;
    }

    .story-item {
      display: flex;
      align-items: center;
      gap: 10px;

      .story-number {
        width: 36px;
        height: 36px;
        line-height: 36px;
        text-align: center;
        background: var(--utools-primary);
        color: white;
        border-radius: 50%;
        font-weight: bold;
        font-size: 16px;
      }

      .story-image {
        img {
          width: 50px;
          height: 50px;
          object-fit: contain;
          border-radius: 4px;
          border: 2px solid var(--utools-border-primary);
        }

        .story-emoji {
          font-size: 40px;
          line-height: 50px;
        }
      }

      .story-missing {
        width: 50px;
        height: 50px;
        line-height: 50px;
        text-align: center;
        background: var(--utools-warning-light);
        color: var(--utools-warning);
        border-radius: 4px;
        font-size: 24px;
        font-weight: bold;
      }

      .story-arrow {
        font-size: 20px;
        color: var(--utools-text-secondary);
      }
    }
  }

  .story-tips {
    p {
      margin: 4px 0;
      font-size: 13px;
    }
  }
}

.stats-bar {
  display: flex;
  justify-content: center;
  gap: 15px;
  padding-top: 15px;
  border-top: 1px solid var(--utools-border-primary);
}
</style>
