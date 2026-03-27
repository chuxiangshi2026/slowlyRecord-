<template>
  <el-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    :title="isEdit ? '编辑文本' : '添加文本'"
    width="700px"
    destroy-on-close
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="80px"
    >
      <el-form-item label="标题" prop="title">
        <el-input
          v-model="formData.title"
          placeholder="请输入标题，如《静夜思》"
          maxlength="100"
          show-word-limit
        />
      </el-form-item>
      
      <el-form-item label="作者">
        <el-input
          v-model="formData.author"
          placeholder="请输入作者（可选）"
          maxlength="50"
        />
      </el-form-item>
      
      <el-form-item label="来源">
        <el-input
          v-model="formData.source"
          placeholder="请输入来源（可选）"
          maxlength="100"
        />
      </el-form-item>
      
      <el-form-item label="标签">
        <el-select
          v-model="formData.tags"
          multiple
          filterable
          allow-create
          default-first-option
          placeholder="选择或输入标签"
          style="width: 100%"
        >
          <el-option
            v-for="tag in existingTags"
            :key="tag"
            :label="tag"
            :value="tag"
          />
        </el-select>
      </el-form-item>
      
      <el-form-item label="内容" prop="content">
        <el-input
          v-model="formData.content"
          type="textarea"
          :rows="12"
          placeholder="请输入文本内容..."
          maxlength="20000"
          show-word-limit
        />
      </el-form-item>
    </el-form>
    
    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" @click="handleSave" :loading="saving">
        保存
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useTextMemoryStore } from '@/stores/textMemory';
import type { TextArticle } from '@/types/text-memory';
import type { FormInstance, FormRules } from 'element-plus';

interface Props {
  modelValue: boolean;
  article?: TextArticle;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'save', article: any): void;
}>();

const textStore = useTextMemoryStore();
const formRef = ref<FormInstance>();
const saving = ref(false);

// 判断是否为编辑模式
const isEdit = computed(() => !!props.article);

// 现有标签
const existingTags = computed(() => textStore.allTags);

// 表单数据
const formData = ref({
  title: '',
  author: '',
  source: '',
  tags: [] as string[],
  content: ''
});

// 表单验证规则
const formRules: FormRules = {
  title: [
    { required: true, message: '请输入标题', trigger: 'blur' },
    { min: 1, max: 100, message: '标题长度1-100个字符', trigger: 'blur' }
  ],
  content: [
    { required: true, message: '请输入内容', trigger: 'blur' },
    { min: 10, message: '内容至少需要10个字符', trigger: 'blur' }
  ]
};

// 监听article变化，编辑时填充数据
watch(() => props.article, (newArticle) => {
  if (newArticle) {
    formData.value = {
      title: newArticle.title,
      author: newArticle.author || '',
      source: newArticle.source || '',
      tags: [...newArticle.tags],
      content: newArticle.content
    };
  } else {
    resetForm();
  }
}, { immediate: true });

// 监听对话框显示
watch(() => props.modelValue, (visible) => {
  if (!visible) {
    resetForm();
  }
});

// 重置表单
function resetForm() {
  formData.value = {
    title: '',
    author: '',
    source: '',
    tags: [],
    content: ''
  };
  formRef.value?.resetFields();
}

// 关闭对话框
function handleClose() {
  emit('update:modelValue', false);
}

// 保存
async function handleSave() {
  const valid = await formRef.value?.validate();
  if (!valid) return;
  
  saving.value = true;
  
  try {
    if (isEdit.value && props.article) {
      // 编辑模式
      const updatedArticle: TextArticle = {
        ...props.article,
        title: formData.value.title,
        author: formData.value.author,
        source: formData.value.source,
        tags: formData.value.tags,
        content: formData.value.content
      };
      emit('save', updatedArticle);
    } else {
      // 新增模式
      emit('save', { ...formData.value });
    }
  } finally {
    saving.value = false;
  }
}
</script>
