/* eslint-disable curly */
import * as THREE from 'three'

export function useInteraction (ctx) {
  const raycaster = new THREE.Raycaster()
  const mouseNDC = new THREE.Vector2()

  let holdTimer = null
  let pendingSpinX = 0
  let hitOnPack = false
  const HOLD_DELAY = 200

  let previousMouseX = 0
  let dragStartX = 0
  let dragStartY = 0
  let dragDirection = 'none' // 'none' | 'horizontal' | 'vertical'
  const DRAG_DEAD_ZONE = 50
  let spinLastX = 0
  let spinAccumulated = 0

  let touchHoldTimer = null
  let touchPendingX = 0
  let touchHitOnPack = false

  ctx.onPackClick = function (event) {
    if (ctx.hasDragged || ctx.isSpinningPack) return
    const idx = event.target.userData.packIndex
    if (idx === undefined || idx !== ctx.selectedPack.value) return
  }

  ctx.onPackHover = function (event) {
    const idx = event.target.userData.packIndex
    if (idx !== ctx.selectedPack.value) return
    if (!ctx.isDragging && !ctx.isSpinningPack) {
      document.body.style.cursor = 'pointer'
    }
  }

  ctx.onPackOut = function (event) {
    const idx = event.target.userData.packIndex
    if (idx !== ctx.selectedPack.value) return
    if (!ctx.isDragging && !ctx.isSpinningPack) {
      document.body.style.cursor = 'default'
    }
  }

  // --- Snapshot helpers
  function snapToNearest () {
    if (ctx.isSnapping) return
    const anglePerPack = (Math.PI * 2) / ctx.config.packCount
    const currentY = ctx.carouselGroup.rotation.y
    const targetY = Math.round(currentY / anglePerPack) * anglePerPack
    const diff = targetY - currentY

    if (Math.abs(diff) < 0.001) {
      updateSelectedFromRotation(targetY)
      return
    }

    ctx.isSnapping = true
    const duration = 180
    const t0 = performance.now()

    function step (now) {
      const t = Math.min((now - t0) / duration, 1)
      const ease = 1 - Math.pow(1 - t, 3)
      ctx.carouselGroup.rotation.y = currentY + diff * ease
      if (t < 1) {
        requestAnimationFrame(step)
      } else {
        ctx.carouselGroup.rotation.y = targetY
        ctx.isSnapping = false
        updateSelectedFromRotation(targetY)
      }
    }
    requestAnimationFrame(step)
  }

  function updateSelectedFromRotation (rotationY) {
    const anglePerPack = (Math.PI * 2) / ctx.config.packCount
    const rawIndex = Math.round(-rotationY / anglePerPack) % ctx.config.packCount
    const idx = ((rawIndex % ctx.config.packCount) + ctx.config.packCount) % ctx.config.packCount
    ctx.selectedPack.value = idx
  }

  ctx.updateSelectedFromRotation = updateSelectedFromRotation

  function snapPackToFace () {
    if (ctx.selectedPack.value === null) return
    const mesh = ctx.packMeshes[ctx.selectedPack.value]
    const base = mesh.userData.baseAngle
    const current = mesh.rotation.y
    const offset = current - base
    const targetOffset = Math.round(offset / Math.PI) * Math.PI
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

  function hitSelectedPack (clientX, clientY) {
    if (ctx.selectedPack.value === null) return false
    if (!ctx.canvasRef.value) return false
    const rect = ctx.canvasRef.value.getBoundingClientRect()
    mouseNDC.x = ((clientX - rect.left) / rect.width) * 2 - 1
    mouseNDC.y = -((clientY - rect.top) / rect.height) * 2 + 1
    raycaster.setFromCamera(mouseNDC, ctx.camera)
    const hits = raycaster.intersectObject(ctx.packMeshes[ctx.selectedPack.value])
    return hits.length > 0
  }

  /** Helper: xử lý move khi package đã selected (dùng chung cho mouse + touch) */
  function handleSelectedMove (clientX, clientY) {
    if (!ctx.isDragging) return
    if (dragDirection === 'none') {
      const dx = Math.abs(clientX - dragStartX)
      const dy = Math.abs(clientY - dragStartY)
      if (dx < DRAG_DEAD_ZONE && dy < DRAG_DEAD_ZONE) return
      dragDirection = dx >= dy ? 'horizontal' : 'vertical'
    }
    if (dragDirection === 'horizontal') {
      if (!ctx.isTearing && ctx.startTearing) ctx.startTearing(dragStartX)
      if (ctx.updateTearing) {
        const progress = ctx.updateTearing(clientX)
        if (progress >= 1) {
          ctx.isDragging = false
          ctx.openPackage()
        }
      }
    }
  }

  function onMouseDown (event) {
    if (ctx.isSnapping) return
    // Block mọi interaction khi đang opening hoặc đã opened
    if (ctx.isPackageOpening) return
    if (ctx.isPackageOpened) {
      // Khi đã opened: cho phép click/drag để reset
      ctx.isDragging = true
      ctx.hasDragged = false
      dragStartX = event.clientX
      dragStartY = event.clientY
      dragDirection = 'none'
      return
    }
    // Nếu đang lift hoặc đã selected → cho swipe ngang để xé hoặc dọc xuống để hạ
    if (ctx.isLiftingOrSelected && ctx.isLiftingOrSelected()) {
      if (!ctx.isPackageSelected) return // đang lift animation, block hết
      // Đã selected: cho phép drag để xé (ngang) hoặc hạ (dọc xuống)
      ctx.isDragging = true
      ctx.hasDragged = false
      dragStartX = event.clientX
      dragStartY = event.clientY
      dragDirection = 'none'
      return
    }

    if (hitSelectedPack(event.clientX, event.clientY)) {
      hitOnPack = true
      pendingSpinX = event.clientX
      holdTimer = setTimeout(() => {
        ctx.isSpinningPack = true
        spinLastX = pendingSpinX
        spinAccumulated = 0
        document.body.style.cursor = 'ew-resize'
        holdTimer = null
      }, HOLD_DELAY)
      ctx.isDragging = true
      ctx.hasDragged = false
      dragStartX = event.clientX
      dragStartY = event.clientY
      dragDirection = 'none'
      previousMouseX = event.clientX
      return
    }

    hitOnPack = false
    ctx.isDragging = true
    ctx.hasDragged = false
    dragStartX = event.clientX
    dragStartY = event.clientY
    dragDirection = 'none'
    previousMouseX = event.clientX
  }

  function onMouseMove (event) {
    // Block khi đang opening
    if (ctx.isPackageOpening) return
    if (ctx.isPackageOpened) return
    // Khi đã selected: cho swipe ngang để xé, dọc xuống để hạ
    if (ctx.isPackageSelected) {
      handleSelectedMove(event.clientX, event.clientY)
      return
    }

    if (holdTimer && hitOnPack) {
      const dx = Math.abs(event.clientX - pendingSpinX)
      if (dx > 4) {
        clearTimeout(holdTimer)
        holdTimer = null
        hitOnPack = false
      }
    }

    if (ctx.isSpinningPack && ctx.selectedPack.value !== null) {
      const deltaX = event.clientX - spinLastX
      spinLastX = event.clientX
      const deltaRad = deltaX * 0.01
      spinAccumulated += deltaRad
      const mesh = ctx.packMeshes[ctx.selectedPack.value]
      mesh.rotation.y += deltaRad
      if (Math.abs(spinAccumulated) >= Math.PI * 2) {
        spinAccumulated = 0
        spinLastX = event.clientX
        mesh.rotation.y = mesh.userData.baseAngle
      }
      return
    }

    if (!ctx.isDragging || ctx.isSnapping) return
    // Chỉ 1 package thì không cho kéo đảo vị trí
    if (ctx.config.packCount <= 1) return

    // Gesture disambiguation: chờ vượt ngưỡng rồi phân biệt ngang/dọc
    if (dragDirection === 'none') {
      const dx = Math.abs(event.clientX - dragStartX)
      const dy = Math.abs(event.clientY - dragStartY)
      if (dx < DRAG_DEAD_ZONE && dy < DRAG_DEAD_ZONE) return
      dragDirection = dx >= dy ? 'horizontal' : 'vertical'
      previousMouseX = event.clientX
    }

    // Vuốt dọc → trigger lift/lower package
    if (dragDirection === 'vertical') {
      const dy = event.clientY - dragStartY
      // Vuốt lên (dy < 0) đủ xa → lift
      if (dy < -80 && !ctx.isPackageSelected && ctx.liftSelectedPackage) {
        ctx.isDragging = false
        ctx.liftSelectedPackage()
      }
      return
    }

    const deltaX = event.clientX - previousMouseX
    if (Math.abs(deltaX) > 2) ctx.hasDragged = true

    // Tự động kích độ nhạy vuốt lên 2.5 lần trên màn hình điện thoại
    const isMobile = window.innerWidth < 768
    const sens = isMobile ? ctx.config.dragSensitivity * 2.5 : ctx.config.dragSensitivity

    if (ctx.carouselGroup) ctx.carouselGroup.rotation.y += deltaX * sens
    previousMouseX = event.clientX
  }

  function onMouseUp (event) {
    if (holdTimer) {
      clearTimeout(holdTimer)
      holdTimer = null
    }
    hitOnPack = false

    // Nếu đã opened → reset khi click
    if (ctx.isPackageOpened && ctx.isDragging) {
      ctx.isDragging = false
      if (!ctx.hasDragged && ctx.resetPackageOpening) {
        ctx.resetPackageOpening()
        // Sau khi reset, hạ package luôn
        if (ctx.lowerSelectedPackage) ctx.lowerSelectedPackage()
      }
      return
    }

    // Block khi đang opening
    if (ctx.isPackageOpening) {
      ctx.isDragging = false
      return
    }

    // Nếu đã selected và vuốt dọc xuống → lower
    if (ctx.isPackageSelected && ctx.isDragging && dragDirection === 'vertical') {
      const dy = event.clientY - dragStartY
      if (dy > 80 && ctx.lowerSelectedPackage) {
        ctx.isDragging = false
        ctx.lowerSelectedPackage()
        return
      }
      ctx.isDragging = false
      return
    }

    // Nếu đang xé dở (ngang) → cancel
    if (ctx.isPackageSelected && ctx.isDragging && dragDirection === 'horizontal') {
      ctx.isDragging = false
      if (ctx.cancelTearing) ctx.cancelTearing()
      return
    }

    if (ctx.isSpinningPack) {
      ctx.isSpinningPack = false
      ctx.isDragging = false
      ctx.hasDragged = false
      document.body.style.cursor = 'default'
      snapPackToFace()
      return
    }
    if (!ctx.isDragging) return
    ctx.isDragging = false
    document.body.style.cursor = 'default'
    // Không snap carousel khi đang lift
    if (!ctx.isLiftingOrSelected || !ctx.isLiftingOrSelected()) {
      snapToNearest()
    }
    setTimeout(() => {
      ctx.hasDragged = false
    }, 100)
  }

  function onTouchStart (event) {
    if (ctx.isSnapping) return

    const touch = event.touches[0]

    // Block khi đang opening
    if (ctx.isPackageOpening) return
    if (ctx.isPackageOpened) {
      ctx.isDragging = true
      ctx.hasDragged = false
      dragStartX = touch.clientX
      dragStartY = touch.clientY
      dragDirection = 'none'
      return
    }

    // Nếu đang lift hoặc đã selected
    if (ctx.isLiftingOrSelected && ctx.isLiftingOrSelected()) {
      if (!ctx.isPackageSelected) return // đang lift animation
      // Đã selected: cho phép drag để xé (ngang) hoặc hạ (dọc)
      ctx.isDragging = true
      ctx.hasDragged = false
      dragStartX = touch.clientX
      dragStartY = touch.clientY
      dragDirection = 'none'
      return
    }

    if (hitSelectedPack(touch.clientX, touch.clientY)) {
      touchHitOnPack = true
      touchPendingX = touch.clientX
      touchHoldTimer = setTimeout(() => {
        ctx.isSpinningPack = true
        spinLastX = touchPendingX
        spinAccumulated = 0
        touchHoldTimer = null
      }, HOLD_DELAY)
      ctx.isDragging = true
      ctx.hasDragged = false
      dragStartX = touch.clientX
      dragStartY = touch.clientY
      dragDirection = 'none'
      previousMouseX = touch.clientX
      return
    }

    touchHitOnPack = false
    ctx.isDragging = true
    ctx.hasDragged = false
    dragStartX = touch.clientX
    dragStartY = touch.clientY
    dragDirection = 'none'
    previousMouseX = touch.clientX
  }

  function onTouchMove (event) {
    // Block khi đang opening
    if (ctx.isPackageOpening) return
    if (ctx.isPackageOpened) return
    // Khi đã selected: cho swipe ngang để xé, dọc để hạ
    if (ctx.isPackageSelected) {
      handleSelectedMove(event.touches[0].clientX, event.touches[0].clientY)
      return
    }

    if (touchHoldTimer && touchHitOnPack) {
      const dx = Math.abs(event.touches[0].clientX - touchPendingX)
      if (dx > 4) {
        clearTimeout(touchHoldTimer)
        touchHoldTimer = null
        touchHitOnPack = false
      }
    }

    if (ctx.isSpinningPack && ctx.selectedPack.value !== null) {
      event.preventDefault()
      const deltaX = event.touches[0].clientX - spinLastX
      spinLastX = event.touches[0].clientX
      const deltaRad = deltaX * 0.01
      spinAccumulated += deltaRad
      const mesh = ctx.packMeshes[ctx.selectedPack.value]
      mesh.rotation.y += deltaRad
      if (Math.abs(spinAccumulated) >= Math.PI * 2) {
        spinAccumulated = 0
        spinLastX = event.touches[0].clientX
        mesh.rotation.y = mesh.userData.baseAngle
      }
      return
    }

    if (!ctx.isDragging || ctx.isSnapping) return
    // Chỉ 1 package thì không cho vuốt đảo vị trí
    if (ctx.config.packCount <= 1) return

    // Gesture disambiguation: chờ vượt ngưỡng rồi phân biệt ngang/dọc
    if (dragDirection === 'none') {
      const dx = Math.abs(event.touches[0].clientX - dragStartX)
      const dy = Math.abs(event.touches[0].clientY - dragStartY)
      if (dx < DRAG_DEAD_ZONE && dy < DRAG_DEAD_ZONE) return
      dragDirection = dx >= dy ? 'horizontal' : 'vertical'
      previousMouseX = event.touches[0].clientX
    }

    // Vuốt dọc → trigger lift/lower package
    if (dragDirection === 'vertical') {
      const dy = event.touches[0].clientY - dragStartY
      // Vuốt lên (dy < 0) đủ xa → lift
      if (dy < -80 && !ctx.isPackageSelected && ctx.liftSelectedPackage) {
        ctx.isDragging = false
        ctx.liftSelectedPackage()
      }
      return
    }

    event.preventDefault()
    const deltaX = event.touches[0].clientX - previousMouseX
    if (Math.abs(deltaX) > 2) ctx.hasDragged = true

    // Tự động kích độ nhạy vuốt lên 2.5 lần trên thiết bị di động
    const isMobile = window.innerWidth < 768
    const sens = isMobile ? ctx.config.dragSensitivity * 2.5 : ctx.config.dragSensitivity

    if (ctx.carouselGroup) ctx.carouselGroup.rotation.y += deltaX * sens
    previousMouseX = event.touches[0].clientX
  }

  function onTouchEnd (event) {
    if (touchHoldTimer) {
      clearTimeout(touchHoldTimer)
      touchHoldTimer = null
    }
    touchHitOnPack = false

    // Nếu đã opened → reset khi tap
    if (ctx.isPackageOpened && ctx.isDragging) {
      ctx.isDragging = false
      if (!ctx.hasDragged && ctx.resetPackageOpening) {
        ctx.resetPackageOpening()
        if (ctx.lowerSelectedPackage) ctx.lowerSelectedPackage()
      }
      return
    }

    // Block khi đang opening
    if (ctx.isPackageOpening) {
      ctx.isDragging = false
      return
    }

    // Nếu đã selected và vuốt dọc xuống → lower
    if (ctx.isPackageSelected && ctx.isDragging && dragDirection === 'vertical') {
      const dy = (event.changedTouches[0]?.clientY || 0) - dragStartY
      if (dy > 80 && ctx.lowerSelectedPackage) {
        ctx.isDragging = false
        ctx.lowerSelectedPackage()
        return
      }
      ctx.isDragging = false
      return
    }

    // Nếu đang xé dở (ngang) → cancel
    if (ctx.isPackageSelected && ctx.isDragging && dragDirection === 'horizontal') {
      ctx.isDragging = false
      if (ctx.cancelTearing) ctx.cancelTearing()
      return
    }

    if (ctx.isSpinningPack) {
      ctx.isSpinningPack = false
      ctx.isDragging = false
      ctx.hasDragged = false
      snapPackToFace()
      return
    }
    ctx.isDragging = false
    // Không snap carousel khi đang lift
    if (!ctx.isLiftingOrSelected || !ctx.isLiftingOrSelected()) {
      snapToNearest()
    }
    setTimeout(() => {
      ctx.hasDragged = false
    }, 100)
  }

  function bindEvents () {
    const canvas = ctx.canvasRef.value
    if (!canvas) return
    canvas.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)

    canvas.addEventListener('touchstart', onTouchStart, { passive: true })
    canvas.addEventListener('touchmove', onTouchMove, { passive: false })
    canvas.addEventListener('touchend', onTouchEnd)

    window.addEventListener('resize', ctx.onResize)
  }

  function unbindEvents () {
    const canvas = ctx.canvasRef.value
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
    window.removeEventListener('resize', ctx.onResize)

    if (canvas) {
      canvas.removeEventListener('mousedown', onMouseDown)
      canvas.removeEventListener('touchstart', onTouchStart)
      canvas.removeEventListener('touchmove', onTouchMove)
      canvas.removeEventListener('touchend', onTouchEnd)
    }
  }

  return { bindEvents, unbindEvents }
}
