import * as THREE from 'three'
import { createGlowTexture } from './packageUtils'

export function useTearHint ({ ctx, TEAR_RATIO }) {
  // Tear visual meshes
  let tearBandMesh = null
  let tearDashedLine = null
  let tearFillLine = null
  let tearChaserDot = null
  let tearChaserGroup = null
  let isTearHintActive = false
  let tearHintAnimFrame = null

  // Reusable color objects
  const COLOR_RED_BAND = new THREE.Color('#9b9b9bff')
  const COLOR_YELLOW = new THREE.Color('#ffdd44')
  const COLOR_ORANGE = new THREE.Color('#ff8800')

  function getTearWorldTransform () {
    const mesh = ctx.packMeshes[ctx.selectedPack.value]
    if (!mesh) {
      return null
    }
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

  function showTearHint () {
    if (isTearHintActive) {
      return
    }
    if (ctx.selectedPack.value === null) {
      return
    }
    const { packW } = ctx.config
    const tw = getTearWorldTransform()
    if (!tw) {
      return
    }

    isTearHintActive = true

    const bandWidth = packW
    const bandHeight = 0.03

    // Dải ngang đỏ thẫm -> đã đổi thành xám trong mã ngọn
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
    ctx.scene.add(tearBandMesh)

    // Đường nét đứt xám
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

    // Đường fill (progress indicator)
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
    const rightDir = new THREE.Vector3(1, 0, 0).applyQuaternion(tw.quaternion)
    tearFillLine.position.addScaledVector(rightDir, -bandWidth / 2)
    tearFillLine.scale.x = 0.001
    ctx.scene.add(tearFillLine)

    // Đốm sáng
    const haloTex = createGlowTexture(128, 'rgba(255,200,220,1)', 'rgba(255,200,220,0)')
    const coreTex = createGlowTexture(64, 'rgba(255,255,255,1)', 'rgba(255,255,255,0)')

    const haloMat = new THREE.SpriteMaterial({
      map: haloTex,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthTest: false,
    })
    const haloSprite = new THREE.Sprite(haloMat)
    haloSprite.scale.set(0.55, 0.2, 1)

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

    tearChaserDot = coreSprite
    tearChaserDot.userData.haloMat = haloMat
    tearChaserDot.userData.haloTex = haloTex
    tearChaserDot.userData.coreTex = coreTex

    const loopDuration = 1500
    const startX = -bandWidth / 2
    const endX = bandWidth / 2

    function animateChaser (now) {
      if (!isTearHintActive) {
        return
      }

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

      const alpha = p > 0.75 ? (1 - p) / 0.25 : 1
      const flicker = 0.92 + 0.08 * Math.sin(now * 0.015)

      haloMat.opacity = 0.5 * alpha * flicker
      coreMat.opacity = 0.9 * alpha * flicker

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
      if (!m) {
        continue
      }
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
        if (tearChaserDot.userData.haloMat) {
          tearChaserDot.userData.haloMat.dispose()
        }
        if (tearChaserDot.userData.haloTex) {
          tearChaserDot.userData.haloTex.dispose()
        }
        if (tearChaserDot.userData.coreTex) {
          tearChaserDot.userData.coreTex.dispose()
        }
      }
      tearChaserDot = null
      tearChaserGroup = null
    }
  }

  function updateFillVisual (progress) {
    if (!tearFillLine) {
      return
    }
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

  return { showTearHint, hideTearHint, updateFillVisual }
}
