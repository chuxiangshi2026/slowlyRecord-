import http from '@/utils/http';
import {defineStore} from "pinia";



export const useNewsStore =
    defineStore('news', () => {

        async function login() {
            return await http.post('/users/login')
        }

        return {login}
    })
