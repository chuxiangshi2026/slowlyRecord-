import axios from 'axios';
import { ElMessage } from 'element-plus';

// 今日诗词 API
const JINRISHICI_API = 'https://v2.jinrishici.com';

// 古诗词 API (使用古诗词网或其他免费API)
const POETRY_DB_API = 'https://poetrydb.org';

/**
 * 诗词数据结构
 */
export interface PoetryData {
  _id: string;
  title: string;
  author: string;
  dynasty: string;
  content: string;
  tags: string[];
}

/**
 * 获取今日诗词（随机一首）
 */
export async function getTodayPoetry(): Promise<PoetryData | null> {
  try {
    const response = await axios.get(`${JINRISHICI_API}/one.json`, {
      timeout: 5000
    });
    
    if (response.data && response.data.status === 'success') {
      const data = response.data.data;
      return {
        _id: `poetry_${Date.now()}`,
        title: data.origin.title || '未知标题',
        author: data.origin.author || '佚名',
        dynasty: data.origin.dynasty || '未知',
        content: data.content || data.origin.content?.join('\n') || '',
        tags: data.matchTags || ['诗词']
      };
    }
    return null;
  } catch (error) {
    console.error('获取今日诗词失败:', error);
    return null;
  }
}

/**
 * 根据作者搜索诗词
 */
export async function searchPoetryByAuthor(author: string): Promise<PoetryData[]> {
  try {
    const response = await axios.get(`${POETRY_DB_API}/author/${encodeURIComponent(author)}`, {
      timeout: 5000
    });
    
    if (Array.isArray(response.data)) {
      return response.data.map((item: any, index: number) => ({
        _id: `poetry_${author}_${index}`,
        title: item.title || '未知标题',
        author: item.author || author,
        dynasty: getDynastyFromAuthor(item.author),
        content: Array.isArray(item.lines) ? item.lines.join('\n') : item.lines || '',
        tags: ['诗词', item.author]
      }));
    }
    return [];
  } catch (error) {
    console.error('搜索诗词失败:', error);
    return [];
  }
}

/**
 * 根据标题搜索诗词
 */
export async function searchPoetryByTitle(title: string): Promise<PoetryData[]> {
  try {
    const response = await axios.get(`${POETRY_DB_API}/title/${encodeURIComponent(title)}`, {
      timeout: 5000
    });
    
    if (Array.isArray(response.data)) {
      return response.data.map((item: any, index: number) => ({
        _id: `poetry_${title}_${index}`,
        title: item.title || title,
        author: item.author || '佚名',
        dynasty: getDynastyFromAuthor(item.author),
        content: Array.isArray(item.lines) ? item.lines.join('\n') : item.lines || '',
        tags: ['诗词', item.title]
      }));
    }
    return [];
  } catch (error) {
    console.error('搜索诗词失败:', error);
    return [];
  }
}

/**
 * 综合搜索诗词（根据关键词）
 */
export async function searchPoetry(keyword: string): Promise<PoetryData[]> {
  const results: PoetryData[] = [];
  
  try {
    // 尝试按作者搜索
    const byAuthor = await searchPoetryByAuthor(keyword);
    results.push(...byAuthor);
    
    // 尝试按标题搜索
    const byTitle = await searchPoetryByTitle(keyword);
    // 去重
    byTitle.forEach(poetry => {
      if (!results.find(p => p.title === poetry.title && p.author === poetry.author)) {
        results.push(poetry);
      }
    });
    
    return results;
  } catch (error) {
    console.error('搜索诗词失败:', error);
    ElMessage.error('搜索失败，请检查网络连接');
    return [];
  }
}

/**
 * 获取内置诗词数据（作为备用）
 */
export function getBuiltinPoetryData(): PoetryData[] {
  return [
    // ===== 经典诗词 =====
    {
      _id: '1',
      title: '静夜思',
      author: '李白',
      dynasty: 'tang',
      content: '床前明月光，\n疑是地上霜。\n举头望明月，\n低头思故乡。',
      tags: ['唐诗', '李白', '思乡', '专升本', '考研']
    },
    {
      _id: '2',
      title: '春晓',
      author: '孟浩然',
      dynasty: 'tang',
      content: '春眠不觉晓，\n处处闻啼鸟。\n夜来风雨声，\n花落知多少。',
      tags: ['唐诗', '孟浩然', '春天', '专升本']
    },
    {
      _id: '3',
      title: '登鹳雀楼',
      author: '王之涣',
      dynasty: 'tang',
      content: '白日依山尽，\n黄河入海流。\n欲穷千里目，\n更上一层楼。',
      tags: ['唐诗', '王之涣', '励志', '专升本', '考研']
    },
    {
      _id: '4',
      title: '水调歌头·明月几时有',
      author: '苏轼',
      dynasty: 'song',
      content: '明月几时有？把酒问青天。\n不知天上宫阙，今夕是何年。\n我欲乘风归去，又恐琼楼玉宇，\n高处不胜寒。\n起舞弄清影，何似在人间。',
      tags: ['宋词', '苏轼', '中秋', '专升本', '考研']
    },
    {
      _id: '5',
      title: '关雎',
      author: '佚名',
      dynasty: 'shijing',
      content: '关关雎鸠，在河之洲。\n窈窕淑女，君子好逑。\n参差荇菜，左右流之。\n窈窕淑女，寤寐求之。',
      tags: ['诗经', '爱情', '专升本', '考研']
    },
    {
      _id: '6',
      title: '江雪',
      author: '柳宗元',
      dynasty: 'tang',
      content: '千山鸟飞绝，\n万径人踪灭。\n孤舟蓑笠翁，\n独钓寒江雪。',
      tags: ['唐诗', '柳宗元', '写景', '专升本']
    },
    {
      _id: '7',
      title: '望庐山瀑布',
      author: '李白',
      dynasty: 'tang',
      content: '日照香炉生紫烟，\n遥看瀑布挂前川。\n飞流直下三千尺，\n疑是银河落九天。',
      tags: ['唐诗', '李白', '写景', '专升本']
    },
    {
      _id: '8',
      title: '赋得古原草送别',
      author: '白居易',
      dynasty: 'tang',
      content: '离离原上草，一岁一枯荣。\n野火烧不尽，春风吹又生。\n远芳侵古道，晴翠接荒城。\n又送王孙去，萋萋满别情。',
      tags: ['唐诗', '白居易', '送别', '专升本']
    },
    // ===== 考研必背 =====
    {
      _id: '9',
      title: '念奴娇·赤壁怀古',
      author: '苏轼',
      dynasty: 'song',
      content: '大江东去，浪淘尽，千古风流人物。\n故垒西边，人道是，三国周郎赤壁。\n乱石穿空，惊涛拍岸，卷起千堆雪。\n江山如画，一时多少豪杰。',
      tags: ['宋词', '苏轼', '考研', '豪放']
    },
    {
      _id: '10',
      title: '岳阳楼记（节选）',
      author: '范仲淹',
      dynasty: 'song',
      content: '不以物喜，不以己悲；\n居庙堂之高则忧其民；\n处江湖之远则忧其君。\n是进亦忧，退亦忧。\n然则何时而乐耶？\n先天下之忧而忧，\n后天下之乐而乐。',
      tags: ['古文', '范仲淹', '考研', '专升本']
    },
    {
      _id: '11',
      title: '出师表（节选）',
      author: '诸葛亮',
      dynasty: '三国',
      content: '臣本布衣，躬耕于南阳，\n苟全性命于乱世，不求闻达于诸侯。\n先帝不以臣卑鄙，猥自枉屈，\n三顾臣于草庐之中，咨臣以当世之事，\n由是感激，遂许先帝以驱驰。',
      tags: ['古文', '诸葛亮', '考研', '专升本']
    },
    {
      _id: '12',
      title: '离骚（节选）',
      author: '屈原',
      dynasty: '战国',
      content: '长太息以掩涕兮，哀民生之多艰。\n余虽好修姱以鞿羁兮，謇朝谇而夕替。\n既替余以蕙纕兮，又申之以揽茝。\n亦余心之所善兮，虽九死其犹未悔。',
      tags: ['楚辞', '屈原', '考研', '专升本']
    },
    // ===== 考公/职称 =====
    {
      _id: '13',
      title: '行测言语理解·常用成语',
      author: '公务员考试',
      dynasty: 'modern',
      content: '1. 一蹴而就：比喻事情轻而易举，一下子就成功。\n2. 一劳永逸：辛苦一次，把事情办好，以后就可以不再费力了。\n3. 相得益彰：指两个人或两件事物互相配合，双方的能力和作用更能显示出来。\n4. 相辅相成：指两件事物互相配合，互相辅助，缺一不可。\n5. 相得益彰：互相配合而使双方的能力和作用更能显示出来。',
      tags: ['考公', '行测', '成语', '职称']
    },
    {
      _id: '14',
      title: '申论写作·金句积累',
      author: '公务员考试',
      dynasty: 'modern',
      content: '1. 民惟邦本，本固邦宁。\n2. 治国有常，而利民为本。\n3. 政之所兴在顺民心，政之所废在逆民心。\n4. 天下之事，不难于立法，而难于法之必行。\n5. 苟利国家生死以，岂因祸福避趋之。',
      tags: ['考公', '申论', '金句', '职称']
    },
    // ===== 英语四六级 =====
    {
      _id: '15',
      title: 'CET-4 高频词汇（A）',
      author: '四六级考试',
      dynasty: 'modern',
      content: '1. abandon v. 放弃，遗弃\n2. ability n. 能力，才能\n3. absolute a. 绝对的，完全的\n4. absorb v. 吸收，吸引\n5. abstract a. 抽象的 n. 摘要\n6. abundant a. 丰富的，充裕的\n7. academic a. 学术的，学院的\n8. accelerate v. 加速，促进',
      tags: ['四六级', '英语', '词汇', 'CET4']
    },
    {
      _id: '16',
      title: 'CET-6 写作万能句型',
      author: '四六级考试',
      dynasty: 'modern',
      content: '1. With the development of..., ...has become increasingly...\n2. There is no doubt that... plays an important role in...\n3. From what has been discussed above, we may safely draw the conclusion that...\n4. Only in this way can we...\n5. It is high time that we took effective measures to...',
      tags: ['四六级', '英语', '写作', 'CET6']
    },
    {
      _id: '17',
      title: '考研英语·核心词汇',
      author: '考研英语',
      dynasty: 'modern',
      content: '1. ambiguous a. 模棱两可的，含糊不清的\n2. compensate v. 补偿，赔偿\n3. deliberate a. 故意的，深思熟虑的\n4. deteriorate v. 恶化，变坏\n5. discrepancy n. 差异，不符\n6. escalate v. 升级，扩大\n7. feasible a. 可行的，可能的\n8. heterogeneous a. 异类的，不同的',
      tags: ['考研', '英语', '词汇']
    },
    // ===== 专升本语文 =====
    {
      _id: '18',
      title: '专升本语文·文学常识',
      author: '专升本考试',
      dynasty: 'modern',
      content: '1. 《诗经》是我国第一部诗歌总集，收录了西周初年至春秋中叶的诗歌305篇。\n2. 《楚辞》是战国时期以屈原为代表的楚国人创作的诗歌总集。\n3. 唐宋八大家：韩愈、柳宗元、欧阳修、苏洵、苏轼、苏辙、王安石、曾巩。\n4. 元曲四大家：关汉卿、白朴、马致远、郑光祖。',
      tags: ['专升本', '语文', '文学常识']
    },
    {
      _id: '19',
      title: '专升本英语·固定搭配',
      author: '专升本考试',
      dynasty: 'modern',
      content: '1. take into account 考虑到，顾及\n2. make use of 利用，使用\n3. catch up with 赶上，追上\n4. get rid of 摆脱，除去\n5. look forward to 盼望，期待\n6. pay attention to 注意，重视\n7. take care of 照顾，照料\n8. put up with 忍受，容忍',
      tags: ['专升本', '英语', '固定搭配']
    }
  ];
}

/**
 * 根据作者推断朝代
 */
function getDynastyFromAuthor(author: string): string {
  const dynastyMap: Record<string, string> = {
    '李白': 'tang',
    '杜甫': 'tang',
    '白居易': 'tang',
    '王维': 'tang',
    '孟浩然': 'tang',
    '王昌龄': 'tang',
    '李商隐': 'tang',
    '杜牧': 'tang',
    '苏轼': 'song',
    '辛弃疾': 'song',
    '李清照': 'song',
    '陆游': 'song',
    '欧阳修': 'song',
    '王安石': 'song',
    '柳宗元': 'tang',
    '韩愈': 'tang',
    '刘禹锡': 'tang',
    '王之涣': 'tang',
    '王勃': 'tang',
    '骆宾王': 'tang',
    '杨炯': 'tang',
    '卢照邻': 'tang'
  };
  
  return dynastyMap[author] || 'unknown';
}

/**
 * 搜索内置诗词（本地数据）
 */
export function searchBuiltinPoetry(keyword: string, dynasty?: string): PoetryData[] {
  const allPoetry = getBuiltinPoetryData();
  
  return allPoetry.filter(poetry => {
    // 按朝代筛选
    if (dynasty && poetry.dynasty !== dynasty) {
      return false;
    }
    
    // 按关键词搜索
    const lowerKeyword = keyword.toLowerCase();
    return (
      poetry.title.includes(keyword) ||
      poetry.author.includes(keyword) ||
      poetry.content.includes(keyword) ||
      poetry.tags.some(tag => tag.includes(keyword))
    );
  });
}
