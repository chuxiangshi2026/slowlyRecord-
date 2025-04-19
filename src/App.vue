<template>
  <RouterView/>
</template>


<script setup lang="ts">
import {RouterView} from 'vue-router'

import {onMounted, ref} from 'vue';
import {useWordsStore} from "@/stores/words.ts";
import {storeToRefs} from "pinia";
import {DEFAULT_INTERVALS} from "@/constants";

const wordsStore = useWordsStore();
const {words} = storeToRefs(wordsStore)


onMounted(() => {

  // 首页刷新时触发   自动更新需要复习的单词
  updateReview();



  window.utools.onPluginEnter(async (action: PluginEnterAction) => {


    // 进行计算，哪些是需要  记的改成true
    // 进入插件时触发
    // 把所有的单词时间计算一下，修改一下是否显示
    /*   for (const item of words.value) {
         console.log(JSON.stringify(item) + '0000000000');
         item.isReview = true
       }*/
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

  //更新需要复习的单词
  function updateReview() {
    // console.log(words.value, typeof words.value[0].reviewTime, '9999999')
    for (const item of words.value) {
      // item.isReview = true
      // console.log(item)
      item.reviewTime = new Date(item.reviewTime)
      item.creatTime = new Date(item.creatTime)
      let reviewTime = item.reviewTime.getTime() + DEFAULT_INTERVALS[item.level] * 60 * 1000;
      let now = Date.now();
      // console.log(now, reviewTime, '00000111111', item.isReview)
      if (!item.isReview && now > reviewTime) {
        item.isReview = true
        wordsStore.updateWord(item)
      }
    }
  }
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
