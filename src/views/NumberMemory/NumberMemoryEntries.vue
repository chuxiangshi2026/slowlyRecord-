<template>
  <div class="number-entries-page">
    <el-card class="main-card">
      <template #header>
        <div class="card-header">
          <span class="title">📝 数字记忆条目</span>
          <div class="header-actions">
            <el-tag v-if="store.entries.length > 0" type="info">
              共 {{ store.entries.length }} 条
            </el-tag>
            <el-button @click="goBack">
              <el-icon><ArrowLeft /></el-icon>
              返回
            </el-button>
            <el-button type="primary" @click="showAddDialog = true">
              <el-icon><Plus /></el-icon>
              添加条目
            </el-button>
          </div>
        </div>
      </template>

      <!-- 搜索和筛选 -->
      <div class="filter-section">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索标题或数字..."
          clearable
          style="width: 250px"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-select
          v-model="selectedTag"
          placeholder="选择标签"
          clearable
          style="width: 150px; margin-left: 10px"
        >
          <el-option
            v-for="tag in store.allTags"
            :key="tag"
            :label="tag"
            :value="tag"
          />
        </el-select>
      </div>

      <!-- 条目列表 -->
      <div class="entries-list" v-loading="store.entriesLoading">
        <el-empty v-if="filteredEntries.length === 0" description="暂无条目，点击添加按钮开始" />

        <div
          v-for="entry in filteredEntries"
          :key="entry._id"
          class="entry-card"
        >
          <div class="entry-header">
            <h3 class="entry-title">{{ entry.title }}</h3>
            <div class="entry-actions">
              <el-dropdown trigger="click">
                <el-button link>
                  <el-icon><More /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item @click="handleImageAssociation(entry)">
                      <el-icon><Picture /></el-icon> 图片联想
                    </el-dropdown-item>
                    <el-dropdown-item @click="handleFillBlanks(entry)">
                      <el-icon><EditPen /></el-icon> 填空练习
                    </el-dropdown-item>
                    <el-dropdown-item @click="handleNotes(entry)">
                      <el-icon><Notebook /></el-icon> 笔记
                    </el-dropdown-item>
                    <el-dropdown-item @click="handlePrompts(entry)">
                      <el-icon><Memo /></el-icon> 提示词
                    </el-dropdown-item>
                    <el-dropdown-item divided @click="handleEdit(entry)">
                      <el-icon><Edit /></el-icon> 编辑
                    </el-dropdown-item>
                    <el-dropdown-item @click="handleDelete(entry)" type="danger">
                      <el-icon><Delete /></el-icon> 删除
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </div>

          <div class="entry-numbers">
            <span class="numbers-display">{{ entry.numbers }}</span>
          </div>

          <div class="entry-footer">
            <div class="entry-tags">
              <el-tag
                v-for="tag in entry.tags"
                :key="tag"
                size="small"
                effect="plain"
              >
                {{ tag }}
              </el-tag>
              <el-tag v-if="entry.tags.length === 0" size="small" type="info">无标签</el-tag>
            </div>
            <div class="entry-meta">
              <span class="meta-item">
                <el-icon><Clock /></el-icon>
                {{ formatDate(entry.createdAt) }}
              </span>
              <span class="meta-item" v-if="entry.reviewCount > 0">
                <el-icon><View /></el-icon> 已复习 {{ entry.reviewCount }} 次
              </span>
            </div>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 添加/编辑对话框 -->
    <el-dialog
      v-model="showAddDialog"
      :title="editingEntry ? '编辑条目' : '添加数字记忆条目'"
      width="600px"
    >
      <el-form :model="entryForm" label-width="80px">
        <el-form-item label="标题" required>
          <el-input
            v-model="entryForm.title"
            placeholder="输入标题（如：电话号码、纪念日等）"
            maxlength="50"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="数字" required>
          <el-input
            v-model="entryForm.numbers"
            placeholder="输入要记忆的数字（如：13800138000）"
            maxlength="100"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="标签">
          <el-select
            v-model="entryForm.tags"
            multiple
            filterable
            allow-create
            default-first-option
            placeholder="选择或输入标签"
            style="width: 100%"
          >
            <el-option
              v-for="tag in store.allTags"
              :key="tag"
              :label="tag"
              :value="tag"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="entryForm.description"
            type="textarea"
            :rows="3"
            placeholder="输入描述或备注（可选）"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="saveEntry" :disabled="!canSave">
          保存
        </el-button>
      </template>
    </el-dialog>

    <!-- 图片联想对话框 -->
    <ImageAssociationDialog
      v-model="showImageAssociationDialog"
      :entry="currentEntry"
    />

    <!-- 填空练习对话框 -->
    <NumberFillBlanksDialog
      v-model="showFillBlanksDialog"
      :entry="currentEntry"
    />

    <!-- 笔记对话框 -->
    <NumberNotesDialog
      v-model="showNotesDialog"
      :entry="currentEntry"
    />

    <!-- 提示词对话框 -->
    <NumberPromptsDialog
      v-model="showPromptsDialog"
      :entry="currentEntry"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useNumberMemoryStore } from '@/stores/numberMemory';
import type { NumberMemoryEntry } from '@/types/number-memory';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  ArrowLeft, Plus, Search, More, Edit, Delete,
  EditPen, Notebook, Memo, Clock, View, Picture
} from '@element-plus/icons-vue';

// 导入子组件
import ImageAssociationDialog from './components/ImageAssociationDialog.vue';
import NumberFillBlanksDialog from './components/NumberFillBlanksDialog.vue';
import NumberNotesDialog from './components/NumberNotesDialog.vue';
import NumberPromptsDialog from './components/NumberPromptsDialog.vue';

const router = useRouter();
const store = useNumberMemoryStore();

// 搜索和筛选
const searchKeyword = ref('');
const selectedTag = ref('');

// 对话框显示状态
const showAddDialog = ref(false);
const showImageAssociationDialog = ref(false);
const showFillBlanksDialog = ref(false);
const showNotesDialog = ref(false);
const showPromptsDialog = ref(false);

// 当前操作
const editingEntry = ref<NumberMemoryEntry | null>(null);
const currentEntry = ref<NumberMemoryEntry | null>(null);

// 表单
const entryForm = ref({
  title: '',
  numbers: '',
  tags: [] as string[],
  description: ''
});

// 过滤后的条目
const filteredEntries = computed(() => {
  let result = store.sortedEntries;

  // 按关键词搜索
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase();
    result = result.filter(entry =>
      entry.title.toLowerCase().includes(keyword) ||
      entry.numbers.includes(keyword)
    );
  }

  // 按标签筛选
  if (selectedTag.value) {
    result = result.filter(entry =>
      entry.tags.includes(selectedTag.value)
    );
  }

  return result;
});

// 是否可以保存
const canSave = computed(() => {
  return entryForm.value.title.trim() && entryForm.value.numbers.trim();
});

// 初始化加载
onMounted(async () => {
  await store.loadEntries();
});

// 格式化日期
function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('zh-CN');
}

// 返回
function goBack() {
  router.push('/number-memory');
}

// 保存条目
async function saveEntry() {
  if (editingEntry.value) {
    // 更新
    const updated: NumberMemoryEntry = {
      ...editingEntry.value,
      title: entryForm.value.title.trim(),
      numbers: entryForm.value.numbers.trim(),
      tags: entryForm.value.tags,
      description: entryForm.value.description?.trim()
    };
    const result = await store.updateEntryItem(updated);
    if (result.ok) {
      ElMessage.success('更新成功');
      showAddDialog.value = false;
      resetForm();
    } else {
      ElMessage.error('更新失败');
    }
  } else {
    // 新增
    const result = await store.addEntry(
      entryForm.value.title.trim(),
      entryForm.value.numbers.trim(),
      entryForm.value.tags,
      entryForm.value.description?.trim()
    );
    if (result.ok) {
      ElMessage.success('添加成功');
      showAddDialog.value = false;
      resetForm();
    } else {
      ElMessage.error('添加失败');
    }
  }
}

// 重置表单
function resetForm() {
  entryForm.value = {
    title: '',
    numbers: '',
    tags: [],
    description: ''
  };
  editingEntry.value = null;
}

// 编辑条目
function handleEdit(entry: NumberMemoryEntry) {
  editingEntry.value = entry;
  entryForm.value = {
    title: entry.title,
    numbers: entry.numbers,
    tags: [...entry.tags],
    description: entry.description || ''
  };
  showAddDialog.value = true;
}

// 删除条目
async function handleDelete(entry: NumberMemoryEntry) {
  try {
    await ElMessageBox.confirm(
      `确定要删除条目 "${entry.title}" 吗？相关的笔记和提示词也会被删除。`,
      '确认删除',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );

    const result = await store.deleteEntryItem(entry._id);
    if (result.ok) {
      ElMessage.success('删除成功');
    } else {
      ElMessage.error('删除失败');
    }
  } catch {
    // 用户取消
  }
}

// 图片联想
function handleImageAssociation(entry: NumberMemoryEntry) {
  currentEntry.value = entry;
  showImageAssociationDialog.value = true;
}

// 填空练习
function handleFillBlanks(entry: NumberMemoryEntry) {
  currentEntry.value = entry;
  showFillBlanksDialog.value = true;
}

// 笔记
function handleNotes(entry: NumberMemoryEntry) {
  currentEntry.value = entry;
  showNotesDialog.value = true;
}

// 提示词
function handlePrompts(entry: NumberMemoryEntry) {
  currentEntry.value = entry;
  showPromptsDialog.value = true;
}

// 监听对话框关闭
watch(showAddDialog, (val) => {
  if (!val) {
    resetForm();
  }
});

// 导入 watch
import { watch } from 'vue';
</script>

<style scoped lang="scss">
.number-entries-page {
  padding: 20px;
  width: 100%;
  box-sizing: border-box;
  min-height: 100vh;
  background-color: var(--utools-bg-secondary);

  .main-card {
    background-color: var(--utools-bg-card);
    border-color: var(--utools-border-primary);
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .title {
      font-size: 18px;
      font-weight: bold;
      color: var(--utools-text-primary);
    }

    .header-actions {
      display: flex;
      gap: 10px;
      align-items: center;
    }
  }

  .filter-section {
    margin-bottom: 20px;
    padding-bottom: 20px;
    border-bottom: 1px solid var(--utools-border-primary);
  }

  .entries-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .entry-card {
    background: var(--utools-bg-secondary);
    border: 1px solid var(--utools-border-color);
    border-radius: 8px;
    padding: 16px;
    transition: all 0.3s;

    &:hover {
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
      border-color: var(--utools-primary);
    }
  }

  .entry-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }

  .entry-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--utools-text-primary);
    margin: 0;
  }

  .entry-actions {
    .el-button {
      color: var(--utools-text-secondary);

      &:hover {
        color: var(--utools-primary);
      }
    }
  }

  .entry-numbers {
    margin-bottom: 12px;
    padding: 12px;
    background: var(--utools-bg-primary);
    border-radius: 6px;

    .numbers-display {
      font-size: 24px;
      font-weight: bold;
      color: var(--utools-primary);
      letter-spacing: 4px;
      font-family: monospace;
    }
  }

  .entry-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
  }

  .entry-tags {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  .entry-meta {
    display: flex;
    gap: 12px;
    font-size: 12px;
    color: var(--utools-text-secondary);

    .meta-item {
      display: flex;
      align-items: center;
      gap: 4px;
    }
  }
}
</style>
