<template>
  <view class="wordbank-container">
    <view class="header">
      <text class="title">词库管理</text>
      <text class="subtitle">下载权威词库，高效备考</text>
    </view>
    <view class="section-list">
      <view class="section-item" @click="goTo('basic')">
        <view class="section-info">
          <text class="section-name">基础词库</text>
          <text class="section-desc">四六级、专四专八、雅思、托福等</text>
        </view>
        <text class="arrow">›</text>
      </view>
      <view class="section-item" @click="goTo('advanced')">
        <view class="section-info">
          <text class="section-name">进阶词库</text>
          <text class="section-desc">专八、考研、GMAT等</text>
        </view>
        <text class="arrow">›</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
const goTo = (type: 'basic' | 'advanced') => {
  const url = type === 'basic'
    ? '/subPackages/wordbank-b/wordbankB'
    : '/subPackages/wordbank-a/wordbankA'
  uni.navigateTo({ url })
}
</script>

<style scoped>
.wordbank-container { min-height: 100vh; background: #f5f5f5; }
.header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 60rpx 40rpx; text-align: center; }
.title { font-size: 40rpx; font-weight: bold; color: #fff; display: block; }
.subtitle { font-size: 26rpx; color: rgba(255,255,255,0.8); margin-top: 10rpx; display: block; }
.section-list { padding: 20rpx; }
.section-item { background: #fff; border-radius: 16rpx; padding: 36rpx 30rpx; margin-bottom: 16rpx; display: flex; justify-content: space-between; align-items: center; }
.section-info { flex: 1; }
.section-name { font-size: 34rpx; font-weight: bold; color: #333; display: block; }
.section-desc { font-size: 24rpx; color: #999; margin-top: 8rpx; display: block; }
.arrow { font-size: 40rpx; color: #ccc; }
</style>
