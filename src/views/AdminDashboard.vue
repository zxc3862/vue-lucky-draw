<template>
  <div v-if="!isAuthenticated" class="login-prompt">
    <h2>� 請先登入</h2>
    <p>您需要先在 <router-link to="/admin/login">管理員登入頁面</router-link> 完成身份驗證</p>
  </div>
  
  <div v-else>
    <div class="header">
      <h2>�🛠️ 管理面板</h2>
      <button @click="logout" class="logout-btn">登出</button>
    </div>
    
    <div class="add-player">
      <input v-model="newPlayerName" placeholder="新增玩家姓名" @keyup.enter="addPlayer" />
      <button @click="addPlayer">➕ 新增玩家</button>
    </div>
    
    <div class="players-list">
      <h3>📋 玩家列表</h3>
      <div v-if="players.length === 0" class="empty-state">
        暫無玩家，請先新增玩家
      </div>
      <div v-for="player in players" :key="player.id" class="player-item">
        <span class="player-name">{{ player.name }}</span>
        <span class="player-balls">🎱 {{ player.balls }}</span>
        <div class="actions">
          <button @click="addBall(player.id)" class="btn-add">+1</button>
          <button @click="removeBall(player.id)" class="btn-remove" :disabled="player.balls <= 0">-1</button>
          <button @click="removePlayer(player.id)" class="btn-delete">🗑️</button>
        </div>
      </div>
    </div>
    
    <div class="draw-section">
      <button @click="draw" class="draw-btn" :disabled="totalBalls === 0">
        🎯 抽獎 (總球數: {{ totalBalls }})
      </button>
    </div>
    
    <div v-if="drawHistory.length > 0" class="history">
      <h3>📜 抽獎歷史</h3>
      <div v-for="record in drawHistory.slice(0, 5)" :key="record.id" class="history-item">
        🎉 {{ record.winner_name }} ({{ new Date(record.draw_time).toLocaleString() }})
      </div>
    </div>
  </div>
</template>

<script setup>
import { supabase } from '../../supabaseClient'
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const players = ref([])
const drawHistory = ref([])
const newPlayerName = ref('')
const isAuthenticated = ref(false)

const totalBalls = computed(() => players.value.reduce((sum, p) => sum + p.balls, 0))

const checkAuth = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  isAuthenticated.value = !!user
}

const fetchPlayers = async () => {
  const { data } = await supabase.from('players').select('*').order('balls', { ascending: false })
  players.value = data || []
}

const fetchDrawHistory = async () => {
  const { data } = await supabase.from('draw_history').select('*').order('draw_time', { ascending: false }).limit(10)
  drawHistory.value = data || []
}

const addPlayer = async () => {
  if (!newPlayerName.value.trim()) return alert('請輸入玩家姓名')
  
  const { error } = await supabase.from('players').insert([
    { name: newPlayerName.value.trim(), balls: 1 }
  ])
  
  if (error) {
    alert(error.message.includes('duplicate') ? '玩家姓名已存在' : '新增失敗')
    return
  }
  
  newPlayerName.value = ''
  await fetchPlayers()
}

const addBall = async (id) => {
  const player = players.value.find(p => p.id === id)
  await supabase.from('players').update({ balls: player.balls + 1 }).eq('id', id)
  await fetchPlayers()
}

const removeBall = async (id) => {
  const player = players.value.find(p => p.id === id)
  if (player.balls <= 0) return
  
  await supabase.from('players').update({ balls: player.balls - 1 }).eq('id', id)
  await fetchPlayers()
}

const removePlayer = async (id) => {
  const player = players.value.find(p => p.id === id)
  if (!confirm(`確定要刪除玩家「${player.name}」嗎？`)) return
  
  await supabase.from('players').delete().eq('id', id)
  await fetchPlayers()
}

const draw = async () => {
  const ballPool = players.value.flatMap(player => Array(player.balls).fill(player))
  if (ballPool.length === 0) return alert('沒有球可以抽獎')
  
  const winner = ballPool[Math.floor(Math.random() * ballPool.length)]
  
  // 記錄抽獎歷史
  await supabase.from('draw_history').insert([{
    winner_id: winner.id,
    winner_name: winner.name,
    balls_before: winner.balls
  }])
  
  alert(`🎉 恭喜 ${winner.name} 中獎！`)
  
  // 中獎後減少一顆球
  await supabase.from('players').update({ balls: winner.balls - 1 }).eq('id', winner.id)
  
  await fetchPlayers()
  await fetchDrawHistory()
}

const logout = async () => {
  await supabase.auth.signOut()
  router.push('/admin/login')
}

onMounted(async () => {
  await checkAuth()
  if (isAuthenticated.value) {
    await fetchPlayers()
    await fetchDrawHistory()
  }
})
</script>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.logout-btn {
  padding: 0.5rem 1rem;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
}

.add-player {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  padding: 1rem;
  background: #f8fafc;
  border-radius: 0.5rem;
}

.add-player input {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.25rem;
}

.players-list {
  margin-bottom: 2rem;
}

.player-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  margin-bottom: 0.5rem;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
}

.player-name {
  font-weight: 600;
}

.player-balls {
  color: #6b7280;
}

.actions {
  display: flex;
  gap: 0.5rem;
}

.actions button {
  padding: 0.25rem 0.5rem;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
  font-size: 0.875rem;
}

.btn-add { background: #10b981; color: white; }
.btn-remove { background: #f59e0b; color: white; }
.btn-delete { background: #ef4444; color: white; }

.draw-btn {
  width: 100%;
  padding: 1rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-size: 1.125rem;
  font-weight: 600;
  cursor: pointer;
  margin-bottom: 2rem;
}

.draw-btn:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.history-item {
  padding: 0.5rem;
  margin-bottom: 0.25rem;
  background: #f0f9ff;
  border-radius: 0.25rem;
  font-size: 0.875rem;
}

.login-prompt {
  text-align: center;
  padding: 2rem;
}

.empty-state {
  text-align: center;
  color: #6b7280;
  padding: 2rem;
}
</style>
