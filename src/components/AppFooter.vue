<template>
  <footer
    class="fixed bottom-3 right-4 z-100 font-mono font-medium text-xs tracking-wide pointer-events-none select-none transition-all duration-300"
    :class="settings.sceneDarkMode ? 'text-white/45 drop-shadow-md' : 'text-[#ff0044]'"
  >
    dev.thaidd@gmail.com
  </footer>
</template>

<script setup>
  import { useSettingsStore } from '@/stores/settingsStore'
  const settings = useSettingsStore()
</script>
