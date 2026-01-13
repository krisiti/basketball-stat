<template>
  <div class="annual-stats-page">
    <el-container>
      <el-header height="60px" class="page-header">
        <h1>年度技术统计</h1>
        <div class="header-actions">
          <el-button 
            size="small"
            @click="goBack"
          >
            返回主页
          </el-button>
          <el-select 
            v-model="selectedYear" 
            placeholder="选择年份" 
            @change="handleYearChange"
            style="width: 150px; margin-right: 10px;"
          >
            <el-option
              v-for="year in availableYears"
              :key="year"
              :label="`${year}年`"
              :value="year"
            />
          </el-select>
          <el-button 
            type="primary" 
            :loading="store.loading"
            @click="refreshData"
            :icon="RefreshIcon"
          >
            刷新数据
          </el-button>
          <el-button 
            type="warning"
            @click="clearCache"
            :icon="DeleteIcon"
          >
            清除缓存
          </el-button>
        </div>
      </el-header>

      <el-main class="stats-main">
        <!-- 加载状态 -->
        <div v-if="store.loading" class="loading-container">
          <el-icon class="is-loading" :size="50">
            <Loading />
          </el-icon>
          <p>正在加载 {{ selectedYear }} 年数据...</p>
        </div>

        <!-- 数据展示 -->
        <div v-else-if="store.playerAnnualStats.length > 0">
          <!-- 统计概览 -->
          <el-card class="summary-card" shadow="hover">
            <template #header>
              <div class="card-header">
                <span>数据概览</span>
                <el-tag type="success">{{ selectedYear }}年</el-tag>
              </div>
            </template>
            <el-row :gutter="20">
              <el-col :xs="12" :sm="12" :md="12">
                <div class="stat-item">
                  <div class="stat-label">比赛场次</div>
                  <div class="stat-value">{{ store.totalGames }}</div>
                </div>
              </el-col>
              <el-col :xs="12" :sm="12" :md="12">
                <div class="stat-item">
                  <div class="stat-label">参与球员</div>
                  <div class="stat-value">{{ store.playerAnnualStats.length }}</div>
                </div>
              </el-col>
            </el-row>
          </el-card>

          <!-- 球员统计表格 -->
          <el-card class="table-card" shadow="hover">
            <template #header>
              <div class="card-header">
                <span>球员年度统计</span>
                <el-input
                  v-model="searchText"
                  placeholder="搜索球员姓名或号码"
                  style="width: 200px;"
                  clearable
                  :prefix-icon="SearchIcon"
                />
              </div>
            </template>

            <el-table
              :data="filteredStats"
              stripe
              border
              :default-sort="{ prop: 'avgPoints', order: 'descending' }"
              style="width: 100%"
            >
              <el-table-column prop="name" label="姓名" width="100" align="center" fixed>
                <template #default="{ row }">
                  <el-tag>{{ row.name }}</el-tag>
                </template>
              </el-table-column>
              
              <el-table-column prop="number" label="号码" width="80" align="center" />
              
              <el-table-column prop="gamesPlayed" label="参赛场次" width="100" align="center" sortable>
                <template #default="{ row }">
                  <el-tag type="info">{{ row.gamesPlayed }}</el-tag>
                </template>
              </el-table-column>
              
              <el-table-column prop="totalPoints" label="总得分" width="100" align="center" sortable>
                <template #default="{ row }">
                  <span class="highlight-points">{{ row.totalPoints }}</span>
                </template>
              </el-table-column>
              
              <el-table-column prop="avgPoints" label="场均得分" width="110" align="center" sortable>
                <template #default="{ row }">
                  <el-tag type="success">{{ row.avgPoints }}</el-tag>
                </template>
              </el-table-column>
              
              <el-table-column prop="avgPlusMinus" label="场均正负值" width="120" align="center" sortable>
                <template #default="{ row }">
                  <el-tag :type="getPlusMinusType(row.avgPlusMinus)">
                    {{ row.avgPlusMinus > 0 ? '+' : '' }}{{ row.avgPlusMinus }}
                  </el-tag>
                </template>
              </el-table-column>
              
              <el-table-column prop="avgPlayTime" label="场均时长(分)" width="130" align="center" sortable>
                <template #default="{ row }">
                  {{ (row.avgPlayTime / 60).toFixed(1) }}
                </template>
              </el-table-column>
              
              <el-table-column prop="totalFouls" label="总犯规" width="100" align="center" sortable>
                <template #default="{ row }">
                  <el-tag type="warning">{{ row.totalFouls }}</el-tag>
                </template>
              </el-table-column>
              
              <el-table-column prop="avgFouls" label="场均犯规" width="110" align="center" sortable>
                <template #default="{ row }">
                  {{ row.avgFouls }}
                </template>
              </el-table-column>
              
              <el-table-column prop="wins" label="胜场" width="80" align="center" sortable>
                <template #default="{ row }">
                  <el-tag type="success">{{ row.wins }}</el-tag>
                </template>
              </el-table-column>
              
              <el-table-column prop="losses" label="负场" width="80" align="center" sortable>
                <template #default="{ row }">
                  <el-tag type="danger">{{ row.losses }}</el-tag>
                </template>
              </el-table-column>
              
              <el-table-column prop="winRate" label="胜率" width="90" align="center" sortable>
                <template #default="{ row }">
                  <span :class="{ 'high-win-rate': parseFloat(row.winRate) >= 60 }">{{ row.winRate }}%</span>
                </template>
              </el-table-column>
            </el-table>
          </el-card>
        </div>

        <!-- 空状态 -->
        <el-empty 
          v-else 
          description="暂无数据"
          :image-size="200"
        >
          <el-button type="primary" @click="refreshData">加载数据</el-button>
        </el-empty>
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAnnualStatsStore } from '../stores/annualStatsStore';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Refresh, Delete, Loading, Search } from '@element-plus/icons-vue';

const router = useRouter();
const RefreshIcon = Refresh;
const DeleteIcon = Delete;
const SearchIcon = Search;

const store = useAnnualStatsStore();
const selectedYear = ref(new Date().getFullYear());
const searchText = ref('');

// 可选年份（从2024到当前年份）
const availableYears = computed(() => {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let year = 2024; year <= currentYear; year++) {
    years.push(year);
  }
  return years.reverse();
});

// 返回主页
const goBack = () => {
  router.push('/dashboard');
};

// 切换年份
const handleYearChange = async (year) => {
  try {
    await store.loadYearData(year);
    ElMessage.success(`已加载 ${year} 年数据`);
  } catch (error) {
    ElMessage.error(`加载 ${year} 年数据失败: ${error.message}`);
  }
};

// 刷新数据
const refreshData = async () => {
  try {
    await store.loadYearData(selectedYear.value);
    ElMessage.success('数据刷新成功');
  } catch (error) {
    ElMessage.error(`数据刷新失败: ${error.message}`);
  }
};

// 清除缓存
const clearCache = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要清除 ${selectedYear.value} 年的缓存数据吗？清除后将重新从网络加载。`,
      '清除缓存',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );
    
    await store.clearYearCache(selectedYear.value);
    ElMessage.success('缓存已清除');
    
    // 重新加载数据
    await refreshData();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('清除缓存失败');
    }
  }
};

// 过滤后的统计数据
const filteredStats = computed(() => {
  if (!searchText.value) {
    return store.playerAnnualStats;
  }
  const search = searchText.value.toLowerCase();
  return store.playerAnnualStats.filter(player => 
    player.name.toLowerCase().includes(search) || 
    player.number.toLowerCase().includes(search)
  );
});

// 总得分
const totalPoints = computed(() => {
  return store.playerAnnualStats.reduce((sum, player) => sum + player.totalPoints, 0);
});

// 场均得分
const avgPointsPerGame = computed(() => {
  if (store.totalGames === 0) return '0.0';
  return (totalPoints.value / store.totalGames).toFixed(1);
});

// 获取正负值标签类型
const getPlusMinusType = (value) => {
  const num = parseFloat(value);
  if (num > 0) return 'success';
  if (num < 0) return 'danger';
  return 'info';
};

// 格式化秒数为分:秒
const formatSeconds = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// 初始化
onMounted(async () => {
  await store.initDB();
  await handleYearChange(selectedYear.value);
});
</script>

<style scoped>
.annual-stats-page {
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.page-header {
  background: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.page-header h1 {
  margin: 0;
  font-size: 24px;
  color: #303133;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.stats-main {
  padding: 20px;
  overflow-y: auto;
}

.loading-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 400px;
  color: white;
  font-size: 18px;
}

.summary-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: bold;
}

.stat-item {
  text-align: center;
  padding: 15px 0;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #409EFF;
}

.table-card {
  margin-bottom: 20px;
}

.highlight-points {
  font-weight: bold;
  color: #E6A23C;
  font-size: 16px;
}

.high-win-rate {
  font-weight: bold;
  color: #67C23A;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    height: auto !important;
    padding: 15px;
    gap: 15px;
  }

  .page-header h1 {
    font-size: 20px;
  }

  .header-actions {
    width: 100%;
    justify-content: space-between;
  }

  .stat-value {
    font-size: 22px;
  }
}
</style>
