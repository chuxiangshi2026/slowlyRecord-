import axios from 'axios';
import { ElMessage } from 'element-plus';
import { useWordsStore } from '@/stores/words';
import { AppInfo } from '@/config';

/**
 * AI 搜索结果数据结构
 */
export interface AISearchResult {
  _id: string;
  title: string;
  author: string;
  dynasty: string;
  content: string;
  tags: string[];
  source: 'ai' | 'cache' | 'builtin';
}

/**
 * AI 搜索配置
 */
export interface AISearchConfig {
  enabled: boolean;
  provider: 'deepseek' | 'qwen' | 'kimi' | 'glm' | 'ollama' | 'siliconflow' | 'openrouter' | 'custom';
  apiKey: string;
  apiUrl: string;
  model: string;
}

// 默认配置
const DEFAULT_CONFIG: AISearchConfig = {
  enabled: true,
  provider: 'glm',
  apiKey: '',
  apiUrl: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
  model: 'glm-4-flash'
};

// 提供商配置映射 - 使用单词列表中的 AI 设置
const PROVIDER_CONFIGS: Record<string, { url: string; model: string; name: string }> = {
  deepseek: {
    url: 'https://api.deepseek.com/v1/chat/completions',
    model: 'deepseek-chat',
    name: 'DeepSeek'
  },
  qwen: {
    url: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
    model: 'qwen-max',
    name: '通义千问'
  },
  kimi: {
    url: 'https://api.moonshot.cn/v1/chat/completions',
    model: 'moonshot-v1-8k',
    name: 'Kimi'
  },
  glm: {
    url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    model: 'glm-4-flash',
    name: '智谱GLM'
  },
  ollama: {
    url: 'http://localhost:11434/api/generate',
    model: 'qwen2.5:0.5b',
    name: 'Ollama'
  },
  siliconflow: {
    url: 'https://api.siliconflow.cn/v1/chat/completions',
    model: 'Qwen/Qwen2.5-7B-Instruct',
    name: 'SiliconFlow'
  },
  openrouter: {
    url: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'qwen/qwen-2.5-7b-instruct:free',
    name: 'OpenRouter'
  }
};

/**
 * 从单词列表的 AI 设置获取配置
 */
export function getAISearchConfig(): AISearchConfig {
  try {
    // 优先从 localStorage 读取用户设置
    const stored = localStorage.getItem('ai_search_config');
    if (stored) {
      const parsed = JSON.parse(stored);
      // 合并默认配置和存储的配置
      const config = { ...DEFAULT_CONFIG, ...parsed };
      // 尝试获取单词列表中的 API key
      return enrichConfigWithWordsStore(config);
    }
  } catch (e) {
    console.error('读取 AI 配置失败:', e);
  }
  // 返回默认配置并尝试补充 API key
  return enrichConfigWithWordsStore({ ...DEFAULT_CONFIG });
}

/**
 * 使用单词列表 store 中的 API key 补充配置
 */
function enrichConfigWithWordsStore(config: AISearchConfig): AISearchConfig {
  try {
    // 尝试从 words store 获取 API key
    const wordsStore = useWordsStore();
    if (wordsStore && wordsStore.userApiKeys) {
      const provider = config.provider as keyof typeof wordsStore.userApiKeys;
      const keys = wordsStore.userApiKeys[provider];
      if (keys && keys.appkey) {
        config.apiKey = keys.appkey;
      }
      // 如果 wordsStore 没有，尝试使用 AppInfo 中的默认配置
      if (!config.apiKey && AppInfo[provider as keyof typeof AppInfo]) {
        const appInfo = AppInfo[provider as keyof typeof AppInfo];
        if (appInfo && appInfo.appkey) {
          config.apiKey = appInfo.appkey;
        }
      }
    }
  } catch (e) {
    console.log('无法访问 words store，使用默认配置');
    // 如果无法访问 store，使用 AppInfo 中的默认配置
    const provider = config.provider as keyof typeof AppInfo;
    if (AppInfo[provider] && AppInfo[provider].appkey) {
      config.apiKey = AppInfo[provider].appkey;
    }
  }
  return config;
}

/**
 * 保存配置到本地存储
 */
export function saveAISearchConfig(config: AISearchConfig): void {
  localStorage.setItem('ai_search_config', JSON.stringify(config));
}

/**
 * 使用 AI 搜索/生成诗词
 */
export async function searchPoetryWithAI(
  keyword: string,
  dynasty?: string,
  config?: AISearchConfig
): Promise<AISearchResult[]> {
  const aiConfig = config || getAISearchConfig();
  
  if (!aiConfig.enabled || !aiConfig.apiKey) {
    ElMessage.warning('请先配置 AI API Key');
    return [];
  }

  const providerConfig = PROVIDER_CONFIGS[aiConfig.provider] || {
    url: aiConfig.apiUrl,
    model: aiConfig.model
  };

  const dynastyPrompt = dynasty ? `${dynasty}时期的` : '';
  
  const prompt = `请搜索或创作关于"${keyword}"的${dynastyPrompt}中国古诗词。
要求：
1. 返回 1-3 首相关诗词
2. 每首诗词包含：标题、作者、朝代、完整内容
3. 只返回 JSON 格式，不要其他说明文字
4. JSON 格式示例：
{
  "poems": [
    {
      "title": "静夜思",
      "author": "李白",
      "dynasty": "唐",
      "content": "床前明月光，\\n疑是地上霜。\\n举头望明月，\\n低头思故乡。"
    }
  ]
}`;

  try {
    const response = await axios.post(
      providerConfig.url,
      {
        model: providerConfig.model,
        messages: [
          { role: 'system', content: '你是一个中国古诗词专家，擅长搜索和解析古诗词。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 2000
      },
      {
        headers: {
          'Authorization': `Bearer ${aiConfig.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    const content = response.data?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('AI 返回内容为空');
    }

    // 解析 JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('无法解析 AI 返回内容');
    }

    const data = JSON.parse(jsonMatch[0]);
    const poems = data.poems || data.data || [];

    return poems.map((poem: any, index: number) => ({
      _id: `ai_poetry_${Date.now()}_${index}`,
      title: poem.title || poem.name || '未知标题',
      author: poem.author || poem.poet || '佚名',
      dynasty: poem.dynasty || poem.period || 'unknown',
      content: poem.content || poem.body || poem.text || '',
      tags: [poem.dynasty || '诗词', poem.author || ''].filter(Boolean),
      source: 'ai' as const
    }));
  } catch (error) {
    console.error('AI 搜索失败:', error);
    ElMessage.error('AI 搜索失败，请检查 API Key 和网络连接');
    return [];
  }
}

/**
 * 使用 AI 搜索/生成文章
 */
export async function searchArticleWithAI(
  keyword: string,
  articleType: 'essay' | 'prose' | 'poetry' | 'classic' = 'essay',
  config?: AISearchConfig
): Promise<AISearchResult[]> {
  const aiConfig = config || getAISearchConfig();
  
  if (!aiConfig.enabled || !aiConfig.apiKey) {
    ElMessage.warning('请先配置 AI API Key');
    return [];
  }

  const providerConfig = PROVIDER_CONFIGS[aiConfig.provider] || {
    url: aiConfig.apiUrl,
    model: aiConfig.model
  };

  const typeMap: Record<string, string> = {
    essay: '散文',
    prose: '现代散文',
    poetry: '现代诗歌',
    classic: '古文'
  };

  const prompt = `请搜索或创作关于"${keyword}"的${typeMap[articleType] || ''}。
要求：
1. 返回 1-2 篇相关文章
2. 每篇文章包含：标题、作者、完整内容（200-800字）
3. 只返回 JSON 格式，不要其他说明文字
4. JSON 格式示例：
{
  "articles": [
    {
      "title": "文章标题",
      "author": "作者名",
      "content": "文章内容..."
    }
  ]
}`;

  try {
    const response = await axios.post(
      providerConfig.url,
      {
        model: providerConfig.model,
        messages: [
          { role: 'system', content: '你是一个文学专家，擅长搜索和创作各类文章。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 3000
      },
      {
        headers: {
          'Authorization': `Bearer ${aiConfig.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    const content = response.data?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('AI 返回内容为空');
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('无法解析 AI 返回内容');
    }

    const data = JSON.parse(jsonMatch[0]);
    const articles = data.articles || data.data || [];

    return articles.map((article: any, index: number) => ({
      _id: `ai_article_${Date.now()}_${index}`,
      title: article.title || '未知标题',
      author: article.author || '佚名',
      dynasty: 'modern',
      content: article.content || article.body || article.text || '',
      tags: [articleType, article.author || ''].filter(Boolean),
      source: 'ai' as const
    }));
  } catch (error) {
    console.error('AI 搜索失败:', error);
    ElMessage.error('AI 搜索失败，请检查 API Key 和网络连接');
    return [];
  }
}

/**
 * 智能搜索（自动判断类型）
 */
export async function smartSearchWithAI(
  keyword: string,
  options: {
    type?: 'poetry' | 'article' | 'auto';
    dynasty?: string;
    articleType?: 'essay' | 'prose' | 'poetry' | 'classic';
  } = {},
  config?: AISearchConfig
): Promise<AISearchResult[]> {
  const { type = 'auto', dynasty, articleType = 'essay' } = options;
  
  // 自动判断类型
  if (type === 'auto') {
    const poetryKeywords = ['诗', '词', '曲', '李白', '杜甫', '苏轼', '唐', '宋', '元', '诗经', '楚辞'];
    const isPoetry = poetryKeywords.some(kw => keyword.includes(kw));
    
    if (isPoetry) {
      return searchPoetryWithAI(keyword, dynasty, config);
    } else {
      return searchArticleWithAI(keyword, articleType, config);
    }
  }
  
  if (type === 'poetry') {
    return searchPoetryWithAI(keyword, dynasty, config);
  } else {
    return searchArticleWithAI(keyword, articleType, config);
  }
}

/**
 * 测试 AI 连接
 */
export async function testAIConnection(config?: AISearchConfig): Promise<boolean> {
  const aiConfig = config || getAISearchConfig();
  
  if (!aiConfig.enabled || !aiConfig.apiKey) {
    return false;
  }

  const providerConfig = PROVIDER_CONFIGS[aiConfig.provider] || {
    url: aiConfig.apiUrl,
    model: aiConfig.model
  };

  try {
    const response = await axios.post(
      providerConfig.url,
      {
        model: providerConfig.model,
        messages: [
          { role: 'user', content: '你好' }
        ],
        max_tokens: 50
      },
      {
        headers: {
          'Authorization': `Bearer ${aiConfig.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    return !!response.data?.choices?.[0]?.message?.content;
  } catch (error) {
    console.error('AI 连接测试失败:', error);
    return false;
  }
}
