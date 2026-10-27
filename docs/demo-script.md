# Kịch bản demo 10 đến 15 phút

Chuẩn bị: migration, seed, AI_PROVIDER=mock, Backend và frontend chạy. Tất cả thao tác với dữ liệu hư cấu.

1. Đăng nhập admin / SpaDemo@123. Giới thiệu Dashboard, lọc khoảng ngày và phân biệt doanh thu PAID với hóa đơn nháp.
2. Tạo khách “Khách Demo Buổi Bảo Vệ”, điện thoại mẫu. Mở hồ sơ và giải thích lịch sử chưa có.
3. Đặt lịch ngày mai, dịch vụ 60 phút, chọn KTV. Đặt khách thứ hai trùng 30 phút cùng KTV để minh họa từ chối. Đổi giờ/KTV để lưu được.
4. Tạo liệu trình 3 buổi. Chọn “Đặt lịch” từ buổi thứ nhất; chỉ ra liên kết và trạng thái BOOKED.
5. Đăng nhập KTV được phân công, mở Lịch của tôi; hoàn thành dịch vụ, ghi chú. Mở hồ sơ được giao; giới thiệu giới hạn quyền.
6. Đăng nhập lễ tân; lập hóa đơn dịch vụ đã hoàn thành, thêm sản phẩm. Tạo nháp, xác nhận tiền mặt, xem trạng thái và hóa đơn in.
7. Lập hóa đơn mua gói cho khách, thanh toán. Mở hồ sơ → Gói đã mua. Đặt lịch dùng gói, quan sát “đang dành”; hủy để giải phóng. Đặt lại, hoàn thành bằng tài khoản có quyền; quan sát lượt đã dùng.
8. Hồ sơ khách → Trợ lý AI → Gợi ý dịch vụ. Nhập nhu cầu. Chỉ rõ “Dữ liệu giả lập”. Tóm tắt sau khi có dịch vụ hoàn thành. Tại lịch hẹn chọn soạn nhắc lịch hoặc chăm sóc sau dịch vụ; chỉnh sửa và sao chép, không gửi thật.
9. Nếu có key riêng đã cấu hình, minh họa Gemini và chỉ rõ nguồn. Nếu không có key, chỉ giải thích adapter và test lỗi; không khẳng định đã gọi AI thật.
10. Quay về admin, xem số liệu sau thanh toán. Mở API docs và kết quả pytest. Nêu hạn chế: SMS, thanh toán trực tuyến, hoàn tiền và phòng/giường chưa làm.

Hệ thống demo cho phép người có quyền ghi nhận hoàn thành lịch tương lai để trình diễn luồng ngay trong buổi bảo vệ; chưa ràng buộc giờ bắt đầu thực tế.
