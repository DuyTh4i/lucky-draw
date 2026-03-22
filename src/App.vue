<template>
  <v-app>
    <router-view />

    <!-- Lock Landscape Overlay -->
    <div
      id="portrait-lock"
      class="fixed inset-0 z-50 hidden flex-col items-center justify-center bg-[#080812] text-center text-white"
    >
      <svg
        class="mb-4 h-16 w-16 animate-bounce text-[#ff0044]"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
        />
      </svg>
      <h2 class="mb-2 text-xl font-bold tracking-wide">Xoay dọc màn hình</h2>
      <p class="max-w-[280px] text-sm text-white/50">Vui lòng xoay điện thoại của bạn lại theo chiều dọc để trải nghiệm đồ họa 3D tốt nhất.</p>
    </div>
  </v-app>
</template>

<script setup>
  import { onMounted } from 'vue'

  onMounted(() => {
    // Thử cưỡng chế khóa xoay ngang qua API hệ thống
    try {
      if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('portrait').catch(() => {})
      }
    } catch {
      // iOS Safari và Desktop không hỗ trợ API này
    }
  })
</script>

<style>
html, body {
  margin: 0 !important;
  padding: 0 !important;
  overflow: hidden !important;
}

/* Khóa xoay ngang trên điện thoại */
@media screen and (orientation: landscape) and (max-height: 600px) and (hover: none) {
  #portrait-lock {
    display: flex !important;
  }
}
</style>
