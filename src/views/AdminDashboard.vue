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
      <!-- 通知提示 -->
      <div v-if="notification.show" class="notification" :class="notification.type" @click="hideNotification">
        <span class="notification-icon">{{ notification.icon }}</span>
        <span class="notification-message">{{ notification.message }}</span>
        <button class="notification-close" @click.stop="hideNotification">×</button>
      </div>

      <!-- 頂部導航 -->
      <header class="dashboard-header">
        <div class="header-content">
          <h1>🛠️ 管理後台</h1>
          <div class="header-actions">
            <router-link to="/" class="home-btn">🏠 回首頁</router-link>
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

          <!-- 新增玩家從用戶選擇 -->
          <div class="add-player-card">
            <h3>➕ 將用戶加入抽球</h3>
            <div class="add-player-form">
              <select
                v-model="selectedUserId"
                class="user-select"
                @change="onUserSelected"
              >
                <option value="">選擇要加入抽球的用戶...</option>
                <option v-for="user in availableUsers" :key="user.id" :value="user.id">
                  {{ user.display_name || user.email.split('@')[0] }} ({{ user.email }})
                </option>
              </select>
              <input
                v-model="newPlayerDisplayName"
                placeholder="顯示名稱（玩家暱稱）"
                class="player-input"
              />
              <input
                v-model.number="newPlayerBalls"
                type="number"
                min="0"
                placeholder="初始球數"
                class="balls-input"
              />
              <button @click="addPlayerFromUser" class="add-btn" :disabled="!selectedUserId || !newPlayerDisplayName.trim()">
                加入抽球
              </button>
            </div>
            <p class="user-hint">💡 只有已註冊的用戶才能參與抽球。用戶需要先註冊帳號，並設定顯示名稱。</p>
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
                  <span class="player-name">{{ player.display_name || player.name }}</span>
                  <span class="player-email">{{ player.name }}</span>
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
                  <button @click="removePlayer(player.id, player.display_name || player.name)" class="action-btn delete">🗑️</button>
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
            <div class="sync-users-section">
              <button @click="syncAllUsers" class="sync-btn" :disabled="isSyncing">
                {{ isSyncing ? '同步中...' : '🔄 同步所有註冊用戶' }}
              </button>
              <p class="sync-hint">💡 如果看不到某些已註冊的用戶，請點擊此按鈕同步</p>
            </div>
          </div>

          <!-- 管理員參與設定 -->
          <div class="admin-participation-card">
            <h3>🎯 管理員參與設定</h3>
            <div class="participation-setting">
              <label class="checkbox-label">
                <input 
                  type="checkbox" 
                  v-model="adminCanParticipate" 
                  @change="updateAdminParticipation"
                >
                <span>允許我參加抽球</span>
              </label>
              <p class="setting-note">勾選後您的帳號也會出現在玩家列表中</p>
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
                  <span class="user-name">{{ user.display_name || user.email.split('@')[0] }}</span>
                  <span class="user-email">{{ user.email }}</span>
                  <span class="user-role" :class="`role-${user.role}`">
                    {{ user.role === 'admin' ? '管理員' : '參加者' }}
                  </span>
                  <span v-if="user.email === currentUser?.email" class="current-user-badge">（您）</span>
                </div>
                <div class="user-actions">
                  <!-- 升級/降級管理員 -->
                  <button 
                    v-if="user.email !== currentUser?.email && user.role !== 'admin'"
                    @click="promoteToAdmin(user.id, user.email)" 
                    class="action-btn promote"
                    title="設為管理員"
                  >
                    ⬆️
                  </button>
                  <button 
                    v-if="user.email !== currentUser?.email && user.role === 'admin'"
                    @click="demoteFromAdmin(user.id, user.email)" 
                    class="action-btn demote"
                    title="取消管理員"
                  >
                    ⬇️
                  </button>
                  
                  <!-- 刪除用戶 -->
                  <button 
                    v-if="user.email !== currentUser?.email"
                    @click="deleteUser(user.id, user.email, user.user_id)" 
                    class="action-btn delete"
                    title="刪除用戶帳號"
                  >
                    🗑️
                  </button>
                  <span 
                    v-else 
                    class="self-protection-note"
                    title="無法操作自己的帳號"
                  >
                    🔒
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- 調試信息區域 -->
        <div class="debug-info-card">
          <h3>📊 系統狀態</h3>
          <div class="debug-stats">
            <div class="stat-item">
              <span class="stat-label">用戶角色記錄：</span>
              <span class="stat-value">{{ userRoles.length }} 個</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">可加入抽球用戶：</span>
              <span class="stat-value">{{ availableUsers.length }} 個</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">當前玩家：</span>
              <span class="stat-value">{{ players.length }} 個</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">最後同步時間：</span>
              <span class="stat-value">{{ lastSyncTime || '未同步' }}</span>
            </div>
          </div>
          
          <!-- 顯示最近的用戶記錄 -->
          <div v-if="userRoles.length > 0" class="recent-users">
            <h4>最近的用戶記錄 (最新5個):</h4>
            <div class="user-list">
              <div v-for="user in userRoles.slice(0, 5)" :key="user.id" class="user-item">
                <span class="user-email">{{ user.email }}</span>
                <span class="user-role" :class="user.role">{{ user.role === 'admin' ? '管理員' : '參加者' }}</span>
                <span class="user-name">{{ user.display_name }}</span>
              </div>
            </div>
          </div>
          <button @click="refreshAllData" class="refresh-all-btn" :disabled="isRefreshing">
            {{ isRefreshing ? '更新中...' : '🔄 重新整理所有數據' }}
          </button>
          <button @click="syncAllAuthUsers" class="sync-users-btn" :disabled="isSyncing">
            {{ isSyncing ? '同步中...' : '🔄 強制同步所有認證用戶' }}
          </button>
          <button @click="checkCurrentUser" class="check-user-btn">
            🔍 檢查當前登入用戶
          </button>
        </div>
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

// HTTP API 輔助函數
const withTimeout = (promise, timeout = 5000) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('請求超時')), timeout)
    )
  ])
}

const getAccessToken = async () => {
  try {
    console.log('🔍 AdminDashboard: 開始獲取 access_token')
    
    // 使用與 useAuth.js 相同的 localStorage key
    const sessionData = localStorage.getItem('sb-qzffahnlwvxgfovmrjia-auth-token')
    console.log('🔍 AdminDashboard: localStorage session data:', sessionData ? '存在' : '不存在')
    
    if (!sessionData) {
      console.warn('⚠️ 未找到 localStorage session')
      throw new Error('未找到有效的 session')
    }

    const session = JSON.parse(sessionData)
    console.log('🔍 AdminDashboard: session 解析成功，包含 access_token:', !!session.access_token)
    
    if (!session.access_token) {
      console.warn('⚠️ session 中沒有 access_token')
      throw new Error('session 中沒有 access_token')
    }

    // 檢查 token 是否過期
    try {
      const tokenParts = session.access_token.split('.')
      console.log('🔍 AdminDashboard: token 部分數量:', tokenParts.length)
      
      if (tokenParts.length === 3) {
        const payload = JSON.parse(atob(tokenParts[1]))
        const currentTime = Math.floor(Date.now() / 1000)
        console.log('🔍 AdminDashboard: token 過期時間:', payload.exp, '當前時間:', currentTime)
        
        if (payload.exp && payload.exp <= currentTime) {
          console.warn('⚠️ access_token 已過期')
          throw new Error('access_token 已過期')
        }
      }
    } catch (tokenError) {
      console.warn('⚠️ token 解析失敗，但繼續使用:', tokenError)
    }

    console.log('✅ 獲取 access_token 成功')
    return session.access_token
  } catch (error) {
    console.error('❌ 獲取 access token 失敗:', error)
    throw error
  }
}

// 純 HTTP API 函數
const httpInsertPlayer = async (playerData) => {
  const SUPABASE_URL = 'https://qzffahnlwvxgfovmrjia.supabase.co'
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6ZmZhaG5sd3Z4Z2Zvdm1yamlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1MjkxNTUsImV4cCI6MjA2NzEwNTE1NX0.1VmdnGXMd4EuDfO22OvJkzXgSopva-ZMka84T8OBrU8'
  
  console.log('🔄 HTTP API: 新增玩家', playerData)
  
  try {
    const token = await getAccessToken()
    
    const response = await withTimeout(
      fetch(`${SUPABASE_URL}/rest/v1/players`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(playerData)
      })
    )
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('HTTP API 新增玩家失敗:', errorText)
      throw new Error(errorText)
    }
    
    console.log('✅ HTTP API: 新增玩家成功')
    return { success: true }
  } catch (error) {
    console.error('HTTP API 新增玩家失敗:', error)
    throw error
  }
}

const httpDeletePlayer = async (playerId) => {
  const SUPABASE_URL = 'https://qzffahnlwvxgfovmrjia.supabase.co'
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6ZmZhaG5sd3Z4Z2Zvdm1yamlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1MjkxNTUsImV4cCI6MjA2NzEwNTE1NX0.1VmdnGXMd4EuDfO22OvJkzXgSopva-ZMka84T8OBrU8'
  
  console.log('🔄 HTTP API: 刪除玩家', playerId)
  
  try {
    const token = await getAccessToken()
    
    const response = await withTimeout(
      fetch(`${SUPABASE_URL}/rest/v1/players?id=eq.${playerId}`, {
        method: 'DELETE',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
    )
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('HTTP API 刪除玩家失敗:', errorText)
      throw new Error(errorText)
    }
    
    console.log('✅ HTTP API: 刪除玩家成功')
    return { success: true }
  } catch (error) {
    console.error('HTTP API 刪除玩家失敗:', error)
    throw error
  }
}

const httpInsertDrawHistory = async (historyData) => {
  const SUPABASE_URL = 'https://qzffahnlwvxgfovmrjia.supabase.co'
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6ZmZhaG5sd3Z4Z2Zvdm1yamlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1MjkxNTUsImV4cCI6MjA2NzEwNTE1NX0.1VmdnGXMd4EuDfO22OvJkzXgSopva-ZMka84T8OBrU8'
  
  console.log('🔄 HTTP API: 新增抽獎歷史', historyData)
  
  try {
    const token = await getAccessToken()
    
    const response = await withTimeout(
      fetch(`${SUPABASE_URL}/rest/v1/draw_history`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(historyData)
      })
    )
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('HTTP API 新增抽獎歷史失敗:', errorText)
      throw new Error(errorText)
    }
    
    console.log('✅ HTTP API: 新增抽獎歷史成功')
    return { success: true }
  } catch (error) {
    console.error('HTTP API 新增抽獎歷史失敗:', error)
    throw error
  }
}

const httpUpdatePlayer = async (playerId, updateData) => {
  const SUPABASE_URL = 'https://qzffahnlwvxgfovmrjia.supabase.co'
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6ZmZhaG5sd3Z4Z2Zvdm1yamlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1MjkxNTUsImV4cCI6MjA2NzEwNTE1NX0.1VmdnGXMd4EuDfO22OvJkzXgSopva-ZMka84T8OBrU8'
  
  console.log('🔄 HTTP API: 更新玩家', { playerId, updateData })
  
  try {
    const token = await getAccessToken()
    
    const response = await withTimeout(
      fetch(`${SUPABASE_URL}/rest/v1/players?id=eq.${playerId}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      })
    )
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('HTTP API 更新玩家失敗:', errorText)
      throw new Error(errorText)
    }
    
    console.log('✅ HTTP API: 更新玩家成功')
    return { success: true }
  } catch (error) {
    console.error('HTTP API 更新玩家失敗:', error)
    throw error
  }
}

const httpDeleteUserRole = async (roleId) => {
  const SUPABASE_URL = 'https://qzffahnlwvxgfovmrjia.supabase.co'
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6ZmZhaG5sd3Z4Z2Zvdm1yamlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1MjkxNTUsImV4cCI6MjA2NzEwNTE1NX0.1VmdnGXMd4EuDfO22OvJkzXgSopva-ZMka84T8OBrU8'
  
  console.log('🔄 HTTP API: 刪除用戶角色', roleId)
  
  try {
    const token = await getAccessToken()
    
    const response = await withTimeout(
      fetch(`${SUPABASE_URL}/rest/v1/user_roles?id=eq.${roleId}`, {
        method: 'DELETE',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
    )
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('HTTP API 刪除用戶角色失敗:', errorText)
      throw new Error(errorText)
    }
    
    console.log('✅ HTTP API: 刪除用戶角色成功')
    return { success: true }
  } catch (error) {
    console.error('HTTP API 刪除用戶角色失敗:', error)
    throw error
  }
}

// HTTP API 查詢函數
const httpFetchPlayers = async () => {
  const SUPABASE_URL = 'https://qzffahnlwvxgfovmrjia.supabase.co'
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6ZmZhaG5sd3Z4Z2Zvdm1yamlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1MjkxNTUsImV4cCI6MjA2NzEwNTE1NX0.1VmdnGXMd4EuDfO22OvJkzXgSopva-ZMka84T8OBrU8'
  
  try {
    const token = await getAccessToken()
    
    const response = await withTimeout(
      fetch(`${SUPABASE_URL}/rest/v1/players?select=*&order=balls.desc`, {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
    )
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(errorText)
    }
    
    const data = await response.json()
    return data || []
  } catch (error) {
    console.error('HTTP API 取得玩家資料失敗:', error)
    throw error
  }
}

const httpFetchDrawHistory = async () => {
  const SUPABASE_URL = 'https://qzffahnlwvxgfovmrjia.supabase.co'
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6ZmZhaG5sd3Z4Z2Zvdm1yamlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1MjkxNTUsImV4cCI6MjA2NzEwNTE1NX0.1VmdnGXMd4EuDfO22OvJkzXgSopva-ZMka84T8OBrU8'
  
  try {
    const token = await getAccessToken()
    
    const response = await withTimeout(
      fetch(`${SUPABASE_URL}/rest/v1/draw_history?select=*&order=draw_time.desc&limit=20`, {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
    )
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(errorText)
    }
    
    const data = await response.json()
    return data || []
  } catch (error) {
    console.error('HTTP API 取得抽球歷史失敗:', error)
    throw error
  }
}

const httpFetchUserRoles = async () => {
  const SUPABASE_URL = 'https://qzffahnlwvxgfovmrjia.supabase.co'
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6ZmZhaG5sd3Z4Z2Zvdm1yamlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1MjkxNTUsImV4cCI6MjA2NzEwNTE1NX0.1VmdnGXMd4EuDfO22OvJkzXgSopva-ZMka84T8OBrU8'
  
  try {
    const token = await getAccessToken()
    
    const response = await withTimeout(
      fetch(`${SUPABASE_URL}/rest/v1/user_roles?select=*&order=created_at.desc`, {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
    )
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(errorText)
    }
    
    const data = await response.json()
    return data || []
  } catch (error) {
    console.error('HTTP API 取得用戶角色失敗:', error)
    throw error
  }
}

// 響應式數據
const players = ref([])
const drawHistory = ref([])
const userRoles = ref([])
const availableUsers = ref([])
const selectedUserId = ref('')
const newPlayerDisplayName = ref('')
const newPlayerBalls = ref(0)
const newUserEmail = ref('')
const newUserRole = ref('')
const activeTab = ref('players')
const isRefreshing = ref(false)
const isDrawing = ref(false)
const isResetting = ref(false)
const showAllHistory = ref(false)
const editingPlayer = ref(null)
const adminCanParticipate = ref(false)
const isSyncing = ref(false)
const lastSyncTime = ref('')

// 通知系統
const notification = ref({
  show: false,
  type: 'success', // success, warning, error, info
  message: '',
  icon: '✅'
})

let notificationTimer = null

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

// 通知系統函數
const showNotification = (message, type = 'success', duration = 3000) => {
  // 清除之前的定時器
  if (notificationTimer) {
    clearTimeout(notificationTimer)
  }

  // 設置通知類型和圖標
  const typeConfig = {
    success: { icon: '✅', class: 'success' },
    warning: { icon: '⚠️', class: 'warning' },
    error: { icon: '❌', class: 'error' },
    info: { icon: 'ℹ️', class: 'info' }
  }

  const config = typeConfig[type] || typeConfig.success

  // 顯示通知
  notification.value = {
    show: true,
    type: config.class,
    message,
    icon: config.icon
  }

  // 設置自動隱藏
  notificationTimer = setTimeout(() => {
    notification.value.show = false
  }, duration)
}

const hideNotification = () => {
  if (notificationTimer) {
    clearTimeout(notificationTimer)
  }
  notification.value.show = false
}

const recentHistory = computed(() => {
  return showAllHistory.value 
    ? drawHistory.value 
    : drawHistory.value.slice(0, 5)
})

// 方法
const formatTime = (timeString) => {
  const date = new Date(timeString)
  
  // 格式化為完整的年月日時分秒
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
    try {
      const data = await httpFetchPlayers()
      players.value = data
      console.log('✅ HTTP API 取得玩家資料成功')
    } catch (httpError) {
      console.warn('HTTP API 取得玩家資料失敗，使用 Supabase 客戶端:', httpError)
      
      // 客戶端 fallback with timeout
      const clientPromise = supabase
        .from('players')
        .select('*')
        .order('balls', { ascending: false })
      
      const { data, error } = await withTimeout(clientPromise, 3000)
      
      if (error) throw error
      players.value = data || []
    }
  } catch (error) {
    console.error('取得玩家資料失敗:', error)
    alert('取得玩家資料失敗')
  }
}

const fetchDrawHistory = async () => {
  try {
    try {
      const data = await httpFetchDrawHistory()
      drawHistory.value = data
      console.log('✅ HTTP API 取得抽球歷史成功')
    } catch (httpError) {
      console.warn('HTTP API 取得抽球歷史失敗，使用 Supabase 客戶端:', httpError)
      
      // 客戶端 fallback with timeout
      const clientPromise = supabase
        .from('draw_history')
        .select('*')
        .order('draw_time', { ascending: false })
        .limit(20)
      
      const { data, error } = await withTimeout(clientPromise, 3000)
      
      if (error) throw error
      drawHistory.value = data || []
    }
  } catch (error) {
    console.error('取得抽球歷史失敗:', error)
  }
}

const fetchUserRoles = async () => {
  try {
    console.log('=== 獲取用戶角色 ===')
    
    try {
      const data = await httpFetchUserRoles()
      userRoles.value = data
      console.log('✅ HTTP API 獲取用戶角色成功:', data.length, data)
    } catch (httpError) {
      console.warn('HTTP API 獲取用戶角色失敗，使用 Supabase 客戶端:', httpError)
      
      // 客戶端 fallback with timeout
      const clientPromise = supabase
        .from('user_roles')
        .select('*')
        .order('created_at', { ascending: false })
      
      const { data, error } = await withTimeout(clientPromise, 3000)
      
      if (error) throw error
      userRoles.value = data || []
      console.log('獲取到的用戶角色:', userRoles.value.length, userRoles.value)
    }
  } catch (error) {
    console.error('取得用戶角色失敗:', error)
  }
}

const refreshPlayers = async () => {
  isRefreshing.value = true
  try {
    await Promise.all([fetchPlayers(), fetchAvailableUsers()])
  } finally {
    isRefreshing.value = false
  }
}

// 獲取可用用戶（尚未加入抽球的用戶）
const fetchAvailableUsers = async () => {
  try {
    // 獲取所有用戶角色和顯示名稱
    const { data: allUserRoles, error: usersError } = await supabase
      .from('user_roles')
      .select('user_id, email, display_name')
    
    if (usersError) throw usersError
    
    // 獲取已經是玩家的用戶ID
    const { data: existingPlayers, error: playersError } = await supabase
      .from('players')
      .select('user_id, display_name')
      .not('user_id', 'is', null)
    
    if (playersError) throw playersError
    
    const existingPlayerIds = new Set(existingPlayers.map(p => p.user_id))
    
    // 過濾出還沒加入抽球的用戶
    availableUsers.value = allUserRoles
      .filter(user => !existingPlayerIds.has(user.user_id))
      .map(user => ({
        ...user,
        id: user.user_id, // 為了與選擇器相容
        display_name: user.display_name || user.email.split('@')[0] // 優先使用 display_name，備用為 email 前綴
      }))
    
    console.log('📊 可用用戶列表:', availableUsers.value)
    
  } catch (error) {
    console.error('獲取可用用戶失敗:', error)
  }
}

const onUserSelected = () => {
  // 當選擇用戶時自動填入建議的顯示名稱
  if (selectedUserId.value) {
    const selectedUser = availableUsers.value.find(u => u.user_id === selectedUserId.value)
    if (selectedUser) {
      // 優先使用 display_name，如果沒有設定才使用 email 前綴
      newPlayerDisplayName.value = selectedUser.display_name || selectedUser.email.split('@')[0]
    }
  } else {
    newPlayerDisplayName.value = ''
  }
}

const addPlayerFromUser = async () => {
  if (!selectedUserId.value) {
    showNotification('請選擇要加入的用戶', 'warning')
    return
  }
  if (!newPlayerDisplayName.value.trim()) {
    showNotification('請輸入顯示名稱', 'warning')
    return
  }
  
  try {
    // 獲取選中用戶的信息
    const selectedUser = availableUsers.value.find(u => u.user_id === selectedUserId.value)
    if (!selectedUser) {
      showNotification('找不到選中的用戶', 'error')
      return
    }
    
    const playerDisplayName = newPlayerDisplayName.value.trim()
    
    // 使用 HTTP API 新增玩家
    const playerData = {
      user_id: selectedUserId.value,
      name: selectedUser.email, // 內部使用 email 作為唯一識別
      display_name: playerDisplayName, // 顯示用的名稱
      balls: newPlayerBalls.value || 0
    }
    
    try {
      await httpInsertPlayer(playerData)
      console.log('✅ HTTP API 新增玩家成功')
    } catch (httpError) {
      console.warn('HTTP API 新增玩家失敗，使用 Supabase 客戶端:', httpError)
      
      // 客戶端 fallback with timeout
      const clientPromise = supabase.from('players').insert([playerData])
      const { error } = await withTimeout(clientPromise, 3000)
      
      if (error) {
        if (error.message.includes('duplicate')) {
          showNotification('該用戶已經是玩家了', 'warning')
        } else {
          throw error
        }
        return
      }
    }
    
    selectedUserId.value = ''
    newPlayerDisplayName.value = ''
    newPlayerBalls.value = 0
    await Promise.all([fetchPlayers(), fetchAvailableUsers()])
    showNotification(`${playerDisplayName} 已成功加入抽球！`, 'success')
  } catch (error) {
    console.error('加入玩家失敗:', error)
    showNotification('加入玩家失敗', 'error')
  }
}

const addBall = async (id) => {
  try {
    const player = players.value.find(p => p.id === id)
    const playerName = player.display_name || player.name || '未知玩家'
    const updateData = { balls: player.balls + 1 }
    
    try {
      await httpUpdatePlayer(id, updateData)
      console.log('✅ HTTP API 增加球數成功')
    } catch (httpError) {
      console.warn('HTTP API 增加球數失敗，使用 Supabase 客戶端:', httpError)
      
      // 客戶端 fallback with timeout
      const clientPromise = supabase.from('players').update(updateData).eq('id', id)
      const { error } = await withTimeout(clientPromise, 3000)
      
      if (error) throw error
    }
    
    await fetchPlayers()
    
    // 顯示成功通知
    showNotification(`${playerName} 球數 +1 (目前: ${player.balls + 1} 球)`, 'success', 2000)
  } catch (error) {
    console.error('增加球數失敗:', error)
    const player = players.value.find(p => p.id === id)
    const playerName = player?.display_name || player?.name || '未知玩家'
    showNotification(`${playerName} 加球失敗`, 'error', 3000)
  }
}

const removeBall = async (id) => {
  try {
    const player = players.value.find(p => p.id === id)
    const playerName = player.display_name || player.name || '未知玩家'
    
    if (player.balls <= 0) {
      showNotification(`${playerName} 球數已經為 0，無法減少`, 'warning', 2000)
      return
    }
    
    const updateData = { balls: player.balls - 1 }
    
    try {
      await httpUpdatePlayer(id, updateData)
      console.log('✅ HTTP API 減少球數成功')
    } catch (httpError) {
      console.warn('HTTP API 減少球數失敗，使用 Supabase 客戶端:', httpError)
      
      // 客戶端 fallback with timeout
      const clientPromise = supabase.from('players').update(updateData).eq('id', id)
      const { error } = await withTimeout(clientPromise, 3000)
      
      if (error) throw error
    }
    
    await fetchPlayers()
    
    // 顯示成功通知
    showNotification(`${playerName} 球數 -1 (目前: ${player.balls - 1} 球)`, 'success', 2000)
  } catch (error) {
    console.error('減少球數失敗:', error)
    const player = players.value.find(p => p.id === id)
    const playerName = player?.display_name || player?.name || '未知玩家'
    showNotification(`${playerName} 減球失敗`, 'error', 3000)
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
    const originalPlayer = players.value.find(p => p.id === editingPlayer.value.id)
    const playerDisplayName = editingPlayer.value.display_name || editingPlayer.value.name || '未知玩家'
    
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
    
    // 顯示成功通知
    showNotification(`${playerDisplayName} 玩家資料已更新`, 'success', 2000)
    
  } catch (error) {
    console.error('更新玩家失敗:', error)
    const playerDisplayName = editingPlayer.value?.display_name || editingPlayer.value?.name || '未知玩家'
    showNotification(`${playerDisplayName} 更新失敗`, 'error', 3000)
  }
}

const removePlayer = async (id, name) => {
  if (!confirm(`確定要刪除玩家「${name}」嗎？此操作無法撤銷。`)) return
  
  try {
    try {
      await httpDeletePlayer(id)
      console.log('✅ HTTP API 刪除玩家成功')
    } catch (httpError) {
      console.warn('HTTP API 刪除玩家失敗，使用 Supabase 客戶端:', httpError)
      
      // 客戶端 fallback with timeout
      const clientPromise = supabase.from('players').delete().eq('id', id)
      const { error } = await withTimeout(clientPromise, 3000)
      
      if (error) throw error
    }
    
    await fetchPlayers()
    showNotification(`玩家「${name}」已被刪除`, 'info')
  } catch (error) {
    console.error('刪除玩家失敗:', error)
    showNotification(`刪除玩家「${name}」失敗`, 'error')
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
    const historyData = {
      winner_id: winner.id,
      winner_name: winner.display_name || winner.name,
      balls_before: winner.balls,
      drawn_by: currentUser.value?.id,
      draw_time: new Date().toISOString() // 明確記錄抽球時間
    }
    
    try {
      await httpInsertDrawHistory(historyData)
      console.log('✅ HTTP API 記錄抽球歷史成功')
    } catch (httpError) {
      console.warn('HTTP API 記錄抽球歷史失敗，使用 Supabase 客戶端:', httpError)
      
      // 客戶端 fallback with timeout
      const clientPromise = supabase.from('draw_history').insert([historyData])
      const { error: historyError } = await withTimeout(clientPromise, 3000)
      
      if (historyError) throw historyError
    }
    
    // 減少中獎者球數
    const updateData = { balls: winner.balls - 1 }
    
    try {
      await httpUpdatePlayer(winner.id, updateData)
      console.log('✅ HTTP API 更新中獎者球數成功')
    } catch (httpError) {
      console.warn('HTTP API 更新中獎者球數失敗，使用 Supabase 客戶端:', httpError)
      
      // 客戶端 fallback with timeout
      const clientPromise = supabase.from('players').update(updateData).eq('id', winner.id)
      const { error: updateError } = await withTimeout(clientPromise, 3000)
      
      if (updateError) throw updateError
    }
    
    // 使用 display_name 優先，備用 name
    const winnerDisplayName = winner.display_name || winner.name
    alert(`🎉 恭喜 ${winnerDisplayName} 中獎！`)
    
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

// 同步所有註冊用戶到 user_roles 表
const syncAllUsers = async () => {
  if (!confirm('確定要檢查並同步註冊用戶嗎？\n\n這會檢查是否有新註冊但未添加到用戶列表的帳戶。')) return
  
  isSyncing.value = true
  try {
    // 首先檢查當前 user_roles 表的內容
    console.log('=== 調試信息 ===')
    console.log('當前 userRoles:', userRoles.value)
    
    // 檢查 auth.users 中是否有更多用戶
    // 由於我們無法直接訪問 auth.users，我們提供手動輸入的選項
    const userEmailsInput = prompt(`當前系統中有 ${userRoles.value.length} 個用戶角色記錄。\n\n如果您知道有其他已註冊但未顯示的用戶，請輸入他們的 Email（多個請用逗號分隔）：\n\n如果不確定，請點擊取消。`)
    
    if (!userEmailsInput) {
      // 如果用戶取消或沒有輸入，則嘗試刷新當前數據
      console.log('刷新用戶數據...')
      await fetchUserRoles()
      await fetchAvailableUsers()
      alert(`已刷新用戶數據。\n目前顯示 ${userRoles.value.length} 個用戶。\n\n如果仍然看不到某些用戶，可能是因為：\n1. 用戶尚未完成 email 驗證\n2. 用戶註冊時發生錯誤\n3. 需要手動添加`)
      isSyncing.value = false
      return
    }
    
    const userEmails = userEmailsInput.split(',').map(email => email.trim()).filter(email => email)
    let successCount = 0
    let failCount = 0
    
    for (const email of userEmails) {
      try {
        // 先檢查用戶是否已經存在
        const existingUser = userRoles.value.find(u => u.email.toLowerCase() === email.toLowerCase())
        if (existingUser) {
          console.log(`用戶 ${email} 已存在，跳過`)
          continue
        }
        
        const result = await setRole(email, 'participant')
        if (result.success) {
          successCount++
          console.log(`成功添加用戶: ${email}`)
        } else {
          failCount++
          console.warn(`設定 ${email} 角色失敗:`, result.error)
        }
      } catch (error) {
        failCount++
        console.error(`設定 ${email} 角色時發生錯誤:`, error)
      }
    }
    
    // 刷新數據
    await fetchUserRoles()
    await fetchAvailableUsers()
    
    alert(`同步完成！\n成功添加: ${successCount} 個用戶\n失敗: ${failCount} 個用戶\n\n當前總用戶數: ${userRoles.value.length}`)
    
  } catch (error) {
    console.error('同步用戶失敗:', error)
    alert('同步用戶失敗: ' + error.message)
  } finally {
    isSyncing.value = false
  }
}

const deleteUserRole = async (id, email) => {
  // 防止管理員刪除自己的權限
  if (currentUser.value && email === currentUser.value.email) {
    alert('⚠️ 不能移除自己的管理員權限！\n\n為了系統安全，管理員無法移除自己的權限。')
    return
  }
  
  if (!confirm(`確定要刪除用戶「${email}」的角色嗎？`)) return
  
  try {
    try {
      await httpDeleteUserRole(id)
      console.log('✅ HTTP API 刪除用戶角色成功')
    } catch (httpError) {
      console.warn('HTTP API 刪除用戶角色失敗，使用 Supabase 客戶端:', httpError)
      
      // 客戶端 fallback with timeout
      const clientPromise = supabase.from('user_roles').delete().eq('id', id)
      const { error } = await withTimeout(clientPromise, 3000)
      
      if (error) throw error
    }
    
    await fetchUserRoles()
    alert('✅ 用戶角色已刪除')
  } catch (error) {
    console.error('刪除用戶角色失敗:', error)
    alert('❌ 刪除用戶角色失敗: ' + error.message)
  }
}

const handleLogout = async () => {
  if (!confirm('確定要登出嗎？')) return
  
  try {
    const result = await logout()
    if (result.success) {
      alert('✅ 已成功登出！')
      // 跳轉到首頁並重新載入
      window.location.href = '/'
    } else {
      alert('❌ 登出失敗: ' + result.error)
    }
  } catch (error) {
    console.error('登出失敗:', error)
    alert('❌ 登出時發生錯誤')
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
      .not('id', 'is', null) // 更新所有記錄
    
    if (clearBallsError) throw clearBallsError
    
    // 確保 draw_status 表有記錄，如果沒有就插入一筆
    const { data: statusData, error: checkError } = await supabase
      .from('draw_status')
      .select('id')
      .limit(1)
    
    if (checkError) throw checkError
    
    if (!statusData || statusData.length === 0) {
      // 如果沒有記錄，插入一筆預設記錄
      const { error: insertError } = await supabase
        .from('draw_status')
        .insert({ 
          status: 'waiting',
          current_winner: null,
          total_participants: 0,
          total_balls: 0,
          last_draw_time: null
        })
      
      if (insertError) throw insertError
    } else {
      // 如果有記錄，更新第一筆
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
        .eq('id', statusData[0].id)
      
      if (statusError) throw statusError
    }
    
    alert('✅ 當局重置完成！所有玩家球數已清空。')
    
    await Promise.all([fetchPlayers(), fetchDrawHistory()])
  } catch (error) {
    console.error('重置當局失敗:', error)
    alert(`重置失敗：${error.message || '請稍後再試'}`)
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
      .not('id', 'is', null) // 刪除所有記錄
    
    if (historyError) throw historyError
    
    // 刪除所有玩家
    const { error: playersError } = await supabase
      .from('players')
      .delete()
      .not('id', 'is', null) // 刪除所有記錄
    
    if (playersError) throw playersError
    
    // 確保 draw_status 表有記錄，如果沒有就插入一筆
    const { data: statusData, error: checkError } = await supabase
      .from('draw_status')
      .select('id')
      .limit(1)
    
    if (checkError) throw checkError
    
    if (!statusData || statusData.length === 0) {
      // 如果沒有記錄，插入一筆預設記錄
      const { error: insertError } = await supabase
        .from('draw_status')
        .insert({ 
          status: 'waiting',
          current_winner: null,
          total_participants: 0,
          total_balls: 0,
          last_draw_time: null
        })
      
      if (insertError) throw insertError
    } else {
      // 如果有記錄，更新第一筆
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
        .eq('id', statusData[0].id)
      
      if (statusError) throw statusError
    }
    
    alert('✅ 全部資料重置完成！系統已回到初始狀態。')
    
    await Promise.all([fetchPlayers(), fetchDrawHistory()])
  } catch (error) {
    console.error('重置全部資料失敗:', error)
    alert(`重置失敗：${error.message || '請稍後再試'}`)
  } finally {
    isResetting.value = false
  }
}

// 密碼驗證函數
const verifyAdminPassword = () => {
  const password = prompt('請輸入管理員密碼進行驗證：')
  return password === '88888888'
}

// 升級為管理員
const promoteToAdmin = async (id, email) => {
  if (!verifyAdminPassword()) {
    alert('❌ 密碼錯誤，無法執行此操作')
    return
  }
  
  if (!confirm(`確定要將用戶「${email}」設為管理員嗎？\n\n管理員將擁有完整的系統權限。`)) return
  
  try {
    const { error } = await supabase
      .from('user_roles')
      .update({ role: 'admin' })
      .eq('id', id)
    
    if (error) throw error
    await fetchUserRoles()
    alert('✅ 已成功設定為管理員')
  } catch (error) {
    console.error('設定管理員失敗:', error)
    alert('❌ 設定管理員失敗: ' + error.message)
  }
}

// 取消管理員權限
const demoteFromAdmin = async (id, email) => {
  if (!verifyAdminPassword()) {
    alert('❌ 密碼錯誤，無法執行此操作')
    return
  }
  
  if (!confirm(`確定要取消用戶「${email}」的管理員權限嗎？\n\n此用戶將降級為一般參加者。`)) return
  
  try {
    const { error } = await supabase
      .from('user_roles')
      .update({ role: 'participant' })
      .eq('id', id)
    
    if (error) throw error
    await fetchUserRoles()
    alert('✅ 已取消管理員權限')
  } catch (error) {
    console.error('取消管理員失敗:', error)
    alert('❌ 取消管理員失敗: ' + error.message)
  }
}

// 刪除用戶帳號
const deleteUser = async (id, email, userId) => {
  if (!verifyAdminPassword()) {
    alert('❌ 密碼錯誤，無法執行此操作')
    return
  }
  
  const confirmMessage = `⚠️ 危險操作確認 ⚠️\n\n確定要完全刪除用戶「${email}」嗎？\n\n這將：\n- 刪除用戶帳號\n- 刪除所有相關資料\n- 此操作無法撤銷\n\n請再次確認！`
  
  if (!confirm(confirmMessage)) return
  
  try {
    // 1. 先刪除 user_roles
    const { error: roleError } = await supabase
      .from('user_roles')
      .delete()
      .eq('id', id)
    
    if (roleError) throw roleError
    
    // 2. 刪除相關的玩家記錄（如果有）
    const { error: playerError } = await supabase
      .from('players')
      .delete()
      .eq('user_id', userId)
    
    // 忽略玩家記錄不存在的錯誤
    
    // 3. 刪除認證用戶（需要 admin 權限）
    const { error: authError } = await supabase.auth.admin.deleteUser(userId)
    
    if (authError) {
      console.warn('刪除認證用戶失敗，但角色已刪除:', authError)
      alert('⚠️ 用戶角色已刪除，但認證帳號可能仍存在\n請聯繫系統管理員完全清理')
    } else {
      alert('✅ 用戶帳號已完全刪除')
    }
    
    await fetchUserRoles()
  } catch (error) {
    console.error('刪除用戶失敗:', error)
    alert('❌ 刪除用戶失敗: ' + error.message)
  }
}

// 更新管理員參與設定
const updateAdminParticipation = async () => {
  try {
    if (adminCanParticipate.value) {
      // 添加管理員到玩家列表
      const { error } = await supabase
        .from('players')
        .upsert({
          user_id: currentUser.value.id,
          name: currentUser.value.email.split('@')[0] + ' (管理員)',
          balls: 1,
          is_participating: true
        })
      
      if (error) throw error
      alert('✅ 您已加入玩家列表')
    } else {
      // 從玩家列表移除
      const { error } = await supabase
        .from('players')
        .delete()
        .eq('user_id', currentUser.value.id)
      
      if (error && error.code !== 'PGRST116') throw error
      alert('✅ 您已退出玩家列表')
    }
    
    await fetchPlayers()
  } catch (error) {
    console.error('更新參與狀態失敗:', error)
    alert('❌ 更新參與狀態失敗: ' + error.message)
    // 恢復原狀態
    adminCanParticipate.value = !adminCanParticipate.value
  }
}

// 檢查管理員是否在玩家列表中
const checkAdminParticipation = async () => {
  try {
    const { data, error } = await supabase
      .from('players')
      .select('id')
      .eq('user_id', currentUser.value?.id)
      .single()
    
    adminCanParticipate.value = !!data
  } catch (error) {
    // 忽略找不到記錄的錯誤
    adminCanParticipate.value = false
  }
}

// 初始化
onMounted(async () => {
  console.log('🔄 AdminDashboard: 開始初始化')
  
  try {
    await checkAuth()
    console.log('✅ AdminDashboard: 認證檢查完成，isAdmin:', isAdmin.value, 'currentUser:', !!currentUser.value)
    
    if (isAdmin.value && currentUser.value) {
      console.log('🔄 AdminDashboard: 開始獲取所有數據')
      
      // 檢查是否有有效的 access_token
      try {
        const token = await getAccessToken()
        console.log('✅ AdminDashboard: 有效的 access_token 獲取成功，長度:', token.length)
        
        await Promise.all([
          fetchPlayers(),
          fetchDrawHistory(),
          fetchUserRoles(),
          fetchAvailableUsers(),
          checkAdminParticipation()
        ])
        
        console.log('✅ AdminDashboard: 所有數據獲取完成')
      } catch (tokenError) {
        console.error('❌ AdminDashboard: 獲取 access_token 失敗:', tokenError)
        alert('❌ 無法獲取認證令牌，請重新登入')
        logout()
      }
    } else {
      console.log('⚠️ AdminDashboard: 用戶無管理員權限或未登入')
      router.push('/admin/login')
    }
  } catch (error) {
    console.error('❌ AdminDashboard: 初始化失敗:', error)
    router.push('/admin/login')
  }
})

// 重新整理所有數據
const refreshAllData = async () => {
  isRefreshing.value = true
  try {
    console.log('=== 重新整理所有數據 ===')
    await Promise.all([
      fetchPlayers(),
      fetchUserRoles(), 
      fetchAvailableUsers()
    ])
    
    // 更新最後同步時間
    lastSyncTime.value = new Date().toLocaleString('zh-TW')
    
    console.log('數據更新完成:', {
      players: players.value.length,
      userRoles: userRoles.value.length,
      availableUsers: availableUsers.value.length
    })
  } catch (error) {
    console.error('重新整理數據失敗:', error)
    alert('重新整理數據失敗: ' + error.message)
  } finally {
    isRefreshing.value = false
  }
}

// 檢查當前用戶
const checkCurrentUser = async () => {
  if (!isAuthenticated.value) return alert('請先登入')
  
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('*')
      .eq('email', currentUser.value.email)
      .single()
    
    if (error) throw error
    
    alert(`當前登入用戶：\n\nEmail: ${data.email}\n角色: ${data.role === 'admin' ? '管理員' : '參加者'}`)
  } catch (error) {
    console.error('檢查當前用戶失敗:', error)
    alert('檢查當前用戶失敗')
  }
}

// 強制同步所有認證用戶到 user_roles 表
const syncAllAuthUsers = async () => {
  if (!confirm('這個操作會檢查所有 Supabase Auth 用戶，並為缺失的用戶創建 user_roles 記錄。\n\n注意：這個操作需要管理員權限，可能需要一些時間。確定要繼續嗎？')) {
    return
  }

  isSyncing.value = true
  let syncedCount = 0
  let errorCount = 0

  try {
    console.log('=== 開始強制同步所有認證用戶 ===')
    
    // 注意：Supabase 的 admin API 通常需要服務角色金鑰
    // 這裡我們使用一個變通方法，通過檢查現有 session 來確保只同步當前可訪問的用戶
    
    // 首先獲取所有現有的 user_roles 記錄
    const { data: existingRoles, error: existingError } = await supabase
      .from('user_roles')
      .select('user_id, email')
    
    if (existingError) throw existingError
    
    const existingUserIds = new Set(existingRoles.map(role => role.user_id))
    console.log('現有 user_roles 記錄數:', existingRoles.length)
    
    // 檢查當前用戶是否在記錄中，如果不在則添加
    if (currentUser.value && !existingUserIds.has(currentUser.value.id)) {
      console.log('當前登入用戶不在 user_roles 中，正在添加...')
      
      try {
        const { error: insertError } = await supabase
          .from('user_roles')
          .insert({
            user_id: currentUser.value.id,
            email: currentUser.value.email,
            role: 'participant',
            display_name: currentUser.value.user_metadata?.display_name || 
                         currentUser.value.user_metadata?.name || 
                         
                         currentUser.value.email.split('@')[0],
            created_at: new Date().toISOString()
          })
        
        if (insertError) {
          console.error('添加當前用戶失敗:', insertError)
          errorCount++
        } else {
          console.log('成功添加當前用戶到 user_roles')
          syncedCount++
        }
      } catch (error) {
        console.error('添加當前用戶時發生錯誤:', error)
        errorCount++
      }
    }
    
    // 重新獲取最新的數據
    await refreshAllData()
    
    const message = `同步完成！\n\n` +
                   `成功同步: ${syncedCount} 個用戶\n` +
                   `失敗: ${errorCount} 個用戶\n\n` +
                   `當前 user_roles 總數: ${userRoles.value.length}`
    
    alert(message)
    console.log('=== 強制同步完成 ===', { syncedCount, errorCount, totalRoles: userRoles.value.length })
    
  } catch (error) {
    console.error('強制同步失敗:', error)
    alert('同步過程中發生錯誤: ' + error.message)
  } finally {
    isSyncing.value = false
  }
}

// 切換玩家參與狀態
const togglePlayerParticipation = async (player) => {
  if (!player) return
  
  try {
    const newStatus = !player.is_participating
    const action = newStatus ? '恢復參與' : '暫停參與'
    
    if (!confirm(`確定要${action}玩家「${player.display_name || player.name}」嗎？`)) {
      return
    }
    
    console.log(`🔄 ${action}玩家:`, player.display_name || player.name)
    
    // 更新資料庫
    const { error } = await supabase
      .from('players')
      .update({ is_participating: newStatus })
      .eq('id', player.id)
    
    if (error) throw error
    
    // 更新本地狀態
    const index = players.value.findIndex(p => p.id === player.id)
    if (index !== -1) {
      players.value[index] = { ...players.value[index], is_participating: newStatus }
    }
    
    const successMsg = `✅ 已${action}玩家「${player.display_name || player.name}」`
    console.log(successMsg)
    alert(successMsg)
    
    // 重新整理數據
    await refreshPlayers()
    
  } catch (error) {
    console.error('切換玩家參與狀態失敗:', error)
    alert('操作失敗，請稍後再試')
  }
}
</script>

<style scoped>
/* 通知系統樣式 */
.notification {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1000;
  padding: 16px 20px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 500;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  transform: translateX(100%);
  opacity: 0;
  animation: slideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  max-width: 350px;
  min-width: 250px;
  backdrop-filter: blur(16px);
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.notification:hover {
  transform: translateX(-8px) scale(1.02);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
}

.notification.success {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.95) 0%, rgba(34, 197, 94, 0.85) 100%);
  color: white;
  border-color: rgba(34, 197, 94, 0.4);
}

.notification.warning {
  background: linear-gradient(135deg, rgba(251, 146, 60, 0.95) 0%, rgba(251, 146, 60, 0.85) 100%);
  color: white;
  border-color: rgba(251, 146, 60, 0.4);
}

.notification.error {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.95) 0%, rgba(239, 68, 68, 0.85) 100%);
  color: white;
  border-color: rgba(239, 68, 68, 0.4);
}

.notification.info {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.95) 0%, rgba(59, 130, 246, 0.85) 100%);
  color: white;
  border-color: rgba(59, 130, 246, 0.4);
}

.notification-icon {
  font-size: 18px;
  flex-shrink: 0;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1));
}

.notification-message {
  font-size: 14px;
  line-height: 1.5;
  flex: 1;
  word-wrap: break-word;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.notification-close {
  background: none;
  border: none;
  color: currentColor;
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
  padding: 2px;
  margin-left: 8px;
  opacity: 0.8;
  transition: all 0.2s ease;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  flex-shrink: 0;
}

.notification-close:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.15);
  transform: scale(1.1);
}

@keyframes slideIn {
  0% {
    transform: translateX(100%);
    opacity: 0;
  }
  50% {
    transform: translateX(-10px);
    opacity: 0.8;
  }
  100% {
    transform: translateX(0);
    opacity: 1;
  }
}

/* 響應式設計 */
@media (max-width: 480px) {
  .notification {
    top: 10px;
    right: 10px;
    left: 10px;
    max-width: none;
    min-width: auto;
  }
  
  .notification:hover {
    transform: translateX(0) scale(1.01);
  }
}

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

.home-btn {
  padding: 0.5rem 1rem;
  background: #68d391;
  color: white;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
  text-decoration: none;
  display: inline-block;
}

.home-btn:hover {
  background: #48bb78;
  transform: translateY(-2px);
  text-decoration: none;
  color: white;
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
.user-input,
.user-select {
  flex: 1;
  min-width: 200px;
  padding: 0.75rem;
  border: 2px solid #e2e8f0;
  border-radius: 0.5rem;
  font-size: 1rem;
}

.user-select {
  min-width: 300px;
  background-color: white;
}

.user-hint {
  margin-top: 0.5rem;
  font-size: 0.875rem;
  color: #64748b;
  text-align: center;
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

.sync-users-section {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e2e8f0;
  text-align: center;
}

.sync-btn {
  padding: 0.75rem 1.5rem;
  background: #38a169;
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 0.5rem;
}

.sync-btn:hover:not(:disabled) {
  background: #2f855a;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(56, 161, 105, 0.4);
}

.sync-btn:disabled {
  background: #a0aec0;
  cursor: not-allowed;
  transform: none;
}

.sync-hint {
  font-size: 0.75rem;
  color: #718096;
  margin: 0;
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

.player-email {
  font-weight: 400;
  color: #718096;
  font-size: 0.875rem;
  margin-top: 0.25rem;
}

.current-user-badge {
  font-size: 0.75rem;
  color: #4299e1;
  font-weight: 500;
  margin-left: 0.5rem;
}

.self-protection-note {
  color: #a0aec0;
  font-size: 1.2rem;
  cursor: help;
}

.player-balls {
  color: #718096;
  font-size: 0.875rem;
}

.user-role {
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-weight: 600;
  font-size: 0.6875rem;
  margin: 0 0.5rem;
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

.action-btn.promote {
  background: #28a745;
  color: white;
  border: none;
  padding: 0.5rem;
  border-radius: 4px;
  cursor: pointer;
  margin-right: 0.5rem;
}

.action-btn.promote:hover {
  background: #218838;
}

.action-btn.demote {
  background: #ffc107;
  color: #212529;
  border: none;
  padding: 0.5rem;
  border-radius: 4px;
  cursor: pointer;
  margin-right: 0.5rem;
}

.action-btn.demote:hover {
  background: #e0a800;
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

/* 調試信息區域 */
.debug-info-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 1rem;
  padding: 1.5rem;
  margin-bottom: 2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  border-left: 4px solid #4299e1;
}

.debug-info-card h3 {
  color: #2d3748;
  margin-bottom: 1rem;
  font-size: 1rem;
}

.debug-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: #f7fafc;
  border-radius: 0.5rem;
  border: 1px solid #e2e8f0;
}

.stat-label {
  font-size: 0.875rem;
  color: #4a5568;
  font-weight: 500;
}

.stat-value {
  font-size: 0.875rem;
  color: #2d3748;
  font-weight: 600;
  background: #4299e1;
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
}

.refresh-all-btn,
.sync-users-btn,
.check-user-btn {
  width: 100%;
  padding: 0.75rem 1.5rem;
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 0.5rem;
}

.refresh-all-btn {
  background: #4299e1;
}

.sync-users-btn {
  background: #ed8936;
}

.check-user-btn {
  background: #38a169;
}

.refresh-all-btn:hover:not(:disabled) {
  background: #3182ce;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(66, 153, 225, 0.4);
}

.sync-users-btn:hover:not(:disabled) {
  background: #dd6b20;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(237, 137,  54, 0.4);
}

.check-user-btn:hover:not(:disabled) {
  background: #2f855a;
  transform: translateY(-2px);
  box-shadow:  0 4px 12px rgba(56, 161, 105, 0.4);
}

.refresh-all-btn:disabled,
.sync-users-btn:disabled,
.check-user-btn:disabled {
  background: #a0aec0;
  cursor: not-allowed;
  transform: none;
}

.recent-users {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e2e8f0;
}

.recent-users h4 {
  margin: 0 0 0.75rem 0;
  color: #4a5568;
  font-size: 0.875rem;
  font-weight: 600;
}

.user-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.user-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  background: #f7fafc;
  border-radius: 0.375rem;
  font-size: 0.75rem;
}

.user-email {
  color: #2d3748;
  font-weight: 500;
  flex: 1;
}

.user-role {
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-weight: 600;
  font-size: 0.6875rem;
  margin: 0 0.5rem;
}

.user-role.admin {
  background: #fed7d7;
  color: #c53030;
}

.user-role.participant {
  background: #c6f6d5;
  color: #2f855a;
}

.user-name {
  font-weight: 600;
  color: #2d3748;
  font-size: 1rem;
}

.user-email {
  color: #718096;
  font-size: 0.875rem;
  margin-top: 0.25rem;
}

/* 手機版響應式設計 */
@media (max-width: 768px) {
  .dashboard-container {
    padding: 0.5rem;
  }
  
  .header {
    padding: 1rem;
    flex-direction: column;
    gap: 1rem;
  }
  
  .header h1 {
    font-size: 1.5rem;
    text-align: center;
  }
  
  .header-actions {
    width: 100%;
    justify-content: center;
  }
  
  .stats-grid {
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
  }
  
  .players-grid {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
  
  .player-card {
    padding: 0.75rem;
  }
  
  .player-actions {
    flex-wrap: wrap;
    gap: 0.25rem;
    justify-content: center;
  }
  
  .action-btn {
    min-width: 40px;
    padding: 0.4rem 0.6rem;
    font-size: 0.8rem;
  }
  
  .add-player-form {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
  
  .form-group select,
  .form-group input {
    font-size: 16px; /* 防止 iOS Safari 縮放 */
  }
}

@media (max-width: 480px) {
  .dashboard-container {
    padding: 0.25rem;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .stat-card {
    padding: 0.75rem;
  }
  
  .player-actions {
    flex-direction: column;
    align-items: stretch;
    gap: 0.25rem;
  }
  
  .action-btn {
    width: 100%;
    text-align: center;
    min-height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .player-info h3 {
    font-size: 0.9rem;
  }
  
  .player-info p {
    font-size: 0.8rem;
  }
}
</style>
