<template>
  <el-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    title="📝 数字记忆笔记"
    width="700px"
    destroy-on-close
    class="number-notes-dialog"
  >
    <div v-if="entry" class="notes-container">
      <!-- 头部信息 -->
      <div class="header-info">
        <h3>{{ entry.title }}</h3>
        <div class="numbers-display">{{ entry.numbers }}</div>
      </div>

      <!-- 添加笔记区域 -->
      <div class="add-note-section">
        <el-input
          v-model="newNoteContent"
          type="textarea"
          :rows="4"
          placeholder="输入笔记内容，记录记忆技巧、联想方法等..."
          maxlength="2000"
          show-word-limit
        />
        <div class="add-note-actions">
          <el-button type="primary" @click="addNote" :disabled="!newNoteContent.trim()">
            <el-icon><Plus /></el-icon>
            添加笔记
          </el-button>
        </div>
      </div>

      <!-- 笔记列表 -->
      <div class="notes-list-section">
        <div class="section-header">
          <h4>我的笔记 ({{ store.currentNotes.length }})</h4>
          <el-radio-group v-model="noteSort" size="small">
            <el-radio-button label="newest">最新</el-radio-button>
            <el-radio-button label="oldest">最早</el-radio-button>
          </el-radio-group>
        </div>

        <el-empty v-if="sortedNotes.length === 0" description="暂无笔记，添加第一条笔记吧" />
        
        <div v-else class="notes-list">
          <div
            v-for="note in sortedNotes"
            :key="note._id"
            class="note-item"
          >
            <div class="note-content">
              <div v-if="editingNoteId === note._id" class="edit-mode">
                <el-input
                  v-model="editingContent"
                  type="textarea"
                  :rows="3"
                  maxlength="2000"
                  show-word-limit
                />
                <div class="edit-actions">
                  <el-button size="small" @click="cancelEdit">取消</el-button>
                  <el-button type="primary" size="small" @click="saveEdit(note)">保存</el-button>
                </div>
              </div>
              <div v-else class="view-mode">
                <p class="note-text">{{ note.content }}</p>
                <div class="note-meta">
                  <span class="note-time">
                    <el-icon><Clock /></el-icon>
                    {{ formatDate(note.createdAt) }}
                  </span>
                  <span v-if="note.updatedAt && note.updatedAt !== note.createdAt" class="note-edited">
                    (已编辑)
                  </span>
                </div>
              </div>
            </div>
            <div class="note-actions">
              <el-button
                v-if="editingNoteId !== note._id"
                link
                type="primary"
                @click="startEdit(note)"
              >
                <el-icon><Edit /></el-icon>
              </el-button>
              <el-button
                v-if="editingNoteId !== note._id"
                link
                type="danger"
                @click="deleteNote(note._id)"
              >
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
          </div>
        </div>
      </div>

      <!-- 底部提示 -->
      <div class="tips">
        <el-alert
          title="笔记提示"
          type="info"
          :closable="false"
        >
          <p>• 记录数字的记忆技巧，如谐音、形状联想等</p>
          <p>• 可以记录每个数字对应的图片特征</p>
          <p>• 随时编辑或删除笔记</p>
        </el-alert>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useNumberMemoryStore } from '@/stores/numberMemory';
import type { NumberMemoryEntry, NumberMemoryNote } from '@/types/number-memory';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Edit, Delete, Clock } from '@element-plus/icons-vue';

interface Props {
  modelValue: boolean;
  entry: NumberMemoryEntry | null;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
}>();

const store = useNumberMemoryStore();

// 新笔记内容
const newNoteContent = ref('');

// 编辑状态
const editingNoteId = ref<string | null>(null);
const editingContent = ref('');

// 排序方式
const noteSort = ref<'newest' | 'oldest'>('newest');

// 排序后的笔记
const sortedNotes = computed(() => {
  const notes = [...store.currentNotes];
  if (noteSort.value === 'newest') {
    return notes.sort((a, b) => b.createdAt - a.createdAt);
  } else {
    return notes.sort((a, b) => a.createdAt - b.createdAt);
  }
});

// 监听对话框显示，加载笔记
watch(() => props.modelValue, async (visible) => {
  if (visible && props.entry) {
    await store.loadNotes(props.entry._id);
  }
});

// 格式化日期
function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// 添加笔记
async function addNote() {
  if (!props.entry || !newNoteContent.value.trim()) return;
  
  const result = await store.addNote({
    entryId: props.entry._id,
    content: newNoteContent.value.trim()
  });
  
  if (result.ok) {
    ElMessage.success('笔记添加成功');
    newNoteContent.value = '';
  } else {
    ElMessage.error(typeof result.error === 'string' ? result.error : '添加失败');
  }
}

// 开始编辑
function startEdit(note: NumberMemoryNote) {
  editingNoteId.value = note._id;
  editingContent.value = note.content;
}

// 取消编辑
function cancelEdit() {
  editingNoteId.value = null;
  editingContent.value = '';
}

// 保存编辑
async function saveEdit(note: NumberMemoryNote) {
  if (!editingContent.value.trim()) {
    ElMessage.warning('笔记内容不能为空');
    return;
  }
  
  const updatedNote: NumberMemoryNote = {
    ...note,
    content: editingContent.value.trim(),
    updatedAt: Date.now()
  };
  
  const result = await store.updateNoteItem(updatedNote);
  
  if (result.ok) {
    ElMessage.success('笔记更新成功');
    editingNoteId.value = null;
    editingContent.value = '';
  } else {
    ElMessage.error(typeof result.error === 'string' ? result.error : '更新失败');
  }
}

// 删除笔记
async function deleteNote(noteId: string) {
  try {
    await ElMessageBox.confirm('确定要删除这条笔记吗？', '确认删除', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    });
    
    const result = await store.deleteNoteItem(noteId);
    if (result.ok) {
      ElMessage.success('笔记已删除');
    } else {
      ElMessage.error(typeof result.error === 'string' ? result.error : '删除失败');
    }
  } catch {
    // 用户取消
  }
}
</script>

<style scoped lang="scss">
.notes-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.header-info {
  padding: 16px;
  background: var(--utools-bg-secondary);
  border-radius: 8px;
  text-align: center;

  h3 {
    margin: 0 0 10px 0;
    color: var(--utools-text-primary);
  }

  .numbers-display {
    font-size: 24px;
    font-weight: bold;
    color: var(--utools-primary);
    letter-spacing: 4px;
    font-family: monospace;
  }
}

.add-note-section {
  .add-note-actions {
    margin-top: 12px;
    text-align: right;
  }
}

.notes-list-section {
  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    
    h4 {
      margin: 0;
      color: var(--utools-text-primary);
    }
  }
}

.notes-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 300px;
  overflow-y: auto;
}

.note-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  background: var(--utools-bg-secondary);
  border-radius: 8px;
  border-left: 4px solid var(--utools-primary);
}

.note-content {
  flex: 1;
}

.view-mode {
  .note-text {
    margin: 0 0 8px 0;
    color: var(--utools-text-primary);
    line-height: 1.6;
    white-space: pre-wrap;
  }
  
  .note-meta {
    display: flex;
    gap: 10px;
    font-size: 12px;
    color: var(--utools-text-secondary);
    
    .note-time {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    
    .note-edited {
      color: var(--utools-primary);
    }
  }
}

.edit-mode {
  .edit-actions {
    margin-top: 10px;
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }
}

.note-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tips {
  p {
    margin: 4px 0;
    font-size: 13px;
  }
}
</style>
