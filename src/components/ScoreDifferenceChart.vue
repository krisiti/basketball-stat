<template>
  <div class="score-difference-chart">
    <div class="chart-header">
      <h3>实时比分走势</h3>
      <div class="chart-info">
        <span class="max-diff-label">
          最大分差: {{ maxDifference }}分
        </span>
        <span class="current-diff-label">
          当前分差: {{ currentDifference }}分
        </span>
      </div>
    </div>
    <div ref="chartContainer" class="chart-container"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, onBeforeUnmount } from 'vue';
import { useGameStore } from '../stores/gameStore';
import * as echarts from 'echarts';

const gameStore = useGameStore();
const chartContainer = ref(null);
let chartInstance = null;
const maxDifference = ref(0);
const currentDifference = ref(0);
let currentScorePlayers = []; // 存储当前得分球员信息

const calculateScoreData = () => {
  // 从 gameDetails 中提取得分事件
  const scoreEvents = gameStore.gameDetails
    .filter(d => d.type === 'score')
    .sort((a, b) => a.timestamp - b.timestamp);

  const timeData = [];
  const redScores = [];
  const blueScores = [];
  const scorePlayers = []; // 存储每个时间点的得分球员
  let redScore = 0;
  let blueScore = 0;

  // 遍历所有得分事件，分别累计两队得分
  scoreEvents.forEach(event => {
    if (event.team === '红队') {
      redScore += event.value;
    } else if (event.team === '黑队') {
      blueScore += event.value;
    }

    const timestamp = new Date(event.timestamp).toLocaleTimeString();
    
    timeData.push(timestamp);
    redScores.push(redScore);
    blueScores.push(blueScore);
    scorePlayers.push({
      player: event.player,
      number: event.number,
      team: event.team,
      points: event.value
    });

    // 更新最大分差
    const diff = Math.abs(redScore - blueScore);
    if (diff > maxDifference.value) {
      maxDifference.value = diff;
    }
  });

  return { timeData, redScores, blueScores, scorePlayers };
};

const initChart = () => {
  if (!chartContainer.value) return;

  chartInstance = echarts.init(chartContainer.value);
  updateChart();
};

const updateChart = () => {
  if (!chartInstance) return;

  const { timeData, redScores, blueScores, scorePlayers } = calculateScoreData();
  const currentRedScore = gameStore.teamScores['红队'] || 0;
  const currentBlueScore = gameStore.teamScores['黑队'] || 0;
  
  currentDifference.value = Math.abs(currentRedScore - currentBlueScore);

  // 找出最大分差的点
  let maxDiffIndex = 0;
  let maxDiff = 0;
  
  for (let i = 0; i < Math.min(redScores.length, blueScores.length); i++) {
    const diff = Math.abs(redScores[i] - blueScores[i]);
    if (diff > maxDiff) {
      maxDiff = diff;
      maxDiffIndex = i;
    }
  }

  const redMarkPoint = [];
  const blueMarkPoint = [];
  
  if (redScores.length > 0 && maxDiffIndex >= 0 && maxDiffIndex < redScores.length) {
    const leadingTeam = redScores[maxDiffIndex] > blueScores[maxDiffIndex] ? 'red' : 'blue';
    
    if (leadingTeam === 'red') {
      redMarkPoint.push({
        name: '最大分差点',
        coord: [maxDiffIndex, redScores[maxDiffIndex]],
        value: `${redScores[maxDiffIndex]}`,
        itemStyle: { color: '#ef4444' }
      });
      blueMarkPoint.push({
        name: '最大分差点',
        coord: [maxDiffIndex, blueScores[maxDiffIndex]],
        value: `${blueScores[maxDiffIndex]}`,
        itemStyle: { color: '#3b82f6' }
      });
    } else {
      blueMarkPoint.push({
        name: '最大分差点',
        coord: [maxDiffIndex, blueScores[maxDiffIndex]],
        value: `${blueScores[maxDiffIndex]}`,
        itemStyle: { color: '#3b82f6' }
      });
      redMarkPoint.push({
        name: '最大分差点',
        coord: [maxDiffIndex, redScores[maxDiffIndex]],
        value: `${redScores[maxDiffIndex]}`,
        itemStyle: { color: '#ef4444' }
      });
    }
  }

  const option = {
    tooltip: {
      trigger: 'axis',
      formatter: function(params) {
        let result = params[0].axisValue + '<br/>';
        
        // 获取当前时间点的索引
        const dataIndex = params[0].dataIndex;
        
        // 如果有得分球员信息，显示
        if (scorePlayers && scorePlayers[dataIndex]) {
          const playerInfo = scorePlayers[dataIndex];
          result += `<span style="font-weight: bold; color: ${playerInfo.team === '红队' ? '#ef4444' : '#3b82f6'};">${playerInfo.team} ${playerInfo.player}(${playerInfo.number}号) +${playerInfo.points}分</span><br/>`;
        }
        
        params.forEach(param => {
          result += `${param.marker}${param.seriesName}: ${param.value}分<br/>`;
        });
        return result;
      }
    },
    legend: {
      top: 10
    },
    xAxis: {
      type: 'category',
      data: timeData.length > 0 ? timeData : ['比赛开始'],
      axisLabel: {
        rotate: 45,
        interval: timeData.length > 10 ? Math.floor(timeData.length / 5) - 1 : 0
      }
    },
    yAxis: {
      type: 'value',
      name: '得分',
      axisLabel: {
        formatter: '{value}'
      },
      splitLine: {
        show: true,
        lineStyle: {
          color: '#e5e7eb'
        }
      }
    },
    series: [
      {
        name: '红队得分',
        type: 'line',
        data: redScores.length > 0 ? redScores : [0],
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: {
          width: 2,
          color: '#ef4444'
        },
        itemStyle: {
          color: '#ef4444'
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(239, 68, 68, 0.3)' },
            { offset: 1, color: 'rgba(239, 68, 68, 0.1)' }
          ])
        },
        markPoint: redMarkPoint.length > 0 ? {
          symbol: 'pin',
          symbolSize: 50,
          data: redMarkPoint,
          label: {
            formatter: '{c}',
            color: '#000'
          }
        } : null,
        markLine: (redScores.length > 0 && maxDiffIndex >= 0) ? {
          lineStyle: {
            type: 'dashed',
            width: 2,
            color: '#9ca3af'
          },
          label: {
            formatter: `最大分差: ${maxDifference.value}分`,
            position: 'middle',
            color: '#fff',
            backgroundColor: '#6b7280',
            padding: [4, 8],
            borderRadius: 4,
            rotate: 0
          },
          data: [
            [
              { coord: [maxDiffIndex, redScores[maxDiffIndex]] },
              { coord: [maxDiffIndex, blueScores[maxDiffIndex]] }
            ]
          ]
        } : null
      },
      {
        name: '黑队得分',
        type: 'line',
        data: blueScores.length > 0 ? blueScores : [0],
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: {
          width: 2,
          color: '#3b82f6'
        },
        itemStyle: {
          color: '#3b82f6'
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(59, 130, 246, 0.3)' },
            { offset: 1, color: 'rgba(59, 130, 246, 0.1)' }
          ])
        },
        markPoint: blueMarkPoint.length > 0 ? {
          symbol: 'pin',
          symbolSize: 50,
          data: blueMarkPoint,
          label: {
            formatter: '{c}',
            color: '#000'
          }
        } : null
      }
    ],
    grid: {
      left: '10%',
      right: '10%',
      bottom: '15%',
      top: '15%',
      containLabel: true
    }
  };

  chartInstance.setOption(option);
};

watch(
  () => gameStore.gameDetails.length,
  () => {
    updateChart();
  },
  { deep: true }
);

watch(
  () => [gameStore.teamScores['红队'], gameStore.teamScores['黑队']],
  () => {
    updateChart();
  }
);

onMounted(() => {
  initChart();
});

onBeforeUnmount(() => {
  if (chartInstance) {
    chartInstance.dispose();
  }
});
</script>

<style scoped>
.score-difference-chart {
  background: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.chart-header {
  margin-bottom: 16px;
}

.chart-header h3 {
  margin: 0 0 8px 0;
  font-size: 16px;
  color: #1f2937;
}

.chart-info {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.max-diff-label,
.current-diff-label {
  font-size: 14px;
  color: #6b7280;
}

.chart-container {
  width: 100%;
  height: 350px;
}
</style>

