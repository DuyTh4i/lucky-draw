import { defineStore } from 'pinia'

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    // Carousel
    packCount: 5,
    radius: 4,
    dragSensitivity: 0.006,

    // Pack appearance
    packW: 1.4,
    packH: 2,
    packD: 0.06,
    packY: 0.2,
    selectedLift: 0.1,

    // Animation
    bobAmplitude: 0.03,
    bobSpeed: 3,

    // Camera
    camX: 0,
    camY: 0,
    camZ: 10,
    lookY: 0.3,

    // Pack data
    packs: [
      { name: 'Mewtwo Pack', color: '#8b2be2', texture: null },
      { name: 'Charizard Pack', color: '#1a6ee8', texture: null },
      { name: 'Pikachu Pack', color: '#e8281a', texture: null },
      { name: 'Gengar Pack', color: '#18b85a', texture: null },
      { name: 'Lugia Pack', color: '#e8a018', texture: null },
      { name: 'Dragonite Pack', color: '#ff4488', texture: null },
      { name: 'Rayquaza Pack', color: '#44ffaa', texture: null },
      { name: 'Arceus Pack', color: '#ff8800', texture: null },
      { name: 'Giratina Pack', color: '#0088ff', texture: null },
      { name: 'Dialga Pack', color: '#aa44ff', texture: null },
    ],

    // Prize tiers
    prizeTiers: [
      { name: 'Giải Nhất', nameEn: '1st Prize', packCount: 1 },
      { name: 'Giải Nhì', nameEn: '2nd Prize', packCount: 2 },
      { name: 'Giải Ba', nameEn: '3rd Prize', packCount: 3 },
    ],

    // UI preferences
    language: 'vi', // 'vi' | 'en'
    menuDarkMode: true,
    sceneDarkMode: false,
  }),

  getters: {
    activePacks (state) {
      return state.packs.slice(0, state.packCount)
    },
    totalPrizePackCount (state) {
      return state.prizeTiers.reduce((sum, t) => sum + t.packCount, 0)
    },
  },

  actions: {
    setPackCount (count) {
      this.packCount = Math.max(2, Math.min(count, this.packs.length))
    },

    updatePack (index, data) {
      if (index >= 0 && index < this.packs.length) {
        this.packs[index] = { ...this.packs[index], ...data }
      }
    },

    addPack (pack) {
      this.packs.push({
        name: pack.name || `Pack ${this.packs.length + 1}`,
        color: pack.color || '#8b2be2',
        texture: pack.texture || null,
      })
    },

    removePack (index) {
      if (this.packs.length > 2) {
        this.packs.splice(index, 1)
        if (this.packCount > this.packs.length) {
          this.packCount = this.packs.length
        }
      }
    },

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
