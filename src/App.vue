<template>
  <RouterView/>
</template>


<script setup lang="ts">
import {RouterView} from 'vue-router'

import {onMounted, ref} from 'vue';
import {useWordsStore} from "@/stores/words.ts";
import {storeToRefs} from "pinia";

const wordsStore = useWordsStore();
const {words} = storeToRefs(wordsStore)

// 默认复习间隔（单位：分钟） 0/5 1/30 2/6*60  3/12h    4/1d      5/2           6/4        7/一周        8/半月
const DEFAULT_INTERVALS = [5, 30, 6 * 60, 12 * 60, 24 * 60, 2 * 24 * 60, 4 * 24 * 60, 7 * 24 * 60, 15 * 24 * 60,
  //  9/1个月         10/3个月                11/半年                12/1年
  30 * 24 * 60, 3 * 30 * 24 * 60, 6 * 30 * 24 * 60, 12 * 30 * 24 * 60];


onMounted(() => {


  console.log('1234241')


  window.utools.onPluginEnter(async (action: PluginEnterAction) => {

    console.log('9999')
    // 进行计算，哪些是需要  记的改成true
    // 进入插件时触发
    // 把所有的单词时间计算一下，修改一下是否显示
    for (const item of words.value) {
      console.log(JSON.stringify(item) + '0000000000');
      item.isReview = true
    }
    /*words.value.forEach((item) => {
      // 如果  当前时间>  上次复习时间+数组[等级]
      /!*if (Date.now() > item.reviewTime.getTime() + DEFAULT_INTERVALS[item.level]) {
        item.isReview = true
      }*!/
      item.isReview = true
      // item.
    })*/

    // app版本
    const currentVerson = window.services.getAppVerson()
    // 数据库版本
    const previousVerson = window.services.wordModel.getAppVersionFromDb()
    // 有返回false   null返回ture
    let b = !previousVerson?.version;
    if (
        //   ?.  链式调用，空返回 undef
        b ||
        currentVerson !== previousVerson?.version
    ) {
      // 没有版本或版本不一致   指定为最新版本
      window.services.wordModel.setAppVerson(currentVerson)
      // 显示更新通知
      // dispatch(updateshowNotification(true))
      console.log('新版，更新version', currentVerson)
    }


    // await initUtoolSetting()

    // if (action.code === 'add vocabulary') {
    //   handlePluginAddWord(action)
    // }

    // if (action.code === 'review') {
    //   handlePluginReview()
    // }
  })
  /*  const initUtoolSetting = () => {
      return new Promise((resolve) => {
        let setting = window.services.wordModel.getUtoolsSetting()
        if (!setting) {
          setting = initialUtoolState
          window.services.wordModel.setUtoolsSetting(setting)
        }
        // dispatch(setUtoolSetting(setting)) // 同步到redux
        console.log('UtoolSetting', setting)
        utoolsSettingRef.current = setting
        resolve(setting)
      })
    }*/

  /*utools.onPluginEnter((action) => {
    console.log(JSON.stringify(action))
    route.value = action.code
    enterAction.value = action
    // { code, type, payload, option, from }


    // app版本
    // const currentVerson = window.services.getAppVerson()
    // 数据库版本
    // const previousVerson = window.services.wordModel.getAppVersionFromDb()

    // 添加单词
    if (action.code === 'add vocabulary') {
      // addWord(action.payload)

    }
    // 复习单词

    // if (action.code === 'review') {
    //   getWordList()
    // }
  })*/


  // 退出插件时触发
  /*  window.utools.onPluginOut((isKill) => {
      route.value = ''
    })*/


});


</script>


<style lang="scss">
//scoped
@use '@/assets/styles/reset.scss';
@use '@/assets/styles/common.scss';

@use '@/assets/styles/card-item.scss';
@use '@/assets/styles/index.scss';
@use '@/assets/styles/letter.scss';
@use '@/assets/styles/list-item.scss';
@import '@/assets/icons/iconfont.css';
@import '@/assets/styles/iconfont1.scss';

</style>
