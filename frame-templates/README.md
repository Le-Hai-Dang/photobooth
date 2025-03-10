# Khung ảnh dễ thương cho Photo Booth

Bộ khung ảnh dễ thương lấy cảm hứng từ những khung ảnh trong tiệm chụp ảnh, với các trang trí nhẹ nhàng như thỏ, hoa và ruy băng màu hồng.

## Các kiểu khung ảnh

1. **Dải dọc 4 ảnh** (vertical-strip) - Kiểu khung dọc chứa 4 ảnh, phù hợp để chụp nhiều biểu cảm khác nhau.
2. **Lưới 2x2** (grid-2x2) - Kiểu khung lưới 2x2 cho 4 ảnh, phù hợp với nhóm bạn và nhiều tư thế chụp.
3. **Ngang đôi** (horizontal-double) - Kiểu khung ngang với 2 ảnh, phù hợp để chụp trước/sau hoặc 2 người.
4. **Đơn** (single) - Khung ảnh đơn, phù hợp để chụp chân dung hoặc ảnh cá nhân đặc biệt.

## Cấu trúc thư mục

```
frame-templates/
  ├── assets/                # Chứa các tài nguyên hình ảnh SVG
  │   ├── bunny.svg         # Hình trang trí thỏ
  │   ├── flower.svg        # Hình trang trí hoa
  │   ├── lace-border.svg   # Họa tiết viền ren
  │   ├── logo.svg          # Logo "Photo Time"
  │   └── ribbon.svg        # Ruy băng trang trí
  ├── cute-frames.css       # CSS định nghĩa kiểu dáng khung ảnh
  ├── cute-frames.js        # JavaScript để tạo và render khung ảnh
  ├── preview-*.html        # HTML template để xem trước các kiểu khung
  ├── preview-generator.html # Công cụ để tạo hình xem trước
  └── README.md             # File này
```

## Cách sử dụng

Khung ảnh dễ thương được tích hợp sẵn vào ứng dụng Photo Booth. Khi chỉnh sửa ảnh, bạn có thể chọn giữa khung ảnh mặc định và khung ảnh dễ thương trong phần "Khung ảnh dễ thương".

### Cách tạo khung ảnh mới

Nếu bạn muốn tạo thêm khung ảnh với kiểu dáng mới:

1. Tạo các tập tin SVG mới trong thư mục `assets/`
2. Cập nhật `cute-frames.css` với kiểu dáng mới
3. Thêm thông tin khung ảnh mới vào mảng `FRAME_INFO` trong file `cute-frames.js`
4. Tạo hình preview cho kiểu khung mới bằng cách mở file `preview-generator.html` trong trình duyệt

## Tùy chỉnh khung ảnh

Bạn có thể tùy chỉnh khung ảnh bằng cách:

1. Sửa đổi màu sắc trong file CSS bằng cách thay đổi các biến màu trong phần `:root`
2. Thay đổi hình trang trí bằng cách thay thế các file SVG trong thư mục `assets/`
3. Thêm các hiệu ứng mới như bóng đổ, gradient, v.v. trong file CSS

## Nguồn cảm hứng

Khung ảnh này lấy cảm hứng từ bức ảnh mà bạn đã cung cấp, với các phong cách khung ảnh từ tiệm chụp ảnh thực tế tại Việt Nam, màu sắc pastel và trang trí dễ thương như thỏ và hoa.
