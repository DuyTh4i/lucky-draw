/* eslint-disable curly */
import * as THREE from 'three'
import { usePrizeStore } from '@/stores/prizeStore'
import { createParticles, destroyParticles, updateParticles } from './packageParticles'
import { createGlowTexture, createPartGeometry } from './packageUtils'

/**
 * usePackageOpening
 *
 * Hiệu ứng "Vuốt để xé nắp" (Swipe to Tear):
 *
 * State 1 – Idle: Light chaser chạy trên đường nét đứt
 * State 2 – Active Dragging: Vuốt ngang fill up đường xé, threshold 80%
 * State 3 – Tear & Burst: Nắp văng + flash + particles + body recoil
 */
export function usePackageOpening (ctx) {
  const textureLoader = new THREE.TextureLoader()

  const TEAR_RATIO = 0.4

  // Prize assignment
  let prizeAssignments = []

  // Tear visual meshes
  let tearBandMesh = null
  let tearDashedLine = null
  let tearFillLine = null
  let tearChaserDot = null
  let tearChaserGroup = null
  let isTearHintActive = false
  let tearHintAnimFrame = null

  // Tearing interaction state
  let tearStartScreenX = 0
  let packageScreenWidth = 0
  let tearProgress = 0

  // Reusable color objects
  const COLOR_RED_BAND = new THREE.Color('#9b9b9bff')
  const COLOR_WHITE = new THREE.Color('#ffffff')
  const COLOR_YELLOW = new THREE.Color('#ffdd44')
  const COLOR_ORANGE = new THREE.Color('#ff8800')
  // const COLOR_RED_HOT = new THREE.Color('#ff2222')

  // ==================== PRIZE ASSIGNMENT ====================

  function assignPrizes () {
    const prizeStore = usePrizeStore()
    const pool = []
    for (const tier of prizeStore.tiers) {
      for (let i = 0; i < tier.quantity; i++) pool.push(tier.id)
    }
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]]
    }
    prizeAssignments = pool
  }

  function getTierForPack (packIndex) {
    const prizeStore = usePrizeStore()
    const tierId = prizeAssignments[packIndex] || 'normal'
    return prizeStore.tiers.find(t => t.id === tierId) || prizeStore.tiers[0]
  }

  // ==================== SCREEN MEASUREMENT ====================

  function getPackageScreenWidth () {
    if (ctx.selectedPack.value === null) return 200
    const mesh = ctx.packMeshes[ctx.selectedPack.value]
    if (!mesh || !ctx.camera || !ctx.canvasRef.value) return 200

    const { packW } = ctx.config
    const worldPos = new THREE.Vector3()
    mesh.getWorldPosition(worldPos)
    const worldQuat = new THREE.Quaternion()
    mesh.getWorldQuaternion(worldQuat)

    const left = new THREE.Vector3(-packW / 2, 0, 0)
      .applyQuaternion(worldQuat)
      .add(worldPos)
    const right = new THREE.Vector3(packW / 2, 0, 0)
      .applyQuaternion(worldQuat)
      .add(worldPos)

    const rect = ctx.canvasRef.value.getBoundingClientRect()
    const pL = left.project(ctx.camera)
    const pR = right.project(ctx.camera)
    return Math.abs(((pR.x + 1) / 2 - (pL.x + 1) / 2) * rect.width)
  }

  // ==================== TEAR WORLD POSITION ====================

  function getTearWorldTransform () {
    const mesh = ctx.packMeshes[ctx.selectedPack.value]
    if (!mesh) return null
    const { packH, packD } = ctx.config
    const worldPos = new THREE.Vector3()
    mesh.getWorldPosition(worldPos)
    const worldQuat = new THREE.Quaternion()
    mesh.getWorldQuaternion(worldQuat)

    const tearLocalY = packH / 2 - packH * TEAR_RATIO
    const offset = new THREE.Vector3(0, tearLocalY, packD / 2 + 0.008)
    offset.applyQuaternion(worldQuat)
    return { position: worldPos.add(offset), quaternion: worldQuat }
  }

  // ==================== STATE 1: IDLE – TEAR HINT ====================

  /**
   * Hiện gợi ý xé:
   * - Dải ngang đỏ (band)
   * - Đường nét đứt trắng
   * - Fill line (progress khi vuốt)
   * - Đốm sáng (light chaser) chạy từ trái→phải, loop 1.5s
   */
  function showTearHint () {
    if (isTearHintActive) return
    if (ctx.selectedPack.value === null) return
    const { packW } = ctx.config
    const tw = getTearWorldTransform()
    if (!tw) return

    isTearHintActive = true

    const bandWidth = packW
    const bandHeight = 0.03

    // --- Dải ngang đỏ ---
    const bandGeo = new THREE.PlaneGeometry(bandWidth, bandHeight)
    const bandMat = new THREE.MeshBasicMaterial({
      color: COLOR_RED_BAND,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide,
      depthTest: false,
    })
    tearBandMesh = new THREE.Mesh(bandGeo, bandMat)
    tearBandMesh.position.copy(tw.position)
    tearBandMesh.quaternion.copy(tw.quaternion)
    tearBandMesh.position.z += 0.001
    tearBandMesh.userData.baseY = tearBandMesh.position.y
    ctx.scene.add(tearBandMesh)

    // --- Đường xám mờ đơn giản ---
    const lineGeo = new THREE.PlaneGeometry(bandWidth, 0.008)
    const lineMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#aaaaaa'),
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
      depthTest: false,
    })
    tearDashedLine = new THREE.Mesh(lineGeo, lineMat)
    tearDashedLine.position.copy(tw.position)
    tearDashedLine.quaternion.copy(tw.quaternion)
    tearDashedLine.position.z += 0.002
    ctx.scene.add(tearDashedLine)

    // --- Đường fill (progress indicator – ẩn ban đầu) ---
    // Geometry dịch gốc sang trái để scale.x mở rộng từ trái→phải
    const fillGeo = new THREE.PlaneGeometry(bandWidth, 0.03)
    fillGeo.translate(bandWidth / 2, 0, 0)
    const fillMat = new THREE.MeshBasicMaterial({
      color: COLOR_YELLOW,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    })
    tearFillLine = new THREE.Mesh(fillGeo, fillMat)
    tearFillLine.position.copy(tw.position)
    tearFillLine.quaternion.copy(tw.quaternion)
    tearFillLine.position.z += 0.003
    // Dịch position về mép trái của band
    const rightDir = new THREE.Vector3(1, 0, 0).applyQuaternion(tw.quaternion)
    tearFillLine.position.addScaledVector(rightDir, -bandWidth / 2)
    tearFillLine.scale.x = 0.001
    tearFillLine.userData.bandWidth = bandWidth
    ctx.scene.add(tearFillLine)

    // --- Đốm sáng tự nhiên (Canvas Radial Gradient) ---
    const haloTex = createGlowTexture(128, 'rgba(255,200,220,1)', 'rgba(255,200,220,0)')
    const coreTex = createGlowTexture(64, 'rgba(255,255,255,1)', 'rgba(255,255,255,0)')

    // Lớp 1: Hào quang lớn mềm
    const haloMat = new THREE.SpriteMaterial({
      map: haloTex,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthTest: false,
    })
    const haloSprite = new THREE.Sprite(haloMat)
    haloSprite.scale.set(0.55, 0.2, 1)

    // Lớp 2: Lõi sáng trắng rực
    const coreMat = new THREE.SpriteMaterial({
      map: coreTex,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthTest: false,
    })
    const coreSprite = new THREE.Sprite(coreMat)
    coreSprite.scale.set(0.22, 0.08, 1)

    tearChaserGroup = new THREE.Group()
    tearChaserGroup.position.copy(tw.position)
    tearChaserGroup.quaternion.copy(tw.quaternion)
    tearChaserGroup.position.z += 0.004
    tearChaserGroup.add(haloSprite)
    tearChaserGroup.add(coreSprite)
    ctx.scene.add(tearChaserGroup)

    // Giữ ref để dispose
    tearChaserDot = coreSprite
    tearChaserDot.userData.haloMat = haloMat
    tearChaserDot.userData.haloTex = haloTex
    tearChaserDot.userData.coreTex = coreTex
    tearChaserDot.userData.haloSprite = haloSprite

    // Animate chaser: loop 1.5s, linear
    const loopDuration = 1500
    const startX = -bandWidth / 2
    const endX = bandWidth / 2

    function animateChaser (now) {
      if (!isTearHintActive) return

      // Đồng bộ vị trí tear elements theo package mỗi frame
      // syncTearPositions()

      if (ctx.isTearing) {
        haloMat.opacity = 0
        coreMat.opacity = 0
        tearHintAnimFrame = requestAnimationFrame(animateChaser)
        return
      }

      const p = (now % loopDuration) / loopDuration
      const x = startX + (endX - startX) * p
      haloSprite.position.x = x
      coreSprite.position.x = x

      // Sáng ngay ở mép trái, mờ dần khi gần mép phải
      const alpha = p > 0.75 ? (1 - p) / 0.25 : 1

      // Nhấp nháy nhẹ
      const flicker = 0.92 + 0.08 * Math.sin(now * 0.015)

      haloMat.opacity = 0.5 * alpha * flicker
      coreMat.opacity = 0.9 * alpha * flicker

      // Scale nhịp thở nhẹ
      const breathe = 1 + 0.06 * Math.sin(now * 0.008)
      haloSprite.scale.set(0.55 * breathe, 0.2 * breathe, 1)

      tearHintAnimFrame = requestAnimationFrame(animateChaser)
    }

    tearHintAnimFrame = requestAnimationFrame(animateChaser)
  }

  function hideTearHint () {
    isTearHintActive = false
    if (tearHintAnimFrame) {
      cancelAnimationFrame(tearHintAnimFrame)
      tearHintAnimFrame = null
    }

    const meshesToRemove = [tearBandMesh, tearDashedLine, tearFillLine]
    for (const m of meshesToRemove) {
      if (!m) continue
      ctx.scene.remove(m)
      m.geometry.dispose()
      m.material.dispose()
    }
    tearBandMesh = null
    tearDashedLine = null
    tearFillLine = null

    if (tearChaserGroup) {
      ctx.scene.remove(tearChaserGroup)
      if (tearChaserDot) {
        tearChaserDot.material.dispose()
        if (tearChaserDot.userData.haloMat) tearChaserDot.userData.haloMat.dispose()
        if (tearChaserDot.userData.haloTex) tearChaserDot.userData.haloTex.dispose()
        if (tearChaserDot.userData.coreTex) tearChaserDot.userData.coreTex.dispose()
      }
      tearChaserDot = null
      tearChaserGroup = null
    }
  }

  // ==================== STATE 2: ACTIVE DRAGGING ====================

  function startTearing (screenX) {
    if (ctx.isPackageOpening || ctx.isPackageOpened) return
    if (ctx.selectedPack.value === null) return

    ctx.isTearing = true
    tearStartScreenX = screenX
    packageScreenWidth = getPackageScreenWidth()
    tearProgress = 0
    updateFillVisual(0)
  }

  /** Cập nhật tiến trình xé, return 0→1 */
  function updateTearing (currentScreenX) {
    if (!ctx.isTearing) return 0
    const dx = currentScreenX - tearStartScreenX
    tearProgress = Math.max(0, Math.min(dx / packageScreenWidth, 1))
    updateFillVisual(tearProgress)

    // Auto-trigger khi vuốt hết chiều ngang
    if (tearProgress >= 1) {
      ctx.isTearing = false
      openPackage()
      return tearProgress
    }

    return tearProgress
  }

  /** Cập nhật visual feedback đường fill */
  function updateFillVisual (progress) {
    if (!tearFillLine) return
    const fillMat = tearFillLine.material
    if (progress > 0.01) {
      fillMat.opacity = 0.85
      tearFillLine.scale.x = Math.max(0.001, progress)
      fillMat.color.copy(COLOR_ORANGE)
    } else {
      fillMat.opacity = 0
      tearFillLine.scale.x = 0.001
    }
  }

  /** Huỷ xé (user thả trước 80%) – snap back */
  function cancelTearing () {
    if (!ctx.isTearing) return
    ctx.isTearing = false

    const currentProgress = tearProgress
    const snapDuration = 200
    const t0 = performance.now()

    function step (now) {
      const t = Math.min((now - t0) / snapDuration, 1)
      const ease = 1 - Math.pow(1 - t, 2)
      const p = currentProgress * (1 - ease)
      updateFillVisual(p)
      if (t < 1) requestAnimationFrame(step)
      else {
        tearProgress = 0
        updateFillVisual(0)
      }
    }
    requestAnimationFrame(step)
  }

  // ==================== STATE 3: TEAR & BURST ====================

  function openPackage () {
    if (ctx.isPackageOpening || ctx.isPackageOpened) return
    if (ctx.selectedPack.value === null) return

    hideTearHint()
    ctx.isTearing = false
    ctx.isPackageOpening = true

    const packIndex = ctx.selectedPack.value
    const originalMesh = ctx.packMeshes[packIndex]
    if (!originalMesh) return

    if (prizeAssignments.length === 0) assignPrizes()
    const tier = getTierForPack(packIndex)

    const worldPos = new THREE.Vector3()
    originalMesh.getWorldPosition(worldPos)
    const worldQuat = new THREE.Quaternion()
    originalMesh.getWorldQuaternion(worldQuat)

    const { packW, packH, packD } = ctx.config
    const cutY = worldPos.y + packH / 2 - packH * TEAR_RATIO

    originalMesh.visible = false

    const origMaterials = Array.isArray(originalMesh.material)
      ? originalMesh.material
      : [originalMesh.material]
    const topMaterials = origMaterials.map(m => m.clone())
    const bottomMaterials = origMaterials.map(m => m.clone())

    // ---- TOP CAP ----
    const { geometry: topGeo } = createPartGeometry(packW, packH, packD, 'top', TEAR_RATIO)
    const topMesh = new THREE.Mesh(topGeo, topMaterials)
    topMesh.position.copy(worldPos)
    topMesh.position.y = cutY
    topMesh.quaternion.copy(worldQuat)
    ctx.scene.add(topMesh)
    ctx.tearTopMesh = topMesh

    // ---- BOTTOM BODY ----
    const { geometry: bottomGeo } = createPartGeometry(packW, packH, packD, 'bottom', TEAR_RATIO)
    const bottomMesh = new THREE.Mesh(bottomGeo, bottomMaterials)
    bottomMesh.position.copy(worldPos)
    bottomMesh.position.y = cutY
    bottomMesh.quaternion.copy(worldQuat)
    ctx.scene.add(bottomMesh)
    ctx.tearBottomMesh = bottomMesh

    // ---- TEAR FLASH ----
    const flashGeo = new THREE.PlaneGeometry(packW * 1.3, 0.04)
    const flashMat = new THREE.MeshBasicMaterial({
      color: COLOR_WHITE,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    })
    const flashMesh = new THREE.Mesh(flashGeo, flashMat)
    flashMesh.position.copy(worldPos)
    flashMesh.position.y = cutY
    flashMesh.position.z += packD / 2 + 0.01
    flashMesh.quaternion.copy(worldQuat)
    ctx.scene.add(flashMesh)

    // ---- PARTICLES ----
    const particles = createParticles(ctx.scene, worldPos.clone().setY(cutY), packW)

    // ---- PRIZE CARD ----
    const cardGeo = new THREE.PlaneGeometry(packW * 0.85, packH * 0.85)
    const cardTex = textureLoader.load(tier.texture)
    cardTex.colorSpace = THREE.SRGBColorSpace
    const cardMat = new THREE.MeshBasicMaterial({
      map: cardTex, transparent: true, opacity: 0, side: THREE.DoubleSide,
    })
    const cardMesh = new THREE.Mesh(cardGeo, cardMat)
    cardMesh.position.copy(worldPos)
    cardMesh.quaternion.copy(worldQuat)
    cardMesh.scale.set(0.6, 0.6, 0.6)
    ctx.scene.add(cardMesh)
    ctx.prizeCardMesh = cardMesh

    // ---- GLOW ----
    const tierColor = new THREE.Color(tier.color)
    const glow = new THREE.PointLight(tierColor, 0, 15)
    glow.position.copy(worldPos)
    glow.position.y += packH * 0.3
    ctx.scene.add(glow)
    ctx.glowLight = glow

    const glowSpriteMat = new THREE.SpriteMaterial({
      color: tierColor, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending,
    })
    const sprite = new THREE.Sprite(glowSpriteMat)
    sprite.position.copy(worldPos)
    sprite.position.y += packH * 0.2
    sprite.scale.set(0, 0, 1)
    ctx.scene.add(sprite)
    ctx.glowSprite = sprite

    // =========== PARALLEL ANIMATION TIMELINE ===========
    const t0 = performance.now()

    const TOP_BREAK_DUR = 400
    const FLASH_DUR = 200
    const PARTICLE_DUR = 1000
    const RECOIL_DUR = 300
    const CARD_RISE_DELAY = 200
    const CARD_RISE_DUR = 800
    const GLOW_FADE_DUR = 2000

    const topStartY = topMesh.position.y
    const topStartRotZ = topMesh.rotation.z
    const bottomStartY = bottomMesh.position.y
    const cardStartY = cardMesh.position.y
    const cardTargetY = cardStartY + packH * 0.6

    function step (now) {
      const elapsed = now - t0

      // ---- TOP CAP BREAK: văng lên + xoay + fade ----
      {
        const tp = Math.min(elapsed / TOP_BREAK_DUR, 1)
        const easeOut = 1 - Math.pow(1 - tp, 2)
        // translateY lên 0.5→1.0 world units
        topMesh.position.y = topStartY + easeOut
        // rotateZ 5→15deg (0.087→0.262 rad)
        topMesh.rotation.z = topStartRotZ + 0.087 + 0.175 * easeOut

        // Fade out sau 75% thời gian (= sau ~0.3s)
        if (tp > 0.75) {
          const fadeP = (tp - 0.75) / 0.25
          for (const mat of topMaterials) {
            mat.transparent = true
            mat.opacity = Math.max(0, 1 - fadeP)
          }
        }
      }

      // ---- TEAR FLASH: scaleX 0.1→1.2, scaleY mỏng, chớp rồi tắt ----
      {
        const fp = Math.min(elapsed / FLASH_DUR, 1)
        if (fp < 0.4) {
          const e = fp / 0.4
          flashMesh.scale.set(0.1 + 1.1 * e, 1 + 2 * e, 1)
          flashMat.opacity = e
        } else {
          const e = (fp - 0.4) / 0.6
          flashMesh.scale.set(1.2 + 0.3 * e, 3 - 2 * e, 1)
          flashMat.opacity = Math.max(0, 1 - e)
        }
      }

      // ---- PARTICLE BURST: nổ hạt lấp lánh ----
      {
        const elapsedSec = Math.min(elapsed / 1000, 1)
        updateParticles(particles, elapsedSec)
      }

      // ---- BODY RECOIL: giật xuống +10px rồi nảy lại ----
      {
        const rp = Math.min(elapsed / RECOIL_DUR, 1)
        // Bounce: giật xuống nhanh rồi nảy về bằng spring
        const recoilOffset = 0.08 * Math.sin(rp * Math.PI) * Math.pow(1 - rp, 0.5)
        bottomMesh.position.y = bottomStartY - recoilOffset
      }

      // ---- PRIZE CARD: trượt lên + fade in ----
      {
        const ce = Math.max(0, elapsed - CARD_RISE_DELAY)
        const tp = Math.min(ce / CARD_RISE_DUR, 1)
        const ease = 1 - Math.pow(1 - tp, 3)
        cardMesh.position.y = cardStartY + (cardTargetY - cardStartY) * ease
        cardMat.opacity = tp
        const s = 0.6 + 0.4 * ease
        cardMesh.scale.set(s, s, s)
      }

      // ---- GLOW ----
      {
        const gt = Math.min(elapsed / GLOW_FADE_DUR, 1)
        const gi = gt < 0.3 ? (gt / 0.3) * 8 : 8 * (1 - (gt - 0.3) / 0.7) * 0.4
        glow.intensity = Math.max(0, gi)
        if (gt < 0.3) {
          const ss = (gt / 0.3) * 8
          sprite.scale.set(ss, ss * 1.5, 1)
          glowSpriteMat.opacity = gt / 0.3 * 0.6
        } else {
          const ft = (gt - 0.3) / 0.7
          const ss = 8 * (1 - ft * 0.3)
          sprite.scale.set(ss, ss * 1.5, 1)
          glowSpriteMat.opacity = 0.6 * (1 - ft)
        }
      }

      const maxDur = Math.max(TOP_BREAK_DUR, FLASH_DUR, PARTICLE_DUR, RECOIL_DUR,
        CARD_RISE_DELAY + CARD_RISE_DUR, GLOW_FADE_DUR)

      if (elapsed < maxDur) {
        requestAnimationFrame(step)
      } else {
        ctx.scene.remove(flashMesh)
        flashMesh.geometry.dispose()
        flashMat.dispose()
        destroyParticles(ctx.scene, particles)
        cleanupTearMeshes()
        ctx.isPackageOpening = false
        ctx.isPackageOpened = true
      }
    }

    requestAnimationFrame(step)
  }

  // ==================== CLEANUP ====================

  function cleanupTearMeshes () {
    for (const key of ['tearTopMesh', 'tearBottomMesh']) {
      const m = ctx[key]
      if (!m) continue
      ctx.scene.remove(m)
      m.geometry.dispose()
      if (Array.isArray(m.material)) for (const mt of m.material) mt.dispose()
      else m.material.dispose()
      ctx[key] = null
    }
    if (ctx.glowSprite) {
      ctx.scene.remove(ctx.glowSprite)
      ctx.glowSprite.material.dispose()
      ctx.glowSprite = null
    }
  }

  function resetPackageOpening () {
    if (!ctx.isPackageOpened && !ctx.isPackageOpening) return

    if (ctx.prizeCardMesh) {
      ctx.scene.remove(ctx.prizeCardMesh)
      ctx.prizeCardMesh.geometry.dispose()
      ctx.prizeCardMesh.material.dispose()
      ctx.prizeCardMesh = null
    }
    if (ctx.glowLight) {
      ctx.scene.remove(ctx.glowLight)
      ctx.glowLight.dispose()
      ctx.glowLight = null
    }
    if (ctx.glowSprite) {
      ctx.scene.remove(ctx.glowSprite)
      ctx.glowSprite.material.dispose()
      ctx.glowSprite = null
    }
    cleanupTearMeshes()
    hideTearHint()

    if (ctx.selectedPack.value !== null) {
      const mesh = ctx.packMeshes[ctx.selectedPack.value]
      if (mesh) {
        mesh.visible = true
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        for (const mat of mats) {
          mat.transparent = false
          mat.opacity = 1
        }
      }
    }

    ctx.isPackageOpening = false
    ctx.isPackageOpened = false
    ctx.isTearing = false
  }

  // ==================== EXPOSE ====================
  ctx.openPackage = openPackage
  ctx.resetPackageOpening = resetPackageOpening
  ctx.assignPrizes = assignPrizes
  ctx.startTearing = startTearing
  ctx.updateTearing = updateTearing
  ctx.cancelTearing = cancelTearing
  ctx.showTearHint = showTearHint
  ctx.hideTearHint = hideTearHint

  return {
    openPackage, resetPackageOpening, assignPrizes,
    startTearing, updateTearing, cancelTearing,
    showTearHint, hideTearHint,
  }
}
