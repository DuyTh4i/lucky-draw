import { defineStore } from 'pinia'
import { usePrizeStore } from './prizeStore'

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

    // UI preferences
    language: 'en', // 'vi' | 'en'
    menuDarkMode: true,
    sceneDarkMode: false,
  }),

  getters: {
    packCount () {
      // Tổng số package = tổng quantity từ prizeStore
      const prizeStore = usePrizeStore()
      const total = prizeStore.totalPackCount
      // Giới hạn trần an toàn 25 package, tối thiểu 1
      return Math.max(1, Math.min(total, 25))
    },
    totalPrizePackCount () {
      const prizeStore = usePrizeStore()
      return prizeStore.totalPackCount
    },
  },

  actions: {
    setQuality (val) {
      this.quality = val
      localStorage.setItem('lucky-quality', val)
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
      const prizeStore = usePrizeStore()
      prizeStore.resetAll()
      this.$reset()
    },
  },
})
