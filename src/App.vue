<template>
  <div class="app-container">
    <div class="app-header">
      <h2>篮球比赛统计系统</h2>
      <el-tag
        :type="dbStatus === '数据库已就绪' ? 'success' : 'warning'"
        effect="dark"
        size="small"
        class="db-status"
      >
        {{ dbStatus }}
      </el-tag>
    </div>
    <GameControls />
    <ExportPanel />
    <PlayerManagement />
    <SubstitutionPanel />
    <TeamSection team="红队" :color="'red'" />
    <TeamSection team="黑队" :color="'blue'" />
    <DetailSection />
    <Toast />
  </div>
</template>

<script setup>
import { ref, onMounted, provide } from 'vue';
import { useGameStore } from './stores/gameStore';
import GameControls from './components/GameControls.vue';
import ExportPanel from './components/ExportPanel.vue';
import PlayerManagement from './components/PlayerManagement.vue';
import SubstitutionPanel from './components/SubstitutionPanel.vue';
import TeamSection from './components/TeamSection.vue';
import DetailSection from './components/DetailSection.vue';
import Toast from './components/Toast.vue';

const dbStatus = ref('数据库加载中...');
const gameStore = useGameStore();

provide('dbStatus', dbStatus);

onMounted(async () => {
  try {
    await gameStore.initDB();
    dbStatus.value = '数据库已就绪';
    await gameStore.loadData();
  } catch (error) {
    console.error('初始化失败:', error);
    dbStatus.value = '数据库加载失败';
  }
});
</script>

<style>
@import './assets/main.css';

.app-header {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}

h2 {
  margin: 0;
  margin-right: 10px;
}

.db-status {
  margin-left: 10px;
}
</style>
