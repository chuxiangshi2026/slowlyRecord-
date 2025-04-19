<template>


  <div class="list-item">
    <p class="word">
      {{ word.text }}
      <span class="phonetic">{{ word.phonetic }}</span>
    </p>
    <div class="level">
      <i :class="`iconfont icon-level-${word.level}`"></i>
    </div>
    <div class="operate">
      <div>
        <i class="iconfont icon-player iconHover" @click="play"></i>
        <i class="iconfont icon-translate iconHover" @click="translation"></i>
      </div>
      <div>
        <i class="iconfont icon-check iconHover" @click="remember"></i>
        <i class="iconfont icon-close iconHover" @click="forget"></i>
        <i class="iconfont icon-delete iconHover" @click="deleteWord"></i>
      </div>
    </div>
    <div>
      <div class="translation" :hidden="explainedHidden">
        <div class="translate-editable" contenteditable="true">{{ word.explainedInChinese }}</div>
      </div>
      <div class="sentence_wrapper achieve"></div>
    </div>
  </div>


</template>

<script setup lang="ts">
import type {Word} from "@/types/words";
// 接收word传参，并传递给子组件
const props = defineProps<{
  word: Word
}>()

const emit = defineEmits(['translation', 'remember:word', 'forget:word', 'delete:word'])



import {ref} from "vue";


const explainedHidden = ref(true);




// 翻译
const translation = (): boolean => {
  explainedHidden.value = !explainedHidden.value;
  return explainedHidden.value;
}


// 播放语音
const play = () => {

}
// 默认复习间隔（单位：分钟） 0/5 1/30 2/6*60  3/12h    4/1d      5/2           6/4        7/一周        8/半月
const DEFAULT_INTERVALS = [5, 30, 6 * 60, 12 * 60, 24 * 60, 2 * 24 * 60, 4 * 24 * 60, 7 * 24 * 60, 15 * 24 * 60,
  //  9/1个月         10/3个月                11/半年                12/1年
  30 * 24 * 60, 3 * 30 * 24 * 60, 6 * 30 * 24 * 60, 12 * 30 * 24 * 60];


// 记住
const remember = () => {

  //如果 当前时间大于  上次复习时间+当前等级*默认复习间隔 且小于上次复习时间+（当前等级+3）*默认复习间隔  等级+1

  // 当前时间
  const now = new Date().getTime();
  // 开始复习时间 (上次复习时间 + 当前等级对应的默认复习间隔)
  const startReviewTime = props.word.reviewTime.getTime() + DEFAULT_INTERVALS[props.word.level] * 60 * 1000;

  // 结束复习时间 (上次复习时间 + (当前等级 + 3) 对应的默认复习间隔)
  const endReviewTime = props.word.reviewTime.getTime() + DEFAULT_INTERVALS[Math.min(props.word.level + 3, DEFAULT_INTERVALS.length - 1)] * 60 * 1000;

  // 判断是否满足条件
  if (now > startReviewTime && now < endReviewTime) {
    // 等级+1
    props.word.level++;
  } else {
    // 否则等级不变，仅更新复习时间
    console.log("未满足升级条件");
  }

  // 更新复习时间
  props.word.reviewTime = new Date();

  // 是否复习，改为false
  props.word.isReview = false;

  // 发送事件通知父组件
  emit('remember:word', props.word);

  console.log(JSON.stringify(props.word) + '123');
}
// 忘记
const forget = () => {
  props.word.level = props.word.level == 0 ? 0 : props.word.level--; // 重置复习间隔
  console.log(JSON.stringify(props.word) + '1')
}
// 删除单词
const deleteWord = () => {
  emit('delete:word', props.word);
}

</script>

<style scoped lang="scss">

</style>
