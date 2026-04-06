import * as THREE from 'three'
import { InteractionManager } from 'three.interactive'
import { Reflector } from 'three/addons/objects/Reflector.js'

export function useWebGL (ctx, settingsStore) {
  function initWebGL () {
    const canvas = ctx.canvasRef.value
    const w = window.innerWidth
    const h = window.innerHeight

    const q = settingsStore.quality
    let prLimit = 2
    if (q === 'low') {
      prLimit = 1
    }
    if (q === 'high') {
      prLimit = Math.max(window.devicePixelRatio, 3)
    }
    if (q === 'ultra') {
      prLimit = Math.max(window.devicePixelRatio, 4)
    }

    ctx.renderer = new THREE.WebGLRenderer({ canvas, antialias: q !== 'low', alpha: true })
    ctx.renderer.setPixelRatio(Math.min(window.devicePixelRatio, prLimit))
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
    const q = settingsStore.quality
    // Bề mặt phản chiếu là tính toán nặng nhất, chia độ nét texture riêng biệt
    let refScale = 0.2 // medium
    if (q === 'high') {
      refScale = 0.4
    }
    if (q === 'ultra') {
      refScale = 1 // 100% độ nét thật
    }
    if (q === 'low') {
      refScale = 0.05
    }

    const reflector = new Reflector(new THREE.PlaneGeometry(30, 30), {
      clipBias: (q === 'high' || q === 'ultra') ? 0.003 : 0.01,
      textureWidth: window.innerWidth * window.devicePixelRatio * refScale,
      textureHeight: window.innerHeight * window.devicePixelRatio * refScale,
      color: 0xff_ff_ff,
    })
    reflector.rotation.x = -Math.PI / 2
    reflector.position.y = -ctx.config.packH / 2 - 0.01
    ctx.scene.add(reflector)

    ctx.fadeMat = new THREE.MeshBasicMaterial({
      color: settingsStore.sceneDarkMode ? 0x0a_0a_14 : 0xee_f2_ff, transparent: true, opacity: 0.8, depthWrite: false,
    })
    const fade = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), ctx.fadeMat)
    fade.rotation.x = -Math.PI / 2
    fade.position.set(0, -ctx.config.packH / 2 + 0.01, 4)
    ctx.scene.add(fade)

    ctx.nearFadeMat = new THREE.MeshBasicMaterial({
      color: settingsStore.sceneDarkMode ? 0x0a_0a_14 : 0xee_f2_ff, transparent: true, opacity: 0.4, depthWrite: false,
    })
    const nearFade = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), ctx.nearFadeMat)
    nearFade.rotation.x = -Math.PI / 2
    nearFade.position.set(0, -ctx.config.packH / 2 + 0.02, -6)
    ctx.scene.add(nearFade)
  }

  function buildLights () {
    const q = settingsStore.quality

    // Thay đèn Directional (Chiếu điểm hội tụ) bằng Ánh sáng tản đều cho toàn bộ Scene
    // Đảm bảo không chiếu flash hội tụ làm lóa vỡ ảnh của thẻ bài nằm chính giữa
    ctx.scene.add(new THREE.AmbientLight(0xff_ff_ff, 2.4))

    // Đèn hắt từ góc đỉnh xuống mờ nhẹ cho có vân khối
    const topDir = new THREE.DirectionalLight(0xff_ff_ff, 0.3)
    topDir.position.set(0, 10, 0)
    ctx.scene.add(topDir)

    // Đèn trang trí phụ trợ
    if (q !== 'low') {
      const rim = new THREE.PointLight(0xaa_44_ff, 2.5, 22)
      rim.position.set(-5, 4, -5)
      ctx.scene.add(rim)

      const fill = new THREE.PointLight(0x44_cc_ff, 1.8, 22)
      fill.position.set(5, 2, 5)
      ctx.scene.add(fill)
    }
  }

  ctx.updateCamera = function () {
    if (!ctx.camera) {
      return
    }

    // Tự động đẩy Camera ra xa thêm 2 đơn vị nếu là giao diện dọc / điện thoại hẹp
    const isMobile = window.innerWidth < 768
    const zOffset = isMobile ? 2 : 0

    ctx.camera.position.set(ctx.config.camX, ctx.config.camY, ctx.config.camZ + zOffset)
    ctx.camera.lookAt(0, ctx.config.lookY, 0)
  }

  ctx.onResize = function () {
    if (!ctx.canvasRef.value || !ctx.camera || !ctx.renderer) {
      return
    }
    const w = window.innerWidth
    const h = window.innerHeight
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
        const mesh = ctx.packMeshes[i]
        const extraY = mesh.userData.liftExtraY || 0
        const extraZ = mesh.userData.liftExtraZ || 0
        // Tắt bobbing khi đang lift hoặc đã selected
        const phase = (i / ctx.packMeshes.length) * Math.PI * 2
        const bobY = extraY || ctx.isPackageSelected
          ? 0
          : Math.sin(time * ctx.config.bobSpeed + phase) * ctx.config.bobAmplitude
        const targetY = ctx.config.packY + bobY + extraY
        // Khi đang lift: set trực tiếp (không lerp) để đồng bộ với camera
        if (extraY || extraZ) {
          mesh.position.y = targetY
          // Đưa package lại gần camera (dọc theo hướng nhìn của nó)
          const angle = mesh.userData.baseAngle || 0
          mesh.position.x = Math.sin(angle) * ctx.config.radius + Math.sin(angle) * extraZ
          mesh.position.z = Math.cos(angle) * ctx.config.radius + Math.cos(angle) * extraZ
        } else {
          mesh.position.y += (targetY - mesh.position.y) * 0.12
        }
      }
    }

    // Khi đã selected, camera cần liên tục lookAt theo config.lookY
    if (ctx.isPackageSelected && ctx.camera) {
      ctx.camera.lookAt(0, ctx.config.lookY, 0)
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
