import * as THREE from 'three'

export function useTearInteraction ({ ctx, updateFillVisual, openPackage }) {
  let tearStartScreenX = 0
  let packageScreenWidth = 0
  let tearProgress = 0

  function getPackageScreenWidth () {
    if (ctx.selectedPack.value === null) {
      return 200
    }
    const mesh = ctx.packMeshes[ctx.selectedPack.value]
    if (!mesh || !ctx.camera || !ctx.canvasRef.value) {
      return 200
    }

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

  function startTearing (screenX) {
    if (ctx.isPackageOpening || ctx.isPackageOpened) {
      return
    }
    if (ctx.selectedPack.value === null) {
      return
    }

    ctx.isTearing = true
    tearStartScreenX = screenX
    packageScreenWidth = getPackageScreenWidth()
    tearProgress = 0
    updateFillVisual(0)
  }

  function updateTearing (currentScreenX) {
    if (!ctx.isTearing) {
      return 0
    }
    const dx = currentScreenX - tearStartScreenX
    tearProgress = Math.max(0, Math.min(dx / packageScreenWidth, 1))
    updateFillVisual(tearProgress)

    if (tearProgress >= 1) {
      ctx.isTearing = false
      openPackage()
      return tearProgress
    }

    return tearProgress
  }

  function cancelTearing () {
    if (!ctx.isTearing) {
      return
    }
    ctx.isTearing = false

    const currentProgress = tearProgress
    const snapDuration = 200
    const t0 = performance.now()

    function step (now) {
      const t = Math.min((now - t0) / snapDuration, 1)
      const ease = 1 - Math.pow(1 - t, 2)
      const p = currentProgress * (1 - ease)
      updateFillVisual(p)
      if (t < 1) {
        requestAnimationFrame(step)
      } else {
        tearProgress = 0
        updateFillVisual(0)
      }
    }
    requestAnimationFrame(step)
  }

  return { startTearing, updateTearing, cancelTearing }
}
