import * as THREE from 'three'
import { createParticles, destroyParticles, updateParticles } from './packageParticles'
import { createPartGeometry } from './packageUtils'

export function usePackageAnimation ({ ctx, TEAR_RATIO, hideTearHint, getTierForPack, getPrizeAssignments, assignPrizes }) {
  const textureLoader = new THREE.TextureLoader()
  const COLOR_WHITE = new THREE.Color('#ffffff')

  function openPackage () {
    if (ctx.isPackageOpening || ctx.isPackageOpened) {
      return
    }
    if (ctx.selectedPack.value === null) {
      return
    }

    hideTearHint()
    ctx.isTearing = false
    ctx.isPackageOpening = true

    const packIndex = ctx.selectedPack.value
    const originalMesh = ctx.packMeshes[packIndex]
    if (!originalMesh) {
      return
    }

    if (getPrizeAssignments().length === 0) {
      assignPrizes()
    }
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

    // TOP CAP
    const { geometry: topGeo } = createPartGeometry(packW, packH, packD, 'top', TEAR_RATIO)
    const topMesh = new THREE.Mesh(topGeo, topMaterials)
    topMesh.position.copy(worldPos)
    topMesh.position.y = cutY
    topMesh.quaternion.copy(worldQuat)
    ctx.scene.add(topMesh)
    ctx.tearTopMesh = topMesh

    // BOTTOM BODY
    const { geometry: bottomGeo } = createPartGeometry(packW, packH, packD, 'bottom', TEAR_RATIO)
    const bottomMesh = new THREE.Mesh(bottomGeo, bottomMaterials)
    bottomMesh.position.copy(worldPos)
    bottomMesh.position.y = cutY
    bottomMesh.quaternion.copy(worldQuat)
    ctx.scene.add(bottomMesh)
    ctx.tearBottomMesh = bottomMesh

    // TEAR FLASH
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

    // PARTICLES
    const particles = createParticles(ctx.scene, worldPos.clone().setY(cutY), packW)

    // PRIZE CARD
    const cardGeo = new THREE.PlaneGeometry(packW * 0.85, packH * 0.85)
    // Wait, load tier.texture
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

    // GLOW
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

    // PARALLEL ANIMATION TIMELINE
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

      // TOP CAP BREAK
      {
        const tp = Math.min(elapsed / TOP_BREAK_DUR, 1)
        const easeOut = 1 - Math.pow(1 - tp, 2)
        topMesh.position.y = topStartY + easeOut
        topMesh.rotation.z = topStartRotZ + 0.087 + 0.175 * easeOut

        if (tp > 0.75) {
          const fadeP = (tp - 0.75) / 0.25
          for (const mat of topMaterials) {
            mat.transparent = true
            mat.opacity = Math.max(0, 1 - fadeP)
          }
        }
      }

      // TEAR FLASH
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

      // PARTICLE BURST
      {
        const elapsedSec = Math.min(elapsed / 1000, 1)
        updateParticles(particles, elapsedSec)
      }

      // BODY RECOIL
      {
        const rp = Math.min(elapsed / RECOIL_DUR, 1)
        const recoilOffset = 0.08 * Math.sin(rp * Math.PI) * Math.pow(1 - rp, 0.5)
        bottomMesh.position.y = bottomStartY - recoilOffset
      }

      // PRIZE CARD
      {
        const ce = Math.max(0, elapsed - CARD_RISE_DELAY)
        const tp = Math.min(ce / CARD_RISE_DUR, 1)
        const ease = 1 - Math.pow(1 - tp, 3)
        cardMesh.position.y = cardStartY + (cardTargetY - cardStartY) * ease
        cardMat.opacity = tp
        const s = 0.6 + 0.4 * ease
        cardMesh.scale.set(s, s, s)
      }

      // GLOW
      {
        const gt = Math.min(elapsed / GLOW_FADE_DUR, 1)
        const gi = gt < 0.3 ? (gt / 0.3) * 8 : 8 * (1 - (gt - 0.3) / 0.7) * 0.4
        glow.intensity = Math.max(0, gi)
        if (gt < 0.3) {
          const ss = (gt / 0.3) * 8
          sprite.scale.set(ss, ss * 1.5, 1)
          glowSpriteMat.opacity = (gt / 0.3) * 0.6
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

  function cleanupTearMeshes () {
    for (const key of ['tearTopMesh', 'tearBottomMesh']) {
      const m = ctx[key]
      if (!m) {
        continue
      }
      ctx.scene.remove(m)
      m.geometry.dispose()
      if (Array.isArray(m.material)) {
        for (const mt of m.material) {
          mt.dispose()
        }
      } else {
        m.material.dispose()
      }
      ctx[key] = null
    }

    if (ctx.glowSprite) {
      ctx.scene.remove(ctx.glowSprite)
      ctx.glowSprite.material.dispose()
      ctx.glowSprite = null
    }
  }

  function resetPackageOpening () {
    if (!ctx.isPackageOpened && !ctx.isPackageOpening) {
      return
    }

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

  return { openPackage, resetPackageOpening }
}
