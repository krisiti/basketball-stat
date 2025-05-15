<template>
  <el-card class="team-section" :class="color === 'red' ? 'red-team' : 'blue-team'">
    <template #header>
      <div class="section-title">
        <h3>
          {{ team }} 
          <el-tag :type="color === 'red' ? 'danger' : 'primary'" size="large" class="score-tag">
            {{ teamScore }}
          </el-tag> 
          <el-tag type="warning" size="small" class="foul-tag">
            本节犯规：{{ teamFouls }}
          </el-tag>
        </h3>
        <el-button 
          :type="isExpanded ? 'info' : 'primary'" 
          size="small" 
          @click="toggleTeam"
        >
          <el-icon>
            <arrow-up v-if="isExpanded" />
            <arrow-down v-else />
          </el-icon>
          {{ isExpanded ? '收起' : '展开' }}
        </el-button>
      </div>
    </template>
    
    <el-table 
      :data="teamPlayers" 
      stripe 
      style="width: 100%"
      :row-class-name="getRowClass"
      v-loading="!teamPlayers.length"
      class="responsive-table"
    >
      <el-table-column prop="number" label="号码" sortable min-width="60" width="auto" />
      <el-table-column prop="name" label="球员" min-width="80" width="auto" />
      <el-table-column label="状态" min-width="80" width="auto">
        <template #default="scope">
          <el-tag :type="getStatusType(scope.row)" size="small">
            {{ getPlayerStatus(scope.row) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="当前上场" min-width="80" width="auto" class-name="hide-on-small">
        <template #default="scope">
          {{ formatTime(scope.row.currentTime) }}
        </template>
      </el-table-column>
      <el-table-column label="总上场" min-width="80" width="auto" class-name="hide-on-small">
        <template #default="scope">
          {{ formatTime(scope.row.totalTime + scope.row.currentTime) }}
        </template>
      </el-table-column>
      <el-table-column label="得分" min-width="150" width="auto">
        <template #default="scope">
          <div class="score-actions">
            <span class="score">{{ scope.row.score }}</span>
            <el-button-group>
              <el-button 
                size="small" 
                @click="updateScore(scope.row, -1)" 
                :disabled="scope.row.score <= 0"
                type="danger"
              >-1</el-button>
              <el-button size="small" @click="updateScore(scope.row, 1)" type="success">+1</el-button>
              <el-button size="small" @click="updateScore(scope.row, 2)" type="success">+2</el-button>
              <el-button size="small" @click="updateScore(scope.row, 3)" type="success">+3</el-button>
            </el-button-group>
            <el-button 
              @click="showScoreDetails(scope.row)" 
              circle
              size="small"
              type="info"
              class="hide-on-small"
            >
              <el-icon><list /></el-icon>
            </el-button>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="犯规" min-width="100" width="auto">
        <template #default="scope">
          <div class="foul-actions">
            <span class="fouls">{{ scope.row.fouls }}</span>
            <el-button-group>
              <el-button 
                type="warning" 
                size="small" 
                @click="addFoul(scope.row, -1)" 
                :disabled="scope.row.fouls <= 0"
              >-P</el-button>
              <el-button 
                type="warning" 
                size="small" 
                @click="addFoul(scope.row, 1)"
              >+P</el-button>
            </el-button-group>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="正负值" min-width="70" width="auto" class-name="hide-on-small">
        <template #default="scope">
          <el-tag 
            :type="scope.row.plusMinus > 0 ? 'success' : scope.row.plusMinus < 0 ? 'danger' : 'info'"
            effect="plain"
          >
            {{ scope.row.plusMinus }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" min-width="60" width="auto">
        <template #default="scope">
          <el-button 
            type="danger" 
            size="small" 
            @click="removePlayer(scope.row)"
            circle
          >
            <el-icon><delete /></el-icon>
          </el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
  
  <!-- Score Details Dialog -->
  <el-dialog
    v-model="showModal"
    :title="`${selectedPlayer.team || ''} ${selectedPlayer.number || ''}号 ${selectedPlayer.name || ''} 得分明细`"
    width="90%"
    max-width="500px"
  >
    <el-empty v-if="!scoreDetails" description="暂无得分记录" />
    <pre v-else>{{ scoreDetails }}</pre>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="showModal = false">关闭</el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useGameStore } from '../stores/gameStore';
import { useToastStore } from '../stores/toastStore';
import { formatTime, formatLocalTime } from '../utils/formatters';
import { ArrowUp, ArrowDown, List, Delete } from '@element-plus/icons-vue';

const props = defineProps({
  team: {
    type: String,
    required: true
  },
  color: {
    type: String,
    required: true
  }
});

const gameStore = useGameStore();
const toastStore = useToastStore();

const isExpanded = computed(() => gameStore.teamExpanded[props.color]);
const teamScore = computed(() => gameStore.teamScores[props.team]);
const teamFouls = computed(() => gameStore.teamFouls[props.team][gameStore.currentPeriod] || 0);

const teamPlayers = computed(() => {
  // 先获取所有球员
  const allTeamPlayers = gameStore.getPlayersForTeam(props.team);
  
  // 如果没有展开，只显示上场球员
  if (!isExpanded.value) {
    return allTeamPlayers.filter(p => p.isPlaying);
  }
  return allTeamPlayers;
});

// 得分明细模态框相关
const showModal = ref(false);
const selectedPlayer = ref({});
const scoreDetails = ref('');

// 获取行的类名
const getRowClass = ({row}) => {
  return row.isPlaying ? 'playing-row' : '';
};

// 获取状态标签类型
const getStatusType = (player) => {
  if (player.isPlaying) {
    return gameStore.isGameRunning ? 'success' : 'warning';
  }
  return 'info';
};

// 获取球员状态文本
const getPlayerStatus = (player) => {
  if (player.isPlaying) {
    return gameStore.isGameRunning ? '上场中' : '暂停中';
  }
  return '已下场';
};

// 切换队伍展开/收起
const toggleTeam = () => {
  gameStore.toggleTeam(props.color);
};

// 更新得分
const updateScore = async (player, points) => {
  const message = `${player.team} ${player.number}号${player.name} ${points > 0 ? `得分 +${points}` : `得分 -1`}`;
  const result = await gameStore.updateScore(player, points);
  if (result) {
    toastStore.success(message);
  }
};

// 添加犯规
const addFoul = async (player, value) => {
  const message = `${player.team} ${player.number}号${player.name} 犯规 ${value > 0 ? '+1' : '-1'}`;
  const result = await gameStore.addFoul(player, value);
  if (result) {
    toastStore.warning(message);
  }
};

// 移除球员
const removePlayer = (player) => {
  gameStore.removePlayer(player);
};

// 显示得分明细
const showScoreDetails = (player) => {
  selectedPlayer.value = player;
  
  const details = gameStore.gameDetails
    .filter(d => d.type === 'score' && d.number === player.number && d.team === player.team)
    .sort((a, b) => b.timestamp - a.timestamp);
    
  if (details.length > 0) {
    scoreDetails.value = details.map(d => 
      `第${d.period}节 ${formatLocalTime(d.timestamp)}: +${d.value}分`
    ).join('\n');
  } else {
    scoreDetails.value = '';
  }
  
  showModal.value = true;
};
</script>

<style scoped>
.team-section {
  margin-bottom: 20px;
  width: 100%;
}

.red-team :deep(.el-card__header) {
  background-color: #fef0f0;
}

.blue-team :deep(.el-card__header) {
  background-color: #ecf5ff;
}

.section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

h3 {
  margin: 0;
  display: flex;
  align-items: center;
}

.score-tag {
  margin: 0 10px;
  font-size: 1.3em;
}

.foul-tag {
  font-size: 0.8em;
}

.score-actions, .foul-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.score, .fouls {
  font-weight: bold;
  min-width: 25px;
  text-align: center;
}

:deep(.playing-row) {
  background-color: #f0f9eb;
}

.responsive-table {
  overflow-x: auto;
}

/* 响应式调整 */
@media screen and (max-width: 1200px) {
  .el-table {
    font-size: 12px;
  }
  
  :deep(.el-button--small) {
    padding: 5px 10px;
    font-size: 11px;
  }
  
  .score-actions, .foul-actions {
    gap: 4px;
  }
}

@media screen and (max-width: 768px) {
  .el-table {
    font-size: 11px;
  }
  
  :deep(.el-button--small) {
    padding: 3px 6px;
    font-size: 10px;
  }
  
  :deep(.hide-on-small) {
    display: none;
  }
  
  .section-title h3 {
    font-size: 14px;
  }
  
  .score-tag {
    margin: 0 5px;
    font-size: 1.1em;
  }
}
</style> 