# 🏢 HỆ THỐNG QUẢN LÝ NHÂN SỰ TOÀN DIỆN
> **Đồ án Chuyên ngành:** Hệ Thống Thông Tin Doanh Nghiệp
> **Kiến trúc:** Client - Server (RESTful API & Single Page Application)  
> **Backend:** ASP.NET Core 8 Web API | Entity Framework Core 8 | SQL Server  
> **Frontend:** React 19 | TypeScript | Vite | Ant Design 6 | Recharts  

---

## 📖 1. Giới thiệu tổng quan
Hệ thống Quản trị Nhân sự (HRM) được nghiên cứu và xây dựng nhằm giải quyết bài toán số hóa toàn diện quy trình quản lý nhân sự trong doanh nghiệp. Hệ thống tối ưu hóa các nghiệp vụ quản trị từ tuyển dụng, quản lý hồ sơ, chấm công, giải quyết đơn từ, tính lương tự động đa bậc, phân tích quỹ lương và tài chính doanh nghiệp, cho đến nhật ký kiểm toán hệ thống đảm bảo tính minh bạch và an toàn dữ liệu.

---

## 🎯 2. Mô hình phân quyền đa cấp
Hệ thống thiết kế mô hình phân quyền chặt chẽ kết hợp giữa **Vai trò** và **Phòng ban**:

| Vai trò | Phạm vi & Thẩm quyền nghiệp vụ |
| :--- | :--- |
| **👑 Chủ doanh nghiệp** | Toàn quyền kiểm soát hệ thống: xem Báo cáo & Thống kê tài chính toàn cty; phê duyệt đơn từ cấp Trưởng phòng; phê duyệt chi trả kỳ lương phòng Kế toán và toàn cty; xem toàn bộ Nhật ký hoạt động. |
| **🏢 Quản lý Nhân sự** | Quản lý vòng đời nhân sự: thêm nhân sự mới, điều chỉnh hồ sơ, bổ nhiệm/thay đổi chức vụ, cho thôi việc (tự động thanh lý hợp đồng và khóa tài khoản). Duyệt đơn từ phòng Nhân sự. |
| **💰 Quản lý / NV Kế toán** | Kích hoạt tính bảng lương tự động hàng loạt toàn cty; theo dõi bảng lương; cập nhật trạng thái chi trả và phê duyệt chi trả lương nhân sự (được kiểm soát chặt chẽ bởi cấp quản lý & Chủ doanh nghiệp). |
| **📋 Quản lý phòng ban khác** | Theo dõi lịch sử chấm công nhân sự trực thuộc phòng ban; phê duyệt đơn từ xin nghỉ phép/OT của nhân viên phòng ban mình. Không được duyệt chéo phòng ban khác. |
| **👤 Nhân viên** | Điểm danh Check-in/Check-out hằng ngày; nộp đơn từ (nghỉ phép, nghỉ ốm, thai sản, OT...); theo dõi lịch sử chấm công; xem phiếu lương chi tiết từng tháng; tự cập nhật thông tin cá nhân. |
| **🛡️ Quản trị viên** | Quản trị tài khoản hệ thống: cấp tài khoản mới, phân quyền vai trò, khóa/mở khóa tài khoản; theo dõi Nhật ký hoạt động hệ thống (Audit Logs). |

---

## 🌟 3. Các phân hệ chức năng chính

### 3.1. Xác thực & Bảo mật
- Xác thực Stateless thông qua **JSON Web Token (JWT)** chuẩn bảo mật cao.
- Mật khẩu mã hóa một chiều bằng giải thuật **BCrypt**.
- Cơ chế kiểm tra trạng thái tài khoản: thông báo rõ ràng khi tài khoản bị khóa (*"Tài khoản đã bị khóa, liên hệ phòng nhân sự để biết thêm chi tiết"*).
- Tự động ghi log mỗi lượt đăng nhập (thành công, sai mật khẩu, tài khoản bị khóa) kèm địa chỉ IP và thời gian thực tế.

### 3.2. Quản lý Hồ sơ & Hợp đồng Lao động
- Quản lý hồ sơ nhân viên đầy đủ thông tin: CCCD, Ngày sinh, Giới tính, Trình độ, Số điện thoại, Email, Địa chỉ, Phòng ban, Chức vụ.
- Quy trình xóa mềm : Khi cho nhân viên thôi việc, hệ thống chuyển trạng thái sang `Đã nghỉ việc`, đồng thời tự động khóa tài khoản liên kết và thanh lý hợp đồng lao động đang hiệu lực.
- Quy định cấp chức vụ phân tầng: Trưởng phòng Nhân sự chỉ được bổ nhiệm nhân viên cấp dưới; chỉ Chủ doanh nghiệp mới có thẩm quyền bổ nhiệm/điều chỉnh cấp Trưởng phòng và Ban Giám đốc.

### 3.3. Quản lý Chấm công thông minh
- Tích hợp Check-in / Check-out trên 1 API duy nhất với thời gian thực lấy từ máy chủ.
- Nhận diện đi làm muộn và quên check-in (check-in sau 12h00 trưa đánh dấu thiếu giờ vào).
- Tự động tính toán số giờ làm thêm (OT) khi thời gian làm việc vượt quá tiêu chuẩn 8 giờ/ngày.
- Phân quyền theo dõi chấm công: Quản lý xem nhân viên phòng ban mình; Chủ doanh nghiệp xem toàn công ty; lọc theo tháng và tìm kiếm tức thì.

### 3.4. Quản lý Đơn từ & Phê duyệt phân cấp
- Đa dạng loại đơn: *Nghỉ phép thường niên, Nghỉ ốm, Nghỉ thai sản (6 tháng theo luật), Nghỉ việc riêng, Làm thêm giờ (OT)*.
- Tự động trừ Thứ Bảy và Chủ Nhật khi tính số ngày nghỉ thực tế.
- Kiểm soát quỹ phép năm: cảnh báo hoặc chặn vượt quá 12 ngày phép/năm.
- Nguyên tắc chống tự duyệt: Nhân sự không thể tự duyệt đơn của chính mình; Quản lý cùng cấp không được duyệt chéo; đơn của cấp Quản lý phải do Chủ doanh nghiệp phê duyệt.

### 3.5. Tính & Quản lý Lương tự động
- Công thức tính lương chuẩn hóa:
  $$\text{Lương gross} = \left(\frac{\text{Lương cơ bản}}{\text{Ngày công chuẩn}}\right) \times \text{Số ngày công} + \left(\frac{\text{Lương cơ bản}}{\text{Ngày công chuẩn} \times 8}\right) \times \text{Giờ OT} \times 1.5$$
- Tự động trích nộp bảo hiểm bắt buộc: **10.5%** lương cơ bản (8% BHXH + 1.5% BHYT + 1% BHTN).
- Tự động tính **Thuế TNCN lũy tiến từng phần 7 bậc** theo biểu thuế chuẩn nhà nước sau khi trừ giảm trừ gia cảnh (11.000.000 VNĐ).
- Phê duyệt & Chi trả phân cấp: Kế toán duyệt lương nhân viên; Quản lý Kế toán duyệt nhân sự kế toán; Chủ doanh nghiệp duyệt cho Quản lý Kế toán.
- Xuất bảng lương ra file Excel (.CSV UTF-8 BOM chuẩn tiếng Việt).

### 3.6. Báo cáo & Thống kê trực quan (Dashboard Analytics)
- Chỉ số tài chính lương: Tổng quỹ lương tháng, số tiền đã chi trả, số tiền chờ chi trả, tỷ lệ hoàn tất chi trả.
- Biểu đồ phân tích trực quan: Cơ cấu nhân sự theo Phòng ban, Phân bổ theo Trình độ học vấn, Phân bổ theo Thâm niên, Phân bổ theo Mức thu nhập.
- Danh sách tình hình nhân sự trực tiếp: Nhân sự đang làm việc, Nhân sự đang nghỉ phép, Nhân sự đã nghỉ việc.

### 3.7. Nhật ký hoạt động hệ thống (Audit Logs)
- Ghi nhận chi tiết mọi thao tác quan trọng: Đăng nhập/Đăng nhập thất bại, Cấp tài khoản, Phân quyền, Đổi mật khẩu, Khóa/Mở khóa tài khoản, Tính lương, Phê duyệt chi trả lương, Bổ nhiệm chức vụ, Thôi việc.
- Thông tin nhật ký: Thời gian (chuẩn giờ địa phương Việt Nam), Người thực hiện (Username + Họ tên), Hành động, Chi tiết thao tác (kèm tên nhân sự cụ thể), Trạng thái (Thành công, Cảnh báo, Thất bại), Địa chỉ IP (chuẩn hóa IPv4).
- Bộ lọc đa năng: Tìm kiếm từ khóa, Lọc theo hành động, Lọc theo trạng thái, Chọn khoảng ngày (RangePicker) và Phân trang dữ liệu.

---

## 👥 4. Tài khoản kiểm thử hệ thống (Default Password: `123456`)

| Tên đăng nhập | Họ và tên | Vai trò | Phòng ban | Chức vụ | Mục đích kiểm thử |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `an.nguyen` | Nguyễn Văn An | **Chủ doanh nghiệp** | Ban Giám đốc | Giám đốc | Toàn quyền kiểm soát, Dashboard tài chính, duyệt cấp cao |
| `admin` | Quản trị viên HT | **Quản trị viên** | Phòng CNTT | Quản trị viên | Quản lý tài khoản, phân quyền, xem Nhật ký hệ thống |
| `hai.duong` | Dương Quang Hải | **Quản lý** | Phòng Nhân sự | Trưởng phòng | Thêm nhân sự, bổ nhiệm chức vụ, thôi việc nhân sự |
| `binh.tran` | Trần Thị Bình | **Quản lý** | Phòng Kế toán | Trưởng phòng | Tính lương hàng loạt, duyệt chi trả lương, xuất CSV |
| `nga.ta` | Tạ Quỳnh Nga | **Quản lý** | Phòng Kế toán | Phó phòng | Nghiệp vụ kế toán phòng ban |
| `chau.le` | Lê Minh Châu | **Quản lý** | Phòng CNTT | Trưởng phòng | Duyệt đơn từ, theo dõi chấm công phòng CNTT |
| `huy.vu` | Vũ Quốc Huy | **Quản lý** | Phòng Kinh doanh | Phó phòng | Duyệt đơn từ, theo dõi chấm công phòng Kinh doanh |
| `ngoc.mai` | Mai Hồng Ngọc | **Nhân viên** | Phòng Nhân sự | Nhân viên | Chấm công cá nhân, nộp đơn từ, xem phiếu lương |
| `trang.do` | Đỗ Thu Trang | **Nhân viên** | Phòng Kinh doanh | Nhân viên | Chấm công, nộp đơn từ |
| `dat.dinh` | Đinh Bá Đạt | **Nhân viên** | Phòng CNTT | Nhân viên | Chấm công, nộp đơn từ |
| `anh.nguyen` | Nguyễn H. Nhật Anh | **Nhân viên** | Phòng CNTT | Nhân viên | *(Tài khoản bị khóa - dùng test thông báo khóa)* |

---

## 🚀 5. Hướng dẫn Cài đặt & Khởi chạy

### 5.1. Khởi tạo Cơ sở dữ liệu (SQL Server)
1. Mở **SQL Server Management Studio (SSMS)** và kết nối tới SQL Server `localhost` (hoặc cấu hình tương ứng).
2. Tạo cơ sở dữ liệu:
   ```sql
   CREATE DATABASE QuanLyNhanSu;
   GO
   ```
3. Chạy file script tạo bảng: [`schema_sqlserver.sql`](Database/schema_sqlserver.sql).
4. Chạy file script nạp dữ liệu mẫu: [`mock_data.sql`](Database/mock_data.sql).

### 5.2. Khởi chạy Backend (.NET 8 Web API)
1. Cấu hình chuỗi kết nối trong file `HrmApp.Api/appsettings.json`:
   ```json
   "ConnectionStrings": {
     "DefaultConnection": "Server=localhost;Database=QuanLyNhanSu;Trusted_Connection=True;TrustServerCertificate=True;"
   }
   ```
2. Mở Solution bằng **Visual Studio 2022** và nhấn `F5` / `Ctrl + F5`, hoặc dùng lệnh:
   ```bash
   cd HrmApp/HrmApp.Api
   dotnet restore
   dotnet run
   ```
3. Backend khởi chạy tại: `http://localhost:5111`
4. Tài liệu Swagger API: `http://localhost:5111/swagger`

### 5.3. Khởi chạy Frontend (React + Vite)
1. Di chuyển vào thư mục client và cài đặt dependencies:
   ```bash
   cd HrmApp/hrm-client
   npm install
   ```
2. Khởi chạy máy chủ phát triển Vite:
   ```bash
   npm run dev
   ```
3. Truy cập hệ thống tại: `http://localhost:5173`

---

## 📡 6. Tổng hợp API Endpoints chính

| Nhóm API | Method | Endpoint | Quyền truy cập | Chức năng |
| :--- | :--- | :--- | :--- | :--- |
| **Auth** | `POST` | `/api/auth/login` | Public | Đăng nhập hệ thống, nhận JWT Token |
| **Nhân viên** | `GET` | `/api/nhanvien` | Quản lý, Chủ DN, HR | Danh sách nhân sự kèm tìm kiếm & lọc |
| | `GET` | `/api/nhanvien/{id}` | Authenticated | Chi tiết thông tin nhân sự |
| | `POST` | `/api/nhanvien` | HR, Chủ DN | Thêm mới nhân sự |
| | `PUT` | `/api/nhanvien/{id}` | HR, Chủ DN | Cập nhật thông tin nhân sự |
| | `PUT` | `/api/nhanvien/{id}/chuc-vu` | HR, Chủ DN | Điều chỉnh/bổ nhiệm chức vụ |
| | `DELETE` | `/api/nhanvien/{id}` | HR, Chủ DN | Thôi việc nhân sự, tự động khóa tài khoản |
| | `PUT` | `/api/nhanvien/ho-so-cua-toi`| Authenticated | Nhân viên tự cập nhật SĐT, địa chỉ |
| **Tài khoản** | `GET` | `/api/taikhoan` | Quản trị viên | Danh sách tài khoản hệ thống |
| | `POST` | `/api/taikhoan` | Quản trị viên | Cấp tài khoản mới |
| | `PUT` | `/api/taikhoan/{id}/vai-tro` | Quản trị viên | Phân quyền vai trò |
| | `DELETE` | `/api/taikhoan/{id}` | Quản trị viên | Khóa / Mở khóa tài khoản |
| | `PUT` | `/api/taikhoan/{id}/doi-mat-khau` | Authenticated | Đổi mật khẩu cá nhân |
| **Chấm công**| `POST` | `/api/chamcong/check-in-out` | Nhân viên, Quản lý | Điểm danh Check-in / Check-out |
| | `GET` | `/api/chamcong/cua-toi` | Authenticated | Lịch sử chấm công cá nhân |
| | `GET` | `/api/chamcong` | Quản lý, Chủ DN | Xem chấm công phòng ban / toàn cty |
| **Đơn từ** | `POST` | `/api/dontu` | Nhân viên, Quản lý | Nộp đơn từ |
| | `GET` | `/api/dontu/cua-toi` | Authenticated | Danh sách đơn từ của cá nhân |
| | `GET` | `/api/dontu` | Quản lý, Chủ DN | Danh sách đơn từ cần phê duyệt |
| | `PUT` | `/api/dontu/{id}/duyet` | Quản lý, Chủ DN | Phê duyệt hoặc từ chối đơn từ |
| | `DELETE` | `/api/dontu/{id}` | Authenticated | Hủy đơn từ khi đang chờ duyệt |
| **Bảng lương**| `POST` | `/api/bangluong/tinh-luong` | Kế toán | Kích hoạt tính lương hàng loạt |
| | `GET` | `/api/bangluong/cua-toi` | Authenticated | Xem phiếu lương cá nhân |
| | `GET` | `/api/bangluong` | Kế toán, Chủ DN | Xem bảng lương toàn công ty |
| | `PUT` | `/api/bangluong/{id}/trang-thai` | Kế toán, Chủ DN | Cập nhật trạng thái chi trả |
| | `POST` | `/api/bangluong/phe-duyet-ky-luong` | Kế toán, Chủ DN | Phê duyệt chi trả toàn kỳ lương |
| | `GET` | `/api/export/bang-luong` | Kế toán, Chủ DN | Xuất bảng lương ra Excel CSV |
| **Thống kê** | `GET` | `/api/thongke/dashboard` | Quản lý, Chủ DN | Lấy toàn bộ số liệu Dashboard |
| **Nhật ký** | `GET` | `/api/nhatky` | Quản trị viên, Chủ DN | Lấy danh sách Audit Logs |
| | `GET` | `/api/nhatky/actions` | Quản trị viên, Chủ DN | Lấy danh mục các hành động log |
