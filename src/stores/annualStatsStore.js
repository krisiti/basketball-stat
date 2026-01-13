import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

// IndexedDB 配置
const DB_NAME = 'BasketballAnnualStatsDB';
const DB_VERSION = 1;
const STORE_NAME = 'annualData';

export const useAnnualStatsStore = defineStore('annualStats', () => {
  const db = ref(null);
  const isDbReady = ref(false);
  const loading = ref(false);
  const currentYear = ref(new Date().getFullYear());
  const gamesData = ref([]);
  const filesConfig = ref({});
  
  // 初始化 IndexedDB
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
        console.log('年度统计数据库连接成功');
        resolve(db.value);
      };

      request.onupgradeneeded = (event) => {
        const database = event.target.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          const objectStore = database.createObjectStore(STORE_NAME, { keyPath: 'cacheKey' });
          objectStore.createIndex('year', 'year', { unique: false });
          objectStore.createIndex('date', 'date', { unique: false });
        }
        console.log('年度统计数据库升级完成');
      };
    });
  }

  // 从 IndexedDB 加载缓存数据
  async function loadFromCache(cacheKey) {
    if (!isDbReady.value) await initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.value.transaction([STORE_NAME], 'readonly');
      const objectStore = transaction.objectStore(STORE_NAME);
      const request = objectStore.get(cacheKey);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // 保存数据到 IndexedDB
  async function saveToCache(cacheKey, data, year) {
    if (!isDbReady.value) await initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.value.transaction([STORE_NAME], 'readwrite');
      const objectStore = transaction.objectStore(STORE_NAME);
      const request = objectStore.put({
        cacheKey,
        data,
        year,
        timestamp: Date.now()
      });

      request.onsuccess = () => {
        console.log('数据已缓存:', cacheKey);
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // 获取文件配置
  async function fetchFilesConfig(year) {
    const configUrl = `https://static-web.bigolive.tv/as/fhab-static/bigo-basketball/data/${year}/basketball_files_config.json`;
    const cacheKey = `config_${year}`;
    
    try {
      const cached = await loadFromCache(cacheKey);
      if (cached && cached.data) {
        console.log('从缓存加载配置:', year);
        filesConfig.value = cached.data;
        return cached.data;
      }

      console.log('从网络获取配置:', configUrl);
      const response = await fetch(configUrl);
      if (!response.ok) {
        throw new Error(`获取配置失败: ${response.status}`);
      }
      
      const config = await response.json();
      filesConfig.value = config;
      await saveToCache(cacheKey, config, year);
      
      return config;
    } catch (error) {
      console.error('获取文件配置失败:', error);
      throw error;
    }
  }

  // 获取单个比赛数据
  async function fetchGameData(year, date, filename) {
    const dataUrl = `https://static-web.bigolive.tv/as/fhab-static/bigo-basketball/data/${year}/${filename}`;
    const cacheKey = `game_${year}_${date}`;
    
    try {
      const cached = await loadFromCache(cacheKey);
      if (cached && cached.data) {
        console.log('从缓存加载比赛数据:', date);
        return { date, data: cached.data };
      }

      console.log('从网络获取比赛数据:', dataUrl);
      const response = await fetch(dataUrl);
      if (!response.ok) {
        throw new Error(`获取比赛数据失败: ${response.status}`);
      }
      
      const gameData = await response.json();
      await saveToCache(cacheKey, gameData, year);
      
      return { date, data: gameData };
    } catch (error) {
      console.error(`获取比赛数据失败 (${date}):`, error);
      return { date, data: null, error: error.message };
    }
  }

  // 加载年度所有数据
  async function loadYearData(year) {
    loading.value = true;
    currentYear.value = year;
    gamesData.value = [];

    try {
      const config = await fetchFilesConfig(year);
      
      if (!config || Object.keys(config).length === 0) {
        throw new Error('没有找到比赛数据');
      }

      const dates = Object.keys(config).sort();
      const promises = dates.map(date => 
        fetchGameData(year, date, config[date])
      );
      
      const results = await Promise.all(promises);
      gamesData.value = results.filter(r => r.data !== null);
      
      console.log(`成功加载 ${gamesData.value.length} 场比赛数据`);
      
    } catch (error) {
      console.error('加载年度数据失败:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  // 计算球员年度统计
  const playerAnnualStats = computed(() => {
    const statsMap = new Map();

    gamesData.value.forEach((game, index) => {
      const gameInfo = game.data?.game?.[0] || {};
      const players = gameInfo.players || [];
      const teamScores = gameInfo.teamScores || {};
      
      if (!players || players.length === 0) {
        console.warn(`第 ${index + 1} 场比赛没有球员数据`);
        return;
      }

      const redScore = teamScores['红队'] || 0;
      const blackScore = teamScores['黑队'] || 0;
      const winningTeam = redScore > blackScore ? '红队' : (blackScore > redScore ? '黑队' : null);

      players.forEach(player => {
        const key = `${player.name}_${player.number}`;
        
        if (!statsMap.has(key)) {
          statsMap.set(key, {
            name: player.name,
            number: player.number,
            gamesPlayed: 0,
            totalPoints: 0,
            totalPlusMinus: 0,
            totalPlayTime: 0,
            totalFouls: 0,
            wins: 0,
            losses: 0
          });
        }

        const stats = statsMap.get(key);
        stats.gamesPlayed += 1;
        stats.totalPoints += player.score || 0;
        stats.totalPlusMinus += player.plusMinus || 0;
        stats.totalPlayTime += ((player.totalTime || 0) + (player.currentTime || 0));
        stats.totalFouls += player.fouls || 0;
        
        if (winningTeam && player.team === winningTeam) {
          stats.wins += 1;
        } else if (winningTeam && player.team !== winningTeam) {
          stats.losses += 1;
        }
      });
    });

    return Array.from(statsMap.values()).map(stats => ({
      name: stats.name,
      number: stats.number,
      gamesPlayed: stats.gamesPlayed,
      totalPoints: stats.totalPoints,
      avgPoints: (stats.totalPoints / stats.gamesPlayed).toFixed(1),
      avgPlusMinus: (stats.totalPlusMinus / stats.gamesPlayed).toFixed(1),
      avgPlayTime: Math.round(stats.totalPlayTime / stats.gamesPlayed),
      totalFouls: stats.totalFouls,
      avgFouls: (stats.totalFouls / stats.gamesPlayed).toFixed(1),
      wins: stats.wins,
      losses: stats.losses,
      winRate: stats.gamesPlayed > 0 ? ((stats.wins / stats.gamesPlayed) * 100).toFixed(1) : '0.0'
    })).sort((a, b) => b.totalPoints - a.totalPoints);
  });

  const totalGames = computed(() => gamesData.value.length);

  async function clearYearCache(year) {
    if (!isDbReady.value) await initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.value.transaction([STORE_NAME], 'readwrite');
      const objectStore = transaction.objectStore(STORE_NAME);
      const yearIndex = objectStore.index('year');
      const request = yearIndex.openCursor(IDBKeyRange.only(year));

      let deleteCount = 0;
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          deleteCount++;
          cursor.continue();
        } else {
          console.log('缓存已清除:', year, `(${deleteCount} 项)`);
          resolve();
        }
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async function clearAllCache() {
    if (!isDbReady.value) await initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.value.transaction([STORE_NAME], 'readwrite');
      const objectStore = transaction.objectStore(STORE_NAME);
      const request = objectStore.clear();

      request.onsuccess = () => {
        console.log('所有缓存已清除');
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  return {
    loading,
    currentYear,
    gamesData,
    filesConfig,
    isDbReady,
    playerAnnualStats,
    totalGames,
    initDB,
    loadYearData,
    clearYearCache,
    clearAllCache
  };
});
