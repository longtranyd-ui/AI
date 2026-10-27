# Minh chứng sử dụng AI

Phiên xây dựng này bắt nguồn từ yêu cầu của người dùng: “dựa các prompt bạn đã viết hãy làm cho mình hệ thống đó và đẩy lên cho mình github https://github.com/longtranyd-ui/AI.git”. Trợ lý AI tạo và sửa mã nguồn, chạy kiểm thử thực tế và chuẩn bị tài liệu. Đây là nhật ký tóm tắt phiên làm việc hiện tại, không phải bản xuất toàn bộ hội thoại.

Các quyết định trong phiên:
- Chọn React/FastAPI/SQLite để demo; Gemini tùy chọn, mock có nhãn.
- Thiết kế lịch nhiều dịch vụ nối tiếp; transaction SQLite để chống đặt trùng.
- Liên kết buổi liệu trình, lượt gói và dịch vụ trong lịch.
- Bổ sung idempotency và rollback thanh toán.
- Viết pytest và kiểm tra trình duyệt, ghi kết quả trong test-report.md.

Lỗi thực tế đã phát hiện và xử lý trong quá trình xây dựng:
- Python stdout Windows không in được tiếng Việt ở lệnh seed: chuyển thông báo CLI sang ASCII.
- Sandbox Windows chặn socket nội bộ của asyncio: chạy bộ kiểm thử với quyền cho phép localhost.
- SQLite có vòng khóa ngoại ở thanh toán/gói: fixture test đặt lại DB với foreign_keys tắt riêng trong bước drop, bật lại trước chạy nghiệp vụ.
- TypeScript được kiểm tra bằng tsc; frontend build thực tế.

Nhóm nên giữ bản hội thoại gốc và commit Git làm bằng chứng. Chưa có minh chứng của các mốc KT1, KT2, KT3 trong quá khứ, chưa có ba vòng thử Gemini thật, chưa có review người dùng thực tế. Không được trình bày các mục chưa thực hiện như kết quả hoàn thành.

## Mẫu ghi cho mỗi minh chứng mới

- Mã, giai đoạn SDLC, ngày, người thực hiện.
- Prompt gốc và công cụ/mô hình thực tế.
- Phản hồi gốc hoặc ảnh/chỉ dẫn đến bản xuất hội thoại.
- Phần nhóm chấp nhận, sửa hoặc từ chối; lý do.
- File/commit bị tác động.
- Cách kiểm tra và kết quả thực tế.

Không đưa API key hoặc dữ liệu khách thật vào minh chứng.
