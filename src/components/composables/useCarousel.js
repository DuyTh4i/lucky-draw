/* eslint-disable curly */
import * as THREE from 'three'

const ALL_COLORS = [
  0x8b_2b_e2, 0x1a_6e_e8, 0xe8_28_1a, 0x18_b8_5a, 0xe8_a0_18,
  0xff_44_88, 0x44_ff_aa, 0xff_88_00, 0x00_88_ff, 0xaa_44_ff,
]

export function useCarousel (ctx) {
  const materialCache = {}
  const sideMat = new THREE.MeshBasicMaterial({ color: 0x11_00_22 })

  // eslint-disable-next-line no-unused-vars
  function createPackMesh (colorHex, index) {
    if (!materialCache[colorHex]) {
      const fw = 128
      const fh = Math.round(fw * 1.6) // ~205px
      const fc = document.createElement('canvas')
      fc.width = fw
      fc.height = fh
      const frontCtx = fc.getContext('2d')
      const grad = frontCtx.createLinearGradient(0, 0, fw, fh)
      grad.addColorStop(0, '#' + colorHex.toString(16).padStart(6, '0'))
      grad.addColorStop(1, '#1a0033')
      frontCtx.fillStyle = grad
      frontCtx.fillRect(0, 0, fw, fh)

      const sheen = frontCtx.createLinearGradient(0, 0, fw, 0)
      sheen.addColorStop(0, 'rgba(255,255,255,0.00)')
      sheen.addColorStop(0.4, 'rgba(255,255,255,0.18)')
      sheen.addColorStop(1, 'rgba(255,255,255,0.00)')
      frontCtx.fillStyle = sheen
      frontCtx.fillRect(0, 0, fw, fh)

      const bc = document.createElement('canvas')
      bc.width = fw
      bc.height = fh
      const bctx = bc.getContext('2d')
      bctx.fillStyle = '#0d0d2b'
      bctx.fillRect(0, 0, fw, fh)

      materialCache[colorHex] = [
        sideMat, sideMat, sideMat, sideMat,
        new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(fc), roughness: 0.5 }),
        new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(bc), roughness: 0.5 }),
      ]
    }

    return new THREE.Mesh(
      new THREE.BoxGeometry(ctx.config.packW, ctx.config.packH, ctx.config.packD),
      materialCache[colorHex],
    )
  }

  function clearCarousel () {
    if (!ctx.carouselGroup) return
    for (const mesh of ctx.packMeshes) {
      if (ctx.interactionManager) ctx.interactionManager.remove(mesh)
      mesh.geometry.dispose()

      // Đã loại bỏ logic dispose material vì giờ ta đã lưu vào cache (chỉ khoảng chục cái tĩnh)
      // Mọi lần kéo thanh UI thay đổi số lượng màn sẽ rốt ráo không tốn chu kỳ build texture Canvas.
    }
    ctx.scene.remove(ctx.carouselGroup)
    ctx.carouselGroup = null
    ctx.packMeshes = []
    ctx.selectedPack.value = null
  }

  function buildCarousel () {
    ctx.carouselGroup = new THREE.Group()
    ctx.packMeshes = []

    for (let i = 0; i < ctx.config.packCount; i++) {
      const angle = (i / ctx.config.packCount) * Math.PI * 2
      const mesh = createPackMesh(ALL_COLORS[i % ALL_COLORS.length], i)

      mesh.position.x = Math.sin(angle) * ctx.config.radius
      mesh.position.z = Math.cos(angle) * ctx.config.radius
      mesh.rotation.y = angle
      mesh.userData.packIndex = i
      mesh.userData.baseAngle = angle
      // Bỏ bóng vì đã tắt ShadowMap trong useWebGL để tránh hao tài nguyên vô ích
      mesh.castShadow = false

      ctx.packMeshes.push(mesh)
      ctx.carouselGroup.add(mesh)
    }

    ctx.scene.add(ctx.carouselGroup)

    for (const mesh of ctx.packMeshes) {
      if (ctx.interactionManager) ctx.interactionManager.add(mesh)
      if (ctx.onPackClick) mesh.addEventListener('click', ctx.onPackClick)
      if (ctx.onPackHover) mesh.addEventListener('mouseover', ctx.onPackHover)
      if (ctx.onPackOut) mesh.addEventListener('mouseout', ctx.onPackOut)
    }
  }

  ctx.rebuildCarousel = function () {
    clearCarousel()
    buildCarousel()
  }

  ctx.autoFit = function () {
    const n = ctx.config.packCount
    const gap = 0.25 // Khoảng cách khe hở giữa các package

    // Đảm bảo cập nhật lại H = 1.6 * W ngay cả khi chỉnh tay W trên GUI
    ctx.config.packH = ctx.config.packW * 1.6

    // Tính toán bán kính của vòng tròn ôm sát các package:
    // Cạnh của một đa giác nội tiếp đường tròn: c = 2 * R * sin(Pi / n).
    // Ở đây package cần (packW + gap) chu vi:
    ctx.config.radius = Math.max(2.5, (ctx.config.packW + gap) / (2 * Math.sin(Math.PI / n)))

    ctx.rebuildCarousel()

    // Lùi camera ra xa tương ứng với độ nở của radius
    // Với radius = ~4.2 -> camZ = 7 => khoảng cách từ màn hình đến thẻ tầm 2.8
    ctx.config.camZ = ctx.config.radius + 4
    if (ctx.updateCamera) ctx.updateCamera()

    if (ctx.gui) {
      for (const c of ctx.gui.controllersRecursive()) c.updateDisplay()
    }
  }

  return { buildCarousel }
}
