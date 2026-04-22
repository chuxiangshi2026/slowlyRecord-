<template>
  <div class="shortcut-memory-page">
    <el-card class="main-card">
      <template #header>
        <div class="card-header">
          <span class="title">⌨️ 快捷键记忆训练</span>
          <div class="header-actions">
            <el-button @click="showHistory = true">
              📊 训练历史
            </el-button>
          </div>
        </div>
      </template>

      <!-- 分类选择 -->
      <div class="category-section" v-if="!selectedCategory">
        <h3 class="section-title">选择快捷键分类</h3>
        <div class="category-grid">
          <div
            v-for="category in store.categories"
            :key="category.name"
            class="category-card"
            @click="selectCategory(category.name)"
          >
            <div class="category-icon">{{ getCategoryIcon(category.name) }}</div>
            <div class="category-name">{{ category.name }}</div>
            <div class="category-desc">{{ category.description }}</div>
            <div class="category-count">{{ category.count }} 个快捷键</div>
            <el-progress
              :percentage="store.getCategoryProgress(category.name)"
              :stroke-width="6"
              :show-text="true"
              class="category-progress"
            />
          </div>
        </div>
      </div>

      <!-- 快捷键列表 -->
      <div class="shortcut-list-section" v-else>
        <div class="list-header">
          <el-button @click="selectedCategory = ''">
            <el-icon><ArrowLeft /></el-icon>
            返回分类
          </el-button>
          <span class="list-title">{{ selectedCategory }} - 快捷键列表</span>
          <div class="list-actions">
            <el-button type="danger" plain @click="clearProgress">
              重置进度
            </el-button>
            <el-button @click="openAddDialog">
              ➕ 新增快捷键
            </el-button>
            <el-button type="primary" @click="startKeyPressTraining">
              🎯 按键训练
            </el-button>
            <el-button type="success" @click="startFunctionSelectTraining">
              🧩 功能选择
            </el-button>
          </div>
        </div>

        <el-table
          :data="store.currentCategoryShortcuts"
          style="width: 100%"
          stripe
          class="shortcut-table"
        >
          <el-table-column type="index" width="50" align="center" />
          <el-table-column prop="functionName" label="功能" width="150">
            <template #default="{ row }">
              <el-tag size="small" type="primary">{{ row.functionName }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="description" label="功能描述" min-width="200" />
          <el-table-column prop="keys" label="快捷键" width="180" align="center">
            <template #default="{ row }">
              <div class="keys-display">
                <el-tag
                  v-for="(key, index) in row.keys"
                  :key="index"
                  size="small"
                  type="warning"
                  class="key-tag"
                >
                  {{ key }}
                </el-tag>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100" align="center">
            <template #default="{ row }">
              <el-tag
                v-if="isMastered(row.id)"
                type="success"
                size="small"
              >
                已掌握
              </el-tag>
              <el-tag
                v-else
                type="info"
                size="small"
              >
                未掌握
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="160" align="center">
            <template #default="{ row }">
              <el-button
                type="primary"
                size="small"
                @click="openMemoryCard(row)"
              >
                记忆
              </el-button>
              <el-button
                v-if="isCustomItem(row.id)"
                type="danger"
                size="small"
                @click="deleteCustomItem(row)"
              >
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-card>

    <!-- 记忆卡片弹窗 -->
    <el-dialog
      v-model="showMemoryCard"
      :title="currentItem?.functionName"
      width="420px"
      align-center
      class="memory-card-dialog"
    >
      <div class="memory-card" v-if="currentItem">
        <div class="card-description">
          <p>{{ currentItem.description }}</p>
        </div>
        <div class="card-keys">
          <div
            v-for="(key, index) in currentItem.keys"
            :key="index"
            class="card-key"
          >
            {{ key }}
          </div>
        </div>
        <div class="card-hint">
          <el-tag type="info" size="small">{{ currentItem.category }}</el-tag>
          <el-tag type="warning" size="small">{{ currentItem.platform }}</el-tag>
        </div>
        <KeyboardVisual
          :pressed-keys="new Set()"
          :target-keys="currentItem.keys"
          class="card-keyboard"
        />
      </div>
    </el-dialog>

    <!-- 新增快捷键弹窗 -->
    <el-dialog
      v-model="showAddDialog"
      title="新增快捷键"
      width="480px"
      align-center
    >
      <el-form
        ref="addFormRef"
        :model="addForm"
        :rules="addRules"
        label-width="90px"
      >
        <el-form-item label="所属分类" prop="category">
          <el-select
            v-model="addForm.category"
            placeholder="选择或输入分类"
            allow-create
            filterable
          >
            <el-option
              v-for="cat in store.categories"
              :key="cat.name"
              :label="cat.name"
              :value="cat.name"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="功能名称" prop="functionName">
          <el-input v-model="addForm.functionName" placeholder="如：复制、粘贴" />
        </el-form-item>
        <el-form-item label="功能描述" prop="description">
          <el-input
            v-model="addForm.description"
            type="textarea"
            :rows="2"
            placeholder="描述这个快捷键的作用"
          />
        </el-form-item>
        <el-form-item label="快捷键" prop="keysText">
          <el-input
            v-model="addForm.keysText"
            placeholder="如：Ctrl + C，用 + 分隔"
          />
          <div class="form-tip">用 + 分隔各个按键，如：Ctrl + Shift + N</div>
        </el-form-item>
        <el-form-item label="平台" prop="platform">
          <el-radio-group v-model="addForm.platform">
            <el-radio-button label="common">通用</el-radio-button>
            <el-radio-button label="win">Windows</el-radio-button>
            <el-radio-button label="mac">Mac</el-radio-button>
            <el-radio-button label="linux">Linux</el-radio-button>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="submitAdd">确定</el-button>
      </template>
    </el-dialog>

    <!-- 训练历史弹窗 -->
    <el-dialog
      v-model="showHistory"
      title="训练历史"
      width="600px"
    >
      <el-empty v-if="trainingHistory.length === 0" description="暂无训练记录" />
      <el-timeline v-else>
        <el-timeline-item
          v-for="record in trainingHistory"
          :key="record._id"
          :type="record.correctAnswers >= record.totalQuestions * 0.8 ? 'success' : 'warning'"
        >
          <div class="history-item">
            <div class="history-header">
              <span class="history-category">{{ record.category }}</span>
              <span class="history-mode">
                {{ record.mode === 'keyPress' ? '按键训练' : '功能选择' }}
              </span>
              <el-tag
                :type="record.correctAnswers >= record.totalQuestions * 0.8 ? 'success' : 'warning'"
                size="small"
              >
                {{ record.correctAnswers }}/{{ record.totalQuestions }}
              </el-tag>
            </div>
            <div class="history-detail">
              <span>用时 {{ record.duration }} 秒</span>
              <span>{{ formatDate(record.createdAt) }}</span>
            </div>
          </div>
        </el-timeline-item>
      </el-timeline>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useShortcutMemoryStore } from '@/stores/shortcutMemory';
import { ElMessage, ElMessageBox } from 'element-plus';
import { ArrowLeft } from '@element-plus/icons-vue';
import type { ShortcutItem } from '@/types/shortcut-memory';
import type { FormInstance, FormRules } from 'element-plus';
import KeyboardVisual from './components/KeyboardVisual.vue';

const router = useRouter();
const store = useShortcutMemoryStore();

const selectedCategory = ref('');
const showMemoryCard = ref(false);
const currentItem = ref<ShortcutItem | null>(null);
const showHistory = ref(false);
const showAddDialog = ref(false);
const addFormRef = ref<FormInstance>();

const addForm = ref({
  category: '',
  functionName: '',
  description: '',
  keysText: '',
  platform: 'common' as 'common' | 'win' | 'mac' | 'linux'
});

const addRules: FormRules = {
  category: [{ required: true, message: '请输入分类', trigger: 'blur' }],
  functionName: [{ required: true, message: '请输入功能名称', trigger: 'blur' }],
  description: [{ required: true, message: '请输入功能描述', trigger: 'blur' }],
  keysText: [{ required: true, message: '请输入快捷键', trigger: 'blur' }]
};

const trainingHistory = computed(() => {
  return store.getTrainingHistory();
});

const masteredIds = computed(() => {
  if (!selectedCategory.value) return new Set<string>();
  return new Set(store.getMasteredIds(selectedCategory.value));
});

function getCategoryIcon(name: string): string {
  const icons: Record<string, string> = {
    'Windows': '🪟',
    'VS Code': '📝',
    'Chrome': '🌐',
    'IntelliJ IDEA': '☕',
    'Photoshop': '🎨'
  };
  return icons[name] || '⌨️';
}

function isCustomItem(id: string): boolean {
  return id.startsWith('custom-');
}

function openAddDialog() {
  addForm.value = {
    category: selectedCategory.value || '',
    functionName: '',
    description: '',
    keysText: '',
    platform: 'common'
  };
  showAddDialog.value = true;
}

async function submitAdd() {
  if (!addFormRef.value) return;
  await addFormRef.value.validate(async (valid) => {
    if (!valid) return;

    const keys = addForm.value.keysText.split('+').map(k => k.trim()).filter(Boolean);
    if (keys.length === 0) {
      ElMessage.warning('快捷键格式不正确');
      return;
    }

    const newItem: ShortcutItem = {
      id: 'custom-' + Date.now(),
      category: addForm.value.category,
      functionName: addForm.value.functionName,
      description: addForm.value.description,
      keys,
      platform: addForm.value.platform
    };

    const result = await store.addCustomShortcut(newItem);
    if (result.ok) {
      ElMessage.success('新增成功');
      showAddDialog.value = false;
    } else {
      ElMessage.error('保存失败');
    }
  });
}

async function deleteCustomItem(row: ShortcutItem) {
  try {
    await ElMessageBox.confirm(
      `确定要删除「${row.functionName}」吗？`,
      '确认删除',
      { type: 'warning' }
    );
    const result = await store.deleteCustomShortcut(row.id);
    if (result.ok) {
      ElMessage.success('删除成功');
    } else {
      ElMessage.error('删除失败');
    }
  } catch {
    // 用户取消
  }
}

function selectCategory(name: string) {
  selectedCategory.value = name;
  store.selectCategory(name);
}

function isMastered(id: string): boolean {
  return masteredIds.value.has(id);
}

function openMemoryCard(item: ShortcutItem) {
  currentItem.value = item;
  showMemoryCard.value = true;
}

function startKeyPressTraining() {
  if (store.currentShortcutCount === 0) {
    ElMessage.warning('当前分类没有快捷键');
    return;
  }
  store.selectCategory(selectedCategory.value);
  router.push('/shortcut-memory/training?mode=keyPress');
}

function startFunctionSelectTraining() {
  if (store.currentShortcutCount === 0) {
    ElMessage.warning('当前分类没有快捷键');
    return;
  }
  store.selectCategory(selectedCategory.value);
  router.push('/shortcut-memory/training?mode=functionSelect');
}

async function clearProgress() {
  try {
    await ElMessageBox.confirm(
      `确定要重置 ${selectedCategory.value} 的学习进度吗？`,
      '确认重置',
      { type: 'warning' }
    );
    await store.clearCategoryProgress(selectedCategory.value);
    ElMessage.success('进度已重置');
  } catch {
    // 用户取消
  }
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-CN');
}

onMounted(async () => {
  await store.loadCategories();
});
</script>

<style scoped lang="scss">
.shortcut-memory-page {
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
    }
  }

  .section-title {
    text-align: center;
    margin-bottom: 20px;
    color: var(--utools-text-primary);
  }

  .category-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 20px;
  }

  .category-card {
    border: 2px solid var(--utools-border-primary);
    border-radius: 12px;
    padding: 24px;
    text-align: center;
    cursor: pointer;
    transition: all 0.3s;
    background: var(--utools-bg-card);

    &:hover {
      border-color: var(--utools-primary);
      transform: translateY(-4px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
    }

    .category-icon {
      font-size: 48px;
      margin-bottom: 12px;
    }

    .category-name {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 8px;
      color: var(--utools-text-primary);
    }

    .category-desc {
      font-size: 13px;
      color: var(--utools-text-secondary);
      margin-bottom: 12px;
    }

    .category-count {
      font-size: 14px;
      color: var(--utools-text-tertiary);
      margin-bottom: 12px;
    }

    .category-progress {
      :deep(.el-progress__text) {
        font-size: 12px;
      }
    }
  }

  .list-header {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 20px;
    flex-wrap: wrap;

    .list-title {
      font-size: 16px;
      font-weight: bold;
      color: var(--utools-text-primary);
      flex: 1;
    }

    .list-actions {
      display: flex;
      gap: 10px;
    }
  }

  .shortcut-table {
    .keys-display {
      display: flex;
      gap: 4px;
      justify-content: center;
      flex-wrap: wrap;

      .key-tag {
        font-family: monospace;
        font-weight: bold;
      }
    }
  }
}

.memory-card-dialog {
  .memory-card {
    text-align: center;

    .card-description {
      font-size: 15px;
      color: var(--utools-text-secondary);
      margin-bottom: 20px;
      line-height: 1.6;
    }

    .card-keys {
      display: flex;
      justify-content: center;
      gap: 12px;
      margin-bottom: 16px;

      .card-key {
        min-width: 56px;
        height: 56px;
        border: 2px solid var(--utools-warning);
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        font-weight: bold;
        color: var(--utools-text-primary);
        background: var(--utools-bg-secondary);
      }
    }

    .card-hint {
      display: flex;
      justify-content: center;
      gap: 8px;
      margin-bottom: 16px;
    }

    .card-keyboard {
      margin-top: 16px;
    }
  }
}

.form-tip {
  font-size: 12px;
  color: var(--utools-text-tertiary);
  margin-top: 4px;
}

.history-item {
  .history-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 6px;

    .history-category {
      font-weight: bold;
      color: var(--utools-text-primary);
    }

    .history-mode {
      font-size: 13px;
      color: var(--utools-text-secondary);
    }
  }

  .history-detail {
    display: flex;
    gap: 16px;
    font-size: 12px;
    color: var(--utools-text-tertiary);
  }
}
</style>
