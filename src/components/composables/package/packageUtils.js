import * as THREE from 'three'

/** Tạo glow texture bằng Canvas2D radial gradient */
export function createGlowTexture (size, colorCenter, colorEdge) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const c = canvas.getContext('2d')
  const half = size / 2
  const grad = c.createRadialGradient(half, half, 0, half, half, half)
  grad.addColorStop(0, colorCenter)
  grad.addColorStop(0.3, colorCenter)
  grad.addColorStop(1, colorEdge)
  c.fillStyle = grad
  c.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

/** Helper tạo geometry cho thân hoặc nắp hộp */
export function createPartGeometry (totalW, totalH, totalD, part, tearRatio = 0.4) {
  if (part === 'top') {
    const h = totalH * tearRatio
    const geo = new THREE.BoxGeometry(totalW, h, totalD)
    geo.translate(0, h / 2, 0)
    return { geometry: geo, height: h }
  } else {
    const h = totalH * (1 - tearRatio)
    const geo = new THREE.BoxGeometry(totalW, h, totalD)
    geo.translate(0, -h / 2, 0)
    return { geometry: geo, height: h }
  }
}
