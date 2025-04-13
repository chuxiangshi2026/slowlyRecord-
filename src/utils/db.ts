import type {Word} from "@/types/words";

// const tableName = 'wordsDoc'

// function getDb() {
//
//     let doc =utools.db.get(tableName)
//     if (doc) {
//         // 修改文档
//         let result   = utools.db.put();
//         if (result.ok) {
//             // 保存成功, 更新文档版本
//             doc._rev = result.rev;
//         } else if (result.error) {
//             // 保存出错，打印错误原因
//             console.log(result.message);
//         }
//     }
//     return doc
// }

function getWordList(): Word[] {
    const docs3 = utools.db.allDocs();
    return dcos3;
}

/*function findWord(word: Word): Word {
    const words = getWordList()
    // const word =words.find(x-> x.word === word)
    return word;
}*/

function addWord(word: Word): void {
    let result = utools.db.put(word);
    if (result.ok) {
        // 保存成功, 更新文档版本
        word._rev = result.rev;
    } else if (result.error) {
        // 保存出错，打印错误原因
        console.log(result.message);
    }

}

/*function showNotification(text: string): void {
    window.utools.showNotification(text);
}*/

// 多端同步时触发
// utools.onDbPull((docs) => {
//     console.log(docs);
// });


// 获取用户信息  昵称与头像
// const user = utools.getUser();
// if (user) {
//     console.log(user);
// }
export {getWordList,addWord};
