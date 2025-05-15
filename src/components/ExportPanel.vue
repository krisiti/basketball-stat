<template>
  <div class="export-buttons">
    <el-button type="primary" @click="exportDB" icon="Download">导出原始数据库</el-button>
    <el-button type="success" @click="exportExcel" icon="Document">导出Excel数据</el-button>
    <input type="file" ref="fileInput" style="display: none" accept=".json" @change="handleFileImport" />
    <el-button type="info" @click="triggerImportDB" icon="Upload">导入数据库</el-button>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useGameStore } from '../stores/gameStore';
import { useToastStore } from '../stores/toastStore';
import { formatTime, formatLocalTime, formatGameTime } from '../utils/formatters';
import { Download, Document, Upload } from '@element-plus/icons-vue';
import * as XLSX from 'xlsx';

const gameStore = useGameStore();
const toastStore = useToastStore();
const fileInput = ref(null);

// 导出Excel数据
const exportExcel = () => {
  try {
    // 创建工作簿
    const wb = XLSX.utils.book_new();

    // 1. 添加球员数据表
    const playerData = gameStore.players.map(p => ({
      球队: p.team,
      号码: p.number,
      姓名: p.name,
      状态: p.isPlaying ? (gameStore.isGameRunning ? '上场中' : '暂停中') : '已下场',
      当前上场时间: formatTime(p.currentTime),
      总上场时间: formatTime(p.totalTime + p.currentTime),
      得分: p.score,
      犯规: p.fouls,
      正负值: p.plusMinus
    }));

    const playerWs = XLSX.utils.json_to_sheet(playerData);
    XLSX.utils.book_append_sheet(wb, playerWs, "球员数据");

    // 2. 添加比赛统计表
    const gameStats = [
      { 球队: '红队', 得分: gameStore.teamScores['红队'], 犯规: gameStore.teamFouls['红队'][gameStore.currentPeriod] || 0 },
      { 球队: '黑队', 得分: gameStore.teamScores['黑队'], 犯规: gameStore.teamFouls['黑队'][gameStore.currentPeriod] || 0 }
    ];
    const statsWs = XLSX.utils.json_to_sheet(gameStats);
    XLSX.utils.book_append_sheet(wb, statsWs, "比赛统计");

    // 3. 添加比赛明细表
    const detailData = gameStore.gameDetails.map(d => ({
      时间: formatLocalTime(d.timestamp),
      节次: d.period,
      比赛时间: formatGameTime(d.gameTime),
      球队: d.team,
      球员号码: d.number,
      球员姓名: d.player,
      事件类型: gameStore.getEventTypeName(d.type),
      数值: d.value || ''
    }));

    const detailWs = XLSX.utils.json_to_sheet(detailData);
    XLSX.utils.book_append_sheet(wb, detailWs, "比赛明细");

    // 导出Excel文件
    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `篮球比赛数据_${dateStr}.xlsx`);
    toastStore.success('Excel导出成功');
  } catch (error) {
    console.error('导出Excel失败:', error);
    toastStore.error('导出Excel失败: ' + error.message);
  }
};

// 导出数据库
const exportDB = async () => {
  try {
    // 从存储中获取数据
    await gameStore.saveData(); // 确保先保存最新数据
    
    // 模拟IndexedDB事务，将数据库中的内容提取出来
    const db = await window.indexedDB.open('BasketballStatsDB', 6);
    
    db.onsuccess = function(event) {
      const database = event.target.result;
      const transaction = database.transaction(['gameData', 'gameDetails'], 'readonly');
      const gameStore = transaction.objectStore('gameData');
      const detailStore = transaction.objectStore('gameDetails');
      
      const gameRequest = gameStore.getAll();
      const detailRequest = detailStore.getAll();
      
      gameRequest.onsuccess = function() {
        const gameData = gameRequest.result;
        
        detailRequest.onsuccess = function() {
          const detailData = detailRequest.result;
          
          const data = {
            game: gameData,
            details: detailData
          };
          
          // 创建并下载文件
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `basketball_stats_${new Date().toISOString().slice(0, 10)}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          toastStore.success('数据库导出成功');
        };
      };
    };
  } catch (error) {
    console.error('导出数据库失败:', error);
    toastStore.error('导出数据库失败: ' + error.message);
  }
};

// 触发文件选择对话框
const triggerImportDB = () => {
  fileInput.value.click();
};

// 处理文件导入
const handleFileImport = async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  
  try {
    const result = await gameStore.importDB(file);
    toastStore.success(result);
  } catch (error) {
    toastStore.error('导入失败: ' + error.message);
  }
  
  // 重置文件输入，以便于再次选择同一文件
  fileInput.value.value = '';
};
</script>

<style scoped>
.export-buttons {
  margin: 20px 0;
  display: flex;
  gap: 10px;
}
</style> 