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
  import { usePackageOpening } from './composables/package/usePackageOpening'
  import { usePackageSelection } from './composables/package/usePackageSelection'
  import { useCarousel } from './composables/scene/useCarousel'
  import { useInteraction } from './composables/scene/useInteraction'
  import { useMainSceneContext } from './composables/scene/useMainSceneContext'
  import { useWebGL } from './composables/scene/useWebGL'

  const settingsStore = useSettingsStore()

  // 1. Initialize Context
  const ctx = useMainSceneContext()
  const { canvasRef, selectedPack, config } = ctx

  // 2. Setup Composables
  const { initWebGL, startAnimation, disposeWebGL } = useWebGL(ctx, settingsStore)
  const { buildCarousel } = useCarousel(ctx)
  const { bindEvents, unbindEvents } = useInteraction(ctx)
  usePackageSelection(ctx)
  usePackageOpening(ctx)

  onMounted(() => {
    initWebGL()
    buildCarousel()

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
  })

  function syncFromStore () {
    config.packCount = settingsStore.packCount
    if (ctx.applyTheme) ctx.applyTheme()
    if (ctx.autoFit) ctx.autoFit()
  }

  defineExpose({ syncFromStore })
</script>
