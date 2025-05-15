<template>
  <el-card class="detail-section">
    <template #header>
      <div class="card-header">
        <div class="header-left">
          <el-icon><Document /></el-icon>
          <span>比赛明细</span>
        </div>
        <div class="filter-controls">
          <el-select v-model="typeFilter" placeholder="筛选类型" size="small">
            <el-option label="所有类型" value="all" />
            <el-option label="得分" value="score" />
            <el-option label="犯规" value="foul" />
            <el-option label="换人" value="sub" />
          </el-select>
        </div>
      </div>
    </template>
    
    <div class="period-tabs">
      <el-tabs v-model="currentPeriod" type="card">
        <el-tab-pane 
          v-for="period in gameStore.getAllPeriods"
          :key="period"
          :label="`第${period}节`"
          :name="period"
        />
      </el-tabs>
    </div>
    
    <el-empty v-if="!periodDetails.length" description="暂无记录" />
    
    <div v-else class="detail-items">
      <el-timeline>
        <el-timeline-item
          v-for="detail in periodDetails" 
          :key="detail.timestamp"
          :timestamp="formatLocalTime(detail.timestamp)"
          :type="getTimelineType(detail)"
          :color="getTimelineColor(detail)"
        >
          <span v-html="getDetailContent(detail)"></span>
          <el-tag 
            size="small" 
            :type="detail.team === '红队' ? 'danger' : 'primary'"
            class="team-tag"
          >
            {{ detail.team }}
          </el-tag>
        </el-timeline-item>
      </el-timeline>
    </div>
  </el-card>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useGameStore } from '../stores/gameStore';
import { formatLocalTime } from '../utils/formatters';
import { Document } from '@element-plus/icons-vue';

const gameStore = useGameStore();
const typeFilter = ref('all');
const currentPeriod = ref(gameStore.currentDetailPeriod);

// 当前节次的明细
const periodDetails = computed(() => {
  return gameStore.getDetailsByPeriod(currentPeriod.value, typeFilter.value);
});

// 监听全局节次变化
watch(() => gameStore.currentPeriod, (newPeriod) => {
  currentPeriod.value = newPeriod;
});

// 获取明细内容
const getDetailContent = (detail) => {
  switch (detail.type) {
    case 'score':
      return `${detail.number}号 ${detail.player} <span class="score-change">得分 ${detail.value > 0 ? '+' : ''}${detail.value}</span>`;
    case 'foul':
      const foulText = detail.value ? `犯规 (${detail.value > 0 ? '+' : ''}${detail.value})` : '犯规 (+1)';
      return `${detail.number}号 ${detail.player} <span class="foul-change">${foulText}</span>`;
    case 'sub-in':
      return `${detail.number}号 ${detail.player} <span class="sub-in">上场</span>`;
    case 'sub-out':
      return `${detail.number}号 ${detail.player} <span class="sub-out">下场</span>`;
    case 'game-start':
      return `<strong>比赛开始</strong>`;
    case 'game-pause':
      return `<strong>比赛暂停</strong>`;
    case 'period-change':
      return `<strong>第${detail.value}节开始</strong>`;
    case 'player-add':
      return `<strong>添加球员: ${detail.number}号 ${detail.player}</strong>`;
    case 'player-remove':
      return `<strong><span class="player-remove">移除球员: ${detail.number}号 ${detail.player}</span></strong>`;
    default:
      return `${detail.player}: ${detail.type}`;
  }
};

// 获取时间轴类型
const getTimelineType = (detail) => {
  switch (detail.type) {
    case 'score': return 'success';
    case 'foul': return 'warning';
    case 'sub-in': 
    case 'sub-out': return 'info';
    case 'game-start': return 'primary';
    case 'game-pause': return 'danger';
    default: return '';
  }
};

// 获取时间轴颜色
const getTimelineColor = (detail) => {
  switch (detail.type) {
    case 'score': return '#67C23A';
    case 'foul': return '#E6A23C';
    case 'sub-in': return '#909399';
    case 'sub-out': return '#909399';
    case 'game-start': return '#409EFF';
    case 'game-pause': return '#F56C6C';
    case 'period-change': return '#409EFF';
    case 'player-add': return '#67C23A';
    case 'player-remove': return '#F56C6C';
    default: return '';
  }
};
</script>

<style scoped>
.detail-section {
  margin-top: 30px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.team-tag {
  margin-left: 10px;
}

.score-change {
  color: #67C23A;
  font-weight: bold;
}

.foul-change {
  color: #E6A23C;
  font-weight: bold;
}

.sub-in {
  color: #409EFF;
}

.sub-out {
  color: #F56C6C;
}

.player-remove {
  color: #F56C6C;
}

.detail-items {
  padding: 0 10px;
}
</style> 