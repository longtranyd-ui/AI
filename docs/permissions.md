# Phân quyền

| Nhóm chức năng | Quản lý | Lễ tân | Kỹ thuật viên |
| --- | --- | --- | --- |
| Hồ sơ khách | Xem/thêm/sửa | Xem/thêm/sửa | Chỉ xem khách có công việc được giao |
| Danh mục dịch vụ/gói | Xem/thêm/sửa/ngừng | Xem | Xem |
| Sản phẩm | Xem/thêm/sửa/tồn | Xem | Không |
| Nhân viên | Quản lý | Chỉ xem tên KTV để phân công | Chỉ danh sách tên KTV |
| Lịch, phân công | Toàn bộ | Toàn bộ | Lịch bản thân |
| Hoàn thành dịch vụ | Có | Không | Công việc bản thân |
| Liệu trình, gói đã mua | Quản lý | Quản lý | Qua công việc được giao, không có API danh sách toàn bộ |
| Hóa đơn và thanh toán | Có | Có | Không |
| Báo cáo doanh thu | Có | Không | Không |
| AI gợi ý/tin nhắn | Có | Có | Không |
| AI tóm tắt | Có | Có | Chỉ lịch sử do mình thực hiện cho khách được phân công |

API xác thực tài khoản còn hoạt động trên mỗi yêu cầu. KTV không nhận điện thoại/email trong hồ sơ khách. Không được khóa/hạ quyền quản lý hoạt động cuối cùng. Không có API xóa cứng hồ sơ lịch sử.
