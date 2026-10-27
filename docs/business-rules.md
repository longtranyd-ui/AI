# Quy tắc nghiệp vụ

## Lịch hẹn

Một lịch có nhiều dịch vụ nối tiếp. Mỗi dịch vụ lưu KTV, thời lượng chốt, bắt đầu/kết thúc UTC. Trùng khi `new_start < old_end AND new_end > old_start`; tiếp giáp được phép. Kiểm tra cả khách hàng và KTV. Thời gian cần offset và không đặt quá khứ (dung sai 5 phút).

BOOKED → CONFIRMED hoặc CANCELLED; hoàn thành các dịch vụ sẽ chuyển lịch sang COMPLETED. Chỉ quản lý/KTV được giao hoàn thành. Lễ tân quản lý lịch và thanh toán nhưng không xác nhận kết quả chuyên môn. Khi dịch vụ đã bắt đầu/hoàn thành không sửa lịch hoặc hủy toàn lịch. Hủy lịch giải phóng lượt gói và đưa buổi liệu trình về PLANNED.

SQLite BEGIN IMMEDIATE bao quanh kiểm tra và ghi để hai tiến trình không cùng vượt điều kiện. Timeout chờ ghi 15 giây; khi bận trả lỗi có thể thử lại. Đây là thiết kế cho quy mô demo, không phải tối ưu cho lượng ghi lớn.

## Gói và liệu trình

Gói danh mục khác gói đã mua. Hóa đơn nháp chưa cấp quyền. Thanh toán tạo snapshot thành phần tại thời điểm mua thành công. Đổi danh mục không thay đổi gói đã mua. Hạn gói phải còn đến lúc kết thúc dịch vụ dự kiến. Đặt lịch dành lượt; hoàn thành ghi package_usage một lần. Gửi lại complete không trừ lần nữa. Hủy trước hoàn thành giải phóng lượt.

Liệu trình gồm các buổi. Một buổi chỉ có một lịch đang hoạt động. Hủy lịch có thể đặt lại, lịch sử cũ vẫn giữ. Hoàn thành cập nhật ghi chú, tiến độ và trạng thái kế hoạch.

## Thanh toán

Hóa đơn chỉ thu dịch vụ đã hoàn thành, chưa lập hóa đơn và không dùng gói. Sản phẩm/gói lấy giá Backend. Không nhận giá hoặc tổng tùy ý từ frontend. Tổng = tổng số lượng × giá chốt − giảm giá; không âm. Sản phẩm trừ tồn khi thanh toán. Hóa đơn PAID bất biến trong phạm vi demo, yêu cầu thanh toán lặp trả cùng kết quả.

Ghi hóa đơn, trừ kho, kích hoạt gói cùng transaction; lỗi rollback toàn bộ. Chuyển khoản là xác nhận thủ công, không đối soát thật. Chưa có luồng hoàn tiền hoặc hủy hóa đơn nháp; nháp đã chứa dịch vụ sẽ giữ quyền lập hóa đơn dịch vụ đó.

## Thống kê

Doanh thu theo paid_at và trạng thái PAID. Lịch theo ngày bắt đầu ở UTC+7, phân trạng thái. Dịch vụ phổ biến theo lượt đã hoàn thành trong khoảng ngày thực hiện; dùng gói cũng tính lượt nhưng không tính doanh thu lần nữa. Khoảng lọc tối đa 366 ngày.
