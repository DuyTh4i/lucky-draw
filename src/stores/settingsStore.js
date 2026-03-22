import { defineStore } from 'pinia'

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    // Đồ hoạ: lưu mốc chất lượng vào ổ cứng trình duyệt để không mất khi tải lại trang
    quality: localStorage.getItem('lucky-quality') || 'ultra',

    // Carousel
    radius: 4,
    dragSensitivity: 0.006,

    // Pack appearance
    packW: 1.4,
    packH: 2,
    packD: 0.06,
    packY: 0.2,

    // Animation
    bobAmplitude: 0.03,
    bobSpeed: 3,

    // Camera
    camX: 0,
    camY: 0,
    camZ: 10,
    lookY: 0.3,

    // Pack data

    // Prize tiers
    prizeTiers: [
      { name: 'Giải Nhất', nameEn: '1st Prize', packCount: 5 },
      { name: 'Giải Nhì', nameEn: '2nd Prize', packCount: 5 },
      { name: 'Giải Ba', nameEn: '3rd Prize', packCount: 5 },
    ],

    // UI preferences
    language: 'vi', // 'vi' | 'en'
    menuDarkMode: true,
    sceneDarkMode: false,
  }),

  getters: {
    packCount (state) {
      // Tự động tính tổng số thẻ của các giải
      const total = state.prizeTiers.reduce((sum, t) => sum + t.packCount, 0)
      // Tăng mức giới hạn trần an toàn lên 25 package theo yêu cầu
      return Math.max(1, Math.min(total, 25))
    },
    totalPrizePackCount (state) {
      return state.prizeTiers.reduce((sum, t) => sum + t.packCount, 0)
    },
  },

  actions: {
    setQuality (val) {
      this.quality = val
      localStorage.setItem('lucky-quality', val)
    },

    // Đã gỡ setPackCount vì sử dụng Getters tự động

    // Prize tier actions
    addPrizeTier () {
      const idx = this.prizeTiers.length + 1
      this.prizeTiers.push({ name: `Giải ${idx}`, packCount: 1 })
    },

    removePrizeTier (index) {
      if (this.prizeTiers.length > 1) {
        this.prizeTiers.splice(index, 1)
      }
    },

    updateTierName (index, name) {
      if (index >= 0 && index < this.prizeTiers.length) {
        this.prizeTiers[index].name = name
      }
    },

    updateTierPackCount (index, count) {
      if (index >= 0 && index < this.prizeTiers.length) {
        this.prizeTiers[index].packCount = Math.max(1, count)
      }
    },

    toggleLanguage () {
      this.language = this.language === 'vi' ? 'en' : 'vi'
    },

    toggleMenuDarkMode () {
      this.menuDarkMode = !this.menuDarkMode
    },

    toggleSceneDarkMode () {
      this.sceneDarkMode = !this.sceneDarkMode
    },

    resetSettings () {
      this.$reset()
    },
  },
})
