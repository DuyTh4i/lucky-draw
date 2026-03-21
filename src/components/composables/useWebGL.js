import * as THREE from 'three'
import { InteractionManager } from 'three.interactive'
import { Reflector } from 'three/addons/objects/Reflector.js'

export function useWebGL (ctx, settingsStore) {
  function initWebGL () {
    const canvas = ctx.canvasRef.value
    const w = canvas.clientWidth
    const h = canvas.clientHeight

    ctx.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    // Giới hạn pixelRatio ở mức 2 (Màn hình 3x 4x sẽ không phải vẽ quá nhiều ngốn GPU)
    ctx.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    ctx.renderer.setSize(w, h, false)

    // Tắt hoàn toàn bộ tính bóng đổ vì project hiện tại không có nguồn sáng nào (light) castShadow
    // Việc để enabled = true mà không gian không có bóng sẽ lãng phí chu kỳ tính toán của GPU
    ctx.renderer.shadowMap.enabled = false

    ctx.scene = new THREE.Scene()
    const bgColor = settingsStore.sceneDarkMode ? 0x0a_0a_14 : 0xee_f2_ff
    ctx.scene.background = new THREE.Color(bgColor)
    ctx.scene.fog = new THREE.Fog(bgColor, 18, 35)

    ctx.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100)

    ctx.interactionManager = new InteractionManager(ctx.renderer, ctx.camera, ctx.renderer.domElement)

    buildFloor()
    buildLights()
  }

  function buildFloor () {
    const reflector = new Reflector(new THREE.PlaneGeometry(30, 30), {
      clipBias: 0.003,
      textureWidth: window.innerWidth * window.devicePixelRatio * 0.2,
      textureHeight: window.innerHeight * window.devicePixelRatio * 0.2,
      color: 0xff_ff_ff,
    })
    reflector.rotation.x = -Math.PI / 2
    reflector.position.y = -ctx.config.packH / 2 - 0.01
    ctx.scene.add(reflector)

    ctx.fadeMat = new THREE.MeshBasicMaterial({
      color: settingsStore.sceneDarkMode ? 0x0a_0a_14 : 0xee_f2_ff, transparent: true, opacity: 0.72, depthWrite: false,
    })
    const fade = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), ctx.fadeMat)
    fade.rotation.x = -Math.PI / 2
    fade.position.set(0, -ctx.config.packH / 2 + 0.01, 4)
    ctx.scene.add(fade)

    ctx.nearFadeMat = new THREE.MeshBasicMaterial({
      color: settingsStore.sceneDarkMode ? 0x0a_0a_14 : 0xee_f2_ff, transparent: true, opacity: 0.35, depthWrite: false,
    })
    const nearFade = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), ctx.nearFadeMat)
    nearFade.rotation.x = -Math.PI / 2
    nearFade.position.set(0, -ctx.config.packH / 2 + 0.02, -6)
    ctx.scene.add(nearFade)
  }

  function buildLights () {
    ctx.scene.add(new THREE.AmbientLight(0xff_ff_ff, 0.7))
    const dir = new THREE.DirectionalLight(0xff_ff_ff, 0.8)
    dir.position.set(0, 10, 0)
    ctx.scene.add(dir)

    const rim = new THREE.PointLight(0xaa_44_ff, 1.4, 22)
    rim.position.set(-5, 4, -5)
    ctx.scene.add(rim)

    const fill = new THREE.PointLight(0x44_cc_ff, 0.9, 22)
    fill.position.set(5, 2, 5)
    ctx.scene.add(fill)
  }

  ctx.updateCamera = function () {
    if (!ctx.camera) {
      return
    }

    // Thay vì dựa vào chiều rộng cửa sổ có thể bị độ lệch do DevTools hoặc scrollbar,
    // ta check tỷ lệ khung hình canvas: dọc (aspect < 1) => đích xác là hiển thị điện thoại
    const isMobile = ctx.camera.aspect < 1
    const mobileOffset = isMobile ? 2.5 : 0

    ctx.camera.position.set(ctx.config.camX, ctx.config.camY, ctx.config.camZ + mobileOffset)
    ctx.camera.lookAt(0, ctx.config.lookY, 0)
  }

  ctx.onResize = function () {
    if (!ctx.canvasRef.value || !ctx.camera || !ctx.renderer) {
      return
    }
    const w = ctx.canvasRef.value.clientWidth
    const h = ctx.canvasRef.value.clientHeight
    ctx.camera.aspect = w / h
    ctx.camera.updateProjectionMatrix()
    ctx.renderer.setSize(w, h, false)

    if (ctx.updateCamera) {
      ctx.updateCamera()
    }
  }

  ctx.applyTheme = function () {
    if (!ctx.scene) {
      return
    }
    const dark = settingsStore.sceneDarkMode
    const color = dark ? 0x0a_0a_14 : 0xee_f2_ff
    ctx.scene.background.set(color)
    if (ctx.scene.fog) {
      ctx.scene.fog.color.set(color)
    }
    if (ctx.fadeMat) {
      ctx.fadeMat.color.set(color)
    }
    if (ctx.nearFadeMat) {
      ctx.nearFadeMat.color.set(color)
    }
  }

  let animFrameId = null
  function animate () {
    animFrameId = requestAnimationFrame(animate)
    const time = performance.now() * 0.001

    // Bobbing animation
    if (ctx.packMeshes) {
      for (let i = 0; i < ctx.packMeshes.length; i++) {
        const phase = (i / ctx.packMeshes.length) * Math.PI * 2
        const bobY = Math.sin(time * ctx.config.bobSpeed + phase) * ctx.config.bobAmplitude
        const targetY = ctx.config.packY + bobY
        ctx.packMeshes[i].position.y += (targetY - ctx.packMeshes[i].position.y) * 0.12
      }
    }

    try {
      if (ctx.interactionManager) {
        ctx.interactionManager.update()
      }
    } catch {
      // Ignore
    }
    if (ctx.renderer && ctx.scene && ctx.camera) {
      ctx.renderer.render(ctx.scene, ctx.camera)
    }
  }

  function startAnimation () {
    animate()
  }

  function disposeWebGL () {
    cancelAnimationFrame(animFrameId)
    if (ctx.interactionManager) {
      if (ctx.packMeshes) {
        for (const m of ctx.packMeshes) {
          ctx.interactionManager.remove(m)
        }
      }
      ctx.interactionManager.dispose()
    }
    if (ctx.renderer) {
      ctx.renderer.dispose()
    }
  }

  return { initWebGL, startAnimation, disposeWebGL }
}
