export interface Word {
    _id?: string,
    _rev?:string,
    // 单词|文本
    text?: string,
    // 是否是单词
    isWord?: boolean
    // 创建时间
    creatTime?: String
    // 上次复习时间
    reviewTime?: String
    // 更新时间
    updateTime?: String
    // 中文解释
    explainedInChinese: string
    // 等级
    level?: number | 'done'
    // 图片
    image?: string
    // 发音
    pronunciation: string,
    // 音标
    phonetic?: string
}

interface YdParams {
    //待翻译文本
    q: string
    // 应用ID	True	可在应用管理 查看
    appKey: string,
    // 随机字符串，可使用UUID进行生产	True
    salt: number,
    // 源语言
    from: string,
    // 目标语言
    to: string,
    // 签名	True	sha256(应用ID+input+salt+curtime+应用密钥)
    sign: string,
    // 签名类型
    signType: string,
    // 当前UTC时间戳(秒)
    curtime: number,
    // 用户上传的术语表
    // vocabId: vocabId,
}
