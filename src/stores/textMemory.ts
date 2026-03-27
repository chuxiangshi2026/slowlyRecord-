import { defineStore } from 'pinia';
import type {
  TextArticle,
  TextNote,
  TextPrompt,
  FillBlankExercise,
  ChoiceQuestion,
  ExerciseSettings,
  TextMemoryState,
  BlankItem
} from '@/types/text-memory';

// 数据库名称
const DB_NAME = 'slowlyrecord-textmemory';

// 获取 uTools db 实例
function getDb() {
  if (typeof utools === 'undefined' || !utools.db) {
    console.warn('uTools db 不可用');
    return null;
  }
  return utools.db;
}

// 生成唯一ID
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// 默认练习设置
const defaultSettings: ExerciseSettings = {
  blankCount: 10,
  choiceCount: 5,
  showPinyin: false,
  highlightKeywords: true
};

export const useTextMemoryStore = defineStore('textMemory', {
  state: (): TextMemoryState => ({
    articles: [],
    currentArticle: null,
    currentNotes: [],
    currentPrompts: [],
    exerciseSettings: { ...defaultSettings },
    loading: false
  }),

  getters: {
    // 获取文章总数
    totalArticles: (state) => state.articles.length,

    // 按时间排序的文章列表
    sortedArticles: (state) => {
      return [...state.articles].sort((a, b) => b.ctime - a.ctime);
    },

    // 按标签分组的文章
    articlesByTag: (state) => {
      const grouped: Record<string, TextArticle[]> = {};
      state.articles.forEach(article => {
        article.tags.forEach(tag => {
          if (!grouped[tag]) {
            grouped[tag] = [];
          }
          grouped[tag].push(article);
        });
      });
      return grouped;
    },

    // 所有标签
    allTags: (state) => {
      const tagSet = new Set<string>();
      state.articles.forEach(article => {
        article.tags.forEach(tag => tagSet.add(tag));
      });
      return Array.from(tagSet);
    },

    // 当前文章的字数
    currentArticleWordCount: (state) => {
      if (!state.currentArticle) return 0;
      return state.currentArticle.content.length;
    }
  },

  actions: {
    // ============ 文章操作 ============

    /**
     * 加载所有文章
     */
    async loadArticles() {
      this.loading = true;
      try {
        const db = getDb();
        if (!db) {
          this.articles = [];
          return;
        }

        const docs = db.allDocs(DB_NAME);
        this.articles = docs.filter((doc: any) => doc._id.startsWith('article_')) as TextArticle[];
      } catch (error) {
        console.error('加载文章失败:', error);
        this.articles = [];
      } finally {
        this.loading = false;
      }
    },

    /**
     * 添加文章
     */
    async addArticle(article: Omit<TextArticle, '_id' | '_rev' | 'ctime' | 'utime' | 'reviewCount'>) {
      try {
        const db = getDb();
        if (!db) throw new Error('数据库不可用');

        const now = Date.now();
        const newArticle: TextArticle = {
          ...article,
          _id: `article_${generateId()}`,
          ctime: now,
          utime: now,
          reviewCount: 0
        };

        const result = db.put({
          ...newArticle
        });

        if (result.ok) {
          newArticle._rev = result.rev;
          this.articles.push(newArticle);
          return { success: true, data: newArticle };
        }
        return { success: false, error: '保存失败' };
      } catch (error) {
        console.error('添加文章失败:', error);
        return { success: false, error: String(error) };
      }
    },

    /**
     * 更新文章
     */
    async updateArticle(article: TextArticle) {
      try {
        const db = getDb();
        if (!db) throw new Error('数据库不可用');

        const updatedArticle = {
          ...article,
          utime: Date.now()
        };

        const result = db.put({
          ...updatedArticle
        });

        if (result.ok) {
          updatedArticle._rev = result.rev;
          const index = this.articles.findIndex(a => a._id === updatedArticle._id);
          if (index !== -1) {
            this.articles[index] = updatedArticle;
          }
          if (this.currentArticle?._id === updatedArticle._id) {
            this.currentArticle = updatedArticle;
          }
          return { success: true, data: updatedArticle };
        }
        return { success: false, error: '更新失败' };
      } catch (error) {
        console.error('更新文章失败:', error);
        return { success: false, error: String(error) };
      }
    },

    /**
     * 删除文章
     */
    async deleteArticle(articleId: string) {
      try {
        const db = getDb();
        if (!db) throw new Error('数据库不可用');

        const article = this.articles.find(a => a._id === articleId);
        if (!article) return { success: false, error: '文章不存在' };

        // 删除文章
        db.remove(article);

        // 删除关联的笔记
        const notes = db.allDocs(DB_NAME).filter((doc: any) => doc.articleId === articleId);
        notes.forEach((note: any) => db.remove(note));

        // 删除关联的提示词
        const prompts = db.allDocs(DB_NAME).filter((doc: any) => doc.articleId === articleId);
        prompts.forEach((prompt: any) => db.remove(prompt));

        this.articles = this.articles.filter(a => a._id !== articleId);

        if (this.currentArticle?._id === articleId) {
          this.currentArticle = null;
          this.currentNotes = [];
          this.currentPrompts = [];
        }

        return { success: true };
      } catch (error) {
        console.error('删除文章失败:', error);
        return { success: false, error: String(error) };
      }
    },

    /**
     * 设置当前文章
     */
    setCurrentArticle(article: TextArticle | null) {
      this.currentArticle = article;
      if (article) {
        this.loadNotes(article._id);
        this.loadPrompts(article._id);
      } else {
        this.currentNotes = [];
        this.currentPrompts = [];
      }
    },

    /**
     * 更新复习次数
     */
    async updateReviewCount(articleId: string) {
      const article = this.articles.find(a => a._id === articleId);
      if (article) {
        article.reviewCount++;
        article.lastReviewTime = Date.now();
        await this.updateArticle(article);
      }
    },

    // ============ 笔记操作 ============

    /**
     * 加载笔记
     */
    async loadNotes(articleId: string) {
      try {
        const db = getDb();
        if (!db) {
          this.currentNotes = [];
          return;
        }

        const docs = db.allDocs(DB_NAME);
        this.currentNotes = (docs
          .filter((doc: any) => doc._id.startsWith('note_') && doc.articleId === articleId) as TextNote[])
          .sort((a: TextNote, b: TextNote) => b.ctime - a.ctime);
      } catch (error) {
        console.error('加载笔记失败:', error);
        this.currentNotes = [];
      }
    },

    /**
     * 添加笔记
     */
    async addNote(note: Omit<TextNote, '_id' | '_rev' | 'ctime'>) {
      try {
        const db = getDb();
        if (!db) throw new Error('数据库不可用');

        const newNote: TextNote = {
          ...note,
          _id: `note_${generateId()}`,
          ctime: Date.now()
        };

        const result = db.put({
          ...newNote
        });

        if (result.ok) {
          newNote._rev = result.rev;
          this.currentNotes.unshift(newNote);
          return { success: true, data: newNote };
        }
        return { success: false, error: '保存失败' };
      } catch (error) {
        console.error('添加笔记失败:', error);
        return { success: false, error: String(error) };
      }
    },

    /**
     * 更新笔记
     */
    async updateNote(note: TextNote) {
      try {
        const db = getDb();
        if (!db) throw new Error('数据库不可用');

        note.utime = Date.now();

        const result = db.put({
          ...note
        });

        if (result.ok) {
          note._rev = result.rev;
          const index = this.currentNotes.findIndex(n => n._id === note._id);
          if (index !== -1) {
            this.currentNotes[index] = note;
          }
          return { success: true, data: note };
        }
        return { success: false, error: '更新失败' };
      } catch (error) {
        console.error('更新笔记失败:', error);
        return { success: false, error: String(error) };
      }
    },

    /**
     * 删除笔记
     */
    async deleteNote(noteId: string) {
      try {
        const db = getDb();
        if (!db) throw new Error('数据库不可用');

        const note = this.currentNotes.find(n => n._id === noteId);
        if (!note) return { success: false, error: '笔记不存在' };

        db.remove(note);
        this.currentNotes = this.currentNotes.filter(n => n._id !== noteId);

        return { success: true };
      } catch (error) {
        console.error('删除笔记失败:', error);
        return { success: false, error: String(error) };
      }
    },

    // ============ 提示词操作 ============

    /**
     * 加载提示词
     */
    async loadPrompts(articleId: string) {
      try {
        const db = getDb();
        if (!db) {
          this.currentPrompts = [];
          return;
        }

        const docs = db.allDocs(DB_NAME);
        this.currentPrompts = (docs
          .filter((doc: any) => doc._id.startsWith('prompt_') && doc.articleId === articleId) as TextPrompt[])
          .sort((a: TextPrompt, b: TextPrompt) => a.order - b.order);
      } catch (error) {
        console.error('加载提示词失败:', error);
        this.currentPrompts = [];
      }
    },

    /**
     * 添加提示词
     */
    async addPrompt(prompt: Omit<TextPrompt, '_id' | '_rev' | 'ctime'>) {
      try {
        const db = getDb();
        if (!db) throw new Error('数据库不可用');

        const newPrompt: TextPrompt = {
          ...prompt,
          _id: `prompt_${generateId()}`,
          ctime: Date.now()
        };

        const result = db.put({
          ...newPrompt
        });

        if (result.ok) {
          newPrompt._rev = result.rev;
          this.currentPrompts.push(newPrompt);
          this.currentPrompts.sort((a, b) => a.order - b.order);
          return { success: true, data: newPrompt };
        }
        return { success: false, error: '保存失败' };
      } catch (error) {
        console.error('添加提示词失败:', error);
        return { success: false, error: String(error) };
      }
    },

    /**
     * 更新提示词
     */
    async updatePrompt(prompt: TextPrompt) {
      try {
        const db = getDb();
        if (!db) throw new Error('数据库不可用');

        const result = db.put({
          ...prompt
        });

        if (result.ok) {
          prompt._rev = result.rev;
          const index = this.currentPrompts.findIndex(p => p._id === prompt._id);
          if (index !== -1) {
            this.currentPrompts[index] = prompt;
          }
          return { success: true, data: prompt };
        }
        return { success: false, error: '更新失败' };
      } catch (error) {
        console.error('更新提示词失败:', error);
        return { success: false, error: String(error) };
      }
    },

    /**
     * 删除提示词
     */
    async deletePrompt(promptId: string) {
      try {
        const db = getDb();
        if (!db) throw new Error('数据库不可用');

        const prompt = this.currentPrompts.find(p => p._id === promptId);
        if (!prompt) return { success: false, error: '提示词不存在' };

        db.remove(prompt);
        this.currentPrompts = this.currentPrompts.filter(p => p._id !== promptId);

        return { success: true };
      } catch (error) {
        console.error('删除提示词失败:', error);
        return { success: false, error: String(error) };
      }
    },

    /**
     * 更新提示词顺序
     */
    async reorderPrompts(prompts: TextPrompt[]) {
      this.currentPrompts = prompts;
      // 批量更新顺序
      for (let i = 0; i < prompts.length; i++) {
        prompts[i].order = i;
        await this.updatePrompt(prompts[i]);
      }
    },

    // ============ 练习相关 ============

    /**
     * 生成填空练习
     */
    generateFillBlanks(articleId: string, content: string, count: number = 10): BlankItem[] {
      const blanks: BlankItem[] = [];
      const sentences = content.split(/[。！？；.!?;]/).filter(s => s.trim().length > 5);

      if (sentences.length === 0) return blanks;

      // 提取关键词（按优先级：4字 > 3字 > 2字，确保不重叠）
      const allWords: { word: string; position: number; priority: number }[] = [];
      
      sentences.forEach((sentence, idx) => {
        const sentenceWords: { word: string; start: number; end: number; priority: number }[] = [];
        
        // 按优先级提取：4字 > 3字 > 2字
        for (let len = 4; len >= 2; len--) {
          for (let i = 0; i <= sentence.length - len; i++) {
            const word = sentence.substring(i, i + len);
            // 过滤掉纯标点、数字、英文
            if (/^[\u4e00-\u9fa5]+$/.test(word)) {
              // 检查是否与已提取的高优先级词重叠
              const overlap = sentenceWords.some(k => 
                k.priority > len && !(i + len <= k.start || i >= k.end)
              );
              if (!overlap) {
                sentenceWords.push({ word, start: i, end: i + len, priority: len });
              }
            }
          }
        }
        
        // 将本句的词加入总列表
        sentenceWords.forEach(w => {
          allWords.push({ word: w.word, position: idx, priority: w.priority });
        });
      });

      if (allWords.length === 0) return blanks;

      // 按优先级排序，同优先级随机
      allWords.sort((a, b) => {
        if (b.priority !== a.priority) return b.priority - a.priority;
        return Math.random() - 0.5;
      });

      // 选择不重复的词语（每句最多选2个）
      const selectedWords: typeof allWords = [];
      const sentenceWordCount = new Map<number, number>();
      
      for (const word of allWords) {
        const currentCount = sentenceWordCount.get(word.position) || 0;
        if (currentCount < 2) { // 每句最多2个
          selectedWords.push(word);
          sentenceWordCount.set(word.position, currentCount + 1);
          
          if (selectedWords.length >= count) break;
        }
      }

      return selectedWords.map(w => ({
        original: w.word,
        position: w.position
      }));
    },

    /**
     * 生成选择题
     */
    generateChoiceQuestions(articleId: string, content: string, count: number = 5): ChoiceQuestion[] {
      const questions: ChoiceQuestion[] = [];
      const sentences = content.split(/[。！？；.!?;]/).filter(s => s.trim().length > 10);

      if (sentences.length === 0) return questions;

      const types: Array<'synonym' | 'antonym' | 'typo' | 'nonsense'> = ['synonym', 'antonym', 'typo', 'nonsense'];

      for (let i = 0; i < Math.min(count, sentences.length); i++) {
        const sentence = sentences[Math.floor(Math.random() * sentences.length)];
        const type = types[Math.floor(Math.random() * types.length)];

        // 提取句子中的关键词（优先4字成语，然后是3字、2字词，确保不重叠）
        const keywords: { word: string; start: number; end: number; priority: number }[] = [];
        
        // 按优先级提取：4字 > 3字 > 2字
        for (let len = 4; len >= 2; len--) {
          for (let j = 0; j <= sentence.length - len; j++) {
            const word = sentence.substring(j, j + len);
            if (/^[\u4e00-\u9fa5]+$/.test(word)) {
              // 检查是否与已提取的高优先级词重叠
              const overlap = keywords.some(k => 
                k.priority > len - 1 && !(j + len <= k.start || j >= k.end)
              );
              if (!overlap) {
                keywords.push({ word, start: j, end: j + len, priority: len });
              }
            }
          }
        }

        if (keywords.length === 0) continue;

        // 优先选择较长的词
        keywords.sort((a, b) => b.priority - a.priority);
        const topKeywords = keywords.slice(0, Math.min(5, keywords.length));
        const selected = topKeywords[Math.floor(Math.random() * topKeywords.length)];
        const keyword = selected.word;

        let question: string;
        let options: string[];
        let correctIndex: number;
        let explanation: string;

        switch (type) {
          case 'synonym':
            question = `下列哪个是"${keyword}"的近义词？`;
            options = this.generateSynonymOptions(keyword);
            correctIndex = 0;
            explanation = `"${keyword}"的近义词是"${options[0]}"`;
            break;
          case 'antonym':
            question = `下列哪个是"${keyword}"的反义词？`;
            options = this.generateAntonymOptions(keyword);
            correctIndex = 0;
            explanation = `"${keyword}"的反义词是"${options[0]}"`;
            break;
          case 'typo':
            question = `找出句子中的错别字（或错误用词）：${sentence}`;
            const typoResult = this.generateTypoOptions(keyword);
            options = typoResult.options;
            correctIndex = typoResult.correctIndex;
            explanation = `正确写法应该是"${keyword}"，而不是"${options[correctIndex === 0 ? 1 : 0]}"`;
            break;
          case 'nonsense':
            question = `下列选项中，哪个替换到"${keyword}"的位置会使句子意思变得荒谬？`;
            options = this.generateNonsenseOptions(keyword);
            correctIndex = options.length - 1;
            explanation = `"${options[correctIndex]}"替换后会使句子意思变得荒谬可笑`;
            break;
          default:
            continue;
        }

        questions.push({
          _id: generateId(),
          articleId,
          type,
          originalText: sentence,
          question,
          options: options.map((opt, idx) => ({ label: String.fromCharCode(65 + idx), content: opt })),
          correctIndex,
          answered: false,
          ctime: Date.now()
        });
      }

      return questions;
    },

    /**
     * 生成近义词选项（简化实现）
     */
    generateSynonymOptions(keyword: string): string[] {
      // 这里可以使用同义词库，简化实现返回模拟数据
      const commonSynonyms: Record<string, string[]> = {
        '美丽': ['漂亮', '丑陋', '普通', '一般'],
        '高兴': ['快乐', '悲伤', '生气', '平静'],
        '快速': ['迅速', '缓慢', '慢慢', '迟疑'],
        '巨大': ['庞大', '微小', '渺小', '细小'],
        '聪明': ['聪慧', '愚蠢', '笨拙', '迟钝']
      };

      const options = commonSynonyms[keyword] || [keyword, '相似词A', '相似词B', '相似词C'];
      return this.shuffleArray([...options]);
    },

    /**
     * 生成反义词选项
     */
    generateAntonymOptions(keyword: string): string[] {
      const commonAntonyms: Record<string, string[]> = {
        '美丽': ['丑陋', '漂亮', '好看', '优美'],
        '高兴': ['悲伤', '快乐', '开心', '愉快'],
        '快速': ['缓慢', '迅速', '飞快', '极速'],
        '巨大': ['微小', '庞大', '宏大', '硕大'],
        '聪明': ['愚蠢', '聪慧', '智慧', '聪颖']
      };

      const options = commonAntonyms[keyword] || ['反义词A', '反义词B', '反义词C', keyword];
      return this.shuffleArray([...options]);
    },

    /**
     * 生成错别字选项
     */
    generateTypoOptions(keyword: string): { options: string[]; correctIndex: number } {
      // 生成形近字或音近字
      const typo = keyword.split('').map(char => {
        // 简单的替换规则
        const similarChars: Record<string, string> = {
          '的': '得', '地': '的', '得': '地',
          '他': '她', '她': '他', '它': '他',
          '已': '己', '己': '已',
          '人': '入', '入': '人'
        };
        return similarChars[char] || char;
      }).join('');

      const options = typo === keyword ? [keyword, keyword + '(误)'] : [keyword, typo];
      const correctIndex = 0;
      return { options: this.shuffleArray(options), correctIndex: options.indexOf(keyword) };
    },

    /**
     * 生成无厘头选项
     */
    generateNonsenseOptions(keyword: string): string[] {
      const nonsenseWords = ['香蕉', '洗衣机', '奥特曼', '汉堡包', '挖掘机'];
      const randomNonsense = nonsenseWords[Math.floor(Math.random() * nonsenseWords.length)];
      return [keyword, keyword, keyword, randomNonsense];
    },

    /**
     * 打乱数组
     */
    shuffleArray<T>(array: T[]): T[] {
      const newArray = [...array];
      for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
      }
      return newArray;
    },

    // ============ 设置操作 ============

    /**
     * 更新练习设置
     */
    updateExerciseSettings(settings: Partial<ExerciseSettings>) {
      this.exerciseSettings = { ...this.exerciseSettings, ...settings };
    },

    /**
     * 重置设置
     */
    resetSettings() {
      this.exerciseSettings = { ...defaultSettings };
    }
  }
});
