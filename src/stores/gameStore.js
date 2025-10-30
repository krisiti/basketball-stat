import { defineStore } from 'pinia';
import { ref, computed, inject } from 'vue';
import { formatTime, formatLocalTime, formatGameTime } from '../utils/formatters';
import { ElMessageBox } from 'element-plus';
import { useToastStore } from './toastStore';

// 数据库常量
const DB_NAME = 'BasketballStatsDB';
const DB_VERSION = 7;
const STORE_NAME = 'gameData';
const DETAIL_STORE_NAME = 'gameDetails';

export const useGameStore = defineStore('game', () => {
  // 导入toast store
  const toastStore = useToastStore();
  
  // 状态
  const players = ref([]);
  const isGameRunning = ref(false);
  const currentPeriod = ref(1);
  const gameTimer = ref(null);
  const teamScores = ref({ '红队': 0, '黑队': 0 });
  const teamFouls = ref({ '红队': { 1: 0 }, '黑队': { 1: 0 } });
  const lastUpdateTime = ref(Date.now());
  const gameStartTime = ref(0);
  const gameDetails = ref([]);
  const currentDetailPeriod = ref(1);
  const teamExpanded = ref({ red: false, blue: false });
  const sortField = ref('number');
  const sortOrder = ref('asc');
  const db = ref(null);
  const isDbReady = ref(false);
  const gameStatus = ref('比赛未开始');

  // 预设球员池
  const presetPlayers = ref([
    { id: 1, name: '郑方庆', number: '0' },
    { id: 2, name: '晓涛', number: '00' },
    { id: 3, name: '佳鑫', number: '17' },
    { id: 4, name: '文灏', number: '2' },
    { id: 5, name: '楚放', number: '3' },
    { id: 6, name: '爱文', number: '5' },
    { id: 7, name: '诗胜', number: '6' },
    { id: 8, name: '日康', number: '7' },
    { id: 9, name: '庆敏', number: '8' },
    { id: 10, name: '李陈超', number: '9' },
    { id: 11, name: '祝程', number: '10' },
    { id: 12, name: '林铎', number: '11' },
    { id: 13, name: '志滨', number: '13' },
    { id: 14, name: '伟国', number: '15' },
    { id: 15, name: '龙腾', number: '16' },
    { id: 16, name: '锐斌', number: '20' },
    { id: 17, name: '鹏东', number: '22' },
    { id: 18, name: '钲烨', number: '99' },
    { id: 19, name: '郁涛', number: '30' },
    { id: 20, name: '伯韬', number: '31' },
    { id: 21, name: '屹剑', number: '33' },
    { id: 22, name: '张铖', number: '34' },
    { id: 23, name: '桂亮', number: '35' },
    { id: 24, name: '洪鹏', number: '36' },
    { id: 25, name: '廖程', number: '23' },
    { id: 26, name: '🐶哥', number: '96' },
  ]);

  // 初始化数据库
  async function initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = (event) => {
        console.error('数据库打开失败:', event.target.error);
        reject(event.target.error);
      };

      request.onsuccess = (event) => {
        db.value = event.target.result;
        isDbReady.value = true;
        console.log('数据库连接成功');
        resolve(db.value);
      };

      request.onupgradeneeded = (event) => {
        const database = event.target.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          database.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
        if (!database.objectStoreNames.contains(DETAIL_STORE_NAME)) {
          database.createObjectStore(DETAIL_STORE_NAME, { keyPath: 'timestamp' });
        }
        console.log('数据库升级完成');
      };
    });
  }

  // 保存游戏数据
  async function saveData() {
    if (!isDbReady.value) return;

    // Create a plain JS object without reactive wrappers
    const data = {
      id: 'currentGame',
      players: JSON.parse(JSON.stringify(players.value.map(p => ({
        name: p.name,
        number: p.number,
        team: p.team,
        isPlaying: p.isPlaying,
        currentTime: p.currentTime,
        totalTime: p.totalTime,
        score: p.score,
        fouls: p.fouls,
        plusMinus: p.plusMinus,
        presetId: p.presetId
      })))),
      isGameRunning: isGameRunning.value,
      currentPeriod: currentPeriod.value,
      teamScores: JSON.parse(JSON.stringify(teamScores.value)),
      teamFouls: JSON.parse(JSON.stringify(teamFouls.value)),
      lastUpdateTime: isGameRunning.value ? Date.now() : null,
      gameStartTime: gameStartTime.value
    };

    return new Promise((resolve, reject) => {
      try {
        const transaction = db.value.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(data);

        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(event.target.error);
      } catch (error) {
        console.error('Error saving data:', error);
        reject(error);
      }
    });
  }

  // 保存明细记录
  async function saveDetailRecord(detail) {
    if (!isDbReady.value) return;

    // Create a plain JS object without reactive wrappers
    const plainDetail = JSON.parse(JSON.stringify(detail));

    return new Promise((resolve, reject) => {
      try {
        const transaction = db.value.transaction([DETAIL_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(DETAIL_STORE_NAME);
        const request = store.put(plainDetail);

        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(event.target.error);
      } catch (error) {
        console.error('Error saving detail record:', error);
        reject(error);
      }
    });
  }

  // 加载游戏数据
  async function loadData() {
    if (!isDbReady.value) return;

    return new Promise((resolve, reject) => {
      const transaction = db.value.transaction([STORE_NAME, DETAIL_STORE_NAME], 'readonly');
      const gameStore = transaction.objectStore(STORE_NAME);
      const detailStore = transaction.objectStore(DETAIL_STORE_NAME);

      const gameRequest = gameStore.get('currentGame');
      const detailRequest = detailStore.getAll();

      gameRequest.onsuccess = (event) => {
        const data = event.target.result;
        if (data) {
          players.value = (data.players || []).map(p => ({
            ...p,
            plusMinus: typeof p.plusMinus === 'number' ? p.plusMinus : 0
          }));
          isGameRunning.value = false;
          currentPeriod.value = data.currentPeriod || 1;
          teamScores.value = data.teamScores || { '红队': 0, '黑队': 0 };
          teamFouls.value = data.teamFouls || { '红队': { 1: 0 }, '黑队': { 1: 0 } };
          lastUpdateTime.value = data.lastUpdateTime || Date.now();
          gameStartTime.value = data.gameStartTime || 0;

          if (data.isGameRunning && data.lastUpdateTime) {
            const timeDiff = Math.floor((Date.now() - data.lastUpdateTime) / 1000);
            players.value.forEach(p => {
              if (p.isPlaying) p.currentTime += timeDiff;
            });
          }
        }
      };

      detailRequest.onsuccess = (event) => {
        gameDetails.value = event.target.result || [];
        gameDetails.value.sort((a, b) => a.timestamp - b.timestamp);
      };

      transaction.oncomplete = () => {
        resolve();
      };

      transaction.onerror = (event) => reject(event.target.error);
    });
  }

  // 清除所有数据
  async function clearData() {
    try {
      const confirmed = await ElMessageBox.confirm(
        '确定要清除所有数据吗？此操作不可撤销！', 
        '警告', 
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning',
        }
      );
      
      if (!confirmed) return;
      if (!isDbReady.value) return;

      return new Promise((resolve, reject) => {
        const transaction = db.value.transaction([STORE_NAME, DETAIL_STORE_NAME], 'readwrite');
        const gameStore = transaction.objectStore(STORE_NAME);
        const detailStore = transaction.objectStore(DETAIL_STORE_NAME);

        const gameRequest = gameStore.clear();
        const detailRequest = detailStore.clear();

        transaction.oncomplete = () => {
          players.value = [];
          isGameRunning.value = false;
          currentPeriod.value = 1;
          teamScores.value = { '红队': 0, '黑队': 0 };
          teamFouls.value = { '红队': { 1: 0 }, '黑队': { 1: 0 } };
          gameDetails.value = [];
          gameStartTime.value = 0;

          if (gameTimer.value) {
            clearInterval(gameTimer.value);
            gameTimer.value = null;
          }

          gameStatus.value = '比赛未开始';
          toastStore.success('所有数据已清除');
          resolve();
        };

        transaction.onerror = (event) => reject(event.target.error);
      });
    } catch (error) {
      if (error !== 'cancel') {
        console.error('清除数据错误:', error);
      }
    }
  }

  // 导入数据库
  async function importDB(file) {
    try {
      const fileReader = new FileReader();
      
      return new Promise((resolve, reject) => {
        fileReader.onload = async (e) => {
          try {
            const data = JSON.parse(e.target.result);
            // 检查是否需要重新计算
            const hasScoreRecords = data.details?.some(d => d.type === 'score');
            const hasPlusMinusData = data.game?.[0]?.players?.some(p => p.plusMinus !== undefined && p.plusMinus !== 0);

            // 清空现有数据
            await clearData();

            try {
              // 保存原始数据
              const transaction = db.value.transaction([STORE_NAME, DETAIL_STORE_NAME], 'readwrite');
              const gameStore = transaction.objectStore(STORE_NAME);
              const detailStore = transaction.objectStore(DETAIL_STORE_NAME);

              // 处理球员数据兼容性
              const importedPlayers = (data.game?.[0]?.players || []).map(p => ({
                ...p,
                plusMinus: typeof p.plusMinus === 'number' ? p.plusMinus : 0
              }));

              // 保存基础数据 - convert to plain JS objects
              const gameData = {
                id: 'currentGame',
                ...data.game?.[0],
                players: JSON.parse(JSON.stringify(importedPlayers))
              };
              gameStore.put(gameData);

              // 保存明细数据 - convert to plain JS objects
              data.details?.forEach(d => {
                const detailData = JSON.parse(JSON.stringify(d));
                detailStore.put(detailData);
              });

              transaction.oncomplete = async () => {
                await loadData();
                
                // 重新计算正负值
                if (hasScoreRecords && !hasPlusMinusData) {
                  recalculatePlusMinus();
                }
                
                await saveData();
                resolve('数据库导入成功');
              };
              
              transaction.onerror = (event) => {
                console.error('Transaction error:', event);
                reject(new Error('导入数据库事务错误'));
              };
            } catch (error) {
              console.error('Error in import transaction:', error);
              reject(error);
            }
          } catch (error) {
            console.error('Error parsing JSON:', error);
            reject(error);
          }
        };
        
        fileReader.onerror = () => reject(new Error('读取文件失败'));
        fileReader.readAsText(file);
      });
    } catch (error) {
      console.error('Import error:', error);
      throw new Error('导入失败: ' + error.message);
    }
  }

  // 开始比赛
  async function startGame() {
    if (isGameRunning.value) return;

    if (gameTimer.value) clearInterval(gameTimer.value);

    isGameRunning.value = true;
    lastUpdateTime.value = Date.now();
    gameStartTime.value = gameStartTime.value || Date.now();

    addDetailRecord('game-start', { team: '', name: '比赛', number: '' });

    gameTimer.value = setInterval(async () => {
      const now = Date.now();
      const elapsedSeconds = (now - lastUpdateTime.value) / 1000;
      lastUpdateTime.value = now;

      players.value.forEach(player => {
        if (player.isPlaying) {
          player.currentTime += elapsedSeconds;
        }
      });

      if (now % 5000 < 100) {
        await saveData();
      }
    }, 1000);

    gameStatus.value = '比赛进行中';
    await saveData();
  }

  // 暂停比赛
  async function pauseGame() {
    if (!isGameRunning.value) return;

    isGameRunning.value = false;
    clearInterval(gameTimer.value);
    gameTimer.value = null;

    addDetailRecord('game-pause', { team: '', name: '比赛', number: '' });

    gameStatus.value = '比赛已暂停';
    await saveData();
  }

  // 下一节
  async function nextPeriod() {
    if (currentPeriod.value >= 4) return;
    currentPeriod.value++;

    if (!teamFouls.value['红队'][currentPeriod.value]) teamFouls.value['红队'][currentPeriod.value] = 0;
    if (!teamFouls.value['黑队'][currentPeriod.value]) teamFouls.value['黑队'][currentPeriod.value] = 0;

    addDetailRecord('period-change', { team: '', name: '', number: '' }, currentPeriod.value);

    // 自动切换到当前节数的明细
    currentDetailPeriod.value = currentPeriod.value;

    await saveData();
  }

  // 上一节
  async function prevPeriod() {
    if (currentPeriod.value <= 1) return;
    currentPeriod.value--;

    // 自动切换到当前节数的明细
    currentDetailPeriod.value = currentPeriod.value;

    await saveData();
  }

  // 添加球员
  async function addPlayer(name, number, team) {
    if (!name || !number) {
      return { success: false, message: '请输入姓名和号码！' };
    }

    const checkResult = checkDuplicate(name, number, team);
    if (checkResult !== '') {
      return { success: false, message: checkResult };
    }

    // 在球员对象中添加正负值字段
    const player = {
      name,
      number,
      team,
      isPlaying: false,
      currentTime: 0,
      totalTime: 0,
      score: 0,
      fouls: 0,
      plusMinus: 0
    };
    players.value.push(player);

    addDetailRecord('player-add', player);
    await saveData();
    
    return { success: true, player };
  }

  // 检查姓名和号码是否重复
  function checkDuplicate(name, number, team) {
    const nameExists = players.value.some(p => p.name === name && p.team === team);
    const numberExists = players.value.some(p => p.number == number && p.team === team);

    if (nameExists && numberExists) {
      return '姓名和号码都已存在！';
    } else if (nameExists) {
      return '姓名已存在！';
    } else if (numberExists) {
      return '号码已存在！';
    }

    return '';
  }

  // 添加预设球员
  async function addPresetPlayer(presetId, team) {
    const preset = presetPlayers.value.find(p => p.id === presetId);
    if (!preset) return { success: false, message: '找不到预设球员' };

    const checkResult = checkDuplicate(preset.name, preset.number, team);
    if (checkResult !== '') {
      return { success: false, message: checkResult };
    }
    
    const player = {
      ...preset,
      team,
      isPlaying: false,
      currentTime: 0,
      totalTime: 0,
      score: 0,
      fouls: 0,
      plusMinus: 0,
      presetId: preset.id
    };
    
    players.value.push(player);
    addDetailRecord('player-add', player);
    await saveData();
    
    return { success: true, player };
  }

  // 移除球员
  async function removePlayer(player) {
    try {
      const confirmed = await ElMessageBox.confirm(
        `确定要移除球员 ${player.number}号 ${player.name} 吗？`, 
        '提示', 
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning',
        }
      );
      
      if (!confirmed) return;

      const index = players.value.indexOf(player);
      if (index !== -1) {
        players.value.splice(index, 1);
        addDetailRecord('player-remove', player);
        await saveData();
        toastStore.success(`已移除球员: ${player.name}`);
      }
    } catch (error) {
      if (error !== 'cancel') {
        console.error('移除球员错误:', error);
      }
    }
  }

  // 切换球员上场状态
  async function togglePlayer(player) {
    const playingCount = players.value.filter(p => p.team === player.team && p.isPlaying).length;
    if (!player.isPlaying && playingCount >= 5) {
      toastStore.warning('每队最多同时5人上场');
      return false;
    }

    if (player.isPlaying) {
      player.totalTime += player.currentTime;
      player.currentTime = 0;
      addDetailRecord('sub-out', player);
    } else {
      player.currentTime = 0;
      addDetailRecord('sub-in', player);
    }

    player.isPlaying = !player.isPlaying;
    await saveData();
    return true;
  }

  // 更新得分
  async function updateScore(player, points) {
    if (!isGameRunning.value) {
      toastStore.warning('比赛进行中才能操作');
      return false;
    }
    
    // 得分为0时不允许减分
    if (points < 0 && player.score <= 0) {
      return false;
    }

    player.score += points;
    if (player.score < 0) player.score = 0;
    teamScores.value[player.team] += points;
    if (teamScores.value[player.team] < 0) teamScores.value[player.team] = 0;

    addDetailRecord('score', player, points);

    // 计算分差变化
    const diffChange = points;

    // 更新本方在场球员正负值
    players.value.filter(p => p.team === player.team && p.isPlaying)
      .forEach(p => p.plusMinus += diffChange);

    // 更新对方在场球员正负值（取反）
    const opponentTeam = player.team === '红队' ? '黑队' : '红队';
    players.value.filter(p => p.team === opponentTeam && p.isPlaying)
      .forEach(p => p.plusMinus -= diffChange);

    await saveData();
    return true;
  }

  // 添加犯规
  async function addFoul(player, value = 1) {
    if (!isGameRunning.value) {
      toastStore.warning('比赛进行中才能操作');
      return false;
    }
    
    // 犯规数为0时不允许减犯规
    if (value < 0 && player.fouls <= 0) {
      return false;
    }

    player.fouls += value;
    if (player.fouls < 0) player.fouls = 0;

    if (!teamFouls.value[player.team][currentPeriod.value]) 
      teamFouls.value[player.team][currentPeriod.value] = 0;
      
    teamFouls.value[player.team][currentPeriod.value] += value;
    if (teamFouls.value[player.team][currentPeriod.value] < 0) 
      teamFouls.value[player.team][currentPeriod.value] = 0;

    addDetailRecord('foul', player, value);

    await saveData();
    return true;
  }

  // 添加明细记录
  function addDetailRecord(type, player, value = null) {
    const now = Date.now();
    const gameTimeCalc = isGameRunning.value ? Math.floor((now - gameStartTime.value) / 1000) : 0;

    // Ensure we're working with plain JS properties, not reactive objects
    const detail = {
      timestamp: now,
      period: currentPeriod.value,
      gameTime: gameTimeCalc,
      type,
      team: player.team,
      player: player.name,
      number: player.number,
      value
    };

    // Add to local state
    gameDetails.value.push(JSON.parse(JSON.stringify(detail)));
    
    // Save to database
    saveDetailRecord(detail);
  }

  // 重新计算正负值
  function recalculatePlusMinus() {
    // 重置所有球员正负值
    players.value.forEach(p => p.plusMinus = 0);

    // 构建球员事件时间线
    const playerEvents = new Map();
    players.value.forEach(p => {
      const key = `${p.team}_${p.number}`;
      playerEvents.set(key, []);
    });

    // 收集并排序所有换人事件
    gameDetails.value
      .filter(d => d.type === 'sub-in' || d.type === 'sub-out')
      .sort((a, b) => a.timestamp - b.timestamp)
      .forEach(d => {
        const key = `${d.team}_${d.number}`;
        playerEvents.get(key)?.push({
          type: d.type,
          timestamp: d.timestamp
        });
      });

    // 处理得分事件
    gameDetails.value
      .filter(d => d.type === 'score')
      .sort((a, b) => a.timestamp - b.timestamp)
      .forEach(d => {
        const points = d.value;
        const scoringTeam = d.team;
        const eventTime = d.timestamp;

        // 获取双方在场球员
        const sameTeamPlayers = players.value.filter(p =>
          p.team === scoringTeam &&
          isPlayerActive(p, eventTime)
        );
        const opponentTeam = scoringTeam === '红队' ? '黑队' : '红队';
        const opponentPlayers = players.value.filter(p =>
          p.team === opponentTeam &&
          isPlayerActive(p, eventTime)
        );

        // 更新正负值
        sameTeamPlayers.forEach(p => p.plusMinus += points);
        opponentPlayers.forEach(p => p.plusMinus -= points);
      });

    // 判断球员在指定时间是否在场
    function isPlayerActive(player, timestamp) {
      const events = playerEvents.get(`${player.team}_${player.number}`) || [];
      let isActive = false;
      for (const event of events) {
        if (event.timestamp > timestamp) break;
        isActive = event.type === 'sub-in';
      }
      return isActive;
    }

    saveData();
  }

  // 切换队伍展开/收起状态
  function toggleTeam(team) {
    teamExpanded.value[team] = !teamExpanded.value[team];
  }

  // 计算排序的球员列表
  const getPlayersForTeam = (team) => {
    const teamKey = team === '红队' ? '红队' : '黑队';
    const teamPlayers = players.value.filter(p => p.team === teamKey);
    
    return teamPlayers.slice().sort((a, b) => {
      // 先比较是否上场（保证上场球员在前）
      if (a.isPlaying !== b.isPlaying) return b.isPlaying - a.isPlaying;

      // 再按指定字段排序
      const valueA = getSortValue(a);
      const valueB = getSortValue(b);

      if (typeof valueA === 'string') {
        return sortOrder.value === 'asc' ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA);
      }
      return sortOrder.value === 'asc' ? valueA - valueB : valueB - valueA;
    });
  };

  // 获取排序值
  function getSortValue(player) {
    switch (sortField.value) {
      case 'number': return parseInt(player.number);
      case 'currentTime': return player.currentTime;
      case 'totalTime': return player.totalTime + player.currentTime;
      case 'score': return player.score;
      default: return player[sortField.value];
    }
  }

  // 排序球员
  function sortPlayers(field) {
    if (sortField.value === field) {
      sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
    } else {
      sortField.value = field;
      sortOrder.value = 'asc';
    }
  }

  // 获取可用的预设球员（未被分配）
  const availablePresetPlayers = computed(() => {
    return presetPlayers.value.filter(preset => 
      !players.value.find(player => player.presetId === preset.id)
    );
  });

  // 获取特定节次的明细
  const getDetailsByPeriod = (period, type = 'all') => {
    return gameDetails.value
      .filter(d => d.period === period)
      .filter(d => {
        if (type === 'all') return true;
        if (type === 'sub') return d.type === 'sub-in' || d.type === 'sub-out';
        return d.type === type;
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  };

  // 获取所有节次
  const getAllPeriods = computed(() => {
    const periods = new Set();
    gameDetails.value.forEach(detail => periods.add(detail.period));
    if (periods.size === 0) periods.add(1);
    return Array.from(periods).sort();
  });

  // 获取明细事件类型名称
  function getEventTypeName(type) {
    const typeNames = {
      'score': '得分',
      'foul': '犯规',
      'sub-in': '换人',
      'sub-out': '换人',
    };
    return typeNames[type] || type;
  }

  return {
    // 状态
    players,
    isGameRunning,
    currentPeriod,
    teamScores,
    teamFouls,
    gameDetails,
    currentDetailPeriod,
    teamExpanded,
    gameStatus,
    presetPlayers,
    availablePresetPlayers,
    sortField,
    sortOrder,
    
    // 数据库方法
    initDB,
    saveData,
    loadData,
    clearData,
    importDB,
    
    // 游戏控制
    startGame,
    pauseGame,
    nextPeriod,
    prevPeriod,
    
    // 球员管理
    addPlayer,
    addPresetPlayer,
    removePlayer,
    togglePlayer,
    checkDuplicate,
    
    // 比赛统计
    updateScore,
    addFoul,
    addDetailRecord,
    recalculatePlusMinus,
    
    // UI相关
    toggleTeam,
    getPlayersForTeam,
    sortPlayers,
    getSortValue,
    getDetailsByPeriod,
    getAllPeriods,
    getEventTypeName,
  };
}); 