import { ref } from 'vue'

export function useMainSceneContext () {
  const canvasRef = ref(null)
  const selectedPack = ref(null)

  const config = {
    packCount: 15,
    radius: 4.2,
    packW: 1.5,
    packH: 2.4, // 1.5 * 1.6
    packD: 0.015,
    packY: 0.1,
    selectedLift: 0.1,
    bobAmplitude: 0.03,
    bobSpeed: 4,
    dragSensitivity: 0.003,
    camX: 0,
    camY: 0.4,
    camZ: 8,
    lookY: -0.3,
  }

  const ctx = {
    canvasRef,
    selectedPack,
    config,
    // Three.js instances
    renderer: null,
    scene: null,
    camera: null,
    interactionManager: null,
    carouselGroup: null,
    packMeshes: [],
    gui: null,
    // Interaction states
    isDragging: false,
    isSnapping: false,
    isSpinningPack: false,
    hasDragged: false,
    // Mats
    fadeMat: null,
    nearFadeMat: null,
    // Methods to be filled by other composables
    onResize: () => {},
    updateCamera: () => {},
    rebuildCarousel: () => {},
    autoFit: () => {},
    updateSelectedFromRotation: () => {},
    onPackClick: () => {},
    onPackHover: () => {},
    onPackOut: () => {},
    applyTheme: () => {},
  }

  return ctx
}
