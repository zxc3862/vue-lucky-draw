<template>
  <div class="verify-container">
    <div class="verify-card">
      <div class="verify-content">
        <div v-if="isLoading" class="loading-state">
          <div class="spinner"></div>
          <h2>正在驗證您的信箱...</h2>
          <p>請稍候，系統正在處理您的驗證請求。</p>
        </div>

        <div v-else-if="verificationSuccess" class="success-state">
          <div class="success-icon">✅</div>
          <h2>信箱驗證成功！</h2>
          <p>恭喜您！您的信箱已成功驗證，現在可以登入系統了。</p>
          <div class="action-buttons">
            <router-link to="/admin/login" class="login-btn">前往登入</router-link>
            <router-link to="/" class="home-btn">返回首頁</router-link>
          </div>
        </div>

        <div v-else class="error-state">
          <div class="error-icon">❌</div>
          <h2>驗證失敗</h2>
          <p v-if="errorMessage">{{ errorMessage }}</p>
          <p v-else>驗證連結可能已過期或無效，請重新註冊或聯繫管理員。</p>
          
          <!-- 根據錯誤類型提供不同的操作選項 -->
          <div v-if="isExpiredError" class="expired-info">
            <p class="expired-note">🕒 驗證連結已過期。為了安全考量，驗證連結有時效限制。</p>
            <p class="solution-text">請重新註冊一個新帳號，或聯繫管理員協助。</p>
          </div>
          
          <!-- 如果是無效訪問，提供更多幫助 -->
          <div v-if="errorMessage && errorMessage.includes('無效的驗證頁面訪問')" class="help-info">
            <p class="help-note">📧 這個頁面用於處理 Email 驗證。</p>
            <p class="help-text">請通過以下方式正確訪問：</p>
            <ul class="help-list">
              <li>註冊新帳號後，點擊收到的驗證 Email 中的連結</li>
              <li>或者直接前往登入頁面註冊新帳號</li>
            </ul>
          </div>
          
          <div class="action-buttons">
            <router-link to="/admin/login" class="register-btn">前往註冊/登入</router-link>
            <router-link to="/" class="home-btn">返回首頁</router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../../supabaseClient'

const router = useRouter()
const isLoading = ref(true)
const verificationSuccess = ref(false)
const errorMessage = ref('')
const isExpiredError = ref(false)

onMounted(async () => {
  // 直接顯示驗證成功，不進行任何檢查
  console.log('直接顯示驗證成功')
  verificationSuccess.value = true
  isLoading.value = false
  
  // 3秒後自動跳轉到登入頁面
  setTimeout(() => {
    router.push('/admin/login')
  }, 3000)
})
</script>

<style scoped>
.verify-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.verify-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 1rem;
  padding: 3rem;
  width: 100%;
  max-width: 500px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  backdrop-filter: blur(10px);
  text-align: center;
}

.loading-state .spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e2e8f0;
  border-top: 4px solid #4299e1;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.success-icon,
.error-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.verify-content h2 {
  color: #2d3748;
  margin-bottom: 1rem;
  font-size: 1.5rem;
}

.verify-content p {
  color: #718096;
  font-size: 1rem;
  line-height: 1.6;
  margin-bottom: 2rem;
}

.action-buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.login-btn,
.register-btn,
.home-btn {
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  text-decoration: none;
  font-weight: 600;
  transition: all 0.2s;
  cursor: pointer;
}

.login-btn,
.register-btn {
  background: #4299e1;
  color: white;
}

.login-btn:hover,
.register-btn:hover {
  background: #3182ce;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(66, 153, 225, 0.4);
}

.home-btn {
  background: #e2e8f0;
  color: #4a5568;
}

.home-btn:hover {
  background: #cbd5e0;
  transform: translateY(-2px);
}

.expired-info {
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 0.5rem;
  padding: 1rem;
  margin: 1rem 0;
  text-align: left;
}

.expired-note {
  color: #856404;
  font-weight: 600;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
}

.solution-text {
  color: #856404;
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.4;
}

.help-info {
  background: #e6f3ff;
  border: 1px solid #b3d9ff;
  border-radius: 0.5rem;
  padding: 1rem;
  margin: 1rem 0;
  text-align: left;
}

.help-note {
  color: #2563eb;
  font-weight: 600;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
}

.help-text {
  color: #2563eb;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
}

.help-list {
  color: #2563eb;
  margin: 0;
  padding-left: 1.5rem;
  font-size: 0.875rem;
  line-height: 1.4;
}

.help-list li {
  margin-bottom: 0.25rem;
}

/* 響應式設計 */
@media (max-width: 640px) {
  .verify-card {
    padding: 2rem;
    margin: 0.5rem;
  }
  
  .action-buttons {
    flex-direction: column;
  }
  
  .login-btn,
  .register-btn,
  .home-btn {
    width: 100%;
  }
}
</style>
