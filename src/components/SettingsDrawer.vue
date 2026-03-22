<template>
  <div>
    <!-- Minimal Toggle -->
    <button
      class="toggle-btn"
      :class="{ light: settings.sceneDarkMode }"
      @click="toggleDrawer"
    >
      <svg
        fill="none"
        height="16"
        stroke="currentColor"
        stroke-width="2"
        viewBox="0 0 24 24"
        width="16"
      >
        <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
      </svg>
    </button>

    <!-- Overlay -->
    <div
      v-if="open"
      ref="overlayRef"
      class="overlay"
      @click="toggleDrawer"
    />

    <aside
      v-if="open"
      ref="drawerRef"
      class="drawer"
      :class="{ light: !settings.menuDarkMode }"
    >
      <div class="accent-top" />

      <header class="drawer-hdr">
        <div>
          <div class="hdr-title">{{ t.title }}</div>
          <div class="hdr-sub">// system.config</div>
        </div>
        <button class="close-x" @click="toggleDrawer">✕</button>
      </header>

      <div class="drawer-scroll">
        <!-- Toggles Row -->
        <div class="toggles-row">
          <button class="toggle-pill" @click="onToggleMenuDarkMode">
            <svg
              v-if="settings.menuDarkMode"
              fill="none"
              height="14"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              viewBox="0 0 24 24"
              width="14"
            >
              <circle cx="12" cy="12" r="5" />
              <path d="M12 1v2m0 18v2M4.2 4.2l1.4 1.4m12.8 12.8l1.4 1.4M1 12h2m18 0h2M4.2 19.8l1.4-1.4m12.8-12.8l1.4-1.4" />
            </svg>
            <svg
              v-else
              fill="none"
              height="14"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              viewBox="0 0 24 24"
              width="14"
            >
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
            {{ t.menu }}
          </button>
          <button class="toggle-pill" @click="onToggleSceneDarkMode">
            <svg
              v-if="settings.sceneDarkMode"
              fill="none"
              height="14"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              viewBox="0 0 24 24"
              width="14"
            >
              <circle cx="12" cy="12" r="5" />
              <path d="M12 1v2m0 18v2M4.2 4.2l1.4 1.4m12.8 12.8l1.4 1.4M1 12h2m18 0h2M4.2 19.8l1.4-1.4m12.8-12.8l1.4-1.4" />
            </svg>
            <svg
              v-else
              fill="none"
              height="14"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              viewBox="0 0 24 24"
              width="14"
            >
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
            {{ t.scene }}
          </button>
          <button class="toggle-pill lang-pill" @click="settings.toggleLanguage()">
            {{ settings.language === 'vi' ? 'EN' : 'VI' }}
          </button>
        </div>

        <!-- Đã gỡ thanh chỉnh Pack Count theo yêu cầu -->

        <!-- Graphics Quality -->
        <section class="sec" style="position: relative; z-index: 10;">
          <div class="sec-label-row">
            <span class="sec-label">{{ t.graphicsQuality }}</span>
            <div class="custom-select" @click="toggleQualityDropdown">
              <div class="select-selected">
                <span v-if="settings.quality === 'low'">{{ t.low }}</span>
                <span v-else-if="settings.quality === 'medium'">{{ t.medium }}</span>
                <span v-else-if="settings.quality === 'high'">{{ t.high }}</span>
                <span v-else-if="settings.quality === 'ultra'">{{ t.ultra }}</span>
                <span v-else>{{ settings.quality }}</span>
                <svg
                  fill="none"
                  style="transition: transform 0.2s; pointer-events: none;"
                  :style="{ transform: isQualityDropdownOpen ? 'rotate(180deg)' : 'none' }"
                  viewBox="0 0 10 6"
                  width="10"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M1 1L5 5L9 1"
                    stroke="#dc143c"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="1.5"
                  />
                </svg>
              </div>
              <div v-show="isQualityDropdownOpen" class="select-items">
                <div :class="{ active: settings.quality === 'low' }" @click.stop="selectQuality('low')">{{ t.low }}</div>
                <div :class="{ active: settings.quality === 'medium' }" @click.stop="selectQuality('medium')">{{ t.medium }}</div>
                <div :class="{ active: settings.quality === 'high' }" @click.stop="selectQuality('high')">{{ t.high }}</div>
                <div :class="{ active: settings.quality === 'ultra' }" @click.stop="selectQuality('ultra')">{{ t.ultra }}</div>
              </div>
            </div>
          </div>
        </section>

        <!-- Divider -->
        <div class="divider" />

        <!-- Prize Tiers -->
        <section class="sec">
          <div class="sec-label-row">
            <span class="sec-label">{{ t.prizeTiers }}</span>
            <button class="btn-add" @click="onAddTier">+ {{ t.add }}</button>
          </div>

          <div class="tier-list">
            <div
              v-for="(tier, i) in settings.prizeTiers"
              :key="i"
              class="tier-row"
            >
              <span class="tier-badge">{{ i + 1 }}</span>
              <input
                class="tier-name-input"
                :value="tier.name"
                @input="settings.updateTierName(i, $event.target.value)"
              >
              <div class="tier-count">
                <button
                  class="btn-tiny"
                  :disabled="tier.packCount <= 1"
                  @click="onUpdateTierCount(i, tier.packCount - 1)"
                >
                  −
                </button>
                <span class="tier-count-num">{{ tier.packCount }}</span>
                <button
                  class="btn-tiny"
                  @click="onUpdateTierCount(i, tier.packCount + 1)"
                >
                  +
                </button>
              </div>
              <button
                class="btn-remove"
                :disabled="settings.prizeTiers.length <= 1"
                @click="onRemoveTier(i)"
              >
                ✕
              </button>
            </div>
          </div>
          <div class="tier-summary">
            {{ t.total }}: {{ settings.totalPrizePackCount }} packages
          </div>
        </section>

        <!-- Divider -->
        <div class="divider" />

        <!-- Reset -->
        <button class="btn-reset" @click="resetAll">↺ {{ t.reset }}</button>

        <!-- Coming Soon -->
        <section class="sec future">
          <div class="sec-label">{{ t.upcoming }}</div>
          <p>› {{ t.upAuth }}</p>
          <p>› {{ t.upTextures }}</p>
        </section>
      </div>
    </aside>
  </div>
</template>

<script setup>
  import gsap from 'gsap'
  import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
  import { useSettingsStore } from '@/stores/settingsStore'

  const translations = {
    vi: {
      title: 'CÀI ĐẶT',
      graphicsQuality: 'CHẤT_LƯỢNG_ĐỒ_HỌA',
      low: 'Thấp',
      medium: 'Vừa',
      high: 'Cao',
      ultra: 'Siêu Cấp',
      prizeTiers: 'BẬC_GIẢI_THƯỞNG',
      add: 'Thêm',
      total: 'Tổng',
      reset: 'ĐẶT LẠI',
      dark: 'Tối',
      light: 'Sáng',
      menu: 'Menu',
      scene: 'Nền',
      upcoming: 'SẮP_RA_MẮT',
      upAuth: 'Đăng nhập & Đồng bộ',
      upTextures: 'Tải lên hình ảnh gói',
    },
    en: {
      title: 'SETTINGS',
      graphicsQuality: 'GRAPHICS_QUALITY',
      low: 'Low',
      medium: 'Med',
      high: 'High',
      ultra: 'Ultra',
      prizeTiers: 'PRIZE_TIERS',
      add: 'Add',
      total: 'Total',
      reset: 'RESET',
      dark: 'Dark',
      light: 'Light',
      menu: 'Menu',
      scene: 'Scene',
      upcoming: 'UPCOMING',
      upAuth: 'User Auth & Cloud Sync',
      upTextures: 'Custom Textures Upload',
    },
  }

  const settings = useSettingsStore()
  const open = ref(false)
  const isQualityDropdownOpen = ref(false)

  const overlayRef = ref(null)
  const drawerRef = ref(null)

  onMounted(() => {
    document.addEventListener('click', closeQualityDropdown)
  })

  onUnmounted(() => {
    document.removeEventListener('click', closeQualityDropdown)
  })

  function closeQualityDropdown () {
    isQualityDropdownOpen.value = false
  }

  function toggleQualityDropdown (event) {
    event.stopPropagation()
    isQualityDropdownOpen.value = !isQualityDropdownOpen.value
  }

  const t = computed(() => translations[settings.language] || translations.vi)

  const emit = defineEmits(['settings-changed'])

  async function toggleDrawer () {
    if (open.value) {
      gsap.to(overlayRef.value, { opacity: 0, duration: 0.2, ease: 'power2.in' })
      gsap.to(drawerRef.value, {
        x: -320,
        duration: 0.3,
        ease: 'power3.in',
        onComplete: () => {
          open.value = false
        },
      })
    } else {
      open.value = true
      await nextTick()
      gsap.fromTo(overlayRef.value, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'power2.out' })
      gsap.fromTo(drawerRef.value, { x: -320 }, { x: 0, duration: 0.4, ease: 'power3.out' })
      const items = drawerRef.value.querySelectorAll('.sec, .divider, .btn-reset, .toggles-row')
      gsap.fromTo(items, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.3, stagger: 0.04, ease: 'power2.out', delay: 0.12 })
    }
  }

  function onAddTier () {
    settings.addPrizeTier()
    emit('settings-changed')
  }

  function onUpdateTierCount (index, count) {
    if (count < 1) return
    settings.updateTierPackCount(index, count)
    emit('settings-changed')
  }

  function onRemoveTier (index) {
    settings.removePrizeTier(index)
    emit('settings-changed')
  }

  function changeQuality (val) {
    if (settings.quality === val) return
    settings.setQuality(val)
    // Đồ hoạ 3D cần nạp lại tài nguyên vật lý, memory và shader nên việc reload là tiêu chuẩn
    window.location.reload()
  }

  function selectQuality (val) {
    isQualityDropdownOpen.value = false
    changeQuality(val)
  }

  function onToggleMenuDarkMode () {
    settings.toggleMenuDarkMode()
    emit('settings-changed')
  }

  function onToggleSceneDarkMode () {
    settings.toggleSceneDarkMode()
    emit('settings-changed')
  }

  function resetAll () {
    settings.resetSettings()
    emit('settings-changed')
  }
</script>

<style scoped>
.toggle-btn {
  position: fixed;
  top: 14px;
  left: 14px;
  z-index: 1100;
  width: 32px;
  height: 32px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  background: rgba(30, 30, 30, 0.85);
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(8px);
  transition: all 0.25s;
}
.toggle-btn:hover {
  border-color: rgba(255, 255, 255, 0.35);
  color: rgba(255, 255, 255, 0.85);
  box-shadow: 0 0 10px rgba(255, 255, 255, 0.08);
}
.toggle-btn:hover svg {
  transform: rotate(90deg);
  transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}

.overlay {
  position: fixed;
  inset: 0;
  z-index: 1200;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(2px);
}

.drawer {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 1300;
  width: 310px;
  max-width: 88vw;
  height: 100vh;
  background: #111;
  color: #eee;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-right: 1px solid rgba(220, 20, 60, 0.2);
  font-family: 'Montserrat', monospace;
  font-size: 0.8rem;
}

.accent-top {
  height: 2px;
  flex-shrink: 0;
  background: linear-gradient(90deg, #dc143c, #ff4466, #dc143c);
}

.drawer-hdr {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 14px 12px;
  border-bottom: 1px solid #222;
}
.hdr-title {
  font-size: 0.95rem;
  font-weight: bold;
  letter-spacing: 3px;
  color: #dc143c;
}
.hdr-sub {
  font-size: 0.55rem;
  color: #555;
  letter-spacing: 1px;
  margin-top: 2px;
}

/* Toggles Row */
.toggles-row {
  display: flex;
  gap: 8px; /* Giảm gap cho màn hình nhỏ */
  margin-bottom: 24px;
}
.toggle-pill {
  flex: 1;
  min-width: 0; /* Cho phép shrink quá nội dung */
  background: #1a1a1a;
  border: 1px solid #333;
  color: #bbb;
  border-radius: 8px;
  padding: 8px 4px;
  font-size: 0.75rem;
  letter-spacing: 0.5px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.2s;
  white-space: nowrap;
}
.toggle-pill:hover {
  border-color: #dc143c;
  color: #fff;
  background: rgba(220, 20, 60, 0.1);
}
.lang-pill {
  flex: 0.8; /* Nút ngôn ngữ nhỏ hơn chút */
}
.close-x {
  background: none;
  border: 1px solid #333;
  border-radius: 4px;
  color: #888;
  cursor: pointer;
  padding: 3px 7px;
  font-size: 0.7rem;
  transition: all 0.2s;
}
.close-x:hover {
  border-color: #dc143c;
  color: #dc143c;
}

.drawer-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 14px;
}
.drawer-scroll::-webkit-scrollbar { width: 3px; }
.drawer-scroll::-webkit-scrollbar-thumb {
  background: #333;
  border-radius: 3px;
}

.sec { margin-bottom: 18px; }
.sec-label {
  font-size: 0.65rem;
  letter-spacing: 2px;
  color: #dc143c;
  margin-bottom: 8px;
  opacity: 0.8;
}

.custom-select {
  position: relative;
  width: 120px;
  font-size: 0.75rem;
  user-select: none;
  z-index: 99;
}
.select-selected {
  background-color: #1a1a1a;
  border: 1px solid #333;
  color: #fff;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.2s;
  text-transform: uppercase;
  font-weight: 500;
  min-height: 28px;
}
.select-selected:hover {
  border-color: #dc143c;
}
.select-items {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background-color: #1a1a1a;
  border: 1px solid #dc143c;
  border-radius: 4px;
  margin-top: 4px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0,0,0,0.5);
  display: flex;
  flex-direction: column;
}
.select-items div {
  color: #ccc;
  padding: 8px 12px;
  cursor: pointer;
  transition: all 0.2s;
  text-transform: uppercase;
}
.select-items div:hover {
  background-color: #dc143c;
  color: #fff;
}
.select-items div.active {
  color: #dc143c;
  font-weight: bold;
  background-color: rgba(220, 20, 60, 0.1);
}

.count-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
}
.count-center {
  display: flex;
  align-items: baseline;
  gap: 4px;
  min-width: 60px;
  justify-content: center;
}
.count-num {
  font-size: 1.6rem;
  font-weight: bold;
  color: #fff;
}
.count-of {
  font-size: 0.6rem;
  color: #555;
}

.btn-sq {
  width: 32px;
  height: 32px;
  border: 1px solid #333;
  border-radius: 4px;
  background: #1a1a1a;
  color: #ccc;
  cursor: pointer;
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.btn-sq:hover:not(:disabled) {
  border-color: #dc143c;
  color: #fff;
}
.btn-sq:disabled {
  opacity: 0.25;
  cursor: not-allowed;
}

.divider {
  height: 1px;
  background: #222;
  margin: 14px 0;
}

.btn-reset {
  width: 100%;
  padding: 9px;
  border: 1px solid #333;
  border-radius: 4px;
  background: #1a1a1a;
  color: #dc143c;
  cursor: pointer;
  font-family: inherit;
  font-size: 0.7rem;
  letter-spacing: 2px;
  transition: all 0.2s;
  margin-bottom: 18px;
}
.btn-reset:hover {
  border-color: #dc143c;
  background: rgba(220, 20, 60, 0.08);
}

/* Loại bỏ CSS của pack-list cũ */

/* ═══ PRIZE TIERS ═══ */
.sec-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.btn-add {
  background: none;
  border: 1px solid #333;
  border-radius: 3px;
  color: #aaa;
  cursor: pointer;
  padding: 2px 8px;
  font-family: inherit;
  font-size: 0.6rem;
  letter-spacing: 1px;
  transition: all 0.2s;
}
.btn-add:hover {
  border-color: #dc143c;
  color: #dc143c;
}

.tier-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.tier-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 6px;
  border: 1px solid #1e1e1e;
  border-radius: 3px;
  background: #161616;
}
.tier-badge {
  width: 20px;
  height: 20px;
  border-radius: 3px;
  background: rgba(220, 20, 60, 0.15);
  color: #dc143c;
  font-size: 0.65rem;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.tier-name-input {
  flex: 1;
  background: none;
  border: none;
  border-bottom: 1px solid #2a2a2a;
  color: #ddd;
  font-family: inherit;
  font-size: 0.72rem;
  padding: 2px 4px;
  outline: none;
  transition: border-color 0.2s;
  min-width: 0;
}
.tier-name-input:focus {
  border-color: #dc143c;
}

.tier-count {
  display: flex;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;
}
.tier-count-num {
  font-size: 0.75rem;
  color: #fff;
  min-width: 18px;
  text-align: center;
}
.btn-tiny {
  width: 18px;
  height: 18px;
  border: 1px solid #333;
  border-radius: 2px;
  background: #1a1a1a;
  color: #999;
  cursor: pointer;
  font-size: 0.7rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  padding: 0;
}
.btn-tiny:hover:not(:disabled) {
  border-color: #dc143c;
  color: #fff;
}
.btn-tiny:disabled {
  opacity: 0.25;
  cursor: not-allowed;
}

.btn-remove {
  background: none;
  border: none;
  color: #444;
  cursor: pointer;
  font-size: 0.55rem;
  padding: 2px 3px;
  transition: color 0.15s;
}
.btn-remove:hover:not(:disabled) {
  color: #dc143c;
}
.btn-remove:disabled {
  opacity: 0.2;
  cursor: not-allowed;
}

.tier-summary {
  margin-top: 6px;
  font-size: 0.6rem;
  color: #666;
  text-align: right;
  letter-spacing: 1px;
}

.future { opacity: 0.4; }
.future p {
  margin: 0 0 3px;
  font-size: 0.65rem;
  color: #777;
}

/* ═══ LIGHT THEME ═══ */
.toggle-btn.light {
  background: rgba(255, 255, 255, 0.85);
  border-color: rgba(0, 0, 0, 0.12);
  color: rgba(0, 0, 0, 0.45);
}
.toggle-btn.light:hover {
  border-color: #dc143c;
  color: #dc143c;
  box-shadow: 0 0 10px rgba(220, 20, 60, 0.1);
}

.drawer.light {
  background: #f8f8fa;
  color: #222;
  border-right-color: rgba(220, 20, 60, 0.15);
}
.drawer.light .accent-top {
  opacity: 0.5;
}
.drawer.light .drawer-hdr {
  border-bottom-color: #e0e0e0;
}
.drawer.light .hdr-sub {
  color: #aaa;
}
.drawer.light .close-x {
  border-color: #ddd;
  color: #999;
}
.drawer.light .close-x:hover {
  border-color: #dc143c;
  color: #dc143c;
}
.drawer.light .toggle-pill {
  background: #fff;
  border-color: #ddd;
  color: #555;
}
.drawer.light .toggle-pill:hover {
  border-color: #dc143c;
  color: #dc143c;
}
.drawer.light .sec-label {
  color: #dc143c;
  opacity: 0.7;
}
.drawer.light .count-num {
  color: #111;
}
.drawer.light .count-of {
  color: #aaa;
}
.drawer.light .btn-sq {
  background: #fff;
  border-color: #ddd;
  color: #555;
}
.drawer.light .btn-sq:hover:not(:disabled) {
  border-color: #dc143c;
  color: #dc143c;
}
.drawer.light .pack-row {
  background: #fff;
  border-color: #eee;
}
.drawer.light .pack-row:hover {
  border-color: #ccc;
}
.drawer.light .pack-name {
  color: #333;
}
.drawer.light .pack-id {
  color: #bbb;
}
.drawer.light .divider {
  background: #e0e0e0;
}
.drawer.light .tier-row {
  background: #fff;
  border-color: #eee;
}
.drawer.light .tier-name-input {
  color: #333;
  border-bottom-color: #ddd;
}
.drawer.light .tier-name-input:focus {
  border-color: #dc143c;
}
.drawer.light .tier-count-num {
  color: #111;
}
.drawer.light .btn-tiny {
  background: #fff;
  border-color: #ddd;
  color: #888;
}
.drawer.light .btn-tiny:hover:not(:disabled) {
  border-color: #dc143c;
  color: #dc143c;
}
.drawer.light .btn-remove {
  color: #ccc;
}
.drawer.light .btn-remove:hover:not(:disabled) {
  color: #dc143c;
}
.drawer.light .tier-summary {
  color: #999;
}
.drawer.light .btn-reset {
  background: #fff;
  border-color: #ddd;
}
.drawer.light .btn-reset:hover {
  border-color: #dc143c;
  background: rgba(220, 20, 60, 0.04);
}
.drawer.light .btn-add {
  border-color: #ddd;
  color: #888;
}
.drawer.light .btn-add:hover {
  border-color: #dc143c;
  color: #dc143c;
}
.drawer.light .future p {
  color: #aaa;
}
.drawer.light .drawer-scroll::-webkit-scrollbar-thumb {
  background: #ddd;
}
.drawer.light .select-selected {
  background: #fff;
  border-color: #ddd;
  color: #333;
}
.drawer.light .select-items {
  background: #fff;
  border-color: #dc143c;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}
.drawer.light .select-items div {
  color: #666;
}
.drawer.light .select-items div:hover {
  background: #dc143c;
  color: #fff;
}
.drawer.light .select-items div.active {
  background: rgba(220, 20, 60, 0.05);
  color: #dc143c;
}
</style>
