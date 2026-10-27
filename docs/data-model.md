# Kiến trúc và dữ liệu

Frontend gọi API FastAPI qua cùng origin hoặc Vite proxy. Backend kiểm tra JWT, vai trò và phạm vi dữ liệu, sau đó đọc/ghi SQLite. AI provider nhận phần dữ liệu Backend chọn, không có kết nối trực tiếp CSDL.

```mermaid
flowchart LR
  UI[React TypeScript] --> API[FastAPI và phân quyền]
  API --> DB[(SQLite)]
  API --> Validator[Prompt và kiểm tra kết quả]
  Validator --> Mock[Mock được ghi nhãn]
  Validator --> Gemini[Gemini REST]
```

```mermaid
erDiagram
  USERS ||--o{ APPOINTMENTS : creates
  USERS ||--o{ APPOINTMENT_SERVICES : assigned
  CUSTOMERS ||--o{ APPOINTMENTS : books
  APPOINTMENTS ||--|{ APPOINTMENT_SERVICES : contains
  SERVICES ||--o{ APPOINTMENT_SERVICES : performed
  CUSTOMERS ||--o{ CUSTOMER_TREATMENT_PLANS : follows
  CUSTOMER_TREATMENT_PLANS ||--|{ TREATMENT_SESSIONS : contains
  SERVICES ||--o{ TREATMENT_SESSIONS : planned
  TREATMENT_SESSIONS o|--o{ APPOINTMENT_SERVICES : schedules
  CARE_PACKAGES ||--|{ PACKAGE_SERVICES : contains
  SERVICES ||--o{ PACKAGE_SERVICES : included
  CUSTOMERS ||--o{ INVOICES : billed
  INVOICES ||--|{ INVOICE_ITEMS : contains
  APPOINTMENT_SERVICES o|--o| INVOICE_ITEMS : charged_once
  CARE_PACKAGES ||--o{ CUSTOMER_PACKAGES : purchased
  CUSTOMERS ||--o{ CUSTOMER_PACKAGES : owns
  INVOICE_ITEMS ||--o| CUSTOMER_PACKAGES : activates
  CUSTOMER_PACKAGES ||--|{ CUSTOMER_PACKAGE_ITEMS : entitles
  SERVICES ||--o{ CUSTOMER_PACKAGE_ITEMS : eligible
  CUSTOMER_PACKAGE_ITEMS o|--o{ APPOINTMENT_SERVICES : reserves
  CUSTOMER_PACKAGE_ITEMS ||--o{ PACKAGE_USAGES : consumed
  APPOINTMENT_SERVICES ||--o| PACKAGE_USAGES : consumes_once
```

Các cột và ràng buộc chính xác nằm trong backend/app/db.py. Giá VND là Integer, thời điểm ISO UTC. Các khóa ngoại bắt buộc được bật bằng PRAGMA. Reference sản phẩm/gói của invoice_items được kiểm tra trong service ứng với kind; đây là tham chiếu đa hình, không phải FK trực tiếp.

Số buổi hoàn thành tính từ treatment_sessions. Lượt gói khả dụng = tổng mua − lượt sử dụng − lịch đang dành. Invoice item dịch vụ và package usage có unique appointment_service_id. Giá, thời lượng dịch vụ được chốt khi đặt; tên/đơn giá khoản mục chốt khi lập hóa đơn; thành phần quyền gói chốt khi thanh toán.

Migration ban đầu dùng metadata của mô hình hiện tại cho bản demo đầu tiên. Nếu phát triển phiên bản mới, cần tạo revision migration tường minh cho thay đổi mới; không sửa mô hình rồi dùng lại revision cũ như một cách nâng cấp dữ liệu.
