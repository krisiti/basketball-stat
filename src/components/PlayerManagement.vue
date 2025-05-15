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
    
    <!-- 预设球员池 -->
    <el-card class="player-pool-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span><el-icon><UserFilled /></el-icon> 预设球员池</span>
          <span class="player-count" v-if="gameStore.availablePresetPlayers.length > 0">
            共 {{ gameStore.availablePresetPlayers.length }} 名球员
          </span>
        </div>
      </template>
      
      <el-empty v-if="gameStore.availablePresetPlayers.length === 0" description="没有可用的预设球员">
        <template #image>
          <el-icon class="empty-icon"><User /></el-icon>
        </template>
      </el-empty>
      
      <div class="pool-players" v-else>
        <el-card
          v-for="player in gameStore.availablePresetPlayers" 
          :key="player.id"
          class="player-card"
          shadow="hover"
        >
          <div class="player-card-content">
            <div class="player-badge">{{ player.number }}</div>
            <div class="player-name">{{ player.name }}</div>
            <div class="pool-actions">
              <el-tooltip content="添加到红队" placement="top" :show-after="300">
                <el-button 
                  circle
                  size="small" 
                  type="danger" 
                  @click="addPresetPlayer(player.id, '红队')"
                >
                  <el-icon><Plus /></el-icon>
                </el-button>
              </el-tooltip>
              <el-tooltip content="添加到黑队" placement="top" :show-after="300">
                <el-button 
                  circle
                  size="small" 
                  type="primary" 
                  @click="addPresetPlayer(player.id, '黑队')"
                >
                  <el-icon><Plus /></el-icon>
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
import { ref, reactive } from 'vue';
import { useGameStore } from '../stores/gameStore';
import { useToastStore } from '../stores/toastStore';
import { User, UserFilled, Plus, Basketball, InfoFilled } from '@element-plus/icons-vue';

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
</script>

<style scoped>
.player-management {
  margin-bottom: 20px;
}

.add-player-card, .player-pool-card {
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

.player-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.1);
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
}
</style> 