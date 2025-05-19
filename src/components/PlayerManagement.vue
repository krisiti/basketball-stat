<template>
  <div class="player-management">
    <!-- 球员添加表单 -->
    <el-card class="add-player-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span><el-icon><Plus /></el-icon> 添加球员</span>
        </div>
      </template>
      
      <el-form :model="playerForm" :rules="rules" ref="playerFormRef" @submit.prevent="addPlayer" class="player-form">
        <div class="form-row">
          <el-form-item prop="team" class="form-item team-item">
            <el-select 
            size="large"
              v-model="playerForm.team" 
              placeholder="选择队伍"
              @keyup.enter="submitForm"
            >
              <el-option 
                label="红队" 
                value="红队">
                <template #prefix>
                  <el-icon color="#F56C6C"><Basketball /></el-icon>
                </template>
                红队
              </el-option>
              <el-option 
                label="黑队" 
                value="黑队">
                <template #prefix>
                  <el-icon color="#409EFF"><Basketball /></el-icon>
                </template>
                黑队
              </el-option>
            </el-select>
          </el-form-item>
          
          <el-form-item prop="name" class="form-item name-item">
            <el-input 
              v-model="playerForm.name" 
              placeholder="球员姓名" 
              clearable 
              @keyup.enter="submitForm"
              prefix-icon="User"
            />
          </el-form-item>
          
          <el-form-item prop="number" class="form-item number-item">
            <el-input 
              v-model="playerForm.number" 
              placeholder="号码" 
              clearable
              @keyup.enter="submitForm"
              prefix-icon="InfoFilled"
            />
          </el-form-item>
          
          <el-button 
            type="primary" 
            @click="submitForm" 
            :disabled="!playerForm.name || !playerForm.number || !playerForm.team"
            :loading="isSubmitting"
          >
            <el-icon><Plus /></el-icon> 添加
          </el-button>
        </div>
        
        <el-alert
          v-if="errorMessage"
          :title="errorMessage"
          type="error"
          closable
          show-icon
          class="error-alert"
          @close="errorMessage = ''"
        />
        
        <el-alert
          v-if="successMessage"
          :title="successMessage"
          type="success"
          closable
          show-icon
          class="success-alert"
          @close="successMessage = ''"
        />
      </el-form>
    </el-card>
    
    <!-- 已选球员展示 -->
    <div class="selected-players-container">
      <!-- 红队已选球员 -->
      <el-card class="selected-players-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <span>
              <el-icon color="#F56C6C"><Basketball /></el-icon>
              红队已选球员 ({{ redTeamPlayers.length }})
            </span>
          </div>
        </template>
        
        <el-empty v-if="redTeamPlayers.length === 0" description="暂无已选球员">
          <template #image>
            <el-icon class="empty-icon"><User /></el-icon>
          </template>
        </el-empty>
        
        <div class="player-tags" v-else>
          <el-tag
            v-for="player in redTeamPlayers"
            :key="`red-${player.number}`"
            class="player-tag"
            closable
            :disable-transitions="false"
            type="danger"
            @close="onRemovePlayer(player)"
            effect="light"
          >
            <span class="tag-number">{{ player.number }}</span> {{ player.name }}
          </el-tag>
        </div>
      </el-card>
      
      <!-- 黑队已选球员 -->
      <el-card class="selected-players-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <span>
              <el-icon color="#409EFF"><Basketball /></el-icon>
              黑队已选球员 ({{ blackTeamPlayers.length }})
            </span>
          </div>
        </template>
        
        <el-empty v-if="blackTeamPlayers.length === 0" description="暂无已选球员">
          <template #image>
            <el-icon class="empty-icon"><User /></el-icon>
          </template>
        </el-empty>
        
        <div class="player-tags" v-else>
          <el-tag
            v-for="player in blackTeamPlayers"
            :key="`black-${player.number}`"
            class="player-tag"
            closable
            :disable-transitions="false"
            type="primary"
            @close="onRemovePlayer(player)"
            effect="light"
          >
            <span class="tag-number">{{ player.number }}</span> {{ player.name }}
          </el-tag>
        </div>
      </el-card>
    </div>
    
    <!-- 预设球员池 -->
    <el-card class="player-pool-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span><el-icon><UserFilled /></el-icon> 预设球员池</span>
          <span class="player-count">
            共 {{ gameStore.presetPlayers.length }} 名球员
          </span>
        </div>
      </template>
      
      <el-empty v-if="gameStore.presetPlayers.length === 0" description="没有可用的预设球员">
        <template #image>
          <el-icon class="empty-icon"><User /></el-icon>
        </template>
      </el-empty>
      
      <div class="pool-players" v-else>
        <el-card
          v-for="player in gameStore.presetPlayers" 
          :key="player.id"
          class="player-card"
          :class="{ 'player-card-disabled': isPlayerSelected(player.id) }"
          shadow="hover"
        >
          <div class="player-card-content">
            <div class="player-badge">{{ player.number }}</div>
            <div class="player-name">{{ player.name }}</div>
            <div class="pool-actions">
              <el-tooltip :content="isPlayerSelected(player.id) ? '已选择' : '添加到红队'" placement="top" :show-after="300">
                <el-button 
                  circle
                  size="small" 
                  type="danger" 
                  @click="addPresetPlayer(player.id, '红队')"
                  :disabled="isPlayerSelected(player.id)"
                >
                  <el-icon><Plus v-if="!isPlayerSelected(player.id)" /><Check v-else /></el-icon>
                </el-button>
              </el-tooltip>
              <el-tooltip :content="isPlayerSelected(player.id) ? '已选择' : '添加到黑队'" placement="top" :show-after="300">
                <el-button 
                  circle
                  size="small" 
                  type="primary" 
                  @click="addPresetPlayer(player.id, '黑队')"
                  :disabled="isPlayerSelected(player.id)"
                >
                  <el-icon><Plus v-if="!isPlayerSelected(player.id)" /><Check v-else /></el-icon>
                </el-button>
              </el-tooltip>
            </div>
          </div>
        </el-card>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';
import { useGameStore } from '../stores/gameStore';
import { useToastStore } from '../stores/toastStore';
import { User, UserFilled, Plus, Basketball, InfoFilled, Delete, Check } from '@element-plus/icons-vue';

const gameStore = useGameStore();
const toastStore = useToastStore();

const playerFormRef = ref(null);
const isSubmitting = ref(false);
const errorMessage = ref('');
const successMessage = ref('');

const playerForm = reactive({
  name: '',
  number: '',
  team: '红队'
});

// 计算属性：获取红队球员
const redTeamPlayers = computed(() => {
  return gameStore.players.filter(player => player.team === '红队')
    .sort((a, b) => (Number(a.number) || 0) - (Number(b.number) || 0));
});

// 计算属性：获取黑队球员
const blackTeamPlayers = computed(() => {
  return gameStore.players.filter(player => player.team === '黑队')
    .sort((a, b) => (Number(a.number) || 0) - (Number(b.number) || 0));
});

const rules = {
  name: [
    { required: true, message: '请输入球员姓名', trigger: 'blur' },
    { min: 1, max: 20, message: '长度在 1 到 20 个字符', trigger: 'blur' }
  ],
  number: [
    { required: true, message: '请输入球员号码', trigger: 'blur' },
    { pattern: /^[0-9]{1,2}$/, message: '请输入0-99之间的号码', trigger: 'blur' }
  ],
  team: [
    { required: true, message: '请选择队伍', trigger: 'change' }
  ]
};

const submitForm = () => {
  if (playerFormRef.value) {
    playerFormRef.value.validate(async (valid) => {
      if (valid) {
        await addPlayer();
      }
    });
  } else {
    addPlayer();
  }
};

const addPlayer = async () => {
  if (!playerForm.name.trim() || !playerForm.number.trim() || !playerForm.team) {
    errorMessage.value = '请输入姓名、号码和队伍！';
    return;
  }

  isSubmitting.value = true;
  errorMessage.value = '';
  successMessage.value = '';

  try {
    const result = await gameStore.addPlayer(
      playerForm.name.trim(),
      playerForm.number.trim(),
      playerForm.team
    );

    if (result.success) {
      playerForm.name = '';
      playerForm.number = '';
      // 保留所选队伍不重置
      successMessage.value = `已添加 ${playerForm.team} 队员: ${result.player?.name || ''}`;
      toastStore.success(successMessage.value);
      
      // 延迟关闭成功消息
      setTimeout(() => {
        successMessage.value = '';
      }, 3000);
    } else {
      errorMessage.value = result.message;
    }
  } catch (error) {
    errorMessage.value = '添加球员失败: ' + (error.message || '未知错误');
  } finally {
    isSubmitting.value = false;
  }
};

const addPresetPlayer = async (presetId, team) => {
  errorMessage.value = '';
  successMessage.value = '';
  
  try {
    const result = await gameStore.addPresetPlayer(presetId, team);
    if (!result.success) {
      errorMessage.value = result.message;
      toastStore.error(result.message);
    } else {
      successMessage.value = `已添加 ${team} 预设队员: ${result.player?.name || ''}`;
      toastStore.success(successMessage.value);
      
      // 延迟关闭成功消息
      setTimeout(() => {
        successMessage.value = '';
      }, 3000);
    }
  } catch (error) {
    errorMessage.value = '添加预设球员失败: ' + (error.message || '未知错误');
    toastStore.error(errorMessage.value);
  }
};

// 移除球员
const onRemovePlayer = async (player) => {
  try {
    await gameStore.removePlayer(player);
  } catch (error) {
    errorMessage.value = '移除球员失败: ' + (error.message || '未知错误');
    toastStore.error(errorMessage.value);
  }
};

const isPlayerSelected = (presetId) => {
  return gameStore.players.some(player => player.presetId === presetId);
};
</script>

<style scoped>
.player-management {
  margin-bottom: 20px;
}

.add-player-card, .player-pool-card, .selected-players-card {
  margin-bottom: 15px;
  border-radius: 8px;
  transition: all 0.3s;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 5px;
}

.player-form {
  width: 100%;
}

.form-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.form-item {
  margin-bottom: 0;
}

.team-item, .name-item, .number-item {
  width: 200px;
  flex: 0 0 auto;
}

.team-item {
  width: 100px;
  flex: 0 0 auto;
}

.team-item :deep(.el-select) {
  width: 100%;
}

.team-item :deep(.el-input__wrapper) {
  box-sizing: border-box;
  height: 40px;
  line-height: 40px;
}

.form-row :deep(.el-input__wrapper),
.form-row :deep(.el-select .el-input__wrapper) {
  height: 40px;
  line-height: 40px;
  padding: 0 11px;
}

.error-alert, .success-alert {
  margin-top: 15px;
  border-radius: 4px;
}

.player-count {
  font-size: 0.9em;
  color: #909399;
}

.pool-players {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 15px;
  margin-top: 10px;
}

.player-card {
  transition: all 0.3s;
  border: 1px solid #EBEEF5;
}

.player-card-disabled {
  opacity: 0.6;
  background-color: #f8f8f8;
}

.player-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.1);
}

.player-card-disabled:hover {
  transform: none;
  box-shadow: none;
}

.player-card-content {
  display: flex;
  align-items: center;
  gap: 10px;
}

.player-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  background-color: #F2F6FC;
  border-radius: 50%;
  font-weight: bold;
  color: #606266;
}

.player-name {
  flex: 1;
  white-space: nowrap;
  font-weight: 500;
}

.pool-actions {
  display: flex;
  margin-left: auto;
}

.empty-icon {
  font-size: 40px;
  color: #C0C4CC;
}

/* 已选球员展示区样式 */
.selected-players-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
  margin-bottom: 15px;
}

.player-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 5px;
}

.player-tag {
  margin-right: 0;
  margin-bottom: 0;
  font-size: 14px;
  padding: 6px 10px;
  display: flex;
  align-items: center;
}

.tag-number {
  font-weight: bold;
  margin-right: 5px;
  font-size: 1em;
  color: inherit;
  opacity: 0.8;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .form-row {
    flex-direction: column;
  }
  
  .name-item, .number-item, .team-item {
    width: 100%;
  }
  
  .pool-players {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  }
  
  .selected-players-container {
    grid-template-columns: 1fr;
  }
}
</style> 