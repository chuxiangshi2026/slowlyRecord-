<template>
  <el-dialog
      :model-value="modelValue"
      @update:model-value="$emit('update:modelValue', $event)"
      title="导入文本"
      width="750px"
      destroy-on-close
  >
    <el-tabs v-model="activeTab">
      <!-- 手动输入 -->
      <el-tab-pane label="手动输入" name="manual">
        <el-form :model="manualForm" label-width="80px">
          <el-form-item label="标题">
            <el-input v-model="manualForm.title" placeholder="输入标题"/>
          </el-form-item>
          <el-form-item label="标签">
            <el-select
                v-model="manualForm.tags"
                multiple
                filterable
                allow-create
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
          <el-form-item label="内容">
            <el-input
                v-model="manualForm.content"
                type="textarea"
                :rows="10"
                placeholder="粘贴或输入文本内容..."
            />
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <!-- 批量导入 -->
      <el-tab-pane label="批量导入" name="batch">
        <el-alert
            title="批量导入格式说明"
            type="info"
            :closable="false"
            style="margin-bottom: 16px"
        >
          <p>每篇文章使用以下格式，多篇文章用 --- 分隔：</p>
          <pre style="background: #f5f7fa; padding: 10px; margin-top: 8px;">
标题：文章标题
标签：标签1,标签2
作者：作者名
---
文章内容...
---
标题：另一篇文章
...</pre>
        </el-alert>
        <el-input
            v-model="batchContent"
            type="textarea"
            :rows="12"
            placeholder="粘贴批量导入的文本..."
        />
      </el-tab-pane>

      <!-- 文件导入 -->
      <el-tab-pane label="文件导入" name="file">
        <!-- 文件格式说明 -->
        <el-alert
            title="文件导入格式说明"
            type="info"
            :closable="false"
            style="margin-bottom: 16px"
        >
          <div class="file-format-desc">
            <p class="format-title">支持格式：<span class="format-tags">.txt</span> <span class="format-tags">.md</span>
              <span class="format-tags">.doc</span> <span class="format-tags">.docx</span></p>

            <el-collapse v-model="activeCollapse" style="margin-top: 12px;">
              <el-collapse-item title="📄 普通文本文件（推荐）" name="plain">
                <div class="format-detail">
                  <p>直接将文件内容作为一篇文章导入，导入后可编辑标题和标签。</p>
                  <div class="example-box">
                    <div class="example-header">
                      <span>示例内容：</span>
                    </div>
                    <pre class="example-content">静夜思

床前明月光，
疑是地上霜。
举头望明月，
低头思故乡。</pre>
                  </div>
                </div>
              </el-collapse-item>

              <el-collapse-item title="📋 带元数据格式（高级）" name="metadata">
                <div class="format-detail">
                  <p>在文件开头添加元数据，自动识别标题、作者、标签等信息。</p>
                  <div class="meta-fields">
                    <div class="meta-field"><span class="meta-key">标题：</span>文章标题</div>
                    <div class="meta-field"><span class="meta-key">作者：</span>作者名称</div>
                    <div class="meta-field"><span class="meta-key">标签：</span>标签1,标签2,标签3</div>
                    <div class="meta-field"><span class="meta-key">来源：</span>文章来源</div>
                  </div>
                  <div class="example-box">
                    <div class="example-header">
                      <span>示例内容：</span>
                    </div>
                    <pre class="example-content">标题：静夜思
作者：李白
标签：唐诗,古诗,必背
---
床前明月光，
疑是地上霜。
举头望明月，
低头思故乡。</pre>
                  </div>
                  <p class="format-tip">💡 提示：元数据和正文之间用 <code>---</code> 分隔</p>
                </div>
              </el-collapse-item>

              <el-collapse-item title="📦 批量导入格式" name="batch">
                <div class="format-detail">
                  <p>一个文件包含多篇文章，每篇用 <code>---</code> 分隔。</p>
                  <div class="example-box">
                    <div class="example-header">
                      <span>示例内容：</span>
                    </div>
                    <pre class="example-content">标题：春晓
作者：孟浩然
标签：唐诗
---
春眠不觉晓，
处处闻啼鸟。
---
标题：登鹳雀楼
作者：王之涣
---
白日依山尽，
黄河入海流。</pre>
                  </div>
                  <p class="format-tip">⚠️ 注意：使用批量格式时，将自动拆分为多篇文章导入</p>
                </div>
              </el-collapse-item>
            </el-collapse>
          </div>
        </el-alert>

        <el-upload
            class="upload-area"
            drag
            action="#"
            :auto-upload="false"
            :on-change="handleFileChange"
            accept=".txt,.md,.doc,.docx"
        >
          <el-icon class="el-icon--upload">
            <upload-filled/>
          </el-icon>
          <div class="el-upload__text">
            拖拽文件到此处或 <em>点击上传</em>
          </div>
          <template #tip>
            <div class="el-upload__tip">
              支持 .txt, .md, .doc, .docx 格式文件，最大 10MB
            </div>
          </template>
        </el-upload>
        <div v-if="fileContent" class="file-preview">
          <h4>文件内容预览：</h4>
          <el-input
              v-model="fileContent"
              type="textarea"
              :rows="6"
              placeholder="文件内容..."
          />
          <el-form :model="fileForm" label-width="80px" style="margin-top: 16px">
            <el-form-item label="标题">
              <el-input v-model="fileForm.title" placeholder="输入标题（默认使用文件名）"/>
            </el-form-item>
            <el-form-item label="标签">
              <el-select
                  v-model="fileForm.tags"
                  multiple
                  filterable
                  allow-create
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
          </el-form>
        </div>
      </el-tab-pane>

      <!-- 联网导入 -->
      <!--      <el-tab-pane label="联网导入" name="online">
              <el-form :model="onlineForm" label-width="100px">
                <el-form-item label="导入方式">
                  <el-radio-group v-model="onlineForm.type">
                    <el-radio label="url">网页链接</el-radio>
                    <el-radio label="search">关键词搜索</el-radio>
                  </el-radio-group>
                </el-form-item>

                <template v-if="onlineForm.type === 'url'">
                  <el-form-item label="网页链接">
                    <el-input
                      v-model="onlineForm.url"
                      placeholder="输入网页链接..."
                    />
                  </el-form-item>
                </template>

                <template v-if="onlineForm.type === 'search'">
                  <el-form-item label="搜索关键词">
                    <el-input
                      v-model="onlineForm.keyword"
                      placeholder="输入诗词名、文章名或作者..."
                    >
                      <template #append>
                        <el-button @click="handleSearch">搜索</el-button>
                      </template>
                    </el-input>
                  </el-form-item>

                  <div v-if="searchResults.length > 0" class="search-results">
                    <h4>搜索结果：</h4>
                    <el-radio-group v-model="selectedResult">
                      <el-radio
                        v-for="(result, index) in searchResults"
                        :key="index"
                        :label="index"
                        border
                        style="margin-bottom: 10px; width: 100%"
                      >
                        <div style="text-align: left">
                          <strong>{{ result.title }}</strong>
                          <p style="margin: 4px 0; color: #666; font-size: 12px">
                            {{ result.content.substring(0, 100) }}...
                          </p>
                        </div>
                      </el-radio>
                    </el-radio-group>
                  </div>
                </template>

                <el-form-item label="标签">
                  <el-select
                    v-model="onlineForm.tags"
                    multiple
                    filterable
                    allow-create
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
              </el-form>
            </el-tab-pane>-->

      <!-- AI 搜索 -->
      <!--      <el-tab-pane label="AI 搜索" name="ai">
              <div class="ai-search-header">
                <el-alert
                  title="使用 AI 搜索古诗词和文章"
                  type="info"
                  :closable="false"
                  show-icon
                >
                  <template #default>
                    <span>通过 AI 大模型搜索或生成诗词文章内容</span>
                    <el-button
                      link
                      type="primary"
                      :icon="Setting"
                      @click="showAIConfig = true"
                      style="margin-left: 12px"
                    >
                      配置 API
                    </el-button>
                  </template>
                </el-alert>
              </div>

              <el-form :model="aiForm" label-width="80px">
                <el-form-item label="搜索类型">
                  <el-radio-group v-model="aiForm.type">
                    <el-radio label="auto">自动判断</el-radio>
                    <el-radio label="poetry">古诗词</el-radio>
                    <el-radio label="article">文章散文</el-radio>
                  </el-radio-group>
                </el-form-item>

                <el-form-item label="关键词">
                  <el-input
                    v-model="aiForm.keyword"
                    placeholder="输入诗词名、作者、主题或任意关键词..."
                  >
                    <template #append>
                      <el-button @click="handleAISearch" :loading="aiSearching">
                        AI 搜索
                      </el-button>
                    </template>
                  </el-input>
                </el-form-item>

                <template v-if="aiForm.type === 'poetry' || aiForm.type === 'auto'">
                  <el-form-item label="朝代">
                    <el-select v-model="aiForm.dynasty" placeholder="选择朝代（可选）" clearable>
                      <el-option label="先秦" value="先秦" />
                      <el-option label="两汉" value="两汉" />
                      <el-option label="魏晋南北朝" value="魏晋南北朝" />
                      <el-option label="隋" value="隋" />
                      <el-option label="唐" value="唐" />
                      <el-option label="宋" value="宋" />
                      <el-option label="元" value="元" />
                      <el-option label="明" value="明" />
                      <el-option label="清" value="清" />
                      <el-option label="近现代" value="近现代" />
                      <el-option label="楚辞" value="楚辞" />
                      <el-option label="汉乐府" value="汉" />
                      <el-option label="魏晋" value="魏晋" />
                      <el-option label="明清" value="明清" />
                    </el-select>
                  </el-form-item>
                </template>

                <template v-if="aiForm.type === 'article'">
                  <el-form-item label="文章类型">
                    <el-select v-model="aiForm.articleType" placeholder="选择文章类型">
                      <el-option label="散文" value="essay" />
                      <el-option label="现代散文" value="prose" />
                      <el-option label="现代诗歌" value="poetry" />
                      <el-option label="古文" value="classic" />
                    </el-select>
                  </el-form-item>
                </template>

                <el-form-item label="标签">
                  <el-select
                    v-model="aiForm.tags"
                    multiple
                    filterable
                    allow-create
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
              </el-form>

              <div v-if="aiResults.length > 0" class="ai-results">
                <h4>AI 搜索结果：</h4>
                <el-scrollbar height="300px">
                  <el-card
                    v-for="(result, index) in aiResults"
                    :key="index"
                    shadow="hover"
                    style="margin-bottom: 12px; cursor: pointer"
                    @click="selectAIResult(result)"
                    :class="{ 'selected': selectedAIResult?._id === result._id }"
                  >
                    <template #header>
                      <div style="display: flex; justify-content: space-between; align-items: center">
                        <span style="font-weight: bold">{{ result.title }}</span>
                        <div>
                          <el-tag size="small" style="margin-right: 8px">{{ result.author }}</el-tag>
                          <el-tag size="small" type="success" v-if="result.source === 'ai'">AI</el-tag>
                        </div>
                      </div>
                    </template>
                    <div style="white-space: pre-line; font-size: 14px; line-height: 1.8">
                      {{ result.content }}
                    </div>
                  </el-card>
                </el-scrollbar>
              </div>

              <div v-else-if="!aiSearching" class="ai-placeholder">
                <el-empty description="请输入关键词进行 AI 搜索">
                  <template #description>
                    <p>请输入关键词进行 AI 搜索</p>
                    <p style="font-size: 12px; color: #999; margin-top: 8px">
                      例如：李白、静夜思、春天、月亮、励志等
                    </p>
                  </template>
                </el-empty>
              </div>
            </el-tab-pane>-->

      <!-- 考试资料库 -->
      <!--      <el-tab-pane label="考试资料" name="exam">
              <el-form :model="examForm" label-width="100px">
                <el-form-item label="考试类型">
                  <el-select v-model="examForm.type" placeholder="选择考试类型" clearable @change="handleExamTypeChange">
                    <el-option label="专升本" value="专升本" />
                    <el-option label="考研" value="考研" />
                    <el-option label="考公/行测" value="考公" />
                    <el-option label="职称考试" value="职称" />
                    <el-option label="英语四六级" value="四六级" />
                    <el-option label="考研英语" value="考研英语" />
                  </el-select>
                </el-form-item>
                <el-form-item label="科目">
                  <el-select v-model="examForm.subject" placeholder="选择科目" clearable :disabled="!examForm.type">
                    <el-option
                      v-for="subject in examSubjects"
                      :key="subject"
                      :label="subject"
                      :value="subject"
                    />
                  </el-select>
                </el-form-item>
                <el-form-item label="搜索">
                  <el-input
                    v-model="examForm.keyword"
                    placeholder="输入关键词搜索考试资料..."
                  >
                    <template #append>
                      <el-button @click="handleExamSearch">搜索</el-button>
                    </template>
                  </el-input>
                </el-form-item>
              </el-form>

              <div v-if="examResults.length > 0" class="exam-results">
                <h4>考试资料：</h4>
                <el-scrollbar height="300px">
                  <el-card
                    v-for="(item, index) in examResults"
                    :key="index"
                    shadow="hover"
                    style="margin-bottom: 12px; cursor: pointer"
                    @click="selectExamItem(item)"
                    :class="{ 'selected': selectedExamItem?._id === item._id }"
                  >
                    <template #header>
                      <div style="display: flex; justify-content: space-between; align-items: center">
                        <span style="font-weight: bold">{{ item.title }}</span>
                        <div>
                          <el-tag size="small" style="margin-right: 4px" v-for="tag in item.tags.slice(0, 2)" :key="tag">{{ tag }}</el-tag>
                        </div>
                      </div>
                    </template>
                    <div style="white-space: pre-line; font-size: 14px; line-height: 1.8; max-height: 150px; overflow: hidden">
                      {{ item.content.substring(0, 200) }}{{ item.content.length > 200 ? '...' : '' }}
                    </div>
                  </el-card>
                </el-scrollbar>
              </div>

              <div v-else class="exam-placeholder">
                <el-empty description="请选择考试类型或输入关键词搜索">
                  <template #description>
                    <p>请选择考试类型或输入关键词搜索</p>
                    <p style="font-size: 12px; color: #999; margin-top: 8px">
                      支持：专升本、考研、考公、职称、四六级等考试资料
                    </p>
                  </template>
                </el-empty>
              </div>
            </el-tab-pane>-->

      <!-- 诗词库 -->
      <el-tab-pane label="诗词库" name="poetry">
        <el-form :model="poetryForm" label-width="80px">
          <el-form-item label="朝代">
            <el-select v-model="poetryForm.dynasty" placeholder="选择朝代" clearable>
              <el-option label="先秦" value="xianqin"/>
              <el-option label="两汉" value="han"/>
              <el-option label="魏晋南北朝" value="weijin"/>
              <el-option label="隋" value="sui"/>
              <el-option label="唐" value="tang"/>
              <el-option label="宋" value="song"/>
              <el-option label="元" value="yuan"/>
              <el-option label="明" value="ming"/>
              <el-option label="清" value="qing"/>
              <el-option label="近现代" value="xiandai"/>
            </el-select>
          </el-form-item>
          <el-form-item label="搜索">
            <el-input
                v-model="poetryForm.keyword"
                placeholder="输入诗词名、作者或诗句..."
            >
              <template #append>
                <el-button @click="handlePoetrySearch">搜索</el-button>
              </template>
            </el-input>
          </el-form-item>
        </el-form>

        <div v-if="poetryLoading" class="poetry-loading">
          <el-skeleton :rows="5" animated />
        </div>

        <div v-else-if="poetryResults.length > 0" class="poetry-results">
          <el-scrollbar height="300px">
            <el-card
                v-for="(poem, index) in poetryResults"
                :key="poem.id"
                shadow="hover"
                style="margin-bottom: 12px; cursor: pointer"
                @click="selectPoetry(poem)"
                :class="{ 'selected': selectedPoetry?.id === poem.id }"
            >
              <template #header>
                <div style="display: flex; justify-content: space-between; align-items: center">
                  <span style="font-weight: bold">{{ poem.title }}</span>
                  <div>
                    <el-tag size="small" type="info" style="margin-right: 8px">{{ poem.dynasty }}</el-tag>
                    <el-tag size="small">{{ poem.author }}</el-tag>
                  </div>
                </div>
              </template>
              <div style="white-space: pre-line; font-size: 14px; line-height: 1.8; margin-bottom: 8px">
                {{ poem.content }}
              </div>
              <div v-if="poem.location" style="font-size: 12px; color: #909399">
                <el-icon><Location /></el-icon> {{ poem.location }}
              </div>
            </el-card>
          </el-scrollbar>
        </div>

        <div v-else class="poetry-placeholder">
          <el-empty description="请输入关键词搜索诗词或选择朝代浏览"/>
        </div>
      </el-tab-pane>
    </el-tabs>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" @click="handleImport" :loading="importing">
        导入
      </el-button>
    </template>
  </el-dialog>

  <!-- AI 配置对话框 -->
  <el-dialog
      v-model="showAIConfig"
      title="AI 搜索配置"
      width="500px"
      destroy-on-close
  >
    <el-alert
        title="使用单词列表中的 AI 设置"
        type="info"
        :closable="false"
        style="margin-bottom: 16px"
    >
      <template #default>
        <p>AI 搜索将使用「单词列表」设置中的 API Key。</p>
        <p style="font-size: 12px; color: #666; margin-top: 4px">
          请在「单词列表 → 设置」中配置 DeepSeek、通义千问、Kimi、GLM 等 API Key
        </p>
      </template>
    </el-alert>

    <el-form :model="aiConfigForm" label-width="100px">
      <el-form-item label="启用 AI">
        <el-switch v-model="aiConfigForm.enabled"/>
      </el-form-item>

      <el-form-item label="AI 提供商">
        <el-select v-model="aiConfigForm.provider" style="width: 100%">
          <el-option label="智谱 GLM（免费/有额度）" value="glm"/>
          <el-option label="DeepSeek" value="deepseek"/>
          <el-option label="通义千问" value="qwen"/>
          <el-option label="Kimi 月之暗面" value="kimi"/>
          <el-option label="Ollama 本地模型" value="ollama"/>
          <el-option label="SiliconFlow" value="siliconflow"/>
          <el-option label="OpenRouter" value="openrouter"/>
          <el-option label="自定义" value="custom"/>
        </el-select>
      </el-form-item>

      <template v-if="aiConfigForm.provider === 'custom'">
        <el-form-item label="API 地址">
          <el-input
              v-model="aiConfigForm.apiUrl"
              placeholder="https://api.example.com/v1/chat/completions"
          />
        </el-form-item>
        <el-form-item label="模型名称">
          <el-input
              v-model="aiConfigForm.model"
              placeholder="模型名称"
          />
        </el-form-item>
      </template>

      <el-form-item label="API Key">
        <el-input
            v-model="aiConfigForm.apiKey"
            type="password"
            show-password
            placeholder="优先使用单词列表中的设置，也可在此处覆盖"
        />
      </el-form-item>

      <el-form-item>
        <el-button
            @click="handleTestAI"
            :loading="aiTesting"
            :type="aiTestResult === true ? 'success' : aiTestResult === false ? 'danger' : 'default'"
        >
          <template v-if="aiTestResult === true">连接成功</template>
          <template v-else-if="aiTestResult === false">连接失败</template>
          <template v-else>测试连接</template>
        </el-button>
        <el-button link type="primary" @click="openWordSettings">
          打开单词列表设置
        </el-button>
      </el-form-item>

      <el-alert
          title="免费 API 推荐"
          type="success"
          :closable="false"
          style="margin-top: 16px"
      >
        <template #default>
          <ul style="margin: 8px 0; padding-left: 20px">
            <li>
              <strong>智谱 GLM-4-Flash</strong> - 免费使用，在单词列表设置中申请
            </li>
            <li>
              <a href="https://siliconflow.cn/" target="_blank" style="color: #409eff">SiliconFlow</a>
              - 注册即送 2000 万 Tokens
            </li>
            <li>
              <a href="https://platform.deepseek.com/" target="_blank" style="color: #409eff">DeepSeek</a>
              - 价格便宜，效果优秀
            </li>
          </ul>
        </template>
      </el-alert>
    </el-form>

    <template #footer>
      <el-button @click="showAIConfig = false">取消</el-button>
      <el-button type="primary" @click="handleSaveAIConfig">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import {ref, computed} from 'vue';
import {useTextMemoryStore} from '@/stores/textMemory';
import {useWordsStore} from '@/stores/words';
import {UploadFilled, Setting, Location} from '@element-plus/icons-vue';
import {ElMessage} from 'element-plus';
import {
  searchPoetry,
  fetchPoetryByDynasty,
  getRandomPoetry,
  type PoetryItem,
  type PoetryDynasty
} from '@/utils/poetry-service';
import {
  smartSearchWithAI,
  getAISearchConfig,
  saveAISearchConfig,
  testAIConnection,
  type AISearchConfig,
  type AISearchResult
} from '@/utils/ai-search-api';

interface Props {
  modelValue: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'import', articles: any[]): void;
  (e: 'openWordSettings'): void;
}>();

const textStore = useTextMemoryStore();
const activeTab = ref('manual');
const importing = ref(false);
const activeCollapse = ref(['plain']); // 默认展开普通文本格式说明

// 现有标签
const existingTags = computed(() => textStore.allTags);

// 手动输入表单
const manualForm = ref({
  title: '',
  tags: [] as string[],
  content: ''
});

// 批量导入
const batchContent = ref('');

// 文件导入
const fileContent = ref('');
const fileForm = ref({
  title: '',
  tags: [] as string[]
});

// 联网导入
const onlineForm = ref({
  type: 'search',
  url: '',
  keyword: '',
  tags: [] as string[]
});
const searchResults = ref<any[]>([]);
const selectedResult = ref<number | null>(null);

// 诗词库
const poetryForm = ref({
  dynasty: '' as PoetryDynasty | '',
  keyword: '',
  tags: [] as string[]
});
const poetryResults = ref<PoetryItem[]>([]);
const selectedPoetry = ref<PoetryItem | null>(null);
const poetryLoading = ref(false);

// AI 搜索
const aiForm = ref({
  keyword: '',
  type: 'auto' as 'poetry' | 'article' | 'auto',
  dynasty: '',
  articleType: 'essay' as 'essay' | 'prose' | 'poetry' | 'classic',
  tags: [] as string[]
});
const aiResults = ref<AISearchResult[]>([]);
const selectedAIResult = ref<AISearchResult | null>(null);
const aiSearching = ref(false);

// AI 配置
const showAIConfig = ref(false);
const aiConfigForm = ref<AISearchConfig>(getAISearchConfig());
const aiTesting = ref(false);
const aiTestResult = ref<boolean | null>(null);

// 考试资料
const examForm = ref({
  type: '',
  subject: '',
  keyword: '',
  tags: [] as string[]
});
const examResults = ref<PoetryItem[]>([]);
const selectedExamItem = ref<PoetryItem | null>(null);
const examSubjects = computed(() => {
  const subjectMap: Record<string, string[]> = {
    '专升本': ['语文', '英语', '数学', '政治', '文学常识', '古诗词'],
    '考研': ['政治', '英语', '数学', '专业课', '古诗词', '文学'],
    '考公': ['行测', '申论', '常识判断', '言语理解', '数量关系'],
    '职称': ['计算机', '英语', '专业知识', '综合能力'],
    '四六级': ['词汇', '阅读', '写作', '翻译', '听力'],
    '考研英语': ['词汇', '阅读', '写作', '翻译', '长难句']
  };
  return examForm.value.type ? (subjectMap[examForm.value.type] || []) : [];
});

// 诗词数据现在从 poetry-api.ts 导入

// 处理文件选择
function handleFileChange(file: any) {
  const reader = new FileReader();
  reader.onload = (e) => {
    fileContent.value = e.target?.result as string;
    // 默认使用文件名作为标题
    const fileName = file.name.replace(/\.[^/.]+$/, '');
    if (!fileForm.value.title) {
      fileForm.value.title = fileName;
    }
  };
  reader.readAsText(file.raw);
}

// 搜索诗词 - 使用本地诗词库
async function handlePoetrySearch() {
  const { dynasty, keyword } = poetryForm.value;

  if (!keyword && !dynasty) {
    ElMessage.warning('请输入关键词或选择朝代');
    return;
  }

  poetryLoading.value = true;
  poetryResults.value = []; // 清空之前的搜索结果

  try {
    // 使用新的本地诗词服务搜索
    const results = await searchPoetry(keyword || '', {
      dynasty: dynasty || undefined,
    });

    if (results.length > 0) {
      poetryResults.value = results;
      ElMessage.success(`找到 ${results.length} 首相关诗词`);
    } else {
      ElMessage.info('未找到匹配的诗词，请尝试其他关键词');
    }
  } catch (error) {
    console.error('搜索失败:', error);
    ElMessage.error('搜索失败，请重试');
  } finally {
    poetryLoading.value = false;
  }
}

// 获取朝代名称
function getDynastyName(code: PoetryDynasty): string {
  const names: Record<PoetryDynasty, string> = {
    xianqin: '先秦',
    han: '两汉',
    weijin: '魏晋南北朝',
    sui: '隋',
    tang: '唐',
    song: '宋',
    yuan: '元',
    ming: '明',
    qing: '清',
    xiandai: '近现代',
  };
  return names[code] || code;
}

// 选择诗词
function selectPoetry(poem: any) {
  selectedPoetry.value = poem;
}

// 考试类型改变
function handleExamTypeChange() {
  examForm.value.subject = '';
  examResults.value = [];
  selectedExamItem.value = null;
}

// 搜索考试资料 - 使用本地诗词库
async function handleExamSearch() {
  const {type, subject, keyword} = examForm.value;

  if (!type && !keyword) {
    ElMessage.warning('请选择考试类型或输入关键词');
    return;
  }

  try {
    // 使用新的本地诗词服务搜索
    const searchTags: string[] = [];
    if (type) searchTags.push(type);
    if (subject) searchTags.push(subject);

    const results = await searchPoetry(keyword || '', {
      tags: searchTags.length > 0 ? searchTags : undefined,
    });

    examResults.value = results;

    if (examResults.value.length > 0) {
      ElMessage.success(`找到 ${examResults.value.length} 条相关资料`);
    } else {
      ElMessage.info('未找到相关资料，请尝试其他关键词');
    }
  } catch (error) {
    console.error('搜索失败:', error);
    ElMessage.error('搜索失败，请重试');
  }
}

// 选择考试资料
function selectExamItem(item: PoetryItem) {
  selectedExamItem.value = item;
}

// AI 搜索
async function handleAISearch() {
  if (!aiForm.value.keyword.trim()) {
    ElMessage.warning('请输入搜索关键词');
    return;
  }

  const config = getAISearchConfig();
  if (!config.enabled || !config.apiKey) {
    ElMessage.warning('请先配置 AI API Key');
    showAIConfig.value = true;
    return;
  }

  aiSearching.value = true;
  aiResults.value = [];
  selectedAIResult.value = null;

  try {
    const results = await smartSearchWithAI(
        aiForm.value.keyword,
        {
          type: aiForm.value.type,
          dynasty: aiForm.value.dynasty || undefined,
          articleType: aiForm.value.articleType
        },
        config
    );

    if (results.length > 0) {
      aiResults.value = results;
      ElMessage.success(`AI 找到 ${results.length} 个结果`);
    } else {
      ElMessage.info('未找到相关内容，请尝试其他关键词');
    }
  } catch (error) {
    console.error('AI 搜索失败:', error);
    ElMessage.error('搜索失败，请检查配置和网络');
  } finally {
    aiSearching.value = false;
  }
}

// 选择 AI 结果
function selectAIResult(result: AISearchResult) {
  selectedAIResult.value = result;
}

// 测试 AI 连接
async function handleTestAI() {
  aiTesting.value = true;
  aiTestResult.value = null;

  try {
    const result = await testAIConnection(aiConfigForm.value);
    aiTestResult.value = result;
    if (result) {
      ElMessage.success('连接成功');
    } else {
      ElMessage.error('连接失败，请检查 API Key 和配置');
    }
  } catch (error) {
    aiTestResult.value = false;
    ElMessage.error('连接失败');
  } finally {
    aiTesting.value = false;
  }
}

// 保存 AI 配置
function handleSaveAIConfig() {
  saveAISearchConfig(aiConfigForm.value);
  ElMessage.success('配置已保存');
  showAIConfig.value = false;
  aiTestResult.value = null;
}

// 打开单词列表设置
function openWordSettings() {
  // 关闭当前对话框
  showAIConfig.value = false;
  // 触发自定义事件，让父组件打开设置
  emit('openWordSettings');
}

// 处理搜索 - 使用本地诗词库搜索
async function handleSearch() {
  const keyword = onlineForm.value.keyword;
  const url = onlineForm.value.url;

  if (!keyword && !url) {
    ElMessage.warning('请输入搜索关键词或网页链接');
    return;
  }

  // 如果是URL模式，尝试抓取网页内容
  if (onlineForm.value.type === 'url' && url) {
    ElMessage.info('正在抓取网页内容...');
    try {
      // 由于跨域限制，这里提示用户手动复制
      searchResults.value = [{
        title: '网页内容导入',
        content: '由于浏览器安全限制，无法直接抓取网页。请手动打开网页，复制内容后使用「手动输入」功能导入。'
      }];
      ElMessage.info('请手动复制网页内容导入');
    } catch (error) {
      ElMessage.error('抓取失败，请手动复制内容');
    }
    return;
  }

  // 搜索模式 - 搜索本地诗词库
  if (keyword) {
    ElMessage.info('正在搜索本地诗词库...');
    try {
      // 使用新的本地诗词服务搜索
      const results = await searchPoetry(keyword);

      if (results.length > 0) {
        searchResults.value = results.map(p => ({
          title: `${p.title} - ${p.author}`,
          content: p.content,
          author: p.author,
          source: p.dynasty,
          location: p.location
        }));
        ElMessage.success(`找到 ${results.length} 个结果`);
      } else {
        ElMessage.info('未找到相关内容，请尝试其他关键词');
      }
    } catch (error) {
      console.error('搜索失败:', error);
      ElMessage.error('搜索失败，请重试');
    }
  }
}

// 解析批量导入内容
function parseBatchContent(content: string): any[] {
  const articles: any[] = [];
  const sections = content.split(/---+/).filter(s => s.trim());

  for (const section of sections) {
    const lines = section.trim().split('\n');
    const article: any = {
      title: '',
      author: '',
      source: '',
      tags: [],
      content: ''
    };

    let contentStarted = false;
    const contentLines: string[] = [];

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      if (trimmedLine.startsWith('标题：') || trimmedLine.startsWith('标题:')) {
        article.title = trimmedLine.replace(/^标题[：:]\s*/, '');
      } else if (trimmedLine.startsWith('作者：') || trimmedLine.startsWith('作者:')) {
        article.author = trimmedLine.replace(/^作者[：:]\s*/, '');
      } else if (trimmedLine.startsWith('来源：') || trimmedLine.startsWith('来源:')) {
        article.source = trimmedLine.replace(/^来源[：:]\s*/, '');
      } else if (trimmedLine.startsWith('标签：') || trimmedLine.startsWith('标签:')) {
        article.tags = trimmedLine.replace(/^标签[：:]\s*/, '').split(/[,，]/).map(t => t.trim()).filter(Boolean);
      } else {
        contentStarted = true;
        contentLines.push(line);
      }
    }

    article.content = contentLines.join('\n').trim();

    if (article.title && article.content) {
      articles.push(article);
    }
  }

  return articles;
}

// 导入
function handleImport() {
  importing.value = true;

  try {
    let articles: any[] = [];

    switch (activeTab.value) {
      case 'manual':
        if (!manualForm.value.title || !manualForm.value.content) {
          ElMessage.warning('请填写标题和内容');
          return;
        }
        articles = [{
          title: manualForm.value.title,
          content: manualForm.value.content,
          tags: manualForm.value.tags,
          author: '',
          source: ''
        }];
        break;

      case 'batch':
        if (!batchContent.value.trim()) {
          ElMessage.warning('请输入批量导入内容');
          return;
        }
        articles = parseBatchContent(batchContent.value);
        if (articles.length === 0) {
          ElMessage.warning('未能解析出有效文章，请检查格式');
          return;
        }
        break;

      case 'file':
        if (!fileContent.value) {
          ElMessage.warning('请先选择文件');
          return;
        }
        articles = [{
          title: fileForm.value.title || '未命名',
          content: fileContent.value,
          tags: fileForm.value.tags,
          author: '',
          source: ''
        }];
        break;

      case 'online':
        if (selectedResult.value !== null && searchResults.value[selectedResult.value]) {
          const result = searchResults.value[selectedResult.value];
          articles = [{
            title: result.title,
            content: result.content,
            tags: onlineForm.value.tags,
            author: '',
            source: onlineForm.value.url || ''
          }];
        } else {
          ElMessage.warning('请选择搜索结果');
          return;
        }
        break;

      case 'poetry':
        if (selectedPoetry.value) {
          const poem = selectedPoetry.value;
          articles = [{
            title: poem.title,
            content: poem.content,
            tags: [...poem.tags, ...poetryForm.value.tags],
            author: poem.author,
            source: poem.source || poem.dynasty,
            dynasty: poem.dynasty,
            location: poem.location // 添加创作地点信息
          }];
        } else {
          ElMessage.warning('请选择一首诗词');
          return;
        }
        break;

      case 'exam':
        if (selectedExamItem.value) {
          const item = selectedExamItem.value;
          articles = [{
            title: item.title,
            content: item.content,
            tags: [...item.tags, ...examForm.value.tags],
            author: item.author,
            source: item.source || item.dynasty,
            location: item.location
          }];
        } else {
          ElMessage.warning('请选择一条考试资料');
          return;
        }
        break;

      case 'ai':
        if (selectedAIResult.value) {
          articles = [{
            title: selectedAIResult.value.title,
            content: selectedAIResult.value.content,
            tags: [...selectedAIResult.value.tags, ...aiForm.value.tags],
            author: selectedAIResult.value.author,
            source: selectedAIResult.value.source
          }];
        } else {
          ElMessage.warning('请选择一个 AI 搜索结果');
          return;
        }
        break;
    }

    emit('import', articles);
    resetForm();
  } finally {
    importing.value = false;
  }
}

// 重置表单
function resetForm() {
  manualForm.value = {title: '', tags: [], content: ''};
  batchContent.value = '';
  fileContent.value = '';
  fileForm.value = {title: '', tags: []};
  onlineForm.value = {type: 'search', url: '', keyword: '', tags: []};
  searchResults.value = [];
  selectedResult.value = null;
  poetryForm.value = {dynasty: '', keyword: '', tags: []};
  poetryResults.value = [];
  selectedPoetry.value = null;
  examForm.value = {type: '', subject: '', keyword: '', tags: []};
  examResults.value = [];
  selectedExamItem.value = null;
  aiForm.value = {
    keyword: '',
    type: 'auto',
    dynasty: '',
    articleType: 'essay',
    tags: []
  };
  aiResults.value = [];
  selectedAIResult.value = null;
  aiSearching.value = false;
  activeTab.value = 'manual';
}

// 关闭对话框
function handleClose() {
  emit('update:modelValue', false);
  resetForm();
}
</script>

<style scoped lang="scss">
.upload-area {
  :deep(.el-upload-dragger) {
    width: 100%;
  }
}

.file-preview {
  margin-top: 20px;
  padding: 16px;
  background: var(--utools-bg-secondary);
  border-radius: 8px;

  h4 {
    margin-top: 0;
    margin-bottom: 12px;
    color: var(--utools-text-primary);
  }
}

.search-results {
  margin-top: 16px;
  padding: 16px;
  background: var(--utools-bg-secondary);
  border-radius: 8px;
  max-height: 300px;
  overflow-y: auto;

  h4 {
    margin-top: 0;
    margin-bottom: 12px;
  }
}

.poetry-results {
  margin-top: 16px;

  .selected {
    border: 2px solid var(--utools-primary);
  }
}

.poetry-placeholder {
  margin-top: 20px;
}

:deep(.el-radio__label) {
  width: 100%;
}

.ai-search-header {
  margin-bottom: 16px;
}

.ai-results {
  margin-top: 16px;

  .selected {
    border: 2px solid var(--utools-primary);
  }
}

.ai-placeholder {
  margin-top: 20px;
}

.exam-results {
  margin-top: 16px;

  .selected {
    border: 2px solid var(--utools-primary);
  }
}

.exam-placeholder {
  margin-top: 20px;
}

/* 文件导入格式说明样式 */
.file-format-desc {
  .format-title {
    margin: 0 0 8px 0;
    font-size: 14px;
    color: var(--utools-text-primary);

    .format-tags {
      display: inline-block;
      padding: 2px 8px;
      margin: 0 4px;
      background: var(--utools-primary-light);
      color: var(--utools-primary);
      border-radius: 4px;
      font-size: 12px;
      font-family: monospace;
    }
  }

  .format-detail {
    padding: 8px 0;

    p {
      margin: 0 0 12px 0;
      color: var(--utools-text-secondary);
      font-size: 13px;
      line-height: 1.6;
    }

    .meta-fields {
      background: var(--utools-bg-tertiary);
      padding: 12px 16px;
      border-radius: 6px;
      margin-bottom: 12px;

      .meta-field {
        font-size: 13px;
        line-height: 1.8;
        color: var(--utools-text-primary);

        .meta-key {
          color: var(--utools-primary);
          font-weight: 500;
          font-family: monospace;
        }
      }
    }

    .example-box {
      background: var(--utools-bg-tertiary);
      border-radius: 6px;
      overflow: hidden;
      margin-bottom: 12px;

      .example-header {
        padding: 8px 12px;
        background: var(--utools-bg-secondary);
        border-bottom: 1px solid var(--utools-border-light);

        span {
          font-size: 12px;
          color: var(--utools-text-secondary);
        }
      }

      .example-content {
        padding: 12px;
        margin: 0;
        font-family: 'Courier New', monospace;
        font-size: 13px;
        line-height: 1.6;
        color: var(--utools-text-primary);
        white-space: pre-wrap;
        word-break: break-all;
        background: transparent;
      }
    }

    .format-tip {
      margin: 8px 0 0 0;
      padding: 8px 12px;
      background: var(--utools-warning-light);
      border-radius: 4px;
      font-size: 12px;
      color: var(--utools-warning);

      code {
        background: rgba(0, 0, 0, 0.1);
        padding: 2px 6px;
        border-radius: 3px;
        font-family: monospace;
      }
    }
  }
}

/* 折叠面板样式优化 */
:deep(.el-collapse) {
  border: none;

  .el-collapse-item__header {
    font-size: 13px;
    color: var(--utools-text-primary);
    background: transparent;
    border-bottom: 1px solid var(--utools-border-light);
    padding-left: 0;
  }

  .el-collapse-item__wrap {
    background: transparent;
    border-bottom: none;
  }

  .el-collapse-item__content {
    padding-bottom: 0;
  }
}
</style>
