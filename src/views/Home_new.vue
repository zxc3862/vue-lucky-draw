<template>
  <div class="home">
    <!-- 頂部導航 -->
    <nav class="nav-bar">
      <div class="nav-content">
        <h1 class="nav-title">🎯 抽球系統</h1>
        <div class="nav-actions">
          <div v-if="isAuthenticated" class="user-info">
            <span class="user-email">{{ currentUser?.email }}</span>
            <span class="user-role" :class="roleClass">{{ roleText }}</span>
            <button @click="handleLogout" class="logout-btn">登出</button>
          </div>
          <router-link v-else to="/admin/login" class="login-btn">🔐 登入</router-link>
        </div>
      </div>
    </nav>

    <!-- 主要內容 -->
    <main class="main-content">
      <!-- 歡迎區域 -->
      <section class="welcome-section">
        <div class="welcome-content">
          <h2>歡迎參與抽球活動！</h2>
          <p>球數越多，中獎機率越高！</p>
        </div>
      </section>

      <!-- 統計卡片 -->
      <section class="stats-section">
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon">👥</div>
            <div class="stat-content">
              <div class="stat-number">{{ players.length }}</div>
              <div class="stat-label">參與玩家</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">🎱</div>
            <div class="stat-content">
              <div class="stat-number">{{ totalBalls }}</div>
              <div class="stat-label">總球數</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">🏆</div>
            <div class="stat-content">
              <div class="stat-number">{{ drawHistory.length }}</div>
              <div class="stat-label">抽球次數</div>
            </div>
          </div>
        </div>
      </section>

      <!-- 抽球狀態 -->
      <section v-if="drawStatus" class="status-section">
        <div class="status-card" :class="`status-${drawStatus.status}`">
          <div class="status-icon">
            <span v-if="drawStatus.status === 'waiting'">⏳</span>
            <span v-else-if="drawStatus.status === 'drawing'">🎯</span>
            <span v-else="drawStatus.status === 'completed'">🎉</span>
          </div>
          <div class="status-content">
            <h3>{{ statusText }}</h3>
            <p v-if="drawStatus.current_winner">
              🏆 最新中獎者：{{ drawStatus.current_winner }}
            </p>
            <p v-if="drawStatus.last_draw_time" class="status-time">
              {{ new Date(drawStatus.last_draw_time).toLocaleString() }}
            </p>
          </div>
        </div>
      </section>

      <!-- 管理員控制區 -->
      <section v-if="isAdmin" class="admin-section">
        <div class="admin-card">
          <h3>🛠️ 管理員控制</h3>
          <div class="admin-actions">
            <router-link to="/admin/dashboard" class="action-btn primary">
              管理後台
            </router-link>
            <button @click="refreshData" class="action-btn secondary" :disabled="isRefreshing">
              {{ isRefreshing ? '更新中...' : '重新整理' }}
            </button>
          </div>
        </div>
      </section>

      <!-- 玩家排行榜 -->
      <section class="players-section">
        <h2>🏆 參與者排行榜</h2>
        <div v-if="players.length === 0" class="empty-state">
          <div class="empty-icon">🎱</div>
          <p>暫無參與者</p>
          <p v-if="isAdmin">請前往管理後台添加玩家</p>
        </div>
        <div v-else class="players-grid">
          <div v-for="(player, index) in players" :key="player.id" 
               class="player-card" 
               :class="{ 'top-player': index < 3 }">
            <div class="rank-badge" :class="`rank-${index + 1}`">
              <span v-if="index === 0">🥇</span>
              <span v-else-if="index === 1">🥈</span>
              <span v-else-if="index === 2">🥉</span>
              <span v-else>{{ index + 1 }}</span>
            </div>
            <div class="player-info">
              <div class="player-name">{{ player.name }}</div>
              <div class="player-balls">🎱 {{ player.balls }} 球</div>
            </div>
            <div class="player-stats">
              <div class="chance-bar">
                <div class="chance-fill" :style="{ width: `${getWinChance(player.balls)}%` }"></div>
              </div>
              <div class="chance-text">{{ Math.round(getWinChance(player.balls)) }}%</div>
            </div>
          </div>
        </div>
      </section>

      <!-- 抽球歷史 -->
      <section v-if="drawHistory.length > 0" class="history-section">
        <h2>📜 抽球歷史</h2>
        <div class="history-list">
          <div v-for="record in recentHistory" :key="record.id" class="history-item">
            <div class="history-icon">🎉</div>
            <div class="history-content">
              <div class="history-winner">{{ record.winner_name }}</div>
              <div class="history-time">{{ formatTime(record.draw_time) }}</div>
            </div>
            <div class="history-balls">{{ record.balls_before }} 球</div>
          </div>
        </div>
        <button v-if="drawHistory.length > 5" @click="showAllHistory = !showAllHistory" class="show-more-btn">
          {{ showAllHistory ? '收起' : `查看全部 ${drawHistory.length} 筆記錄` }}
        </button>
      </section>
    </main>
  </div>
</template>

<script setup>
import { supabase } from '../../supabaseClient'
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'

const router = useRouter()
const { 
  currentUser, 
  userRole, 
  isAuthenticated, 
  isAdmin, 
  isParticipant,
  checkAuth,
  logout
} = useAuth()

// 響應式數據
const players = ref([])
const drawHistory = ref([])
const drawStatus = ref(null)
const isRefreshing = ref(false)
const showAllHistory = ref(false)

// 計算屬性
const totalBalls = computed(() => players.value.reduce((sum, p) => sum + p.balls, 0))

const roleClass = computed(() => ({
  'role-admin': isAdmin.value,
  'role-participant': isParticipant.value
}))

const roleText = computed(() => {
  switch (userRole.value) {
    case 'admin': return '管理員'
    case 'participant': return '參加者'
    default: return '訪客'
  }
})

const statusText = computed(() => {
  if (!drawStatus.value) return ''
  
  switch (drawStatus.value.status) {
    case 'waiting': return '等待抽球'
    case 'drawing': return '抽球中...'
    case 'completed': return '抽球完成'
    default: return '未知狀態'
  }
})

const recentHistory = computed(() => {
  return showAllHistory.value 
    ? drawHistory.value 
    : drawHistory.value.slice(0, 5)
})

// 方法
const getWinChance = (balls) => {
  return totalBalls.value > 0 ? (balls / totalBalls.value) * 100 : 0
}

const formatTime = (timeString) => {
  const date = new Date(timeString)
  const now = new Date()
  const diffMs = now - date
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffHours / 24)
  
  if (diffDays > 0) {
    return `${diffDays} 天前`
  } else if (diffHours > 0) {
    return `${diffHours} 小時前`
  } else {
    return '剛剛'
  }
}

const fetchPlayers = async () => {
  try {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .order('balls', { ascending: false })
    
    if (error) throw error
    players.value = data || []
  } catch (error) {
    console.error('取得玩家資料失敗:', error)
  }
}

const fetchDrawHistory = async () => {
  try {
    const { data, error } = await supabase
      .from('draw_history')
      .select('*')
      .order('draw_time', { ascending: false })
      .limit(20)
    
    if (error) throw error
    drawHistory.value = data || []
  } catch (error) {
    console.error('取得抽球歷史失敗:', error)
  }
}

const fetchDrawStatus = async () => {
  try {
    const { data, error } = await supabase
      .from('draw_status')
      .select('*')
      .single()
    
    if (error && error.code !== 'PGRST116') throw error
    drawStatus.value = data
  } catch (error) {
    console.error('取得抽球狀態失敗:', error)
  }
}

const refreshData = async () => {
  isRefreshing.value = true
  try {
    await Promise.all([
      fetchPlayers(),
      fetchDrawHistory(),
      fetchDrawStatus()
    ])
  } catch (error) {
    console.error('重新整理失敗:', error)
  } finally {
    isRefreshing.value = false
  }
}

const handleLogout = async () => {
  try {
    await logout()
    router.push('/')
  } catch (error) {
    console.error('登出失敗:', error)
  }
}

// 初始化
onMounted(async () => {
  await checkAuth()
  await refreshData()
})
</script>

<style scoped>
/* 基本樣式 */
.home {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

/* 導航欄 */
.nav-bar {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  padding: 1rem 0;
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.nav-title {
  font-size: 1.5rem;
  font-weight: bold;
  color: #2d3748;
  margin: 0;
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.user-email {
  font-size: 0.875rem;
  color: #4a5568;
}

.user-role {
  padding: 0.25rem 0.5rem;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 600;
}

.role-admin {
  background: #fbb6ce;
  color: #97266d;
}

.role-participant {
  background: #bee3f8;
  color: #2b6cb0;
}

.logout-btn, .login-btn {
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  text-decoration: none;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.logout-btn {
  background: #fc8181;
  color: white;
}

.login-btn {
  background: #4299e1;
  color: white;
}

.logout-btn:hover, .login-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* 主要內容 */
.main-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

/* 歡迎區域 */
.welcome-section {
  text-align: center;
  margin-bottom: 3rem;
}

.welcome-content h2 {
  font-size: 2rem;
  color: white;
  margin-bottom: 0.5rem;
}

.welcome-content p {
  font-size: 1.125rem;
  color: rgba(255, 255, 255, 0.9);
}

/* 統計卡片 */
.stats-section {
  margin-bottom: 3rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
}

.stat-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 1rem;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s;
}

.stat-card:hover {
  transform: translateY(-4px);
}

.stat-icon {
  font-size: 2rem;
}

.stat-number {
  font-size: 2rem;
  font-weight: bold;
  color: #2d3748;
}

.stat-label {
  color: #718096;
  font-size: 0.875rem;
}

/* 狀態卡片 */
.status-section {
  margin-bottom: 3rem;
}

.status-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 1rem;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.status-waiting { border-left: 4px solid #f6ad55; }
.status-drawing { border-left: 4px solid #4299e1; }
.status-completed { border-left: 4px solid #48bb78; }

.status-icon {
  font-size: 2rem;
}

.status-content h3 {
  margin: 0 0 0.5rem 0;
  color: #2d3748;
}

.status-time {
  font-size: 0.875rem;
  color: #718096;
}

/* 管理員控制區 */
.admin-section {
  margin-bottom: 3rem;
}

.admin-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.admin-card h3 {
  margin: 0 0 1rem 0;
  color: #2d3748;
}

.admin-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.action-btn {
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  text-decoration: none;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn.primary {
  background: #4299e1;
  color: white;
}

.action-btn.secondary {
  background: #edf2f7;
  color: #4a5568;
}

.action-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 玩家排行榜 */
.players-section {
  margin-bottom: 3rem;
}

.players-section h2 {
  color: white;
  text-align: center;
  margin-bottom: 2rem;
}

.empty-state {
  text-align: center;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 1rem;
  padding: 3rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.players-grid {
  display: grid;
  gap: 1rem;
}

.player-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 1rem;
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.2s;
}

.player-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.top-player {
  background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
}

.rank-badge {
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 1.125rem;
}

.rank-1 { background: #ffd700; color: #b45309; }
.rank-2 { background: #c0c0c0; color: #4a5568; }
.rank-3 { background: #cd7f32; color: white; }

.player-info {
  flex: 1;
}

.player-name {
  font-weight: 600;
  color: #2d3748;
  margin-bottom: 0.25rem;
}

.player-balls {
  color: #718096;
  font-size: 0.875rem;
}

.player-stats {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
}

.chance-bar {
  width: 80px;
  height: 8px;
  background: #e2e8f0;
  border-radius: 4px;
  overflow: hidden;
}

.chance-fill {
  height: 100%;
  background: linear-gradient(90deg, #4299e1, #3182ce);
  transition: width 0.3s ease;
}

.chance-text {
  font-size: 0.75rem;
  font-weight: 600;
  color: #4299e1;
}

/* 抽球歷史 */
.history-section {
  margin-bottom: 3rem;
}

.history-section h2 {
  color: white;
  text-align: center;
  margin-bottom: 2rem;
}

.history-list {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 1rem;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.history-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border-bottom: 1px solid #e2e8f0;
}

.history-item:last-child {
  border-bottom: none;
}

.history-icon {
  font-size: 1.5rem;
}

.history-content {
  flex: 1;
}

.history-winner {
  font-weight: 600;
  color: #2d3748;
}

.history-time {
  font-size: 0.875rem;
  color: #718096;
}

.history-balls {
  font-size: 0.875rem;
  color: #4299e1;
  font-weight: 600;
}

.show-more-btn {
  width: 100%;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.95);
  border: none;
  border-radius: 0.5rem;
  margin-top: 1rem;
  cursor: pointer;
  color: #4299e1;
  font-weight: 500;
  transition: background 0.2s;
}

.show-more-btn:hover {
  background: white;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .nav-content {
    flex-direction: column;
    gap: 1rem;
  }

  .nav-title {
    font-size: 1.25rem;
  }

  .user-info {
    flex-direction: column;
    text-align: center;
    gap: 0.25rem;
  }

  .main-content {
    padding: 1rem;
  }

  .welcome-content h2 {
    font-size: 1.5rem;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .admin-actions {
    flex-direction: column;
  }

  .action-btn {
    text-align: center;
  }

  .player-card {
    flex-direction: column;
    text-align: center;
  }

  .player-stats {
    align-items: center;
  }

  .chance-bar {
    width: 120px;
  }
}

@media (max-width: 480px) {
  .nav-content {
    padding: 0 0.5rem;
  }

  .main-content {
    padding: 0.5rem;
  }

  .stat-card {
    padding: 1rem;
  }

  .status-card,
  .admin-card {
    padding: 1rem;
  }

  .player-card {
    padding: 0.75rem;
  }

  .history-item {
    padding: 0.75rem;
  }
}
</style>
