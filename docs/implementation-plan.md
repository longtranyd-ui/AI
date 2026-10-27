# Kế hoạch và phạm vi triển khai

Ứng dụng demo localhost dành cho đồ án nhóm 22. Các bước triển khai trong phiên làm việc: cơ sở dữ liệu và migrations; xác thực/phân quyền; API danh mục; lịch hẹn và liệu trình; thanh toán và gói; AI mock/Gemini; giao diện; kiểm thử và hướng dẫn bàn giao.

Quyết định: FastAPI + SQLAlchemy + SQLite, React + TypeScript + Vite; lưu tiền bằng số nguyên đồng; giờ API UTC có offset, hiển thị UTC+7. SQLite `BEGIN IMMEDIATE` bảo vệ toàn bộ đoạn kiểm tra/ghi của nghiệp vụ lịch, thanh toán và lượt gói. Không mở rộng sang SMS thật hoặc cổng thanh toán.

Mọi dữ liệu mẫu hư cấu. AI thật cần khóa và tên mô hình từ tài khoản của người dùng. Test phải chạy thực tế; nhật ký kết quả ở test-report.md.
