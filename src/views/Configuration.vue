<template>
  <div class="config-container">
    <div class="config-header">
      <div class="header-content">
        <h2>系统配置</h2>
      </div>
      <div class="header-actions">
        <el-button size="small" type="primary" @click="goBack">返回主页</el-button>
      </div>
    </div>
    
    <div class="config-content">
      <PlayerManagement />
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';
import PlayerManagement from '../components/PlayerManagement.vue';

const router = useRouter();

const goBack = () => {
  router.push('/dashboard');
};
</script>

<style scoped>
.config-container {
  padding: 20px;
}

.config-header {
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

.config-content {
  /* Configuration content styles */
}
</style> 