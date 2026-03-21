<template>
  <div
    class="relative w-full h-screen overflow-hidden cursor-grab active:cursor-grabbing transition-all duration-500 ease"
    :class="settingsStore.sceneDarkMode
      ? 'bg-[linear-gradient(160deg,#0a0a14_0%,#10081e_60%,#080816_100%)]'
      : 'bg-[linear-gradient(160deg,#f0f4ff_0%,#e0d0ff_60%,#cce8ff_100%)]'"
  >
    <canvas ref="canvasRef" class="block w-full! h-full!" />
    <div v-if="selectedPack !== null" />
  </div>
</template>

<script setup>
  import { onMounted, onUnmounted } from 'vue'
  import { useSettingsStore } from '@/stores/settingsStore'
  import { useCarousel } from './composables/useCarousel'
  import { useDebugGUI } from './composables/useDebugGUI'
  import { useInteraction } from './composables/useInteraction'
  import { useMainSceneContext } from './composables/useMainSceneContext'
  import { useWebGL } from './composables/useWebGL'

  const settingsStore = useSettingsStore()

  // 1. Initialize Context
  const ctx = useMainSceneContext()
  const { canvasRef, selectedPack, config } = ctx

  // 2. Setup Composables
  const { initWebGL, startAnimation, disposeWebGL } = useWebGL(ctx, settingsStore)
  const { buildCarousel } = useCarousel(ctx)
  const { bindEvents, unbindEvents } = useInteraction(ctx)
  const { setupGUI, disposeGUI } = useDebugGUI(ctx)

  onMounted(() => {
    initWebGL()
    buildCarousel()
    setupGUI()

    // Initial snap – select the pack facing camera
    if (ctx.updateSelectedFromRotation) ctx.updateSelectedFromRotation(0)

    bindEvents()

    // Update camera on init
    if (ctx.updateCamera) ctx.updateCamera()

    startAnimation()
  })

  onUnmounted(() => {
    unbindEvents()
    disposeWebGL()
    disposeGUI()
  })

  function syncFromStore () {
    config.packCount = settingsStore.packCount
    if (ctx.applyTheme) ctx.applyTheme()
    if (ctx.autoFit) ctx.autoFit()
  }

  defineExpose({ syncFromStore })
</script>
