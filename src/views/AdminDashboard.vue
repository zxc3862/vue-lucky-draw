<template>
  <div class="dashboard-container">
    <!-- 檢查權限 -->
    <div v-if="!isAuthenticated" class="access-denied">
      <div class="access-card">
        <h2>🔐 需要登入</h2>
        <p>請先完成身份驗證才能存取管理後台</p>
        <router-link to="/admin/login" class="login-link">前往登入</router-link>
      </div>
    </div>
    
    <div v-else-if="!isAdmin && !isLoading" class="access-denied">
      <div class="access-card">
        <h2>⚠️ 權限不足</h2>
        <p>您需要管理員權限才能存取此頁面</p>
        <p v-if="userRole">目前角色：{{ roleText }}</p>
        <p v-else>未設定角色，請聯繫管理員</p>
        <router-link to="/" class="back-link">返回首頁</router-link>
      </div>
    </div>
    
    <!-- 管理後台主界面 -->
    <div v-else-if="isAdmin" class="dashboard">
      <!-- 頂部導航 -->
      <header class="dashboard-header">
        <div class="header-content">
          <h1>🛠️ 管理後台</h1>
          <div class="header-actions">
            <span class="admin-info">管理員：{{ currentUser?.email }}</span>
            <button @click="handleLogout" class="logout-btn">登出</button>
          </div>
        </div>
      </header>

      <!-- 主要內容 -->
      <main class="dashboard-main">
        <!-- 標籤頁導航 -->
        <nav class="tabs">
          <button 
            v-for="tab in tabs" 
            :key="tab.key"
            @click="activeTab = tab.key"
            class="tab-btn"
            :class="{ active: activeTab === tab.key }"
          >
            {{ tab.icon }} {{ tab.label }}
          </button>
        </nav>

        <!-- 玩家管理 -->
        <section v-if="activeTab === 'players'" class="tab-content">
          <div class="section-header">
            <h2>👥 玩家管理</h2>
            <button @click="refreshPlayers" class="refresh-btn" :disabled="isRefreshing">
              {{ isRefreshing ? '更新中...' : '🔄 重新整理' }}
            </button>
          </div>

          <!-- 新增玩家 -->
          <div class="add-player-card">
            <h3>➕ 新增玩家</h3>
            <div class="add-player-form">
              <input
                v-model="newPlayerName"
                placeholder="玩家姓名"
                @keyup.enter="addPlayer"
                class="player-input"
              />
              <input
                v-model.number="newPlayerBalls"
                type="number"
                min="1"
                placeholder="球數"
                class="balls-input"
              />
              <button @click="addPlayer" class="add-btn" :disabled="!newPlayerName.trim()">
                新增
              </button>
            </div>
          </div>

          <!-- 玩家列表 -->
          <div class="players-list">
            <div v-if="players.length === 0" class="empty-state">
              <div class="empty-icon">👥</div>
              <p>暫無玩家資料</p>
            </div>
            <div v-else class="players-grid">
              <div v-for="player in players" :key="player.id" class="player-item">
                <div class="player-info">
                  <span class="player-name">{{ player.name }}</span>
                  <div class="player-details">
                    <span class="player-balls">🎱 {{ player.balls }} 球</span>
                    <span class="participation-status" :class="{ active: player.is_participating }">
                      {{ player.is_participating ? '✅ 參與中' : '⏸️ 暫停參與' }}
                    </span>
                  </div>
                </div>
                <div class="player-actions">
                  <button @click="togglePlayerParticipation(player)" class="action-btn" :class="player.is_participating ? 'pause' : 'resume'">
                    {{ player.is_participating ? '⏸️' : '▶️' }}
                  </button>
                  <button @click="addBall(player.id)" class="action-btn add">+1</button>
                  <button @click="removeBall(player.id)" class="action-btn remove" :disabled="player.balls <= 0">-1</button>
                  <button @click="editPlayer(player)" class="action-btn edit">✏️</button>
                  <button @click="removePlayer(player.id, player.name)" class="action-btn delete">🗑️</button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- 抽球管理 -->
        <section v-if="activeTab === 'draw'" class="tab-content">
          <div class="section-header">
            <h2>🎯 抽球管理</h2>
          </div>

          <!-- 抽球狀態 -->
          <div class="draw-status-card">
            <h3>📊 抽球狀態</h3>
            <div class="status-grid">
              <div class="status-item">
                <span class="status-label">總玩家數</span>
                <span class="status-value">{{ players.length }}</span>
              </div>
              <div class="status-item">
                <span class="status-label">總球數</span>
                <span class="status-value">{{ totalBalls }}</span>
              </div>
              <div class="status-item">
                <span class="status-label">抽球次數</span>
                <span class="status-value">{{ drawHistory.length }}</span>
              </div>
            </div>
          </div>

          <!-- 抽球控制 -->
          <div class="draw-control-card">
            <h3>🎯 抽球控制</h3>
            <div class="draw-actions">
              <button 
                @click="performDraw" 
                class="draw-btn" 
                :disabled="totalBalls === 0 || isDrawing"
              >
                <span v-if="isDrawing">抽球中...</span>
                <span v-else>🎯 執行抽球 ({{ totalBalls }} 球)</span>
              </button>
              <button @click="clearAllBalls" class="clear-btn" :disabled="totalBalls === 0">
                🗑️ 清空所有球
              </button>
            </div>
            <p v-if="totalBalls === 0" class="draw-warning">
              ⚠️ 目前沒有球可以抽取，請先為玩家添加球數
            </p>
          </div>

          <!-- 系統重置控制 -->
          <div class="reset-control-card">
            <h3>🔄 系統重置</h3>
            <div class="reset-actions">
              <button @click="resetCurrentRound" class="reset-round-btn" :disabled="isResetting">
                {{ isResetting ? '重置中...' : '🔄 重置當局' }}
              </button>
              <button @click="resetAllData" class="reset-all-btn" :disabled="isResetting">
                {{ isResetting ? '重置中...' : '⚠️ 重置全部資料' }}
              </button>
            </div>
            <div class="reset-info">
              <p><strong>重置當局：</strong>清空所有球數，保留玩家與歷史記錄</p>
              <p><strong>重置全部資料：</strong>刪除所有玩家、歷史記錄，重新開始</p>
            </div>
          </div>

          <!-- 抽球歷史 -->
          <div v-if="drawHistory.length > 0" class="history-card">
            <h3>📜 抽球歷史</h3>
            <div class="history-list">
              <div v-for="record in recentHistory" :key="record.id" class="history-item">
                <div class="history-info">
                  <span class="history-winner">🏆 {{ record.winner_name }}</span>
                  <span class="history-time">{{ formatTime(record.draw_time) }}</span>
                </div>
                <span class="history-balls">{{ record.balls_before }} 球</span>
              </div>
            </div>
            <button v-if="drawHistory.length > 5" @click="showAllHistory = !showAllHistory" class="show-more-btn">
              {{ showAllHistory ? '收起' : `查看全部 ${drawHistory.length} 筆` }}
            </button>
          </div>
        </section>

        <!-- 用戶權限管理 -->
        <section v-if="activeTab === 'users'" class="tab-content">
          <div class="section-header">
            <h2>👤 用戶權限管理</h2>
          </div>

          <!-- 新增用戶角色 -->
          <div class="add-user-card">
            <h3>➕ 設定用戶角色</h3>
            <div class="add-user-form">
              <input
                v-model="newUserEmail"
                type="email"
                placeholder="用戶 Email"
                class="user-input"
              />
              <select v-model="newUserRole" class="role-select">
                <option value="">選擇角色</option>
                <option value="admin">管理員</option>
                <option value="participant">參加者</option>
              </select>
              <button @click="setUserRole" class="set-role-btn" :disabled="!newUserEmail || !newUserRole">
                設定角色
              </button>
            </div>
          </div>

          <!-- 用戶列表 -->
          <div class="users-list">
            <div v-if="userRoles.length === 0" class="empty-state">
              <div class="empty-icon">👤</div>
              <p>暫無用戶角色資料</p>
            </div>
            <div v-else class="users-grid">
              <div v-for="user in userRoles" :key="user.id" class="user-item">
                <div class="user-info">
                  <span class="user-email">{{ user.email }}</span>
                  <span class="user-role" :class="`role-${user.role}`">
                    {{ user.role === 'admin' ? '管理員' : '參加者' }}
                  </span>
                </div>
                <div class="user-actions">
                  <button @click="deleteUserRole(user.id, user.email)" class="action-btn delete">🗑️</button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>

    <!-- 載入狀態 -->
    <div v-else-if="isLoading" class="loading-state">
      <div class="loading-spinner"></div>
      <p>載入中...</p>
    </div>

    <!-- 編輯玩家對話框 -->
    <div v-if="editingPlayer" class="modal-overlay" @click="closeEditDialog">
      <div class="modal-content" @click.stop>
        <h3>✏️ 編輯玩家</h3>
        <div class="edit-form">
          <div class="form-group">
            <label>玩家姓名</label>
            <input v-model="editingPlayer.name" type="text" class="form-input" />
          </div>
          <div class="form-group">
            <label>球數</label>
            <input v-model.number="editingPlayer.balls" type="number" min="0" class="form-input" />
          </div>
          <div class="form-actions">
            <button @click="savePlayerEdit" class="save-btn">💾 儲存</button>
            <button @click="closeEditDialog" class="cancel-btn">❌ 取消</button>
          </div>
        </div>
      </div>
    </div>
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
  isLoading,
  checkAuth,
  setUserRole: setRole,
  logout
} = useAuth()

// 響應式數據
const players = ref([])
const drawHistory = ref([])
const userRoles = ref([])
const newPlayerName = ref('')
const newPlayerBalls = ref(1)
const newUserEmail = ref('')
const newUserRole = ref('')
const activeTab = ref('players')
const isRefreshing = ref(false)
const isDrawing = ref(false)
const isResetting = ref(false)
const showAllHistory = ref(false)
const editingPlayer = ref(null)

// 標籤頁配置
const tabs = [
  { key: 'players', label: '玩家管理', icon: '👥' },
  { key: 'draw', label: '抽球管理', icon: '🎯' },
  { key: 'users', label: '用戶權限', icon: '👤' }
]

// 計算屬性
const totalBalls = computed(() => 
  players.value
    .filter(p => p.is_participating) // 只計算參與中的玩家
    .reduce((sum, p) => sum + p.balls, 0)
)

const roleText = computed(() => {
  switch (userRole.value) {
    case 'admin': return '管理員'
    case 'participant': return '參加者'
    default: return '未設定'
  }
})

const recentHistory = computed(() => {
  return showAllHistory.value 
    ? drawHistory.value 
    : drawHistory.value.slice(0, 5)
})

// 方法
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
    alert('取得玩家資料失敗')
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

const fetchUserRoles = async () => {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    userRoles.value = data || []
  } catch (error) {
    console.error('取得用戶角色失敗:', error)
  }
}

const refreshPlayers = async () => {
  isRefreshing.value = true
  try {
    await fetchPlayers()
  } finally {
    isRefreshing.value = false
  }
}

const addPlayer = async () => {
  if (!newPlayerName.value.trim()) return alert('請輸入玩家姓名')
  
  try {
    const { error } = await supabase.from('players').insert([{
      name: newPlayerName.value.trim(),
      balls: newPlayerBalls.value || 1
    }])
    
    if (error) {
      if (error.message.includes('duplicate')) {
        alert('玩家姓名已存在')
      } else {
        throw error
      }
      return
    }
    
    newPlayerName.value = ''
    newPlayerBalls.value = 1
    await fetchPlayers()
  } catch (error) {
    console.error('新增玩家失敗:', error)
    alert('新增玩家失敗')
  }
}

const addBall = async (id) => {
  try {
    const player = players.value.find(p => p.id === id)
    const { error } = await supabase
      .from('players')
      .update({ balls: player.balls + 1 })
      .eq('id', id)
    
    if (error) throw error
    await fetchPlayers()
  } catch (error) {
    console.error('增加球數失敗:', error)
    alert('增加球數失敗')
  }
}

const removeBall = async (id) => {
  try {
    const player = players.value.find(p => p.id === id)
    if (player.balls <= 0) return
    
    const { error } = await supabase
      .from('players')
      .update({ balls: player.balls - 1 })
      .eq('id', id)
    
    if (error) throw error
    await fetchPlayers()
  } catch (error) {
    console.error('減少球數失敗:', error)
    alert('減少球數失敗')
  }
}

const editPlayer = (player) => {
  editingPlayer.value = { ...player }
}

const closeEditDialog = () => {
  editingPlayer.value = null
}

const savePlayerEdit = async () => {
  try {
    const { error } = await supabase
      .from('players')
      .update({
        name: editingPlayer.value.name,
        balls: editingPlayer.value.balls
      })
      .eq('id', editingPlayer.value.id)
    
    if (error) throw error
    
    closeEditDialog()
    await fetchPlayers()
  } catch (error) {
    console.error('更新玩家失敗:', error)
    alert('更新玩家失敗')
  }
}

const removePlayer = async (id, name) => {
  if (!confirm(`確定要刪除玩家「${name}」嗎？此操作無法撤銷。`)) return
  
  try {
    const { error } = await supabase.from('players').delete().eq('id', id)
    if (error) throw error
    await fetchPlayers()
  } catch (error) {
    console.error('刪除玩家失敗:', error)
    alert('刪除玩家失敗')
  }
}

const performDraw = async () => {
  if (totalBalls.value === 0) return alert('沒有球可以抽取')
  
  isDrawing.value = true
  
  try {
    // 只從參與中的玩家建立球池
    const participatingPlayers = players.value.filter(player => player.is_participating && player.balls > 0)
    
    if (participatingPlayers.length === 0) {
      alert('沒有參與中的玩家有球可以抽取')
      return
    }
    
    // 建立球池
    const ballPool = participatingPlayers.flatMap(player => 
      Array(player.balls).fill(player)
    )
    
    // 隨機抽取
    const winner = ballPool[Math.floor(Math.random() * ballPool.length)]
    
    // 記錄抽球歷史
    const { error: historyError } = await supabase.from('draw_history').insert([{
      winner_id: winner.id,
      winner_name: winner.name,
      balls_before: winner.balls,
      drawn_by: currentUser.value?.id
    }])
    
    if (historyError) throw historyError
    
    // 減少中獎者球數
    const { error: updateError } = await supabase
      .from('players')
      .update({ balls: winner.balls - 1 })
      .eq('id', winner.id)
    
    if (updateError) throw updateError
    
    alert(`🎉 恭喜 ${winner.name} 中獎！`)
    
    await Promise.all([fetchPlayers(), fetchDrawHistory()])
  } catch (error) {
    console.error('抽球失敗:', error)
    alert('抽球過程中發生錯誤')
  } finally {
    isDrawing.value = false
  }
}

const clearAllBalls = async () => {
  if (!confirm('確定要清空所有玩家的球數嗎？此操作無法撤銷。')) return
  
  try {
    const { error } = await supabase
      .from('players')
      .update({ balls: 0 })
      .neq('id', '00000000-0000-0000-0000-000000000000') // 更新所有記錄
    
    if (error) throw error
    await fetchPlayers()
  } catch (error) {
    console.error('清空球數失敗:', error)
    alert('清空球數失敗')
  }
}

const setUserRole = async () => {
  if (!newUserEmail.value || !newUserRole.value) return
  
  try {
    const result = await setRole(newUserEmail.value, newUserRole.value)
    
    if (result.success) {
      alert('用戶角色設定成功')
      newUserEmail.value = ''
      newUserRole.value = ''
      await fetchUserRoles()
    } else {
      alert(result.error || '設定用戶角色失敗')
    }
  } catch (error) {
    console.error('設定用戶角色失敗:', error)
    alert('設定用戶角色失敗')
  }
}

const deleteUserRole = async (id, email) => {
  if (!confirm(`確定要刪除用戶「${email}」的角色嗎？`)) return
  
  try {
    const { error } = await supabase.from('user_roles').delete().eq('id', id)
    if (error) throw error
    await fetchUserRoles()
  } catch (error) {
    console.error('刪除用戶角色失敗:', error)
    alert('刪除用戶角色失敗')
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

const resetCurrentRound = async () => {
  const confirmMessage = '確定要重置當局嗎？\n\n這將：\n- 清空所有玩家的球數\n- 保留玩家名單和歷史記錄\n\n此操作無法撤銷。'
  
  if (!confirm(confirmMessage)) return
  
  isResetting.value = true
  
  try {
    // 清空所有玩家球數
    const { error: clearBallsError } = await supabase
      .from('players')
      .update({ balls: 0 })
      .neq('id', '00000000-0000-0000-0000-000000000000') // 更新所有記錄
    
    if (clearBallsError) throw clearBallsError
    
    // 更新抽球狀態
    const { error: statusError } = await supabase
      .from('draw_status')
      .update({ 
        status: 'waiting',
        current_winner: null,
        total_participants: 0,
        total_balls: 0,
        last_draw_time: null,
        updated_at: new Date().toISOString()
      })
    
    if (statusError) throw statusError
    
    alert('✅ 當局重置完成！所有玩家球數已清空。')
    
    await Promise.all([fetchPlayers(), fetchDrawHistory()])
  } catch (error) {
    console.error('重置當局失敗:', error)
    alert('重置失敗，請稍後再試')
  } finally {
    isResetting.value = false
  }
}

const resetAllData = async () => {
  const confirmMessage = '🚨 警告：您即將重置全部資料！\n\n這將：\n- 刪除所有玩家資料\n- 刪除所有抽球歷史\n- 重置抽球狀態\n\n此操作無法撤銷！\n\n請輸入 "RESET" 確認此操作。'
  
  const userInput = prompt(confirmMessage)
  if (userInput !== 'RESET') {
    alert('已取消重置操作')
    return
  }
  
  isResetting.value = true
  
  try {
    // 刪除所有抽球歷史
    const { error: historyError } = await supabase
      .from('draw_history')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // 刪除所有記錄
    
    if (historyError) throw historyError
    
    // 刪除所有玩家
    const { error: playersError } = await supabase
      .from('players')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // 刪除所有記錄
    
    if (playersError) throw playersError
    
    // 重置抽球狀態
    const { error: statusError } = await supabase
      .from('draw_status')
      .update({ 
        status: 'waiting',
        current_winner: null,
        total_participants: 0,
        total_balls: 0,
        last_draw_time: null,
        updated_at: new Date().toISOString()
      })
    
    if (statusError) throw statusError
    
    alert('✅ 全部資料重置完成！系統已回到初始狀態。')
    
    await Promise.all([fetchPlayers(), fetchDrawHistory()])
  } catch (error) {
    console.error('重置全部資料失敗:', error)
    alert('重置失敗，請稍後再試')
  } finally {
    isResetting.value = false
  }
}

// 初始化
onMounted(async () => {
  await checkAuth()
  if (isAdmin.value) {
    await Promise.all([
      fetchPlayers(),
      fetchDrawHistory(),
      fetchUserRoles()
    ])
  }
})
</script>

<style scoped>
/* 基本樣式 */
.dashboard-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

/* 權限檢查頁面 */
.access-denied {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 1rem;
}

.access-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 1rem;
  padding: 3rem;
  text-align: center;
  max-width: 400px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.access-card h2 {
  color: #2d3748;
  margin-bottom: 1rem;
}

.access-card p {
  color: #718096;
  margin-bottom: 1rem;
}

.login-link, .back-link {
  display: inline-block;
  padding: 0.75rem 1.5rem;
  background: #4299e1;
  color: white;
  text-decoration: none;
  border-radius: 0.5rem;
  font-weight: 500;
  transition: all 0.2s;
}

.login-link:hover, .back-link:hover {
  background: #3182ce;
  transform: translateY(-2px);
}

/* 管理後台 */
.dashboard {
  min-height: 100vh;
}

.dashboard-header {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  padding: 1rem 0;
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-content h1 {
  color: #2d3748;
  margin: 0;
  font-size: 1.5rem;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.admin-info {
  color: #4a5568;
  font-size: 0.875rem;
}

.logout-btn {
  padding: 0.5rem 1rem;
  background: #fc8181;
  color: white;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.logout-btn:hover {
  background: #f56565;
  transform: translateY(-2px);
}

/* 主要內容 */
.dashboard-main {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

/* 標籤頁 */
.tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 2rem;
  background: rgba(255, 255, 255, 0.1);
  padding: 0.5rem;
  border-radius: 1rem;
}

.tab-btn {
  flex: 1;
  padding: 0.75rem 1rem;
  background: transparent;
  color: rgba(255, 255, 255, 0.7);
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.tab-btn.active {
  background: rgba(255, 255, 255, 0.95);
  color: #2d3748;
}

.tab-btn:hover:not(.active) {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

/* 內容區域 */
.tab-content {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.section-header h2 {
  color: white;
  margin: 0;
}

.refresh-btn {
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
}

.refresh-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.3);
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 卡片樣式 */
.add-player-card,
.draw-status-card,
.draw-control-card,
.history-card,
.add-user-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 1rem;
  padding: 1.5rem;
  margin-bottom: 2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.add-player-card h3,
.draw-status-card h3,
.draw-control-card h3,
.history-card h3,
.add-user-card h3 {
  margin: 0 0 1rem 0;
  color: #2d3748;
}

/* 表單樣式 */
.add-player-form,
.add-user-form {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.player-input,
.balls-input,
.user-input {
  flex: 1;
  min-width: 200px;
  padding: 0.75rem;
  border: 2px solid #e2e8f0;
  border-radius: 0.5rem;
  font-size: 1rem;
}

.balls-input {
  max-width: 120px;
}

.role-select {
  padding: 0.75rem;
  border: 2px solid #e2e8f0;
  border-radius: 0.5rem;
  font-size: 1rem;
  background: white;
}

.add-btn,
.set-role-btn {
  padding: 0.75rem 1.5rem;
  background: #48bb78;
  color: white;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.add-btn:hover:not(:disabled),
.set-role-btn:hover:not(:disabled) {
  background: #38a169;
  transform: translateY(-2px);
}

.add-btn:disabled,
.set-role-btn:disabled {
  background: #a0aec0;
  cursor: not-allowed;
  transform: none;
}

/* 列表樣式 */
.players-list,
.users-list {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 1rem;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: #718096;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.players-grid,
.users-grid {
  display: flex;
  flex-direction: column;
}

.player-item,
.user-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid #e2e8f0;
}

.player-item:last-child,
.user-item:last-child {
  border-bottom: none;
}

.player-info,
.user-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.player-details {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.player-name,
.user-email {
  font-weight: 600;
  color: #2d3748;
}

.player-balls {
  color: #718096;
  font-size: 0.875rem;
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

.player-actions,
.user-actions {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  padding: 0.5rem;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s;
}

.action-btn.add { background: #48bb78; color: white; }
.action-btn.remove { background: #ed8936; color: white; }
.action-btn.edit { background: #4299e1; color: white; }
.action-btn.delete { background: #f56565; color: white; }

.action-btn.pause {
  background: #ed8936;
  color: white;
}

.action-btn.resume {
  background: #48bb78;
  color: white;
}

.action-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

/* 抽球控制 */
.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
}

.status-item {
  text-align: center;
  padding: 1rem;
  background: #f7fafc;
  border-radius: 0.5rem;
}

.status-label {
  display: block;
  font-size: 0.875rem;
  color: #718096;
  margin-bottom: 0.5rem;
}

.status-value {
  display: block;
  font-size: 1.5rem;
  font-weight: bold;
  color: #2d3748;
}

.draw-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.draw-btn {
  flex: 1;
  min-width: 200px;
  padding: 1rem;
  background: #4299e1;
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-size: 1.125rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.draw-btn:hover:not(:disabled) {
  background: #3182ce;
  transform: translateY(-2px);
}

.draw-btn:disabled {
  background: #a0aec0;
  cursor: not-allowed;
  transform: none;
}

.clear-btn {
  padding: 1rem;
  background: #f56565;
  color: white;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.clear-btn:hover:not(:disabled) {
  background: #e53e3e;
  transform: translateY(-2px);
}

.clear-btn:disabled {
  background: #a0aec0;
  cursor: not-allowed;
  transform: none;
}

.draw-warning {
  color: #d69e2e;
  font-size: 0.875rem;
  margin: 1rem 0 0 0;
  text-align: center;
}

/* 歷史記錄 */
.history-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #f7fafc;
  border-radius: 0.5rem;
}

.history-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
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
  padding: 0.75rem;
  background: #e2e8f0;
  color: #4a5568;
  border: none;
  border-radius: 0.5rem;
  margin-top: 1rem;
  cursor: pointer;
  transition: background 0.2s;
}

.show-more-btn:hover {
  background: #cbd5e0;
}

/* 載入狀態 */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  color: white;
}

.loading-spinner {
  width: 3rem;
  height: 3rem;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top: 4px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 模態框 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  background: white;
  border-radius: 1rem;
  padding: 2rem;
  max-width: 400px;
  width: 100%;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.modal-content h3 {
  margin: 0 0 1.5rem 0;
  color: #2d3748;
}

.edit-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-weight: 500;
  color: #374151;
}

.form-input {
  padding: 0.75rem;
  border: 2px solid #e2e8f0;
  border-radius: 0.5rem;
  font-size: 1rem;
}

.form-input:focus {
  outline: none;
  border-color: #4299e1;
}

.form-actions {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
}

.save-btn,
.cancel-btn {
  flex: 1;
  padding: 0.75rem;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.save-btn {
  background: #48bb78;
  color: white;
}

.save-btn:hover {
  background: #38a169;
}

.cancel-btn {
  background: #e2e8f0;
  color: #4a5568;
}

.cancel-btn:hover {
  background: #cbd5e0;
}

/* 系統重置控制 */
.reset-control-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 1rem;
  padding: 1.5rem;
  margin-bottom: 2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  border-left: 4px solid #f56565;
}

.reset-control-card h3 {
  margin: 0 0 1rem 0;
  color: #2d3748;
}

.reset-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}

.reset-round-btn,
.reset-all-btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.reset-round-btn {
  background: #ed8936;
  color: white;
}

.reset-round-btn:hover:not(:disabled) {
  background: #dd6b20;
  transform: translateY(-2px);
}

.reset-all-btn {
  background: #f56565;
  color: white;
}

.reset-all-btn:hover:not(:disabled) {
  background: #e53e3e;
  transform: translateY(-2px);
}

.reset-round-btn:disabled,
.reset-all-btn:disabled {
  background: #a0aec0;
  cursor: not-allowed;
  transform: none;
}

.reset-info {
  padding: 1rem;
  background: #fff5f5;
  border-radius: 0.5rem;
  border: 1px solid #feb2b2;
}

.reset-info p {
  margin: 0.5rem 0;
  font-size: 0.875rem;
  color: #742a2a;
}

.reset-info p:first-child {
  margin-top: 0;
}

.reset-info p:last-child {
  margin-bottom: 0;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    gap: 1rem;
  }

  .header-actions {
    flex-direction: column;
    text-align: center;
    gap: 0.5rem;
  }

  .dashboard-main {
    padding: 1rem;
  }

  .tabs {
    flex-direction: column;
  }

  .section-header {
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }

  .add-player-form,
  .add-user-form {
    flex-direction: column;
  }

  .player-input,
  .user-input {
    min-width: auto;
  }

  .draw-actions {
    flex-direction: column;
  }

  .draw-btn {
    min-width: auto;
  }

  .status-grid {
    grid-template-columns: 1fr;
  }

  .player-item,
  .user-item {
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }

  .player-actions,
  .user-actions {
    align-self: stretch;
    justify-content: center;
  }

  .form-actions {
    flex-direction: column;
  }
}

@media (max-width: 480px) {
  .dashboard-main {
    padding: 0.5rem;
  }

  .add-player-card,
  .draw-status-card,
  .draw-control-card,
  .history-card,
  .add-user-card {
    padding: 1rem;
  }

  .player-item,
  .user-item {
    padding: 0.75rem;
  }

  .modal-content {
    padding: 1.5rem;
  }
}
</style>
