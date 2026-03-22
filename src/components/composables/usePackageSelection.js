/* eslint-disable curly */

/**
 * usePackageSelection
 *
 * Quản lý hiệu ứng chuyển động khi chọn gói:
 * - Vuốt lên: camera + selected package nâng lên, các package khác ở yên
 * - Sau khi nâng xong: tắt carousel (không cho swipe), tắt xoay package
 * - Bobbing vẫn hoạt động
 */
export function usePackageSelection (ctx) {
  let isLifting = false
  ctx.isPackageSelected = false

  // Độ cao nâng lên
  const LIFT_AMOUNT = 6.4 // Selected package nâng lên bao nhiêu đơn vị
  const LIFT_CAMERA_AMOUNT = 6.8 // Camera nâng lên bao nhiêu
  const LIFT_LOOK_AMOUNT = 6.8 // Camera lookAt nâng lên bao nhiêu
  const LIFT_Z_AMOUNT = 0.5 // Đưa package lại gần camera bao nhiêu đơn vị
  const LIFT_DURATION = 500

  // Lưu vị trí gốc
  let originalCamY = 0
  let originalLookY = 0

  /**
   * Nâng camera + selected package lên trên
   */
  function liftSelectedPackage () {
    if (isLifting || ctx.isPackageSelected) return
    if (ctx.selectedPack.value === null) return

    isLifting = true

    // Trên điện thoại (màn dọc) cần nâng cao hơn
    const isMobile = window.innerWidth < 768
    const mobileScale = isMobile ? 1.2 : 1
    const liftAmount = LIFT_AMOUNT * mobileScale
    const liftZAmount = LIFT_Z_AMOUNT * mobileScale + mobileScale
    const liftCamAmount = LIFT_CAMERA_AMOUNT * mobileScale
    const liftLookAmount = LIFT_LOOK_AMOUNT * mobileScale

    // Lưu vị trí gốc
    originalCamY = ctx.camera.position.y
    originalLookY = ctx.config.lookY

    const selectedMesh = ctx.packMeshes[ctx.selectedPack.value]
    const startCamY = ctx.camera.position.y
    const startLookY = ctx.config.lookY

    const t0 = performance.now()

    function step (now) {
      const t = Math.min((now - t0) / LIFT_DURATION, 1)
      const ease = 1 - Math.pow(1 - t, 3) // ease-out cubic

      // Nâng camera lên
      ctx.camera.position.y = startCamY + liftCamAmount * ease
      // Nâng lookAt lên
      const newLookY = startLookY + liftLookAmount * ease
      ctx.config.lookY = newLookY
      ctx.camera.lookAt(0, newLookY, 0)

      // Nâng selected package lên + đưa lại gần camera
      if (selectedMesh) {
        selectedMesh.userData.liftExtraY = liftAmount * ease
        selectedMesh.userData.liftExtraZ = liftZAmount * ease
      }

      if (t < 1) {
        requestAnimationFrame(step)
      } else {
        isLifting = false
        ctx.isPackageSelected = true
      }
    }

    requestAnimationFrame(step)
  }

  /**
   * Hạ camera + selected package xuống vị trí ban đầu
   */
  function lowerSelectedPackage () {
    if (isLifting || !ctx.isPackageSelected) return

    isLifting = true

    const selectedMesh = ctx.selectedPack.value === null
      ? null
      : ctx.packMeshes[ctx.selectedPack.value]

    const startCamY = ctx.camera.position.y
    const startLookY = ctx.config.lookY
    const startExtraY = selectedMesh ? (selectedMesh.userData.liftExtraY || 0) : 0
    const startExtraZ = selectedMesh ? (selectedMesh.userData.liftExtraZ || 0) : 0

    const t0 = performance.now()

    function step (now) {
      const t = Math.min((now - t0) / LIFT_DURATION, 1)
      const ease = 1 - Math.pow(1 - t, 3)

      // Hạ camera xuống
      ctx.camera.position.y = startCamY + (originalCamY - startCamY) * ease
      // Hạ lookAt
      const newLookY = startLookY + (originalLookY - startLookY) * ease
      ctx.config.lookY = newLookY
      ctx.camera.lookAt(0, newLookY, 0)

      // Hạ selected package
      if (selectedMesh) {
        selectedMesh.userData.liftExtraY = startExtraY * (1 - ease)
        selectedMesh.userData.liftExtraZ = startExtraZ * (1 - ease)
      }

      if (t < 1) {
        requestAnimationFrame(step)
      } else {
        isLifting = false
        ctx.isPackageSelected = false
        if (selectedMesh) {
          selectedMesh.userData.liftExtraY = 0
          selectedMesh.userData.liftExtraZ = 0
        }
      }
    }

    requestAnimationFrame(step)
  }

  function isLiftingOrSelected () {
    return isLifting || ctx.isPackageSelected
  }

  // Expose lên ctx
  ctx.liftSelectedPackage = liftSelectedPackage
  ctx.lowerSelectedPackage = lowerSelectedPackage
  ctx.isLiftingOrSelected = isLiftingOrSelected

  return { liftSelectedPackage, lowerSelectedPackage, isLiftingOrSelected }
}
