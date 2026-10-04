# 🏢 HỆ THỐNG QUẢN TRỊ NHÂN SỰ 
## 🚀 Công nghệ sử dụng
*   **Framework:** .NET 8 Web API
*   **Database:** SQL Server
*   **ORM:** Entity Framework Core
*   **Authentication:** JSON Web Token
*   **Security:** Băm mật khẩu bằng BCrypt
*   **Architecture:** Controller - Service - DTO Pattern

---

## 🌟 Chức năng nổi bật

### 1. Phân quyền và bảo mật
*   Xác thực bằng JWT
*   Mã hóa mật khẩu 1 chiều bằng BCrypt.
*   Phân quyền Role-based (Quản trị viên, Quản lý, Kế toán, Nhân viên).

### 2. Quản lý hồ sơ và hợp đồng
*   CRUD hồ sơ nhân viên (Xóa mềm để bảo toàn dữ liệu).
*   Cho phép nhân viên tự cập nhật thông tin cá nhân cơ bản.
*   Quản lý lịch sử chức vụ và Hợp đồng lao động.

### 3. Quản lý đơn từ
*   Nộp đơn xin nghỉ phép, nghỉ ốm, thai sản, v.v.
*   **Auto-calculate:** Tự động loại trừ Thứ 7, Chủ Nhật khi tính số ngày nghỉ thực tế.
*   **Leave Balance:** Cảnh báo/Chặn nếu nhân viên nghỉ vượt quá quỹ phép năm (12 ngày/năm).
*   Luồng phê duyệt đơn từ dành cho Quản lý.

### 4. Chấm công thông minh
*   Chỉ cần gọi 1 API duy nhất để Check-in/Check-out (Server tự động lấy giờ thực tế).
*   **Anti-cheat:** Nhận diện việc quên Check-in (Ví dụ: Bấm lần đầu sau 12h00 trưa sẽ bị đánh dấu Thiếu giờ vào).
*   Tự động tính toán số giờ làm thêm nếu làm quá 8 tiếng/ngày.

### 5. Tính lương tự động
*   Tính lương hàng loạt dựa trên: Lương cơ bản + Lương OT (x1.5) - Thuế - Bảo hiểm.
*   Tự động trích 10.5% (BHXH, BHYT, BHTN).
*   Tính Thuế TNCN lũy tiến 7 bậc chuẩn nhà nước (sau khi trừ 11 triệu giảm trừ gia cảnh).
*   **Export:** Xuất bảng lương ra định dạng Excel (.csv UTF-8 BOM chuẩn tiếng Việt).

### 6. Báo cáo và thống kê
*   Thống kê số lượng nhân sự đang làm, số nhân sự mới tuyển trong tháng.
*   Gom nhóm dữ liệu nhân sự theo: **Phòng ban**, **Trình độ học vấn**, và **Thâm niên** (Dưới 1 năm, 1-3 năm, Trên 3 năm).
*   Tổng quỹ lương tháng hiện tại.

---

## 🛠 Hướng dẫn Cài đặt và khởi chạy

**Bước 1: Clone và mở dự án**
Mở project HrmApp.Api.csproj bằng Visual Studio hoặc VS Code.

**Bước 2: Cấu hình Database**
Mở file ppsettings.json và sửa lại chuỗi kết nối DefaultConnection cho phù hợp với SQL Server của bạn.

**Bước 3: Chạy ứng dụng**
Mở Terminal / PowerShell và gõ:
`ash
dotnet build
dotnet run
`
Truy cập **Swagger** để xem và test toàn bộ API: http://localhost:5111/swagger

---

## 📂 Danh sách API Endpoints chính

### Auth
*   POST /api/auth/login - Đăng nhập (nhận JWT)

### Nhân Viên
*   GET /api/nhanvien - Danh sách nhân viên
*   POST /api/nhanvien - Thêm mới nhân viên
*   PUT /api/nhanvien/ho-so-cua-toi - Nhân viên tự cập nhật thông tin cá nhân
*   DELETE /api/nhanvien/{id} - Xóa nhân viên

### Chấm Công
*   POST /api/chamcong/check-in-out - Bấm giờ vào/ra
*   GET /api/chamcong/cua-toi - Xem lịch sử chấm công cá nhân

### Bảng Lương
*   POST /api/bangluong/tinh-luong - Kế toán kích hoạt tính lương toàn công ty
*   GET /api/export/bang-luong - Xuất file Excel bảng lương (.csv)

### Đơn Từ
*   POST /api/dontu - Nộp đơn từ
*   PUT /api/dontu/{id}/duyet - Sếp duyệt đơn từ

### Thống Kê
*   GET /api/thongke/dashboard - Xem biểu đồ, chỉ số tổng quan
