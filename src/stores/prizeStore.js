/* eslint-disable unicorn/prefer-add-event-listener */
import { defineStore } from 'pinia'

// Import default prize textures (static assets)
import extraRareTex from '@/assets/texture/prize/extra_rare/500.webp'
import normalTex from '@/assets/texture/prize/normal/10.webp'
import rareTex from '@/assets/texture/prize/rare/20.webp'
import superRareTex from '@/assets/texture/prize/super_rare/50.webp'
import ssrTex from '@/assets/texture/prize/super_super_rare/100.webp'
import ultraRareTex from '@/assets/texture/prize/ultra_rare/200.webp'

/**
 * 6 bậc giải thưởng cố định, không thêm không bớt.
 * Mỗi bậc có: id, label (vi/en), color, defaultTexture, quantity.
 */
export const PRIZE_TIERS = [
  { id: 'normal', labelVi: 'Thường', labelEn: 'Normal', color: '#9e9e9e', defaultTexture: normalTex },
  { id: 'rare', labelVi: 'Hiếm', labelEn: 'Rare', color: '#4caf50', defaultTexture: rareTex },
  { id: 'super_rare', labelVi: 'Siêu hiếm', labelEn: 'Super Rare', color: '#2196f3', defaultTexture: superRareTex },
  { id: 'super_super_rare', labelVi: 'Cực hiếm', labelEn: 'Super Super Rare', color: '#9c27b0', defaultTexture: ssrTex },
  { id: 'ultra_rare', labelVi: 'Siêu cực hiếm', labelEn: 'Ultra Rare', color: '#ff9800', defaultTexture: ultraRareTex },
  { id: 'extra_rare', labelVi: 'Đặc biệt hiếm', labelEn: 'Extra Rare', color: '#f44336', defaultTexture: extraRareTex },
]

/**
 * Convert ảnh File (png, jpg, jpeg, gif, bmp…) sang WebP Blob URL bằng Canvas.
 * Nếu file đã là webp thì trả về blob URL trực tiếp.
 */
function convertToWebP (file) {
  return new Promise((resolve, reject) => {
    // Nếu file đã là webp → tạo blob URL ngay
    if (file.type === 'image/webp') {
      resolve(URL.createObjectURL(file))
      return
    }

    const img = new Image()
    const reader = new FileReader()
    reader.addEventListener('load', e => {
      img.addEventListener('load', () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        const ctx2d = canvas.getContext('2d')
        ctx2d.drawImage(img, 0, 0)
        canvas.toBlob(
          blob => {
            if (blob) {
              resolve(URL.createObjectURL(blob))
            } else {
              reject(new Error('Không thể chuyển đổi ảnh sang WebP'))
            }
          },
          'image/webp',
          0.9,
        )
      })
      img.onerror = () => reject(new Error('Không thể đọc ảnh'))
      img.src = e.target.result
    })
    reader.onerror = () => reject(new Error('Không thể đọc file'))
    reader.readAsDataURL(file)
  })
}

export const usePrizeStore = defineStore('prize', {
  state: () => ({
    // Số lượng giải thưởng cho mỗi bậc (theo thứ tự PRIZE_TIERS)
    quantities: [5, 4, 3, 2, 1, 1],

    // Texture URL custom do user upload (null = dùng mặc định)
    // Index tương ứng PRIZE_TIERS
    customTextures: [null, null, null, null, null, null],
  }),

  getters: {
    /**
     * Trả về mảng đầy đủ thông tin từng bậc, bao gồm quantity + texture hiện hành.
     */
    tiers (state) {
      return PRIZE_TIERS.map((tier, i) => ({
        ...tier,
        quantity: state.quantities[i],
        texture: state.customTextures[i] || tier.defaultTexture,
        hasCustomTexture: !!state.customTextures[i],
      }))
    },

    /**
     * Tổng số package từ tất cả các bậc.
     */
    totalPackCount (state) {
      return state.quantities.reduce((sum, q) => sum + q, 0)
    },
  },

  actions: {
    /**
     * Tăng số lượng của bậc index lên 1.
     */
    increment (index) {
      if (index >= 0 && index < 6) {
        this.quantities[index]++
      }
    },

    /**
     * Giảm số lượng của bậc index xuống 1, tối thiểu 0.
     */
    decrement (index) {
      if (index >= 0 && index < 6 && this.quantities[index] > 0) {
        this.quantities[index]--
      }
    },

    /**
     * Đặt số lượng cho bậc index.
     */
    setQuantity (index, value) {
      if (index >= 0 && index < 6) {
        this.quantities[index] = Math.max(0, value)
      }
    },

    /**
     * Upload ảnh custom cho bậc index.
     * Nhận File object, tự động convert sang WebP nếu cần.
     */
    async uploadTexture (index, file) {
      if (index < 0 || index >= 6) {
        return
      }

      // Revoke URL cũ nếu có để tránh rò rỉ bộ nhớ
      if (this.customTextures[index]) {
        URL.revokeObjectURL(this.customTextures[index])
      }

      try {
        const webpUrl = await convertToWebP(file)
        this.customTextures[index] = webpUrl
      } catch (error) {
        console.error('Upload texture thất bại:', error)
        throw error
      }
    },

    /**
     * Xoá texture custom, quay lại dùng texture mặc định.
     */
    removeCustomTexture (index) {
      if (index >= 0 && index < 6 && this.customTextures[index]) {
        URL.revokeObjectURL(this.customTextures[index])
        this.customTextures[index] = null
      }
    },

    /**
     * Reset mọi thứ về mặc định.
     */
    resetAll () {
      // Revoke tất cả blob URL trước khi reset
      for (let i = 0; i < 6; i++) {
        if (this.customTextures[i]) {
          URL.revokeObjectURL(this.customTextures[i])
        }
      }
      this.$reset()
    },
  },
})
