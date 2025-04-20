import type {Word} from "@/types/words";

export const testData:Word[]= [{
  _id: '1', // 添加 _id
  _rev: '1', // 添加 _rev
  // 是否需要复习
  isReview: true,
  text: 'abandon',
  // isWord: true,
  creatTime: new Date(),
  reviewTime: new Date(),
  // updateTime: '2023-01-03',
  explainedInChinese: '放弃',
  explainedHidden: false,
  level: 0,
  image: 'https://www.baidu.com/img/flexible/logo/pc/result.png',
  pronunciation: 'https://fanyi.baidu.com/gettts?lan=en&text=abandon&spd=3&source=web',
  phonetic: '[əˈbændən]'
}, {
  _id: '2', // 添加 _id
  _rev: '2', // 添加 _rev
  isReview: true,
  text: 'book',
  // isWord: true,
  creatTime: new Date(),
  reviewTime: new Date(),
  // updateTime: '2023-01-03',
  explainedInChinese: '书',
  explainedHidden: false,
  level: 0,
  image: 'https://www.baidu.com/img/flexible/logo/pc/result.png',
  pronunciation: 'https://fanyi.baidu.com/gettts?lan=en&text=abandon&spd=3&source=web',
  phonetic: '[əˈbændən]'
}]
