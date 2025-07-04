
import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import AdminLogin from '../views/AdminLogin.vue'
import AdminDashboard from '../views/AdminDashboard.vue'
import ResetPassword from '../views/ResetPassword.vue'

const routes = [
  { path: '/', component: Home },
  { path: '/admin/login', component: AdminLogin },
  { path: '/admin/dashboard', component: AdminDashboard },
  { path: '/reset-password', component: ResetPassword }
]

export default createRouter({
  history: createWebHistory(),
  routes
})
