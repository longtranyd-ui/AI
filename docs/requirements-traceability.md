# Đối chiếu yêu cầu và sản phẩm

| Yêu cầu | Màn hình/API | Mã và kiểm tra |
| --- | --- | --- |
| Đăng nhập, 3 vai trò | Login; /auth; /users | security.py, permissions.md; auth/roles/scope tests |
| Khách và lịch sử | Khách hàng → Hồ sơ | /customers; validation/persistence/scope tests |
| Dịch vụ, gói | Dịch vụ; Gói chăm sóc | /services, /packages; schema và API |
| Liệu trình | Liệu trình → Đặt lịch | /plans; test_plan_lifecycle |
| Đặt/đổi/hủy | Lịch hẹn | booking; overlap, rollback, concurrent tests |
| Phân công | Biểu mẫu lịch; lịch của tôi | technician_id; scope/completion tests |
| Thanh toán, sản phẩm | Hóa đơn; Sản phẩm | invoice/pay; stock, concurrency, rollback tests |
| Gói khách đã mua | Hồ sơ → Gói đã mua | entitlements; package lifecycle tests |
| Tìm kiếm | Khách, lịch, danh mục | q/filter và frontend |
| Thống kê | Dashboard | /reports; paid-only test |
| AI gợi ý | Hồ sơ → Trợ lý AI | ai/service.py; allowlist/schema/medical mock tests |
| AI tin nhắn | Lịch → Soạn tin | reminder, aftercare; reminder test |
| AI tóm tắt | Hồ sơ → Trợ lý AI | summary; scope test |
| Prompt tách riêng | backend/app/ai/prompts | System và 4 tác vụ |
| Không tư vấn y khoa | Prompt và cảnh báo UI | Output cần nhân viên kiểm tra |
| Test bắt buộc | backend/tests | Kết quả thực tế trong test-report.md |
| Minh chứng SDLC | docs/ai-evidence | Có nhật ký phiên xây dựng, chưa thay cho minh chứng KT1–KT3 thực tế của nhóm |

Tất cả trạng thái triển khai được đánh giá ở mức demo localhost. Adapter Gemini cần key thật để kiểm tra phản hồi mô hình. Các giới hạn chi tiết ở README và business-rules.md.
