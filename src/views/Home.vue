<template>
  <div class="home">
    <!-- 通知 Toast -->
    <transition name="toast">
      <div v-if="toastMessage" class="toast" :class="toastType">
        <div class="toast-content">
          <span class="toast-icon">{{ toastIcon }}</span>
          <span class="toast-text">{{ toastMessage }}</span>
        </div>
      </div>
    </transition>

    <!-- 頂部導航 -->
    <nav class="nav-bar">
      <div class="nav-content">
        <h1 class="nav-title">🎯 抽球系統</h1>
        <div class="nav-actions">
          <div v-if="isAuthenticated" class="user-info">
            <div class="user-display">
              <span class="user-name" @click="openEditNameDialog" :title="'點擊編輯顯示名稱'">
                {{ displayName }} ✏️
              </span>
              <span class="user-role" :class="roleClass">{{ roleText }}</span>
            </div>
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
              {{ formatTime(drawStatus.last_draw_time) }}
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

      <!-- 參與控制區 -->
      <section v-if="canParticipate" class="participation-section">
        <div class="participation-card">
          <h3>🎯 參與抽球</h3>
          <div class="participation-content">
            <div v-if="userPlayer" class="player-status">
              <div class="status-info">
                <span class="player-name">{{ displayName }}</span>
                <span class="player-balls">🎱 {{ userPlayer.balls }} 球</span>
                <span class="participation-status" :class="{ active: isParticipating }">
                  {{ isParticipating ? '✅ 參與中' : '⏸️ 已被暫停' }}
                </span>
              </div>
              <div class="status-actions">
                <button @click="openEditNameDialog" class="edit-name-btn">
                  ✏️ 修改名稱
                </button>
              </div>
            </div>
      <div v-else class="join-prompt">
        <p>您還沒有參與抽球活動</p>
        <p v-if="displayName" class="display-name-info">
          將使用顯示名稱：<strong>{{ displayName }}</strong>
        </p>
        <button @click="handleToggleParticipation" class="join-btn" :disabled="participationLoading">
          {{ participationLoading ? '處理中...' : '加入抽球' }}
        </button>
      </div>
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
              <div class="player-name">{{ player.display_name || player.name }}</div>
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
          <div v-for="record in processedHistory" :key="record.id" class="history-item">
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

    <!-- 編輯名稱對話框 -->
    <div v-if="showEditName" class="modal-overlay" @click="closeEditNameDialog">
      <div class="modal-content" @click.stop>
        <h3>✏️ 修改顯示名稱</h3>
        <div class="edit-form">
          <div class="form-group">
            <label>顯示名稱</label>
            <input v-model="newPlayerName" type="text" class="form-input" placeholder="請輸入您想要的顯示名稱" />
          </div>
          
          <div class="form-actions">
            <button 
              type="button"
              @click="handleUpdateName" 
              :disabled="!newPlayerName.trim() || isSaving"
              class="btn btn-primary"
            >
              {{ isSaving ? '⏳ 處理中...' : '💾 儲存' }}
            </button>
            
            <button 
              type="button"
              @click="closeEditNameDialog" 
              class="btn btn-secondary"
            >
              {{ isSaving ? '🚫 強制取消' : '❌ 取消' }}
            </button>
            
            <!-- 保留純 HTTP 測試按鈕以備不時之需 -->
            <button 
              v-if="false"
              type="button"
              @click="testPureHTTP" 
              :disabled="isSaving"
              class="btn btn-success"
              style="background: #38a169; color: white; font-size: 0.8rem;"
            >
              🔥 純 HTTP 測試
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { supabase } from '../../supabaseClient'
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { useParticipation } from '../composables/useParticipation'

const router = useRouter()
const { 
  currentUser, 
  userRole, 
  displayName,
  isLoading,
  isCheckingAuth,
  isAuthenticated, 
  isAdmin, 
  isParticipant,
  checkAuth,
  fetchUserRole,
  updateUserDisplayName,
  updateUserDisplayNameSimple,
  updateUserDisplayNameLocal,
  updateUserDisplayNamePureHTTP,
  logout
} = useAuth()

const {
  isParticipating,
  userPlayer,
  canParticipate,
  participationText,
  checkParticipationStatus,
  toggleParticipation,
  updatePlayerName
} = useParticipation()

// 響應式數據
const players = ref([])
const drawHistory = ref([])
const drawStatus = ref(null)
const isRefreshing = ref(false)
const showAllHistory = ref(false)
const participationLoading = ref(false)

// 編輯名稱相關
const showEditName = ref(false)
const newPlayerName = ref('')
const isSaving = ref(false)

// Toast 通知系統
const toastMessage = ref('')
const toastType = ref('success')
const toastTimeout = ref(null)

const toastIcon = computed(() => {
  switch (toastType.value) {
    case 'success': return '✅'
    case 'error': return '❌'
    case 'warning': return '⚠️'
    case 'info': return 'ℹ️'
    default: return '📢'
  }
})

const showToast = (message, type = 'success', duration = 3000) => {
  toastMessage.value = message
  toastType.value = type
  
  if (toastTimeout.value) {
    clearTimeout(toastTimeout.value)
  }
  
  toastTimeout.value = setTimeout(() => {
    toastMessage.value = ''
  }, duration)
}

// 計算屬性
const totalBalls = computed(() => 
  players.value
    .filter(p => p.is_participating) // 只計算參與中的玩家
    .reduce((sum, p) => sum + p.balls, 0)
)

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

// 處理歷史記錄，動態更新當前用戶的顯示名稱
const processedHistory = computed(() => {
  if (!drawHistory.value.length) return []
  
  console.log('🔍 processedHistory: 開始處理歷史記錄')
  console.log('  - currentUser:', currentUser.value?.email, 'id:', currentUser.value?.id)
  console.log('  - displayName:', displayName.value)
  
  const userPlayerInfo = userPlayer.value ? {
    id: userPlayer.value.id,
    user_id: userPlayer.value.user_id,
    name: userPlayer.value.name,
    display_name: userPlayer.value.display_name,
    email: userPlayer.value.email
  } : null
  console.log('  - userPlayer 詳細信息:', userPlayerInfo)
  
  const historyInfo = drawHistory.value.slice(0, 3).map(r => ({ 
    winner_name: r.winner_name, 
    winner_id: r.winner_id, 
    winner_email: r.winner_email,
    id: r.id
  }))
  console.log('  - 前3筆歷史記錄詳細:', historyInfo)
  
  const processed = recentHistory.value.map(record => {
    // 如果當前用戶已登入且有顯示名稱
    if (currentUser.value && displayName.value && record.winner_name !== displayName.value) {
      
      // 方法1: 通過 winner_id 直接匹配當前用戶ID
      if (record.winner_id && record.winner_id === currentUser.value.id) {
        console.log('🔄 歷史記錄匹配 (winner_id):', record.winner_name, '->', displayName.value)
        return {
          ...record,
          winner_name: displayName.value
        }
      }
      
      // 方法2: 通過 userPlayer 的 id 匹配（這是正確的匹配方式）
      if (userPlayer.value && record.winner_id === userPlayer.value.id) {
        console.log('🔄 歷史記錄匹配 (userPlayer.id):', record.winner_name, '->', displayName.value)
        return {
          ...record,
          winner_name: displayName.value
        }
      }
      
      // 方法3: 通過 email 匹配
      if (record.winner_email === currentUser.value.email) {
        console.log('🔄 歷史記錄匹配 (winner_email):', record.winner_name, '->', displayName.value)
        return {
          ...record,
          winner_name: displayName.value
        }
      }
      
      // 方法4: 通過 winner_name 與當前用戶 email 匹配（舊的歷史記錄可能用 email 作為名稱）
      if (record.winner_name === currentUser.value.email) {
        console.log('🔄 歷史記錄匹配 (email as name):', record.winner_name, '->', displayName.value)
        return {
          ...record,
          winner_name: displayName.value
        }
      }
      
      // 方法5: 通過玩家名稱匹配（檢查是否與 userPlayer 的舊名稱匹配）
      if (userPlayer.value && (
        record.winner_name === userPlayer.value.name || 
        record.winner_name === userPlayer.value.display_name
      )) {
        console.log('🔄 歷史記錄匹配 (player name):', record.winner_name, '->', displayName.value)
        return {
          ...record,
          winner_name: displayName.value
        }
      }
    }
    
    // 否則使用原始的 winner_name
    return record
  })
  
  console.log('📜 處理後的歷史記錄:', processed.map(r => r.winner_name))
  
  return processed
})

// 調試信息 - 在開發環境中監控 userPlayer 和 isParticipating 的狀態變化
watch([userPlayer, isParticipating, canParticipate], ([newUserPlayer, newIsParticipating, newCanParticipate], [oldUserPlayer, oldIsParticipating, oldCanParticipate]) => {
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 Home.vue: 參與狀態變化')
    console.log('  - userPlayer:', oldUserPlayer, '->', newUserPlayer)
    console.log('  - isParticipating:', oldIsParticipating, '->', newIsParticipating) 
    console.log('  - canParticipate:', oldCanParticipate, '->', newCanParticipate)
    console.log('  - 當前用戶:', currentUser.value?.email)
    console.log('  - 用戶角色:', userRole.value)
    console.log('  - 顯示哪個UI:', newUserPlayer ? '狀態和修改名稱' : '加入抽球按鈕')
  }
}, { immediate: true })

// 監控 currentUser 變化，當用戶登入狀態改變時重新檢查參與狀態
watch(currentUser, async (newUser, oldUser) => {
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 Home.vue: currentUser 狀態變化')
    console.log('  - oldUser:', oldUser?.email || 'null')
    console.log('  - newUser:', newUser?.email || 'null')
  }
  
  if (newUser && newUser !== oldUser) {
    console.log('✅ 用戶登入狀態改變，重新檢查參與狀態')
    // 等待一小段時間確保用戶資料完全同步
    await new Promise(resolve => setTimeout(resolve, 200))
    await checkParticipationStatus()
  } else if (!newUser && oldUser) {
    console.log('❌ 用戶登出，清空參與狀態')
    // 用戶登出時清空參與狀態
    userPlayer.value = null
    isParticipating.value = false
  }
})

// 組件掛載時初始化
onMounted(async () => {
  console.log('🚀 Home.vue: 組件掛載，開始初始化')
  
  // 先確保認證狀態檢查完成
  console.log('🔍 等待認證狀態檢查完成...')
  await checkAuth()
  
  // 等待一小段時間確保 currentUser 完全初始化
  await new Promise(resolve => setTimeout(resolve, 100))
  
  console.log('📊 認證狀態檢查後:')
  console.log('  - currentUser:', currentUser.value?.email)
  console.log('  - userRole:', userRole.value)
  console.log('  - isAuthenticated:', isAuthenticated.value)
  
  // 如果用戶已登入，才檢查參與狀態
  if (currentUser.value) {
    console.log('✅ 用戶已登入，檢查參與狀態')
    await checkParticipationStatus()
  } else {
    console.log('❌ 用戶未登入，跳過參與狀態檢查')
  }
  
  // 刷新數據
  await refreshData()
  
  console.log('✅ Home.vue: 初始化完成')
})

// 方法
const getWinChance = (balls) => {
  return totalBalls.value > 0 ? (balls / totalBalls.value) * 100 : 0
}

const formatTime = (timeString) => {
  const date = new Date(timeString)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

const fetchPlayers = async () => {
  try {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('is_participating', true) // 只顯示參與中的玩家
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
    console.log('📜 獲取抽球歷史:', data)
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
  console.log('🔄 refreshData: 開始刷新數據')
  isRefreshing.value = true
  try {
    await Promise.all([
      fetchPlayers(),
      fetchDrawHistory(),
      fetchDrawStatus()
    ])
    console.log('✅ refreshData: 所有數據刷新成功')
  } catch (error) {
    console.error('refreshData: 重新整理失敗:', error)
  } finally {
    isRefreshing.value = false
  }
}

const handleLogout = async () => {
  console.log('🔄 登出按鈕被點擊')
  if (!confirm('確定要登出嗎？')) {
    console.log('❌ 用戶取消登出')
    return
  }
  
  console.log('🔄 用戶確認登出，執行登出...')
  try {
    const result = await logout()
    console.log('📊 登出結果:', result)
    
    if (result.success) {
      console.log('🔄 準備重新載入頁面...')
      // 立即清除所有狀態並重新載入，不顯示 alert
      sessionStorage.clear()
      localStorage.clear()
      window.location.href = '/'
    } else {
      alert('❌ 登出失敗: ' + (result.error || '未知錯誤'))
    }
  } catch (error) {
    console.error('❌ 登出異常:', error)
    alert('❌ 登出時發生錯誤: ' + error.message)
  }
}

const handleToggleParticipation = async () => {
  participationLoading.value = true
  try {
    console.log('🚀 handleToggleParticipation 開始')
    console.log('  - 當前 userPlayer:', userPlayer.value)
    console.log('  - 當前 isParticipating:', isParticipating.value)
    
    const result = await toggleParticipation()
    console.log('📊 toggleParticipation 結果:', result)
    
    if (result.success) {
      showToast(result.message, 'success')
      
      // 重新檢查參與狀態，確保 userPlayer 狀態正確更新
      console.log('🔄 重新檢查參與狀態...')
      await checkParticipationStatus()
      console.log('📊 檢查後 userPlayer:', userPlayer.value)
      console.log('📊 檢查後 isParticipating:', isParticipating.value)
      
      await refreshData() // 重新整理數據顯示最新狀態
      console.log('✅ 數據重新整理完成')
    } else {
      showToast(result.error, 'error')
    }
  } catch (error) {
    console.error('加入抽球失敗:', error)
    showToast('操作失敗，請稍後再試', 'error')
  } finally {
    participationLoading.value = false
    console.log('🏁 handleToggleParticipation 完成')
  }
}

const openEditNameDialog = () => {
  console.log('🔄 openEditNameDialog 被調用')
  console.log('📊 當前狀態:')
  console.log('  - displayName:', displayName.value)
  console.log('  - userPlayer:', userPlayer.value)
  console.log('  - currentUser:', currentUser.value)
  
  // 優先使用 displayName，備用為 userPlayer 的名稱
  newPlayerName.value = displayName.value || userPlayer.value?.display_name || userPlayer.value?.name || ''
  console.log('📝 預填名稱:', newPlayerName.value)
  
  showEditName.value = true
  console.log('✅ 對話框應該顯示了，showEditName:', showEditName.value)
}

const closeEditNameDialog = () => {
  console.log('🔄 closeEditNameDialog 被調用')
  console.log('📊 當前狀態: isSaving =', isSaving.value)
  
  // 強制重置狀態
  showEditName.value = false
  newPlayerName.value = ''
  isSaving.value = false
  
  console.log('✅ 對話框已關閉，狀態已重置')
}

const handleUpdateName = async () => {
  console.log('🔄 handleUpdateName 開始執行')
  
  try {
    if (!newPlayerName.value.trim()) {
      showToast('請輸入顯示名稱', 'warning')
      return
    }
    
    isSaving.value = true
    console.log('⏳ 設定 isSaving = true')
    
    // 創建總體超時控制 (8秒)
    const overallTimeout = setTimeout(() => {
      console.error('❌ 整體操作超時')
      isSaving.value = false
      showToast('操作超時，請稍後再試', 'error')
    }, 8000)
    
    let result = { success: false, error: '未知錯誤' }
    
    try {
      // 使用新的純 HTTP 方法 (同時更新 Auth 和 user_roles)
      console.log('🔄 使用新的純 HTTP 方法更新...')
      result = await updateUserDisplayNamePureHTTP(newPlayerName.value.trim())
      console.log('📊 純 HTTP 結果:', result)
      
      // 純 HTTP 方法完成後立即清除超時
      clearTimeout(overallTimeout)
      
    } catch (pureHttpError) {
      console.warn('⚠️ 純 HTTP 方法失敗:', pureHttpError)
      
      // 如果純 HTTP 方法失敗，嘗試原有的 updateUserDisplayName 方法
      try {
        console.log('🔄 嘗試 updateUserDisplayName 方法...')
        result = await Promise.race([
          updateUserDisplayName(newPlayerName.value.trim()),
          new Promise((_, reject) => setTimeout(() => reject(new Error('updateUserDisplayName 超時')), 5000))
        ])
        console.log('📊 updateUserDisplayName 結果:', result)
        
        // 清除超時
        clearTimeout(overallTimeout)
        
      } catch (updateError) {
        console.warn('⚠️ updateUserDisplayName 也失敗:', updateError)
        
        // 最後嘗試簡化版方法
        try {
          console.log('🔄 最後嘗試簡化版方法...')
          result = await Promise.race([
            updateUserDisplayNameSimple(newPlayerName.value.trim()),
            new Promise((_, reject) => setTimeout(() => reject(new Error('updateUserDisplayNameSimple 超時')), 3000))
          ])
          console.log('📊 updateUserDisplayNameSimple 結果:', result)
          
          // 清除超時
          clearTimeout(overallTimeout)
          
        } catch (simpleError) {
          console.warn('⚠️ 所有方法都失敗了:', simpleError)
          result = { success: false, error: `所有更新方法都失敗: ${simpleError.message}` }
          
          // 清除超時
          clearTimeout(overallTimeout)
        }
      }
    }
    
    // 如果用戶有玩家記錄，也嘗試使用參與方法更新（非阻塞）
    if (result.success && userPlayer.value) {
      try {
        console.log('🔄 更新玩家記錄...')
        await Promise.race([
          updatePlayerName(newPlayerName.value.trim()),
          new Promise((_, reject) => setTimeout(() => reject(new Error('updatePlayerName 超時')), 3000))
        ])
        console.log('✅ 玩家記錄更新成功')
      } catch (playerError) {
        console.warn('⚠️ 更新玩家顯示名稱失敗，但用戶顯示名稱已更新:', playerError)
      }
    }
    
    console.log('📊 最終結果:', result)
    
    if (result.success) {
      console.log('✅ 更新成功，顯示成功訊息')
      showToast(result.message || '顯示名稱更新成功！', 'success')
      closeEditNameDialog()
      
      // 刷新頁面數據以確保同步（非阻塞）
      try {
        console.log('🔄 刷新頁面數據...')
        await Promise.race([
          refreshData(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('refreshData 超時')), 3000))
        ])
        console.log('✅ 頁面數據刷新完成')
      } catch (refreshError) {
        console.warn('⚠️ 刷新數據失敗，但更新已成功:', refreshError)
      }
    } else {
      console.error('❌ 更新失敗:', result.error)
      showToast(result.error || '更新失敗，請稍後再試', 'error')
    }
  } catch (error) {
    console.error('❌ handleUpdateName 外層捕獲錯誤:', error)
    showToast('更新失敗，請稍後再試: ' + error.message, 'error')
  } finally {
    console.log('🏁 handleUpdateName 完成，設定 isSaving = false')
    isSaving.value = false
  }
}

// 快速測試功能（僅用於除錯）
const testSimpleUpdate = async () => {
  console.log('🧪 快速測試開始')
  
  if (!newPlayerName.value.trim()) {
    showToast('請輸入顯示名稱', 'warning')
    return
  }
  
  try {
    isSaving.value = true
    
    // 先檢查當前用戶
    console.log('🔍 檢查當前用戶狀態...')
    const { data: { user }, error: getUserError } = await supabase.auth.getUser()
    
    if (getUserError) {
      console.error('❌ 獲取用戶失敗:', getUserError)
      showToast(`獲取用戶失敗: ${getUserError.message}`, 'error')
      return
    }
    
    if (!user) {
      console.error('❌ 沒有當前用戶')
      showToast('沒有當前用戶，請重新登入', 'error')
      return
    }
    
    console.log('✅ 當前用戶:', user.email)
    console.log('📊 當前 user_metadata:', user.user_metadata)
    
    // 添加超時控制
    console.log('🔄 快速測試：開始更新 Auth user_metadata...')
    
    const updatePromise = supabase.auth.updateUser({
      data: { display_name: newPlayerName.value.trim() }
    })
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        console.error('❌ 快速測試超時 (5秒)')
        reject(new Error('快速測試超時 (5秒)'))
      }, 5000)
    })
    
    const { data, error } = await Promise.race([updatePromise, timeoutPromise])
    
    if (error) {
      console.error('❌ 快速測試失敗:', error)
      showToast(`快速測試失敗: ${error.message}`, 'error')
    } else {
      console.log('✅ 快速測試成功')
      console.log('📊 更新後的數據:', data)
      showToast('快速測試成功！Auth 已更新', 'success')
      
      // 嘗試強制更新本地狀態
      console.log('🔄 快速測試：重新檢查授權狀態')
      await checkAuth()
      console.log('✅ 快速測試：授權狀態檢查完成')
    }
  } catch (error) {
    console.error('❌ 快速測試異常:', error)
    showToast(`快速測試異常: ${error.message}`, 'error')
  } finally {
    console.log('🏁 快速測試完成，設定 isSaving = false')
    isSaving.value = false
  }
}

// 純 HTTP 更新方法（最可靠的方法）
const updateNameViaPureHTTP = async (newName) => {
  console.log('🔥 使用純 HTTP 方法更新...')
  
  try {
    // 手動檢查所有可能的 token 存儲位置
    let accessToken = null
    
    console.log('🔍 搜尋 localStorage 中的 token...')
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.includes('auth')) {
        try {
          const value = localStorage.getItem(key)
          const parsed = JSON.parse(value)
          if (parsed?.access_token) {
            accessToken = parsed.access_token
            console.log(`🔑 從 ${key} 找到 access_token`)
            break
          }
        } catch (e) {
          // 忽略解析錯誤
        }
      }
    }
    
    if (!accessToken) {
      console.log('🔍 檢查 sessionStorage...')
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i)
        if (key && key.includes('auth')) {
          try {
            const value = sessionStorage.getItem(key)
            const parsed = JSON.parse(value)
            if (parsed?.access_token) {
              accessToken = parsed.access_token
              console.log(`🔑 從 sessionStorage ${key} 找到 access_token`)
              break
            }
          } catch (e) {
            // 忽略解析錯誤
          }
        }
      }
    }
    
    if (!accessToken) {
      throw new Error('找不到任何有效的訪問令牌')
    }
    
    console.log('🔑 使用找到的訪問令牌進行 API 調用')
    
    // 純 HTTP 調用
    const response = await Promise.race([
      fetch('https://qzffahnlwvxgfovmrjia.supabase.co/auth/v1/user', {
        method: 'PUT',
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6ZmZhaG5sd3Z4Z2Zvdm1yamlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1MjkxNTUsImV4cCI6MjA2NzEwNTE1NX0.1VmdnGXMd4EuDfO22OvJkzXgSopva-ZMka84T8OBrU8',
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: { display_name: newName }
        })
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('純 HTTP 更新超時 (8秒)')), 8000))
    ])
    
    console.log('📡 純 HTTP API 響應狀態:', response.status)
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HTTP ${response.status}: ${errorText}`)
    }
    
    const result = await response.json()
    console.log('✅ 純 HTTP 更新成功:', result)
    
    // 手動更新本地顯示名稱
    displayName.value = newName
    
    return { 
      success: true, 
      message: '顯示名稱更新成功！',
      data: result
    }
  } catch (error) {
    console.error('❌ 純 HTTP 更新失敗:', error)
    return { 
      success: false, 
      error: `純 HTTP 更新失敗: ${error.message}`
    }
  }
}

// HTTP API 直接更新方法（完全跳過 Supabase 客戶端）
const updateNameViaHTTP = async (newName) => {
  console.log('🌐 使用 HTTP API 直接更新...')
  
  try {
    // 從 localStorage 或 sessionStorage 獲取訪問令牌（跳過 Supabase 客戶端）
    let accessToken = null
    
    // 嘗試從不同的存儲位置獲取 token
    try {
      const supabaseAuthToken = localStorage.getItem('sb-qzffahnlwvxgfovmrjia-auth-token')
      if (supabaseAuthToken) {
        const authData = JSON.parse(supabaseAuthToken)
        accessToken = authData?.access_token
        console.log('🔑 從 localStorage 獲取到訪問令牌')
      }
    } catch (e) {
      console.warn('⚠️ 無法從 localStorage 獲取 token:', e)
    }
    
    // 如果 localStorage 沒有，嘗試 sessionStorage
    if (!accessToken) {
      try {
        const sessionToken = sessionStorage.getItem('supabase.auth.token')
        if (sessionToken) {
          const tokenData = JSON.parse(sessionToken)
          accessToken = tokenData?.access_token
          console.log('🔑 從 sessionStorage 獲取到訪問令牌')
        }
      } catch (e) {
        console.warn('⚠️ 無法從 sessionStorage 獲取 token:', e)
      }
    }
    
    // 如果還是沒有 token，嘗試從 currentUser 獲取（如果可用）
    if (!accessToken && currentUser.value?.access_token) {
      accessToken = currentUser.value.access_token
      console.log('🔑 從 currentUser 獲取到訪問令牌')
    }
    
    if (!accessToken) {
      throw new Error('無法獲取有效的訪問令牌，請重新登入')
    }
    
    console.log('🔑 準備使用訪問令牌進行 API 調用')
    
    // 直接調用 Supabase Auth API
    const response = await Promise.race([
      fetch('https://qzffahnlwvxgfovmrjia.supabase.co/auth/v1/user', {
        method: 'PUT',
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6ZmZhaG5sd3Z4Z2Zvdm1yamlhIiwicm9zZSI6ImFub24iLCJpYXQiOjE3NTE1MjkxNTUsImV4cCI6MjA2NzEwNTE1NX0.1VmdnGXMd4EuDfO22OvJkzXgSopva-ZMka84T8OBrU8',
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: { display_name: newName }
        })
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('HTTP API 更新超時 (8秒)')), 8000))
    ])
    
    console.log('📡 API 響應狀態:', response.status)
    
    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`HTTP ${response.status}: ${errorData}`)
    }
    
    const result = await response.json()
    console.log('✅ HTTP API 更新成功:', result)
    
    // 手動更新本地顯示名稱
    updateUserDisplayNameLocal(newName)
    
    return { 
      success: true, 
      message: 'HTTP API 更新成功！顯示名稱已更新',
      data: result
    }
  } catch (error) {
    console.error('❌ HTTP API 更新失敗:', error)
    return { 
      success: false, 
      error: `HTTP API 更新失敗: ${error.message}`
    }
  }
}

// 極簡測試功能（完全跳過 useAuth）
const superSimpleTest = async () => {
  console.log('🚀 極簡測試開始')
  
  if (!newPlayerName.value.trim()) {
    showToast('請輸入顯示名稱', 'warning')
    return
  }
  
  try {
    isSaving.value = true
    
    console.log('🔄 極簡測試：直接調用 supabase.auth.updateUser')
    console.log('📝 要更新的名稱:', newPlayerName.value.trim())
    
    // 添加超時控制
    const updatePromise = supabase.auth.updateUser({
      data: { 
        display_name: newPlayerName.value.trim(),
        test_timestamp: new Date().toISOString()
      }
    })
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        console.error('❌ 極簡測試超時 (8秒)')
        reject(new Error('極簡測試超時 (8秒)'))
      }, 8000)
    })
    
    console.log('⏳ 極簡測試：等待 API 回應...')
    const result = await Promise.race([updatePromise, timeoutPromise])
    
    console.log('📊 極簡測試完整結果:', result)
    
    if (result.error) {
      console.error('❌ 極簡測試失敗:', result.error)
      showToast(`極簡測試失敗: ${result.error.message}`, 'error')
    } else {
      console.log('✅ 極簡測試成功!')
      console.log('👤 更新後的用戶:', result.data.user)
      console.log('🔍 用戶 metadata:', result.data.user.user_metadata)
      showToast('極簡測試成功！', 'success')
      
      // 強制刷新頁面來看結果
      setTimeout(() => {
        if (confirm('測試成功！要刷新頁面查看結果嗎？')) {
          window.location.reload()
        }
      }, 1000)
    }
  } catch (error) {
    console.error('❌ 極簡測試捕獲異常:', error)
    showToast(`極簡測試異常: ${error.message}`, 'error')
  } finally {
    console.log('🏁 極簡測試完成')
    isSaving.value = false
  }
}
</script>

<style scoped>
/* 基本樣式 */
.home {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

/* 通知 Toast */
.toast {
  position: fixed;
  top: 2rem;
  right: 2rem;
  z-index: 1000;
  min-width: 300px;
  max-width: 500px;
  padding: 1rem;
  border-radius: 0.5rem;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(10px);
}

.toast.success {
  background: rgba(72, 187, 120, 0.95);
  color: white;
  border: 1px solid rgba(72, 187, 120, 0.3);
}

.toast.error {
  background: rgba(245, 101, 101, 0.95);
  color: white;
  border: 1px solid rgba(245, 101, 101, 0.3);
}

.toast.warning {
  background: rgba(237, 137, 54, 0.95);
  color: white;
  border: 1px solid rgba(237, 137, 54, 0.3);
}

.toast.info {
  background: rgba(66, 153, 225, 0.95);
  color: white;
  border: 1px solid rgba(66, 153, 225, 0.3);
}

.toast-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.toast-icon {
  font-size: 1.25rem;
}

.toast-text {
  font-weight: 500;
  line-height: 1.4;
}

/* fade 動畫 */
.toast-enter-active, .toast-leave-active {
  transition: opacity 0.3s ease;
}

.toast-enter, .toast-leave-to {
  opacity: 0;
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
  gap: 0.75rem;
}

.user-display {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  align-items: flex-end;
}

.user-name {
  font-size: 0.875rem;
  color: #4a5568;
  font-weight: 500;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 0.375rem;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.user-name:hover {
  background: rgba(66, 153, 225, 0.1);
  color: #3182ce;
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

/* 參與控制區 */
.participation-section {
  margin-bottom: 3rem;
}

.participation-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.participation-card h3 {
  margin: 0 0 1rem 0;
  color: #2d3748;
}

.participation-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.player-status {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.status-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.player-name {
  font-weight: 600;
  color: #2d3748;
  font-size: 1.125rem;
}

.player-balls {
  color: #718096;
  font-size: 0.875rem;
}

.participation-status {
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 600;
  background: #fed7d7;
  color: #742a2a;
}

.participation-status.active {
  background: #c6f6d5;
  color: #22543d;
}

.status-actions {
  display: flex;
  gap: 0.5rem;
}

.participation-btn,
.edit-name-btn,
.join-btn {
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.participation-btn {
  background: #4299e1;
  color: white;
}

.participation-btn:hover:not(:disabled) {
  background: #3182ce;
  transform: translateY(-2px);
}

.edit-name-btn {
  background: #ed8936;
  color: white;
}

.edit-name-btn:hover {
  background: #dd6b20;
  transform: translateY(-2px);
}

.join-btn {
  background: #48bb78;
  color: white;
  padding: 1rem 2rem;
}

.join-btn:hover:not(:disabled) {
  background: #38a169;
  transform: translateY(-2px);
}

.join-prompt {
  text-align: center;
  padding: 2rem;
}

.join-prompt p {
  margin-bottom: 1rem;
  color: #718096;
}

.participation-btn:disabled,
.join-btn:disabled {
  background: #a0aec0;
  cursor: not-allowed;
  transform: none;
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
@media (max-width: 1024px) {
  .main-content {
    padding: 1.5rem 1rem;
  }

  .welcome-section {
    margin-bottom: 2rem;
  }

  .stats-section,
  .status-section,
  .admin-section,
  .participation-section {
    margin-bottom: 2rem;
  }

  .stats-grid {
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 1rem;
  }
}

@media (max-width: 768px) {
  .nav-content {
    flex-direction: column;
    gap: 0.5rem;
    padding: 0 0.5rem;
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
    padding: 1rem 0.5rem;
  }

  /* 壓縮歡迎區域 */
  .welcome-section {
    margin-bottom: 1.5rem;
  }

  .welcome-content h2 {
    font-size: 1.5rem;
    margin-bottom: 0.25rem;
  }

  .welcome-content p {
    font-size: 1rem;
    margin-bottom: 0.5rem;
  }

  /* 統計卡片更緊湊 */
  .stats-section {
    margin-bottom: 1.5rem;
  }

  .stats-grid {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }

  .stat-card {
    padding: 1rem;
  }

  .stat-number {
    font-size: 1.5rem;
  }

  /* 狀態區域更緊湊 */
  .status-section {
    margin-bottom: 1.5rem;
  }

  .status-card {
    padding: 1rem;
  }

  .status-content h3 {
    font-size: 1.125rem;
    margin-bottom: 0.25rem;
  }

  /* 管理員控制區更緊湊 */
  .admin-section {
    margin-bottom: 1.5rem;
  }

  .admin-card {
    padding: 1rem;
  }

  .admin-card h3 {
    font-size: 1.125rem;
    margin-bottom: 0.5rem;
  }

  .admin-actions {
    flex-direction: column;
    gap: 0.5rem;
  }

  .action-btn {
    text-align: center;
    padding: 0.75rem 1rem;
    font-size: 0.875rem;
  }

  /* 參與控制區更緊湊 */
  .participation-section {
    margin-bottom: 1.5rem;
  }

  .participation-card {
    padding: 1rem;
  }

  .participation-card h3 {
    font-size: 1.125rem;
    margin-bottom: 0.5rem;
  }

  .player-status {
    gap: 0.5rem;
  }

  .status-actions {
    margin-top: 0.5rem;
  }

  .edit-name-btn {
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
  }

  .join-btn {
    padding: 0.75rem 1.5rem;
    font-size: 0.875rem;
  }

  /* 玩家排行榜 */
  .players-section h2 {
    font-size: 1.5rem;
    margin-bottom: 1rem;
  }

  .player-card {
    flex-direction: column;
    text-align: center;
    padding: 1rem;
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
    gap: 0.5rem;
  }

  .nav-title {
    font-size: 1.125rem;
  }

  .main-content {
    padding: 0.5rem;
  }

  /* 進一步壓縮歡迎區域 */
  .welcome-section {
    margin-bottom: 1rem;
  }

  .welcome-content h2 {
    font-size: 1.25rem;
    margin-bottom: 0.25rem;
  }

  .welcome-content p {
    font-size: 0.875rem;
  }

  /* 統計卡片更小 */
  .stats-section {
    margin-bottom: 1rem;
  }

  .stats-grid {
    gap: 0.5rem;
  }

  .stat-card {
    padding: 0.75rem;
  }

  .stat-number {
    font-size: 1.25rem;
  }

  .stat-label {
    font-size: 0.75rem;
  }

  /* 狀態區域更小 */
  .status-section {
    margin-bottom: 1rem;
  }

  .status-card {
    padding: 0.75rem;
  }

  .status-content h3 {
    font-size: 1rem;
  }

  /* 管理員控制區更小 */
  .admin-section {
    margin-bottom: 1rem;
  }

  .admin-card {
    padding: 0.75rem;
  }

  .admin-card h3 {
    font-size: 1rem;
    margin-bottom: 0.5rem;
  }

  .action-btn {
    padding: 0.5rem 0.75rem;
    font-size: 0.8rem;
  }

  /* 參與控制區更小 */
  .participation-section {
    margin-bottom: 1rem;
  }

  .participation-card {
    padding: 0.75rem;
  }

  .participation-card h3 {
    font-size: 1rem;
    margin-bottom: 0.5rem;
  }

  .status-info {
    gap: 0.25rem;
  }

  .player-name {
    font-size: 0.875rem;
  }

  .player-balls {
    font-size: 0.875rem;
  }

  .participation-status {
    font-size: 0.75rem;
  }

  .edit-name-btn {
    padding: 0.375rem 0.5rem;
    font-size: 0.75rem;
  }

  .join-btn {
    padding: 0.5rem 1rem;
    font-size: 0.8rem;
  }

  /* 玩家排行榜 */
  .players-section h2 {
    font-size: 1.25rem;
    margin-bottom: 0.75rem;
  }

  .player-card {
    padding: 0.75rem;
  }

  .player-name {
    font-size: 0.875rem;
  }

  .player-balls {
    font-size: 0.875rem;
  }

  .chance-text {
    font-size: 0.75rem;
  }

  .history-item {
    padding: 0.75rem;
  }

  .history-winner {
    font-size: 0.875rem;
  }

  .history-time {
    font-size: 0.75rem;
  }
}

/* 模態框樣式 */
.modal-overlay {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  background: rgba(0, 0, 0, 0.8) !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  z-index: 9999 !important;
  padding: 1rem !important;
  visibility: visible !important;
  opacity: 1 !important;
}

.modal-content {
  background: white;
  border-radius: 1rem;
  padding: 2rem;
  max-width: 400px;
  width: 100%;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  position: relative;
  z-index: 10000;
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
  margin-top: 1.5rem;
  justify-content: flex-end;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 0.5rem;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: #4299e1;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #3182ce;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(66, 153, 225, 0.4);
}

.btn-secondary {
  background: #718096;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background: #4a5568;
  transform: translateY(-1px);
}
</style>
