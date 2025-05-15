<template>
  <div class="controls">
    <el-button-group>
      <el-button type="success" @click="startGame" :disabled="gameStore.isGameRunning" icon="VideoPlay">
        开始比赛
      </el-button>
      <el-button type="warning" @click="pauseGame" :disabled="!gameStore.isGameRunning" icon="VideoPause">
        暂停比赛
      </el-button>
    </el-button-group>
    
    <el-button-group class="period-controls">
      <el-button @click="prevPeriod" :disabled="gameStore.currentPeriod <= 1" icon="ArrowLeft">
        上一节
      </el-button>
      <el-button @click="nextPeriod" :disabled="gameStore.currentPeriod >= 4" icon="ArrowRight">
        下一节
      </el-button>
    </el-button-group>
    
    <el-button type="danger" @click="clearData" icon="Delete">
      清除所有数据
    </el-button>
    
    <el-tag :type="gameStore.isGameRunning ? 'success' : 'info'" effect="dark" class="status-tag">
      {{ gameStore.gameStatus }}
    </el-tag>
    <el-tag type="primary" effect="plain" class="period-tag">
      当前节次：{{ gameStore.currentPeriod }}
    </el-tag>
  </div>
</template>

<script setup>
import { useGameStore } from '../stores/gameStore';
import { VideoPlay, VideoPause, ArrowLeft, ArrowRight, Delete } from '@element-plus/icons-vue';

const gameStore = useGameStore();

const startGame = () => gameStore.startGame();
const pauseGame = () => gameStore.pauseGame();
const prevPeriod = () => gameStore.prevPeriod();
const nextPeriod = () => gameStore.nextPeriod();
const clearData = () => gameStore.clearData();
</script>

<style scoped>
.controls {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
  flex-wrap: wrap;
  gap: 10px;
}

.period-controls {
  margin: 0 10px;
}

.status-tag, .period-tag {
  margin-left: 10px;
}
</style> 