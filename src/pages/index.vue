<template>
  <MainScene ref="sceneRef" />
  <SettingsDrawer @settings-changed="onSettingsChanged" />
  <AppFooter />
</template>

<script setup>
  import { ref } from 'vue'
  import AppFooter from '@/components/AppFooter.vue'
  import MainScene from '@/components/MainScene.vue'
  import SettingsDrawer from '@/components/SettingsDrawer.vue'

  const sceneRef = ref(null)

  function onSettingsChanged () {
    if (sceneRef.value?.syncFromStore) {
      sceneRef.value.syncFromStore()
    }
  }
</script>
