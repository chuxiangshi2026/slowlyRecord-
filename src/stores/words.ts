import {ref} from "vue";
import type {Word, YdParams} from "@/types/words";
import {defineStore} from "pinia";
import http from "@/utils/http.ts";


export const useWordsStore =
    defineStore('words',
        () => {
            const words = ref<Word[]>([])

            // 创建状态，更新状态
            function updateWords(payload: Word[]) {
                words.value = payload
                // addWord(words)
            }

            function clearWords() {
                words.value = []
            }

            // 异步提交状态，动作
            async function translation(payload: YdParams) {
                return await http.get('/', {...payload})
            }

            return {words, updateWords, clearWords, translation}
        },
        {
            persist: true,
        }
    )
