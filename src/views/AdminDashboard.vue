
<template>
  <h2>🛠️ 管理面板</h2>
  <ul>
    <li v-for="player in players" :key="player.id">
      {{ player.name }} - 🎱 {{ player.balls }}
      <button @click="addBall(player.id)">+1</button>
      <button @click="remove(player.id)">🗑️</button>
    </li>
  </ul>
  <button @click="draw">🎯 抽獎</button>
</template>

<script setup>
import { supabase } from '../supabaseClient'
import { ref, onMounted } from 'vue'

const players = ref([])

const fetchPlayers = async () => {
  const { data } = await supabase.from('players').select('*')
  players.value = data
}

const addBall = async (id) => {
  const player = players.value.find(p => p.id === id)
  await supabase.from('players').update({ balls: player.balls + 1 }).eq('id', id)
  fetchPlayers()
}

const remove = async (id) => {
  await supabase.from('players').delete().eq('id', id)
  fetchPlayers()
}

const draw = async () => {
  const ballPool = players.value.flatMap(player => Array(player.balls).fill(player))
  if (ballPool.length === 0) return alert('沒球可以抽')
  const winner = ballPool[Math.floor(Math.random() * ballPool.length)]
  alert(`🎉 ${winner.name} 中獎！`)
  await supabase.from('players').update({ balls: winner.balls - 1 }).eq('id', winner.id)
  fetchPlayers()
}

onMounted(fetchPlayers)
</script>
