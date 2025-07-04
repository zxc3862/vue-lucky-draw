
<template>
  <div class="home">
    <header class="header">
      <h1>� 抽獎系統</h1>
      <p>歡迎參與我們的抽獎活動！球數越多，中獎機率越高！</p>
      <router-link to="/admin/login" class="admin-link">🔐 管理員入口</router-link>
    </header>
    
    <div class="stats">
      <div class="stat-card">
        <div class="stat-number">{{ players.length }}</div>
        <div class="stat-label">參與玩家</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">{{ totalBalls }}</div>
        <div class="stat-label">總球數</div>
      </div>
    </div>
    
    <div class="players-section">
      <h2>🏆 參與者排行榜</h2>
      <div v-if="players.length === 0" class="empty-state">
        暫無參與者，請聯繫管理員添加
      </div>
      <div v-else class="players-grid">
        <div v-for="(player, index) in players" :key="player.id" class="player-card">
          <div class="rank">{{ index + 1 }}</div>
          <div class="player-info">
            <div class="player-name">{{ player.name }}</div>
            <div class="player-balls">🎱 {{ player.balls }} 球</div>
          </div>
          <div class="chance">
            {{ Math.round((player.balls / totalBalls) * 100) }}% 機率
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { supabase } from '../../supabaseClient'
import { ref, onMounted, computed } from 'vue'

const players = ref([])

const totalBalls = computed(() => players.value.reduce((sum, p) => sum + p.balls, 0))

const fetchPlayers = async () => {
  const { data } = await supabase.from('players').select('*').order('balls', { ascending: false })
  players.value = data || []
}

onMounted(fetchPlayers)
</script>

<style scoped>
.home {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

.header {
  text-align: center;
  margin-bottom: 3rem;
}

.header h1 {
  font-size: 2.5rem;
  margin-bottom: 1rem;
  color: #1f2937;
}

.header p {
  color: #6b7280;
  margin-bottom: 1.5rem;
}

.admin-link {
  display: inline-block;
  padding: 0.5rem 1rem;
  background: #3b82f6;
  color: white;
  text-decoration: none;
  border-radius: 0.5rem;
  font-weight: 500;
}

.stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 3rem;
}

.stat-card {
  text-align: center;
  padding: 1.5rem;
  background: white;
  border-radius: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.stat-number {
  font-size: 2rem;
  font-weight: bold;
  color: #3b82f6;
}

.stat-label {
  color: #6b7280;
  margin-top: 0.5rem;
}

.players-section h2 {
  text-align: center;
  margin-bottom: 2rem;
  color: #1f2937;
}

.players-grid {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.player-card {
  display: flex;
  align-items: center;
  padding: 1rem;
  background: white;
  border-radius: 0.75rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s;
}

.player-card:hover {
  transform: translateY(-2px);
}

.rank {
  font-size: 1.25rem;
  font-weight: bold;
  color: #f59e0b;
  margin-right: 1rem;
  width: 2rem;
}

.player-info {
  flex: 1;
}

.player-name {
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 0.25rem;
}

.player-balls {
  color: #6b7280;
  font-size: 0.875rem;
}

.chance {
  font-weight: 600;
  color: #10b981;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: #6b7280;
}

@media (max-width: 640px) {
  .home {
    padding: 1rem;
  }
  
  .stats {
    grid-template-columns: 1fr;
  }
  
  .header h1 {
    font-size: 2rem;
  }
}
</style>
