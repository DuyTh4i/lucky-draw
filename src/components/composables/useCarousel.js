/* eslint-disable curly */
import * as THREE from 'three'
import backTexUrl from '@/assets/texture/back.webp'
import frontTexUrl from '@/assets/texture/front.webp'
import { useSettingsStore } from '@/stores/settingsStore'

export function useCarousel (ctx) {
  // Thay vì giấu bên trong, ta khai báo Texture tĩnh ở ngoài để load 1 lần xài chung
  const textureLoader = new THREE.TextureLoader()
  const frontTex = textureLoader.load(frontTexUrl)
  frontTex.colorSpace = THREE.SRGBColorSpace
  const backTex = textureLoader.load(backTexUrl)
  backTex.colorSpace = THREE.SRGBColorSpace

  const sideMat = new THREE.MeshBasicMaterial({ color: 0x11_00_22 })
  // Lưu chung 1 bộ vật liệu thực (Shared Material Cache) thay vì lưu riêng màu
  let sharedMaterials = null

  function createPackMesh () {
    if (!sharedMaterials) {
      const q = useSettingsStore().quality
      const Ctor = q === 'low' ? THREE.MeshBasicMaterial : THREE.MeshStandardMaterial

      sharedMaterials = [
        sideMat, sideMat, sideMat, sideMat,
        new Ctor({ map: frontTex, roughness: 0.4 }),
        new Ctor({ map: backTex, roughness: 0.4 }),
      ]
    }

    return new THREE.Mesh(
      new THREE.BoxGeometry(ctx.config.packW, ctx.config.packH, ctx.config.packD),
      sharedMaterials,
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
      const mesh = createPackMesh()

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
  }

  return { buildCarousel }
}
