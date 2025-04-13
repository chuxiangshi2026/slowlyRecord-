import {defineStore} from 'pinia'

import http from '@/utils/http';


export const useChecksStore =
    defineStore('checks', () => {

        async function login() {
            return await http.post('/users/login')
        }

        return {login}
    })

