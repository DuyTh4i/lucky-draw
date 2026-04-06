import * as THREE from 'three'

const PARTICLE_COLORS = ['#ffd700', '#ffa500', '#ff6347', '#ffffff', '#ffec8b', '#ff4444']

export function createParticles (scene, tearPos, packWidth) {
  const count = 28
  const group = new THREE.Group()
  group.position.copy(tearPos)
  group.position.z += 0.02
  scene.add(group)

  const data = []

  for (let i = 0; i < count; i++) {
    // Quỹ đạo: rẽ quạt hướng lên (cone ~±63°)
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.7
    const speed = 1.5 + Math.random() * 2.5
    const vx = Math.cos(angle) * speed * (Math.random() > 0.5 ? 1 : -1) * 0.4
    const vy = Math.abs(Math.sin(angle) * speed) // hướng lên
    const spin = (Math.random() - 0.5) * 12

    const size = 0.02 + Math.random() * 0.04
    const colorStr = PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)]

    const geo = new THREE.PlaneGeometry(size, size)
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(colorStr),
      transparent: true,
      opacity: 1,
      side: THREE.DoubleSide,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    })
    const mesh = new THREE.Mesh(geo, mat)

    // Vị trí xuất phát dọc đường rách
    const startX = (Math.random() - 0.5) * packWidth * 0.8
    mesh.position.set(startX, 0, 0)

    group.add(mesh)

    data.push({
      mesh,
      mat,
      startX,
      vx,
      vy,
      spin,
      gravity: 3 + Math.random() * 2,
      lifetime: 0.5 + Math.random() * 0.5,
    })
  }

  return { group, data }
}

export function updateParticles (particles, elapsedSec) {
  for (const p of particles.data) {
    const t = elapsedSec / p.lifetime
    if (t > 1) {
      p.mat.opacity = 0
      p.mesh.visible = false
      continue
    }

    // Vị trí tuyệt đối = startPos + velocity*t - 0.5*gravity*t^2
    p.mesh.position.x = p.startX + p.vx * elapsedSec
    p.mesh.position.y = p.vy * elapsedSec - 0.5 * p.gravity * elapsedSec * elapsedSec
    p.mesh.rotation.z = p.spin * elapsedSec

    // Fade dần ở nửa sau đời
    p.mat.opacity = t > 0.4 ? Math.max(0, 1 - (t - 0.4) / 0.6) : 1
  }
}

export function destroyParticles (scene, particles) {
  for (const p of particles.data) {
    p.mesh.geometry.dispose()
    p.mat.dispose()
  }
  scene.remove(particles.group)
}
