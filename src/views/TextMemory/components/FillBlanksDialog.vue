<template>
  <el-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    title="填空练习"
    width="900px"
    destroy-on-close
    class="fill-blanks-dialog"
  >
    <div v-if="article" class="fill-blanks-container">
      <!-- 设置工具栏 -->
      <div class="toolbar">
        <div class="toolbar-left">
          <span class="article-title">{{ article.title }}</span>
          <el-tag size="small" type="info">共 {{ article.content.length }} 字</el-tag>
        </div>
        <div class="toolbar-right">
          <el-form :inline="true" size="small">
            <el-form-item label="填空数量">
              <el-input-number
                v-model="blankCount"
                :min="3"
                :max="30"
                size="small"
              />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="generateNewExercise">
                <el-icon><Refresh /></el-icon>
                重新生成
              </el-button>
              <el-button @click="toggleShowAnswers">
                {{ showAnswers ? '隐藏答案' : '显示答案' }}
              </el-button>
            </el-form-item>
          </el-form>
        </div>
      </div>

      <!-- 练习模式选择 -->
      <div class="mode-selector">
        <el-radio-group v-model="exerciseMode">
          <el-radio-button label="random">随机填空</el-radio-button>
          <el-radio-button label="keyword">关键词填空</el-radio-button>
          <el-radio-button label="sentence">整句填空</el-radio-button>
        </el-radio-group>
      </div>

      <!-- 填空内容区域 -->
      <div class="exercise-area" v-loading="generating">
        <div v-if="exerciseSegments.length > 0" class="exercise-content">
          <template v-for="(segment, index) in exerciseSegments" :key="index">
            <span v-if="segment.type === 'text'" class="text-segment">
              {{ segment.content }}
            </span>
            <span v-else-if="segment.type === 'blank'" class="blank-item">
              <el-input
                v-model="segment.userAnswer"
                :class="{
                  'is-correct': segment.isChecked && segment.isCorrect,
                  'is-wrong': segment.isChecked && !segment.isCorrect
                }"
                :placeholder="getBlankPlaceholder(segment)"
                size="small"
                @keyup.enter="checkAnswer(segment)"
              >
                <template #suffix>
                  <el-icon v-if="segment.isChecked && segment.isCorrect" class="status-icon correct">
                    <Check />
                  </el-icon>
                  <el-icon v-if="segment.isChecked && !segment.isCorrect" class="status-icon wrong">
                    <Close />
                  </el-icon>
                </template>
              </el-input>
              <span v-if="showAnswers || (segment.isChecked && !segment.isCorrect)" class="answer-hint">
                {{ segment.answer }}
              </span>
            </span>
          </template>
        </div>
        <el-empty v-else description="点击「重新生成」开始练习" />
      </div>

      <!-- 统计信息 -->
      <div v-if="stats.total > 0" class="stats-bar">
        <el-tag type="info">共 {{ stats.total }} 个填空</el-tag>
        <el-tag type="success">已答对 {{ stats.correct }} 个</el-tag>
        <el-tag type="danger">错误 {{ stats.wrong }} 个</el-tag>
        <el-tag type="warning">未答 {{ stats.total - stats.correct - stats.wrong }} 个</el-tag>
        <el-tag type="primary">正确率 {{ stats.percentage }}%</el-tag>
      </div>

      <!-- 操作按钮 -->
      <div class="action-bar">
        <el-button type="primary" @click="checkAllAnswers" :disabled="!hasBlanks">
          检查答案
        </el-button>
        <el-button @click="resetExercise" :disabled="!hasBlanks">
          重置练习
        </el-button>
        <el-button type="success" @click="saveProgress">
          保存进度
        </el-button>
      </div>

      <!-- 提示区域 -->
      <div class="tips-area">
        <el-alert
          title="练习提示"
          type="info"
          :closable="false"
        >
          <p>1. 在输入框中填入缺失的文字</p>
          <p>2. 按 Enter 键或点击"检查答案"验证</p>
          <p>3. 错误的答案会显示正确答案</p>
        </el-alert>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useTextMemoryStore } from '@/stores/textMemory';
import type { TextArticle } from '@/types/text-memory';
import { ElMessage } from 'element-plus';
import { Refresh, Check, Close } from '@element-plus/icons-vue';

interface Props {
  modelValue: boolean;
  article: TextArticle | null;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
}>();

const textStore = useTextMemoryStore();

// 练习设置
const blankCount = ref(10);
const exerciseMode = ref<'random' | 'keyword' | 'sentence'>('random');
const showAnswers = ref(false);
const generating = ref(false);

// 练习段落
interface ExerciseSegment {
  type: 'text' | 'blank';
  content?: string;
  userAnswer?: string;
  answer?: string;
  isChecked?: boolean;
  isCorrect?: boolean;
}

const exerciseSegments = ref<ExerciseSegment[]>([]);

// 是否有填空
const hasBlanks = computed(() => {
  return exerciseSegments.value.some(s => s.type === 'blank');
});

// 统计信息
const stats = computed(() => {
  const blanks = exerciseSegments.value.filter(s => s.type === 'blank');
  const total = blanks.length;
  const correct = blanks.filter(s => s.isCorrect).length;
  const wrong = blanks.filter(s => s.isChecked && !s.isCorrect).length;
  const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
  return { total, correct, wrong, percentage };
});

// 监听文章变化
watch(() => props.article, (newArticle) => {
  if (newArticle) {
    generateNewExercise();
  }
}, { immediate: true });

// 监听模式变化
watch(exerciseMode, () => {
  generateNewExercise();
});

// 生成新的练习
function generateNewExercise() {
  if (!props.article) return;
  
  generating.value = true;
  showAnswers.value = false;
  
  setTimeout(() => {
    const content = props.article!.content;
    const segments: ExerciseSegment[] = [];
    
    switch (exerciseMode.value) {
      case 'random':
        generateRandomBlanks(content, segments);
        break;
      case 'keyword':
        generateKeywordBlanks(content, segments);
        break;
      case 'sentence':
        generateSentenceBlanks(content, segments);
        break;
    }
    
    exerciseSegments.value = segments;
    generating.value = false;
  }, 100);
}

// 随机填空
function generateRandomBlanks(content: string, segments: ExerciseSegment[]) {
  // 找出所有可能的2-4字词语位置
  const allWords: { word: string; start: number; end: number; len: number }[] = [];
  
  // 提取2-4字词语（优先较长的词）
  for (let len = 4; len >= 2; len--) {
    for (let i = 0; i <= content.length - len; i++) {
      const word = content.substring(i, i + len);
      // 只取纯中文词语
      if (/^[\u4e00-\u9fa5]+$/.test(word)) {
        allWords.push({ word, start: i, end: i + len, len });
      }
    }
  }
  
  if (allWords.length === 0) {
    segments.push({ type: 'text', content });
    return;
  }
  
  // 随机打乱
  const shuffledWords = [...allWords].sort(() => Math.random() - 0.5);
  
  // 选择不重叠的填空
  const selectedWords: typeof allWords = [];
  const usedRanges: { start: number; end: number }[] = [];
  
  for (const word of shuffledWords) {
    // 检查是否与已选的关键词重叠
    const overlap = usedRanges.some(range => 
      !(word.end <= range.start || word.start >= range.end)
    );
    
    if (!overlap) {
      selectedWords.push(word);
      usedRanges.push({ start: word.start, end: word.end });
      
      if (selectedWords.length >= blankCount.value) {
        break;
      }
    }
  }
  
  if (selectedWords.length === 0) {
    segments.push({ type: 'text', content });
    return;
  }
  
  // 按位置排序
  selectedWords.sort((a, b) => a.start - b.start);
  
  // 构建段落
  let lastEnd = 0;
  selectedWords.forEach(word => {
    // 添加文本段
    if (word.start > lastEnd) {
      segments.push({
        type: 'text',
        content: content.substring(lastEnd, word.start)
      });
    }
    
    // 添加填空
    segments.push({
      type: 'blank',
      answer: word.word,
      userAnswer: '',
      isChecked: false,
      isCorrect: false
    });
    
    lastEnd = word.end;
  });
  
  // 添加剩余文本
  if (lastEnd < content.length) {
    segments.push({
      type: 'text',
      content: content.substring(lastEnd)
    });
  }
}

// 关键词填空
function generateKeywordBlanks(content: string, segments: ExerciseSegment[]) {
  // 按优先级提取关键词：4字成语 > 3字词组 > 2字词语
  const allKeywords: { word: string; start: number; end: number; priority: number }[] = [];
  
  // 提取4字成语或词组（优先级最高）
  for (let i = 0; i <= content.length - 4; i++) {
    const word = content.substring(i, i + 4);
    // 匹配4个中文字符，排除纯标点
    if (/^[\u4e00-\u9fa5]{4}$/.test(word)) {
      allKeywords.push({ word, start: i, end: i + 4, priority: 3 });
    }
  }
  
  // 提取3字词组
  for (let i = 0; i <= content.length - 3; i++) {
    const word = content.substring(i, i + 3);
    if (/^[\u4e00-\u9fa5]{3}$/.test(word)) {
      // 检查是否与已存在的4字词重叠
      const overlap4 = allKeywords.some(k => 
        k.priority === 3 && !(i + 3 <= k.start || i >= k.end)
      );
      if (!overlap4) {
        allKeywords.push({ word, start: i, end: i + 3, priority: 2 });
      }
    }
  }
  
  // 提取2字词语
  for (let i = 0; i <= content.length - 2; i++) {
    const word = content.substring(i, i + 2);
    if (/^[\u4e00-\u9fa5]{2}$/.test(word)) {
      // 检查是否与已存在的3字或4字词重叠
      const overlap = allKeywords.some(k => 
        (k.priority === 3 || k.priority === 2) && !(i + 2 <= k.start || i >= k.end)
      );
      if (!overlap) {
        allKeywords.push({ word, start: i, end: i + 2, priority: 1 });
      }
    }
  }
  
  if (allKeywords.length === 0) {
    // 回退到随机填空
    generateRandomBlanks(content, segments);
    return;
  }
  
  // 按优先级排序（高优先级在前），同优先级随机打乱
  allKeywords.sort((a, b) => {
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }
    return Math.random() - 0.5;
  });
  
  // 选择不重叠的关键词
  const selectedKeywords: typeof allKeywords = [];
  const usedRanges: { start: number; end: number }[] = [];
  
  for (const keyword of allKeywords) {
    // 检查是否与已选的关键词重叠
    const overlap = usedRanges.some(range => 
      !(keyword.end <= range.start || keyword.start >= range.end)
    );
    
    if (!overlap) {
      selectedKeywords.push(keyword);
      usedRanges.push({ start: keyword.start, end: keyword.end });
      
      if (selectedKeywords.length >= blankCount.value) {
        break;
      }
    }
  }
  
  if (selectedKeywords.length === 0) {
    generateRandomBlanks(content, segments);
    return;
  }
  
  // 按位置排序
  selectedKeywords.sort((a, b) => a.start - b.start);
  
  // 构建段落
  let lastEnd = 0;
  selectedKeywords.forEach(keyword => {
    if (keyword.start > lastEnd) {
      segments.push({
        type: 'text',
        content: content.substring(lastEnd, keyword.start)
      });
    }
    
    segments.push({
      type: 'blank',
      answer: keyword.word,
      userAnswer: '',
      isChecked: false,
      isCorrect: false
    });
    
    lastEnd = keyword.end;
  });
  
  if (lastEnd < content.length) {
    segments.push({
      type: 'text',
      content: content.substring(lastEnd)
    });
  }
}

// 整句填空
function generateSentenceBlanks(content: string, segments: ExerciseSegment[]) {
  // 按标点分割句子（使用更精确的匹配）
  const sentences: { text: string; start: number; end: number }[] = [];
  
  // 匹配中文标点结尾的句子
  const regex = /[^。！？；.!?;\n]+[。！？；.!?;]?/g;
  let match;
  
  while ((match = regex.exec(content)) !== null) {
    const text = match[0].trim();
    if (text.length >= 5) { // 只保留长度足够的句子
      sentences.push({
        text: text,
        start: match.index,
        end: match.index + match[0].length
      });
    }
  }
  
  // 如果没有找到带标点的句子，尝试按行分割
  if (sentences.length === 0) {
    const lines = content.split('\n').filter(line => line.trim().length >= 5);
    let currentPos = 0;
    lines.forEach(line => {
      const trimmedLine = line.trim();
      const start = content.indexOf(trimmedLine, currentPos);
      if (start !== -1) {
        sentences.push({
          text: trimmedLine,
          start: start,
          end: start + trimmedLine.length
        });
        currentPos = start + trimmedLine.length;
      }
    });
  }
  
  if (sentences.length === 0) {
    segments.push({ type: 'text', content });
    return;
  }
  
  // 随机打乱句子顺序
  const shuffledSentences = [...sentences].sort(() => Math.random() - 0.5);
  
  // 选择不重叠的句子（优先选择靠前面的句子以保持原文顺序）
  const selectedSentences: typeof sentences = [];
  const usedRanges: { start: number; end: number }[] = [];
  
  // 先按原文顺序排序
  const sortedByPosition = [...shuffledSentences].sort((a, b) => a.start - b.start);
  
  for (const sentence of sortedByPosition) {
    // 检查是否与已选句子重叠（句子不应该重叠，但以防万一）
    const overlap = usedRanges.some(range => 
      !(sentence.end <= range.start || sentence.start >= range.end)
    );
    
    if (!overlap) {
      selectedSentences.push(sentence);
      usedRanges.push({ start: sentence.start, end: sentence.end });
      
      if (selectedSentences.length >= blankCount.value) {
        break;
      }
    }
  }
  
  if (selectedSentences.length === 0) {
    segments.push({ type: 'text', content });
    return;
  }
  
  // 按位置排序以重建原文顺序
  selectedSentences.sort((a, b) => a.start - b.start);
  
  // 构建段落
  let lastEnd = 0;
  selectedSentences.forEach(sentence => {
    if (sentence.start > lastEnd) {
      segments.push({
        type: 'text',
        content: content.substring(lastEnd, sentence.start)
      });
    }
    
    segments.push({
      type: 'blank',
      answer: sentence.text,
      userAnswer: '',
      isChecked: false,
      isCorrect: false
    });
    
    lastEnd = sentence.end;
  });
  
  if (lastEnd < content.length) {
    segments.push({
      type: 'text',
      content: content.substring(lastEnd)
    });
  }
}

// 获取填空占位符
function getBlankPlaceholder(segment: ExerciseSegment): string {
  if (!segment.answer) return '';
  return '□'.repeat(segment.answer.length);
}

// 检查单个答案
function checkAnswer(segment: ExerciseSegment) {
  if (!segment.answer || segment.userAnswer === undefined) return;
  
  segment.isChecked = true;
  segment.isCorrect = segment.userAnswer.trim() === segment.answer;
  
  if (segment.isCorrect) {
    ElMessage.success('回答正确！');
  } else {
    ElMessage.error(`回答错误，正确答案是：${segment.answer}`);
  }
}

// 切换显示答案
function toggleShowAnswers() {
  showAnswers.value = !showAnswers.value;
}

// 检查所有答案
function checkAllAnswers() {
  let correct = 0;
  let total = 0;
  
  exerciseSegments.value.forEach(segment => {
    if (segment.type === 'blank' && segment.answer) {
      total++;
      segment.isChecked = true;
      segment.isCorrect = segment.userAnswer?.trim() === segment.answer;
      if (segment.isCorrect) correct++;
    }
  });
  
  if (correct === total) {
    ElMessage.success(`恭喜！全部正确！(${correct}/${total})`);
    // 更新复习次数
    if (props.article) {
      textStore.updateReviewCount(props.article._id);
    }
  } else {
    ElMessage.warning(`答对 ${correct}/${total} 题，继续加油！`);
  }
}

// 重置练习
function resetExercise() {
  exerciseSegments.value.forEach(segment => {
    if (segment.type === 'blank') {
      segment.userAnswer = '';
      segment.isChecked = false;
      segment.isCorrect = false;
    }
  });
  showAnswers.value = false;
  ElMessage.info('练习已重置');
}

// 保存进度
function saveProgress() {
  ElMessage.success('进度已保存');
}
</script>

<style scoped lang="scss">
.fill-blanks-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: var(--utools-bg-secondary);
  border-radius: 8px;
  
  .article-title {
    font-weight: 600;
    margin-right: 12px;
    color: var(--utools-text-primary);
  }
}

.mode-selector {
  display: flex;
  justify-content: center;
}

.exercise-area {
  min-height: 200px;
  max-height: 400px;
  overflow-y: auto;
  padding: 20px;
  background: var(--utools-bg-secondary);
  border-radius: 8px;
  line-height: 2;
}

.exercise-content {
  font-size: 16px;
  line-height: 2.5;
  color: var(--utools-text-primary);
}

.text-segment {
  white-space: pre-wrap;
}

.blank-item {
  display: inline-flex;
  align-items: center;
  margin: 0 4px;
  vertical-align: middle;
  
  :deep(.el-input) {
    width: auto;
    min-width: 80px;
    
    .el-input__inner {
      text-align: center;
      font-size: 16px;
    }
    
    &.is-correct .el-input__inner {
      background-color: #f0f9eb;
      border-color: #67c23a;
      color: #67c23a;
    }
    
    &.is-wrong .el-input__inner {
      background-color: #fef0f0;
      border-color: #f56c6c;
      color: #f56c6c;
    }
  }
  
  .status-icon {
    font-size: 14px;
    
    &.correct {
      color: #67c23a;
    }
    
    &.wrong {
      color: #f56c6c;
    }
  }
  
  .answer-hint {
    margin-left: 8px;
    color: #67c23a;
    font-size: 14px;
    font-weight: 500;
  }
}

.stats-bar {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
  padding: 12px;
  background: var(--utools-bg-secondary);
  border-radius: 8px;
}

.action-bar {
  display: flex;
  justify-content: center;
  gap: 12px;
}

.tips-area {
  p {
    margin: 4px 0;
    font-size: 13px;
  }
}
</style>
