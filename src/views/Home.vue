
<template>
  <h1>🎉 玩家列表</h1>
  <ul>
    <li v-for="player in players" :key="player.id">
      {{ player.name }} - 🎱 {{ player.balls }}
    </li>
  </ul>
</template>

<script setup>
import { supabase } from '../supabaseClient'
import { ref, onMounted } from 'vue'

const players = ref([])

const fetchPlayers = async () => {
  const { data } = await supabase.from('players').select('*').order('balls', { ascending: false })
  players.value = data
}

onMounted(fetchPlayers)
</script>
