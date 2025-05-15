<template>
  <Transition name="fade">
    <div v-if="toastStore.isVisible" class="toast-container">
      <div class="toast">
        {{ toastStore.message }}
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { useToastStore } from '../stores/toastStore';

const toastStore = useToastStore();
</script> 