import { defineStore } from 'pinia';
import { ref } from 'vue';
import { ElMessage } from 'element-plus';

export const useToastStore = defineStore('toast', () => {
  const message = ref('');
  const isVisible = ref(false);
  let timer = null;

  function showToast(msg, type = 'info', duration = 2000) {
    // 使用Element Plus的消息组件
    ElMessage({
      message: msg,
      type: type, // success/warning/info/error
      duration: duration,
      showClose: true
    });
    
    // 不再设置底部自定义Toast的状态
    // 保留状态变量以避免其他组件引用出错
    message.value = msg;
    isVisible.value = false;
  }

  // 各种类型的便捷方法
  function success(msg, duration = 2000) {
    showToast(msg, 'success', duration);
  }

  function error(msg, duration = 3000) {
    showToast(msg, 'error', duration);
  }

  function warning(msg, duration = 2500) {
    showToast(msg, 'warning', duration);
  }

  function info(msg, duration = 2000) {
    showToast(msg, 'info', duration);
  }

  return {
    message,
    isVisible,
    showToast,
    success,
    error,
    warning,
    info
  };
}); 