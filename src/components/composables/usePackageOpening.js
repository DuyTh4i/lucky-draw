/* eslint-disable curly */
import * as THREE from 'three'
import { usePrizeStore } from '@/stores/prizeStore'

/**
 * usePackageOpening
 *
 * Xử lý hiệu ứng xé package và hiện prize card:
 * - User kéo ngang HẾT package → hiện đường xé + trigger mở
 * - Phần trên bay lên + xoay + rơi ra
 * - Prize card bên trong được đẩy lên + glow
 * - Phần dưới rơi xuống
 */
export function usePackageOpening (ctx) {
  const textureLoader = new THREE.TextureLoader()

  const TEAR_RATIO = 0.25
  const TEAR_DURATION = 1200
  const CARD_RISE_DELAY = 200
  const CARD_RISE_DURATION = 800
  const BOTTOM_FALL_DELAY = 400
  const BOTTOM_FALL_DURATION = 800
  const GLOW_FADE_DURATION = 2000

  // Prize assignment
  let prizeAssignments = []

  // Tearing state
  // Tearing state
  let tearGuideLineMesh = null
  let tearHintDotMesh = null
  let tearStartScreenX = 0
  let packageScreenWidth = 0
  let tearProgress = 0
  let isTearHintActive = false
  let tearHintAnimFrame = null

  // ===================== PRIZE ASSIGNMENT =====================

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

  // ===================== GEOMETRY HELPERS =====================

  function createPartGeometry (totalW, totalH, totalD, part) {
    if (part === 'top') {
      const h = totalH * TEAR_RATIO
      const geo = new THREE.BoxGeometry(totalW, h, totalD)
      geo.translate(0, h / 2, 0)
      return { geometry: geo, height: h }
    } else {
      const h = totalH * (1 - TEAR_RATIO)
      const geo = new THREE.BoxGeometry(totalW, h, totalD)
      geo.translate(0, -h / 2, 0)
      return { geometry: geo, height: h }
    }
  }

  // ===================== TEAR LINE =====================

  /** Tính chiều rộng package trên màn hình (pixel) */
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

  /** Lấy vị trí world-space của đường xé */
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

  /** Hiện gợi ý xé (đường kẻ mờ + đốm sáng chạy ngang) */
  function showTearHint () {
    if (isTearHintActive) return
    if (ctx.selectedPack.value === null) return
    const { packW } = ctx.config
    const t = getTearWorldTransform()
    if (!t) return

    isTearHintActive = true

    // Guide line (đường kẻ xám nhạt)
    const guideGeo = new THREE.PlaneGeometry(packW * 0.95, 0.012)
    const guideMat = new THREE.MeshBasicMaterial({
      color: 0xe0_e0_e0,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      depthTest: false,
    })
    tearGuideLineMesh = new THREE.Mesh(guideGeo, guideMat)
    tearGuideLineMesh.position.copy(t.position)
    tearGuideLineMesh.quaternion.copy(t.quaternion)
    tearGuideLineMesh.position.z += 0.001
    ctx.scene.add(tearGuideLineMesh)

    // Đốm sáng
    const spriteMat = new THREE.SpriteMaterial({
      color: 0xff_ff_ff,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthTest: false,
    })
    tearHintDotMesh = new THREE.Sprite(spriteMat)
    tearHintDotMesh.scale.set(0.18, 0.18, 1)

    const dotGroup = new THREE.Group()
    dotGroup.position.copy(t.position)
    dotGroup.quaternion.copy(t.quaternion)
    dotGroup.position.z += 0.002
    dotGroup.add(tearHintDotMesh)

    ctx.scene.add(dotGroup)
    ctx.tearHintDotGroup = dotGroup

    // Animate đốm sáng chạy từ trái qua phải liên tục
    const loopDuration = 1500
    const startX = -packW / 2 + 0.1
    const endX = packW / 2 - 0.1

    function animate (now) {
      if (!isTearHintActive) return

      const p = (now % loopDuration) / loopDuration
      tearHintDotMesh.position.x = startX + (endX - startX) * p

      if (p < 0.1) spriteMat.opacity = (p / 0.1) * 0.8
      else if (p > 0.9) spriteMat.opacity = (1 - (p - 0.9) / 0.1) * 0.8
      else spriteMat.opacity = 0.8

      tearHintAnimFrame = requestAnimationFrame(animate)
    }

    tearHintAnimFrame = requestAnimationFrame(animate)
  }

  function hideTearHint () {
    isTearHintActive = false
    if (tearHintAnimFrame) {
      cancelAnimationFrame(tearHintAnimFrame)
      tearHintAnimFrame = null
    }

    if (tearGuideLineMesh) {
      ctx.scene.remove(tearGuideLineMesh)
      tearGuideLineMesh.geometry.dispose()
      tearGuideLineMesh.material.dispose()
      tearGuideLineMesh = null
    }

    if (ctx.tearHintDotGroup) {
      ctx.scene.remove(ctx.tearHintDotGroup)
      tearHintDotMesh.material.dispose() // as sprite material
      tearHintDotMesh = null
      ctx.tearHintDotGroup = null
    }
  }

  /** Bắt đầu quá trình kéo ngang */
  function startTearing (screenX) {
    if (ctx.isPackageOpening || ctx.isPackageOpened) return
    if (ctx.selectedPack.value === null) return

    ctx.isTearing = true
    tearStartScreenX = screenX
    packageScreenWidth = getPackageScreenWidth()
    tearProgress = 0
  }

  /** Cập nhật tiến trình xé, return 0→1 */
  function updateTearing (currentScreenX) {
    if (!ctx.isTearing) return 0
    const dx = Math.abs(currentScreenX - tearStartScreenX)
    tearProgress = Math.min(dx / packageScreenWidth, 1)
    return tearProgress
  }

  /** Huỷ xé (user thả trước khi kéo hết) */
  function cancelTearing () {
    ctx.isTearing = false
    tearProgress = 0
  }

  // ===================== OPEN PACKAGE =====================

  function openPackage () {
    if (ctx.isPackageOpening || ctx.isPackageOpened) return
    if (ctx.selectedPack.value === null) return

    // Dọn tear line hint
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

    // Top Tear
    const { geometry: topGeo } = createPartGeometry(packW, packH, packD, 'top')
    const topMesh = new THREE.Mesh(topGeo, topMaterials)
    topMesh.position.copy(worldPos)
    topMesh.position.y = cutY
    topMesh.quaternion.copy(worldQuat)
    ctx.scene.add(topMesh)
    ctx.tearTopMesh = topMesh

    // Bottom Tear
    const { geometry: bottomGeo } = createPartGeometry(packW, packH, packD, 'bottom')
    const bottomMesh = new THREE.Mesh(bottomGeo, bottomMaterials)
    bottomMesh.position.copy(worldPos)
    bottomMesh.position.y = cutY
    bottomMesh.quaternion.copy(worldQuat)
    ctx.scene.add(bottomMesh)
    ctx.tearBottomMesh = bottomMesh

    // Prize Card
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

    // Glow Light
    const tierColor = new THREE.Color(tier.color)
    const glow = new THREE.PointLight(tierColor, 0, 15)
    glow.position.copy(worldPos)
    glow.position.y += packH * 0.3
    ctx.scene.add(glow)
    ctx.glowLight = glow

    // Glow Sprite
    const spriteMat = new THREE.SpriteMaterial({
      color: tierColor, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending,
    })
    const sprite = new THREE.Sprite(spriteMat)
    sprite.position.copy(worldPos)
    sprite.position.y += packH * 0.2
    sprite.scale.set(0, 0, 1)
    ctx.scene.add(sprite)
    ctx.glowSprite = sprite

    // Animate
    const t0 = performance.now()
    const topStartY = topMesh.position.y
    const topStartRotX = topMesh.rotation.x
    const topStartRotZ = topMesh.rotation.z
    const bottomStartY = bottomMesh.position.y
    const cardStartY = cardMesh.position.y
    const cardTargetY = cardStartY + packH * 0.6

    function step (now) {
      const elapsed = now - t0

      // TOP TEAR
      {
        const tp = Math.min(elapsed / TEAR_DURATION, 1)
        if (tp < 0.4) {
          const e = 1 - Math.pow(1 - tp / 0.4, 2)
          topMesh.position.y = topStartY + packH * 1.5 * e
          topMesh.rotation.x = topStartRotX - 0.3 * e
          topMesh.rotation.z = topStartRotZ + 0.2 * e
        } else {
          const e = ((tp - 0.4) / 0.6) ** 2
          topMesh.position.y = topStartY + packH * 1.5 - packH * 3 * e
          topMesh.rotation.x = topStartRotX - 0.3 - 1.2 * e
          topMesh.rotation.z = topStartRotZ + 0.2 + 0.8 * e
          for (const mat of topMaterials) {
            mat.transparent = true
            mat.opacity = Math.max(0, 1 - (tp - 0.4) / 0.6)
          }
        }
      }

      // PRIZE CARD
      {
        const ce = Math.max(0, elapsed - CARD_RISE_DELAY)
        const tp = Math.min(ce / CARD_RISE_DURATION, 1)
        const ease = 1 - Math.pow(1 - tp, 3)
        cardMesh.position.y = cardStartY + (cardTargetY - cardStartY) * ease
        cardMat.opacity = tp
        const s = 0.6 + 0.4 * ease
        cardMesh.scale.set(s, s, s)
      }

      // GLOW
      {
        const gt = Math.min(elapsed / GLOW_FADE_DURATION, 1)
        const gi = gt < 0.3 ? (gt / 0.3) * 8 : 8 * (1 - (gt - 0.3) / 0.7) * 0.4
        glow.intensity = Math.max(0, gi)
        if (gt < 0.3) {
          const ss = (gt / 0.3) * 8
          sprite.scale.set(ss, ss * 1.5, 1)
          spriteMat.opacity = gt / 0.3 * 0.6
        } else {
          const ft = (gt - 0.3) / 0.7
          const ss = 8 * (1 - ft * 0.3)
          sprite.scale.set(ss, ss * 1.5, 1)
          spriteMat.opacity = 0.6 * (1 - ft)
        }
      }

      // BOTTOM FALL
      {
        const be = Math.max(0, elapsed - BOTTOM_FALL_DELAY)
        const tp = Math.min(be / BOTTOM_FALL_DURATION, 1)
        bottomMesh.position.y = bottomStartY - packH * 3 * tp * tp
        if (tp > 0.3) {
          const ft = (tp - 0.3) / 0.7
          for (const mat of bottomMaterials) {
            mat.transparent = true
            mat.opacity = Math.max(0, 1 - ft)
          }
        }
      }

      const maxDur = Math.max(TEAR_DURATION, CARD_RISE_DELAY + CARD_RISE_DURATION,
        BOTTOM_FALL_DELAY + BOTTOM_FALL_DURATION, GLOW_FADE_DURATION)
      if (elapsed < maxDur) requestAnimationFrame(step)
      else {
        cleanupTearMeshes()
        ctx.isPackageOpening = false
        ctx.isPackageOpened = true
      }
    }

    requestAnimationFrame(step)
  }

  // ===================== CLEANUP =====================

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

  // Expose
  ctx.openPackage = openPackage
  ctx.resetPackageOpening = resetPackageOpening
  ctx.assignPrizes = assignPrizes
  ctx.startTearing = startTearing
  ctx.updateTearing = updateTearing
  ctx.cancelTearing = cancelTearing

  ctx.showTearHint = showTearHint
  ctx.hideTearHint = hideTearHint

  return { openPackage, resetPackageOpening, assignPrizes, startTearing, updateTearing, cancelTearing, showTearHint, hideTearHint }
}
