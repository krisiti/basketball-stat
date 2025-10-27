<template>
  <div class="dashboard-container">
    <div class="dashboard-header">
      <div class="header-content">
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
      <div class="header-actions">
        <el-button size="small" type="primary" @click="goToConfig">
          <el-icon><Setting /></el-icon> 球员配置
        </el-button>
        <el-button size="small" type="danger" @click="logout">退出登录</el-button>
      </div>
    </div>
    <div class="app-content">
      <GameControls />
      <ExportPanel />
      <SubstitutionPanel />
      <TeamSection team="红队" :color="'red'" />
      <TeamSection team="黑队" :color="'blue'" />
      <ScoreDifferenceChart />
      <DetailSection />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, provide } from 'vue';
import { useRouter } from 'vue-router';
import { useGameStore } from '../stores/gameStore';
import GameControls from '../components/GameControls.vue';
import ExportPanel from '../components/ExportPanel.vue';
import SubstitutionPanel from '../components/SubstitutionPanel.vue';
import TeamSection from '../components/TeamSection.vue';
import ScoreDifferenceChart from '../components/ScoreDifferenceChart.vue';
import DetailSection from '../components/DetailSection.vue';
import { Setting } from '@element-plus/icons-vue';

const router = useRouter();
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

const goToConfig = () => {
  router.push('/configuration');
}

const logout = () => {
  localStorage.removeItem('isAuthenticated');
  router.push('/login');
}
</script>

<style scoped>
.dashboard-container {
  padding: 20px;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header-content {
  display: flex;
  align-items: center;
}

h2 {
  margin: 0;
  margin-right: 10px;
}

.db-status {
  margin-left: 10px;
}
</style> 