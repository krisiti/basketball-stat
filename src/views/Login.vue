<template>
  <div class="login-container">
    <div class="login-box">
      <h2>篮球比赛统计系统</h2>
      <el-form :model="loginForm" :rules="rules" ref="loginFormRef" class="login-form">
        <el-form-item prop="username">
          <el-input 
            v-model="loginForm.username" 
            prefix-icon="User"
            placeholder="用户名">
          </el-input>
        </el-form-item>
        <el-form-item prop="password">
          <el-input 
            v-model="loginForm.password" 
            prefix-icon="Lock"
            type="password" 
            placeholder="密码"
            @keyup.enter="handleLogin">
          </el-input>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" class="login-button" @click="handleLogin" :loading="loading">
            登录
          </el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

const router = useRouter()
const loginFormRef = ref(null)
const loading = ref(false)

const loginForm = reactive({
  username: '',
  password: ''
})

const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能小于6位', trigger: 'blur' }
  ]
}

const handleLogin = () => {
  if (loginFormRef.value) {
    loginFormRef.value.validate((valid) => {
      if (valid) {
        loading.value = true
        
        // Hardcoded credentials check
        if (loginForm.username === 'bigo' && loginForm.password === '12345678') {
          setTimeout(() => {
            localStorage.setItem('isAuthenticated', 'true')
            router.push('/dashboard')
            loading.value = false
          }, 800)
        } else {
          setTimeout(() => {
            ElMessage.error('用户名或密码错误')
            loading.value = false
          }, 800)
        }
      }
    })
  }
}
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: #f0f2f5;
}

.login-box {
  width: 350px;
  padding: 35px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

h2 {
  text-align: center;
  margin-bottom: 25px;
  color: #303133;
}

.login-form {
  margin-top: 20px;
}

.login-button {
  width: 100%;
}
</style> 