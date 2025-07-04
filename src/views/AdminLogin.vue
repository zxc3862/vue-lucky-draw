
<template>
  <h2>🔐 管理員登入</h2>
  <input v-model="email" placeholder="Email" />
  <button @click="login">登入連結寄送</button>
  <p v-if="message">{{ message }}</p>
</template>

<script setup>
import { supabase } from '../../supabaseClient'
import { ref } from 'vue'

const email = ref('')
const message = ref('')

const login = async () => {
  const { error } = await supabase.auth.signInWithOtp({ email: email.value })
  message.value = error ? '登入失敗' : '請至信箱收信完成登入'
}
</script>
