<template>
  <MainScene ref="sceneRef" />
  <SettingsDrawer @settings-changed="onSettingsChanged" />
  <footer class="app-footer" :class="{ 'scene-dark': settings.sceneDarkMode }">
    dev.thaidd@gmail.com
  </footer>
</template>

<script setup>
  import { ref } from 'vue'
  import MainScene from '@/components/MainScene.vue'
  import SettingsDrawer from '@/components/SettingsDrawer.vue'
  import { useSettingsStore } from '@/stores/settingsStore'

  const settings = useSettingsStore()
  const sceneRef = ref(null)

  function onSettingsChanged () {
    if (sceneRef.value?.syncFromStore) {
      sceneRef.value.syncFromStore()
    }
  }
</script>

<style scoped>
.app-footer {
  position: fixed;
  bottom: 12px;
  right: 16px;
  z-index: 100;
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 0.65rem;
  /* Light scene style */
  color: rgba(90, 80, 140, 0.65);
  letter-spacing: 0.5px;
  pointer-events: none;
  user-select: none;
  text-shadow: none;
  transition: all 0.3s;
}

.app-footer.scene-dark {
  /* Dark scene style */
  color: rgba(255, 255, 255, 0.35);
  text-shadow: 0 0 4px rgba(0, 0, 0, 0.4);
}
</style>
