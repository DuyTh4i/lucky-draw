<template>
  <div class="scene-wrapper" :class="{ dark: settingsStore.sceneDarkMode }">
    <canvas ref="canvasRef" />
    <div v-if="selectedPack !== null" />
  </div>
</template>

<script setup>
  import GUI from 'lil-gui'
  import * as THREE from 'three'
  import { InteractionManager } from 'three.interactive'
  import { Reflector } from 'three/addons/objects/Reflector.js'
  import { onMounted, onUnmounted, ref } from 'vue'
  import { useSettingsStore } from '@/stores/settingsStore'

  const settingsStore = useSettingsStore()

  // ─── Name & Color Pool ──────────────────────────────────────────────────────
  const ALL_NAMES = [
    'Mewtwo Pack', 'Charizard Pack', 'Pikachu Pack', 'Gengar Pack', 'Lugia Pack',
    'Dragonite Pack', 'Rayquaza Pack', 'Arceus Pack', 'Giratina Pack', 'Dialga Pack',
  ]
  const ALL_COLORS = [
    0x8b_2b_e2, 0x1a_6e_e8, 0xe8_28_1a, 0x18_b8_5a, 0xe8_a0_18,
    0xff_44_88, 0x44_ff_aa, 0xff_88_00, 0x00_88_ff, 0xaa_44_ff,
  ]

  // ─── Config (GUI-controlled) ───────────────────────────────────────────────
  const config = {
    packCount: 15,
    radius: 4,
    packW: 1.2,
    packH: 2.3,
    packD: 0.015,
    packY: 0.4,
    selectedLift: 0.1,
    bobAmplitude: 0.03,
    bobSpeed: 3,
    dragSensitivity: 0.006,
    // Camera
    camX: 0,
    camY: 0.3,
    camZ: 10,
    lookY: 0,
  }

  // ─── State ──────────────────────────────────────────────────────────────────
  const canvasRef = ref(null)
  const selectedPack = ref(null)

  let renderer, scene, camera, interactionManager
  let carouselGroup, packMeshes = []
  let animFrameId, gui

  // Drag state
  let isDragging = false
  let previousMouseX = 0
  let hasDragged = false
  let isSnapping = false

  // Selected-pack spin state
  let isSpinningPack = false
  const _spinStartX = 0
  let spinLastX = 0
  let spinAccumulated = 0
  const raycaster = new THREE.Raycaster()
  const mouseNDC = new THREE.Vector2()

  // Theme materials refs
  let fadeMat = null
  let nearFadeMat = null

  // ─── Create Pack Mesh ─────────────────────────────────────────────────────
  function createPackMesh (colorHex, index) {
    // --- Front canvas ---
    const fc = document.createElement('canvas')
    fc.width = 128
    fc.height = 192
    const ctx = fc.getContext('2d')

    const grad = ctx.createLinearGradient(0, 0, 128, 192)
    grad.addColorStop(0, '#' + colorHex.toString(16).padStart(6, '0'))
    grad.addColorStop(1, '#1a0033')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 128, 192)

    // Sheen overlay
    const sheen = ctx.createLinearGradient(0, 0, 128, 0)
    sheen.addColorStop(0, 'rgba(255,255,255,0.00)')
    sheen.addColorStop(0.4, 'rgba(255,255,255,0.18)')
    sheen.addColorStop(1, 'rgba(255,255,255,0.00)')
    ctx.fillStyle = sheen
    ctx.fillRect(0, 0, 128, 192)

    // --- Back canvas ---
    const bc = document.createElement('canvas')
    bc.width = 128
    bc.height = 192
    const bctx = bc.getContext('2d')
    bctx.fillStyle = '#0d0d2b'
    bctx.fillRect(0, 0, 128, 192)

    const side = new THREE.MeshBasicMaterial({ color: 0x11_00_22})

    return new THREE.Mesh(
      new THREE.BoxGeometry(config.packW, config.packH, config.packD),
      [
        side, side, side, side,
        new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(fc), roughness: 0.3}),
        new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(bc), roughness: 0.3}),
      ],
    )
  }

  // ─── Build / Clear Carousel ──────────────────────────────────────────────
  function clearCarousel () {
    if (!carouselGroup) return
    for (const mesh of packMeshes) {
      interactionManager.remove(mesh)
      mesh.geometry.dispose()
      if (Array.isArray(mesh.material)) {
        for (const m of mesh.material) {
          if (m.map) m.map.dispose()
          m.dispose()
        }
      }
    }
    scene.remove(carouselGroup)
    carouselGroup = null
    packMeshes = []
    selectedPack.value = null
  }

  function buildCarousel () {
    carouselGroup = new THREE.Group()
    packMeshes = []

    for (let i = 0; i < config.packCount; i++) {
      const angle = (i / config.packCount) * Math.PI * 2
      const mesh = createPackMesh(ALL_COLORS[i % ALL_COLORS.length], i)

      mesh.position.x = Math.sin(angle) * config.radius
      mesh.position.z = Math.cos(angle) * config.radius
      mesh.rotation.y = angle
      mesh.userData.packIndex = i
      mesh.userData.baseAngle = angle
      mesh.castShadow = true

      packMeshes.push(mesh)
      carouselGroup.add(mesh)
    }

    scene.add(carouselGroup)

    // Register interactions
    for (const mesh of packMeshes) {
      interactionManager.add(mesh)
      mesh.addEventListener('click', onPackClick)
      mesh.addEventListener('mouseover', onPackHover)
      mesh.addEventListener('mouseout', onPackOut)
    }
  }

  function rebuildCarousel () {
    clearCarousel()
    buildCarousel()
  }

  // ─── Auto-fit radius / pack size / camera when packCount changes ────────
  function autoFit () {
    const n = config.packCount
    const gap = 0.17 // minimum gap between packs
    // Scale pack width down for many packs
    config.packW = Math.max(0.9, 1.6 - (n - 5) * 0.03)
    config.packH = Math.max(1.2, 2.3 - (n - 5) * 0.05)
    // Radius so adjacent packs don't overlap: chord >= packW + gap
    config.radius = Math.max(2.5, (config.packW + gap) / (2 * Math.sin(Math.PI / n)))
    rebuildCarousel()

    // Make responsive right after build
    if (camera && canvasRef.value) {
      onResize()
    } else {
      config.camZ = config.radius * 2.2 + 2
      updateCamera()
    }

    // Refresh GUI sliders to reflect new computed values
    if (gui) {
      for (const c of gui.controllersRecursive()) c.updateDisplay()
    }
  }

  // ─── Floor & Lights ───────────────────────────────────────────────────────
  function buildFloor () {
    // Mirror reflector – larger, softer
    const reflector = new Reflector(new THREE.PlaneGeometry(20, 20), {
      clipBias: 0.003,
      textureWidth: window.innerWidth * window.devicePixelRatio * 0.2,
      textureHeight: window.innerHeight * window.devicePixelRatio * 0.2,
      color: 0xff_ff_ff,
    })
    reflector.rotation.x = -Math.PI / 2
    reflector.position.y = -config.packH / 2 - 0.01
    scene.add(reflector)

    // Wide fade overlay to soften the reflection
    fadeMat = new THREE.MeshBasicMaterial({
      color: settingsStore.sceneDarkMode ? 0x0a_0a_14 : 0xee_f2_ff, transparent: true, opacity: 0.72, depthWrite: false,
    })
    const fade = new THREE.Mesh(new THREE.PlaneGeometry(35, 35), fadeMat)
    fade.rotation.x = -Math.PI / 2
    fade.position.set(0, -config.packH / 2 + 0.01, 4)
    scene.add(fade)

    // Extra close-range fade for a soft gradient look near the packs
    nearFadeMat = new THREE.MeshBasicMaterial({
      color: settingsStore.sceneDarkMode ? 0x0a_0a_14 : 0xee_f2_ff, transparent: true, opacity: 0.35, depthWrite: false,
    })
    const nearFade = new THREE.Mesh(new THREE.PlaneGeometry(35, 35), nearFadeMat)
    nearFade.rotation.x = -Math.PI / 2
    nearFade.position.set(0, -config.packH / 2 + 0.02, -6)
    scene.add(nearFade)
  }

  function buildLights () {
    scene.add(new THREE.AmbientLight(0xff_ff_ff, 0.7))

    const dir = new THREE.DirectionalLight(0xff_ff_ff, 0.8)
    dir.position.set(0, 10, 0)
    //dir.castShadow = true
    scene.add(dir)

    // Purple rim
    const rim = new THREE.PointLight(0xaa_44_ff, 1.4, 22)
    rim.position.set(-5, 4, -5)
    scene.add(rim)

    // Cyan fill
    const fill = new THREE.PointLight(0x44_cc_ff, 0.9, 22)
    fill.position.set(5, 2, 5)
    scene.add(fill)
  }

  // ─── Pack Interactions ────────────────────────────────────────────────────
  function onPackClick (event) {
    if (hasDragged || isSpinningPack) return
    const idx = event.target.userData.packIndex
    // Only the snapped (center) pack is interactive
    if (idx === undefined || idx !== selectedPack.value) return
  }

  function onPackHover (event) {
    const idx = event.target.userData.packIndex
    if (idx !== selectedPack.value) return
    if (!isDragging && !isSpinningPack) {
      document.body.style.cursor = 'pointer'
    }
  }

  function onPackOut (event) {
    const idx = event.target.userData.packIndex
    if (idx !== selectedPack.value) return
    if (!isDragging && !isSpinningPack) {
      document.body.style.cursor = 'default'
    }
  }

  // ─── Snap to Nearest Pack ──────────────────────────────────────────────────
  function snapToNearest () {
    if (isSnapping) return
    const anglePerPack = (Math.PI * 2) / config.packCount
    const currentY = carouselGroup.rotation.y
    const targetY = Math.round(currentY / anglePerPack) * anglePerPack
    const diff = targetY - currentY

    if (Math.abs(diff) < 0.001) {
      updateSelectedFromRotation(targetY)
      return
    }

    isSnapping = true
    const duration = 180
    const t0 = performance.now()

    function step (now) {
      const t = Math.min((now - t0) / duration, 1)
      const ease = 1 - Math.pow(1 - t, 3)
      carouselGroup.rotation.y = currentY + diff * ease
      if (t < 1) {
        requestAnimationFrame(step)
      } else {
        carouselGroup.rotation.y = targetY
        isSnapping = false
        updateSelectedFromRotation(targetY)
      }
    }
    requestAnimationFrame(step)
  }

  function updateSelectedFromRotation (rotationY) {
    const anglePerPack = (Math.PI * 2) / config.packCount
    const rawIndex = Math.round(-rotationY / anglePerPack) % config.packCount
    const idx = ((rawIndex % config.packCount) + config.packCount) % config.packCount
    selectedPack.value = idx
  }

  // ─── Snap pack to nearest face (nearest π/2) ─────────────────────────────
  function snapPackToFace () {
    if (selectedPack.value === null) return
    const mesh = packMeshes[selectedPack.value]
    const base = mesh.userData.baseAngle
    const current = mesh.rotation.y
    const offset = current - base
    // Nearest quarter-turn from base
    const targetOffset = Math.round(offset / (Math.PI)) * (Math.PI)
    const targetRot = base + targetOffset
    const diff = targetRot - current

    if (Math.abs(diff) < 0.005) {
      mesh.rotation.y = targetRot
      spinAccumulated = 0
      return
    }

    const duration = 220
    const t0 = performance.now()
    const startRot = current
    function step (now) {
      const t = Math.min((now - t0) / duration, 1)
      const ease = 1 - Math.pow(1 - t, 3)
      mesh.rotation.y = startRot + diff * ease
      if (t < 1) requestAnimationFrame(step)
      else {
        mesh.rotation.y = targetRot
        spinAccumulated = 0
      }
    }
    requestAnimationFrame(step)
  }

  // ─── Raycast helper ───────────────────────────────────────────────────────
  function hitSelectedPack (clientX, clientY) {
    if (selectedPack.value === null) return false
    const rect = canvasRef.value.getBoundingClientRect()
    mouseNDC.x = ((clientX - rect.left) / rect.width) * 2 - 1
    mouseNDC.y = -((clientY - rect.top) / rect.height) * 2 + 1
    raycaster.setFromCamera(mouseNDC, camera)
    const hits = raycaster.intersectObject(packMeshes[selectedPack.value])
    return hits.length > 0
  }

  // ─── Drag Handlers (Mouse) ───────────────────────────────────────────────
  let holdTimer = null
  let pendingSpinX = 0
  let hitOnPack = false
  const HOLD_DELAY = 200 // ms to hold before entering spin mode

  function onMouseDown (event) {
    if (isSnapping) return

    // Check if clicking directly on the selected (centered) pack
    if (hitSelectedPack(event.clientX, event.clientY)) {
      hitOnPack = true
      pendingSpinX = event.clientX
      // Start hold timer — if user holds without dragging, enter spin mode
      holdTimer = setTimeout(() => {
        isSpinningPack = true
        spinLastX = pendingSpinX
        spinAccumulated = 0
        document.body.style.cursor = 'ew-resize'
        holdTimer = null
      }, HOLD_DELAY)
      // Also prepare for carousel drag in case user drags before timer
      isDragging = true
      hasDragged = false
      previousMouseX = event.clientX
      return
    }

    hitOnPack = false
    isDragging = true
    hasDragged = false
    previousMouseX = event.clientX
  }

  function onMouseMove (event) {
    // If hold timer is still pending, user started dragging → cancel spin, keep carousel drag
    if (holdTimer && hitOnPack) {
      const dx = Math.abs(event.clientX - pendingSpinX)
      if (dx > 4) {
        clearTimeout(holdTimer)
        holdTimer = null
        hitOnPack = false
        // Continue as carousel drag
      }
    }

    // Spinning the selected pack on its Y axis
    if (isSpinningPack && selectedPack.value !== null) {
      const deltaX = event.clientX - spinLastX
      spinLastX = event.clientX
      const deltaRad = deltaX * 0.01
      spinAccumulated += deltaRad
      packMeshes[selectedPack.value].rotation.y += deltaRad
      // Full 360° rotation → reset to base angle
      if (Math.abs(spinAccumulated) >= Math.PI * 2) {
        spinAccumulated = 0
        spinStartX = event.clientX
        spinLastX = event.clientX
        packMeshes[selectedPack.value].rotation.y = packMeshes[selectedPack.value].userData.baseAngle
      }
      return
    }

    if (!isDragging || isSnapping) return
    const deltaX = event.clientX - previousMouseX
    if (Math.abs(deltaX) > 2) hasDragged = true
    carouselGroup.rotation.y += deltaX * config.dragSensitivity
    previousMouseX = event.clientX
  }

  function onMouseUp () {
    // Clear hold timer if still pending
    if (holdTimer) {
      clearTimeout(holdTimer)
      holdTimer = null
    }
    hitOnPack = false

    if (isSpinningPack) {
      isSpinningPack = false
      isDragging = false
      hasDragged = false
      document.body.style.cursor = 'default'
      snapPackToFace()
      return
    }
    if (!isDragging) return
    isDragging = false
    document.body.style.cursor = 'default'
    snapToNearest()
    setTimeout(() => {
      hasDragged = false
    }, 100)
  }

  // ─── Drag Handlers (Touch) ───────────────────────────────────────────────
  let touchHoldTimer = null
  let touchPendingX = 0
  let touchHitOnPack = false

  function onTouchStart (event) {
    if (isSnapping) return

    const touch = event.touches[0]
    if (hitSelectedPack(touch.clientX, touch.clientY)) {
      touchHitOnPack = true
      touchPendingX = touch.clientX
      touchHoldTimer = setTimeout(() => {
        isSpinningPack = true
        spinLastX = touchPendingX
        spinAccumulated = 0
        touchHoldTimer = null
      }, HOLD_DELAY)
      isDragging = true
      hasDragged = false
      previousMouseX = touch.clientX
      return
    }

    touchHitOnPack = false
    isDragging = true
    hasDragged = false
    previousMouseX = touch.clientX
  }

  function onTouchMove (event) {
    // If hold timer still pending, user dragged → cancel spin
    if (touchHoldTimer && touchHitOnPack) {
      const dx = Math.abs(event.touches[0].clientX - touchPendingX)
      if (dx > 4) {
        clearTimeout(touchHoldTimer)
        touchHoldTimer = null
        touchHitOnPack = false
      }
    }

    // Touch spin
    if (isSpinningPack && selectedPack.value !== null) {
      event.preventDefault()
      const deltaX = event.touches[0].clientX - spinLastX
      spinLastX = event.touches[0].clientX
      const deltaRad = deltaX * 0.01
      spinAccumulated += deltaRad
      packMeshes[selectedPack.value].rotation.y += deltaRad
      if (Math.abs(spinAccumulated) >= Math.PI * 2) {
        spinAccumulated = 0
        spinLastX = event.touches[0].clientX
        packMeshes[selectedPack.value].rotation.y = packMeshes[selectedPack.value].userData.baseAngle
      }
      return
    }

    if (!isDragging || isSnapping) return
    event.preventDefault()
    const deltaX = event.touches[0].clientX - previousMouseX
    if (Math.abs(deltaX) > 2) hasDragged = true
    carouselGroup.rotation.y += deltaX * config.dragSensitivity
    previousMouseX = event.touches[0].clientX
  }

  function onTouchEnd () {
    if (touchHoldTimer) {
      clearTimeout(touchHoldTimer)
      touchHoldTimer = null
    }
    touchHitOnPack = false

    if (isSpinningPack) {
      isSpinningPack = false
      isDragging = false
      hasDragged = false
      snapPackToFace()
      return
    }
    isDragging = false
    snapToNearest()
    setTimeout(() => {
      hasDragged = false
    }, 100)
  }

  // ─── Resize ───────────────────────────────────────────────────────────────
  function onResize () {
    if (!canvasRef.value || !camera || !renderer) return
    const w = canvasRef.value.clientWidth
    const h = canvasRef.value.clientHeight
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h, false)

    // Make camera responsive to screen width (move back on narrow screens)
    const baseZ = config.radius * 2.2 + 2
    const aspectFactor = camera.aspect < 1 ? 1 / camera.aspect : 1
    config.camZ = baseZ * Math.pow(aspectFactor, 0.75)
    updateCamera()
  }

  // ─── Camera helper ────────────────────────────────────────────────────────
  function updateCamera () {
    camera.position.set(config.camX, config.camY, config.camZ)
    camera.lookAt(0, config.lookY, 0)
  }

  // ─── Render Loop ──────────────────────────────────────────────────────────
  function animate () {
    animFrameId = requestAnimationFrame(animate)

    // Bobbing animation – skip the selected (centered) pack
    const time = performance.now() * 0.001
    for (let i = 0; i < packMeshes.length; i++) {
      const phase = (i / packMeshes.length) * Math.PI * 2
      // const bobY = isSelected ? 0 : Math.sin(time * config.bobSpeed + phase) * config.bobAmplitude
      // const liftY = isSelected ? config.selectedLift : 0
      const bobY = Math.sin(time * config.bobSpeed + phase) * config.bobAmplitude
      const liftY = 0
      const targetY = config.packY + bobY + liftY

      // Smooth lerp for nice transitions
      packMeshes[i].position.y += (targetY - packMeshes[i].position.y) * 0.12
    }

    try {
      interactionManager.update()
    } catch (error) {
      console.warn('InteractionManager update error:', error)
    }
    renderer.render(scene, camera)
  }

  // ─── GUI (lil-gui) ────────────────────────────────────────────────────────
  function setupGUI () {
    gui = new GUI({ closeFolders: true })

    const carousel = gui.addFolder('Carousel')
    carousel.add(config, 'packCount', 2, 20, 1).name('Pack Count').onChange(autoFit)
    carousel.add(config, 'radius', 2, 16, 0.1).name('Radius').onChange(rebuildCarousel)
    carousel.add(config, 'dragSensitivity', 0.001, 0.02, 0.001).name('Drag Speed')

    const pack = gui.addFolder('Pack Size')
    pack.add(config, 'packW', 0.5, 3, 0.1).name('Width').onChange(rebuildCarousel)
    pack.add(config, 'packH', 1, 4, 0.1).name('Height').onChange(rebuildCarousel)
    pack.add(config, 'packD', 0.01, 0.3, 0.001).name('Depth').onChange(rebuildCarousel)
    pack.add(config, 'packY', -3, 3, 0.1).name('Elevation')
    pack.add(config, 'selectedLift', 0, 2, 0.05).name('Selected Lift')

    const cam = gui.addFolder('Camera')
    cam.add(config, 'camX', -10, 10, 0.05).name('X').onChange(updateCamera)
    cam.add(config, 'camY', -10, 10, 0.05).name('Y').onChange(updateCamera)
    cam.add(config, 'camZ', -10, 20, 0.05).name('Z').onChange(updateCamera)
    cam.add(config, 'lookY', -5, 5, 0.1).name('Look Y').onChange(updateCamera)

    const anim = gui.addFolder('Animation')
    anim.add(config, 'bobAmplitude', 0, 0.5, 0.01).name('Bob Height')
    anim.add(config, 'bobSpeed', 0.1, 5, 0.1).name('Bob Speed')
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────
  onMounted(() => {
    const canvas = canvasRef.value
    const w = canvas.clientWidth
    const h = canvas.clientHeight

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(w, h, false)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap

    scene = new THREE.Scene()
    const bgColor = settingsStore.sceneDarkMode ? 0x0a_0a_14 : 0xee_f2_ff
    scene.background = new THREE.Color(bgColor)
    scene.fog = new THREE.Fog(bgColor, 18, 35)

    camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100)
    camera.position.set(config.camX, config.camY, config.camZ)
    camera.lookAt(0, config.lookY, 0)

    interactionManager = new InteractionManager(renderer, camera, renderer.domElement)

    buildLights()
    buildFloor()
    buildCarousel()
    setupGUI()

    // Initial snap – select the pack facing camera
    updateSelectedFromRotation(0)

    // Mouse drag events
    canvas.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)

    // Touch drag events
    canvas.addEventListener('touchstart', onTouchStart, { passive: true })
    canvas.addEventListener('touchmove', onTouchMove, { passive: false })
    canvas.addEventListener('touchend', onTouchEnd)

    window.addEventListener('resize', onResize)
    animate()
  })

  onUnmounted(() => {
    cancelAnimationFrame(animFrameId)
    window.removeEventListener('resize', onResize)
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
    const canvas = canvasRef.value
    if (canvas) {
      canvas.removeEventListener('mousedown', onMouseDown)
      canvas.removeEventListener('touchstart', onTouchStart)
      canvas.removeEventListener('touchmove', onTouchMove)
      canvas.removeEventListener('touchend', onTouchEnd)
    }
    for (const m of packMeshes) interactionManager.remove(m)
    renderer.dispose()
    if (gui) gui.destroy()
    document.body.style.cursor = 'default'
  })

  // ─── Store sync ───────────────────────────────────────────────────────────
  function applyTheme () {
    if (!scene) return
    const dark = settingsStore.sceneDarkMode
    const color = dark ? 0x0a_0a_14 : 0xee_f2_ff
    scene.background.set(color)
    if (scene.fog) scene.fog.color.set(color)
    if (fadeMat) fadeMat.color.set(color)
    if (nearFadeMat) nearFadeMat.color.set(color)
  }

  function syncFromStore () {
    config.packCount = settingsStore.packCount
    applyTheme()
    autoFit()
  }

  defineExpose({ syncFromStore })
</script>

<style scoped>
.scene-wrapper {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background: linear-gradient(160deg, #f0f4ff 0%, #e0d0ff 60%, #cce8ff 100%);
  cursor: grab;
  transition: background 0.5s ease;
}

.scene-wrapper.dark {
  background: linear-gradient(160deg, #0a0a14 0%, #10081e 60%, #080816 100%);
}

.scene-wrapper:active {
  cursor: grabbing;
}

canvas {
  width: 100% !important;
  height: 100% !important;
  display: block;
}

.pack-label {
  position: absolute;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(80, 0, 160, 0.75);
  color: #fff;
  padding: 8px 28px;
  border-radius: 24px;
  font-size: 1.1rem;
  font-weight: bold;
  letter-spacing: 1px;
  backdrop-filter: blur(8px);
  pointer-events: none;
}

.hint {
  position: absolute;
  bottom: 28px;
  left: 50%;
  transform: translateX(-50%);
  color: rgba(60, 0, 120, 0.45);
  font-size: 0.85rem;
  pointer-events: none;
}
.scene-wrapper.dark .hint {
  color: rgba(180, 160, 220, 0.35);
}
</style>
