# Báo cáo kiểm thử thực tế

Ngày kiểm tra: 27/10/2026. Môi trường: Windows, Python 3.12.14, Node.js runtime đi kèm workspace, SQLite; Chromium do Playwright cài. Không sử dụng dữ liệu khách thật.

## Backend

Lệnh thực tế: Python workspace chạy `-X utf8 -m pytest -xq` từ backend, với thư viện cài trong thư mục làm việc riêng. Kết quả: **25 passed, 1 warning trong 19.04 giây**. Warning là deprecation của Starlette TestClient khi dùng httpx; không phải lỗi assertion.

Các nhóm đã kiểm tra: đăng nhập và tài khoản khóa; vai trò và quản lý cuối cùng; xác thực thông tin khách; trùng khoảng thời gian và tiếp giáp; hủy lịch; nhiều dịch vụ; rollback đổi lịch; đặt trùng đồng thời bằng kết nối riêng; giới hạn hồ sơ KTV; hoàn thành và tiến độ liệu trình; dành/giải phóng/trừ gói đúng một lần; gói sai chủ hoặc hết hạn; tiền tính Backend; số lượng/giảm giá không hợp lệ; thanh toán lặp và đồng thời; rollback thiếu tồn kho; không thu hai lần dịch vụ; thống kê hóa đơn đã thanh toán; AI mock, schema, allowlist, giới hạn lượt và lỗi cấu hình AI không ảnh hưởng CRUD.

## Frontend

`tsc -b`: đạt. `vite build`: đạt. Có cảnh báo bundle trên 500 kB, phù hợp bản demo nhỏ; có thể tách tải biểu đồ nếu tiếp tục tối ưu.

Playwright chạy trên ứng dụng build được FastAPI phục vụ ở localhost:8000. Bốn ca ban đầu đạt, thời gian 11.5 giây:
1. Dashboard và chuyển qua các danh mục không có lỗi JavaScript.
2. Tạo khách → gợi ý mock → đặt lịch → hoàn thành → lập và thanh toán hóa đơn qua UI.
3. Menu của lễ tân và kỹ thuật viên đúng vai trò.
4. Bố cục 390 px không tràn chiều ngang.

Ảnh desktop/mobile thực tế được lưu trong docs/images và đã xem trực quan. Các ca UI thêm dữ liệu mẫu có tên “Khách UI …”, không xóa dữ liệu cũ.

## Lỗi phát hiện và khắc phục

- Dữ liệu danh mục cũ bị dùng tạm khi chuyển loại danh mục, gây render sai: remount Catalog theo key màn hình.
- Nhãn bọc cả select khiến tên truy cập chứa nội dung option: chuyển Field sang label có htmlFor/id riêng.
- Chart animation chụp giữa quá trình: tắt animation cho biểu đồ doanh thu để hình ảnh và dữ liệu ổn định.
- Test DB có vòng FK: chỉ tắt FK trong giai đoạn reset database test; bật lại cho mọi kiểm tra nghiệp vụ.

## Chưa xác minh

Chưa gọi Gemini thật vì không có API key người dùng; chưa đánh giá chất lượng phản hồi mô hình thật, tải lớn, nhiều máy người dùng, bảo mật production, SMS/email/cổng thanh toán. Mock và test cấu trúc không thay thế đánh giá mô hình thật. Chưa chạy lại hướng dẫn cài đặt trên một máy Windows sạch ngoài môi trường workspace này.
