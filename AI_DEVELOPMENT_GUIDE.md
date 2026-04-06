# KẾT CẤU & CHỨC NĂNG SOURCE CODE (HARDCORE TECHNICAL DOCS)

Tài liệu này là "bản đồ code" chi tiết để AI không cần đọc lại source khi nhận prompt mới. 

## 1. QUẢN LÝ TRẠNG THÁI (PINIA STORES)

Hệ thống lưu trạng thái ở `src/stores/*`. Không dùng props/emit để truyền state ở cấp độ lớn.

### 1.1 `prizeStore.js` (Quản lý Phần Thưởng - QUAN TRỌNG NHẤT)
- **State**:
  - `quantities`: Array[6], lưu số lượng giải thưởng cho 6 bậc cố định (Mặc định: `[5, 4, 3, 2, 1, 1]`).
  - `customTextures`: Array[6], chứa Blob URLs của ảnh WebP do user upload (Mặc định: `[null, null, ...]` => dùng ảnh mặc định).
- **Constant**: `PRIZE_TIERS` (6 bậc: Normal, Rare, Super Rare, Super Super Rare, Ultra Rare, Extra Rare; có màu và vi/en label).
- **Getters**:
  - `tiers`: Trộn `PRIZE_TIERS` với `quantities` và `customTextures` để render UI.
  - `totalPackCount`: Tổng số giải thưởng đang có.
- **Actions đáng chú ý**:
  - `uploadTexture(index, file)`: Nhận `File` -> Dùng `<canvas>` render thành Blob WebP (để Tối ưu bộ nhớ WebGL) -> Cập nhật `customTextures`. Tự gọi `URL.revokeObjectURL` để dọn rác.
  - `increment/decrement/setQuantity(index, val)`.
  - `removeCustomTexture(index)` / `resetAll()`.

### 1.2 `settingsStore.js` (Cài đặt Hệ Thống & 3D)
- **Cấu hình 3D (Sync sang GSAP/Three)**:
  - Vòng quay: `radius=4`, `dragSensitivity=0.006`.
  - Hộp quà: `packW=1.4`, `packH=2`, `packD=0.06`, `packY=0.2`.
  - Hoạt ảnh lượn lờ: `bobAmplitude=0.03`, `bobSpeed=3`.
  - Camera: `camX, camY, camZ=10, lookY=0.3`.
- **Cấu hình UI**: `language='vi'|'en'`, `menuDarkMode`, `sceneDarkMode`, `quality='ultra'|'high'...`.
- Có lưu/load biến `quality` vào `localStorage`.

### 1.3 `rateSetting.js` & `app.js`
- `app.js`: Đang rỗng hoặc giữ base state.
- `rateSetting.js`: Store cũ/song song chứa `prizePool` (danh sách quà dạng object rời rạc) và `mode="random"`. (Lưu ý: Logic hiện tại trên UI Drawer đang bind cứng vào `prizeStore.js`, `rateSetting.js` có thể là tính năng chờ phát triển thêm).

---

## 2. CẤU TRÚC COMPONENTS CHÍNH

### 2.1 `src/components/MainScene.vue` (Lõi 3D)
- **Chức năng**: Khởi tạo `<canvas ref="canvasRef">` và đóng vai trò điểm gắn kết của Three.js.
- **Kiến trúc**: Dùng **Composables pattern** để chia nhỏ logic WebGL khổng lồ thành các functions:
  - `useMainSceneContext()`: Chứa chung các refs/states (`selectedPack`, `config`) cho 3D.
  - `useWebGL()`: Xây `Scene`, `Camera`, `Renderer`, Resize watcher.
  - `useCarousel()`: Tính toán vị trí vòng tròn các Pack, Render mesh `THREE.Mesh`, áp dụng material (Textures lấy từ Store).
  - `useInteraction()`: Drag/Swipe trên canvas (Mouse event & Touch), xoay vòng quay.
  - `usePackageSelection()` & `usePackageOpening()`: Logic click mở gói quà, zoom camera, trigger GSAP.

### 2.2 `src/components/SettingsDrawer.vue` (UI Điều Khiển)
- **Bản chất**: KHÔNG PHẢI komponent của Vuetify (`v-navigation-drawer`), đây là một Drawer được custom hoàn toàn bằng HTML/CSS và dùng `GSAP` để làm animation thò thụt (`gsap.to(drawerRef, {x: -320})`).
- **Data Binding**:
  - Đang bind 6 vòng lặp cấp số lượng qua `prizeStore.tiers`.
  - Các input `<input type="file">` bọc bởi nhãn tùy chỉnh gọi thẳng vào `prizeStore.uploadTexture()`.
  - Khi thay đổi `Chất lượng đồ họa (Quality)`, component sẽ gọi `window.location.reload()` để Three.js xả toàn bộ VRAM và build shader mới (tiêu chuẩn bắt buộc).
- **CSS**: Scoped CSS nguyên thủy, không dùng Tailwind classes ở file này. Hệ thống biến màu `#dc143c` (Crimson) đặc trưng.

### 2.3 Quanh `App.vue`
- Cấu hình lock xoay ngang (`navigator.orientation.lock`) để ép UX chơi trên điện thoại dạng dọc (Portrait).

---

## 3. FLOW CHẠY DỮ LIỆU ĐỂ PROMPT MỚI
Nếu bạn (AI) cần tạo lệnh, hãy tư duy theo luồng sau:
1. **Lưu trữ dữ liệu vòng quay**: Bắt buộc tạo state mới trong `prizeStore.js` hoặc `settingsStore.js` (không tạo biến `ref` lẻ tẻ trong Component nếu nó là config).
2. **Cập nhật UI**: Chỉnh HTML/CSS ở `SettingsDrawer.vue`. Chú ý dùng CSS native tương thích với cấu trúc hiện tại (class `.sec-label`, `.tier-card`). Nếu hiệu ứng xuất hiện / thụt vào, phải nhúng thông qua timeline của `gsap` hiện có ở hàm `toggleDrawer`.
3. **Cập nhật 3D**:
   - Thay đổi các biến base ở `settingsStore.js`.
   - Nếu phải thay shader/material hay cơ chế sinh ngẫu nhiên, sờ vào các file trong `src/components/composables/`. Tuyệt đối dọn sạch rác bằng `mesh.geometry.dispose()` & `mesh.material.dispose()` vào các lifecycle.
