# 🏢 HỆ THỐNG QUẢN LÝ NHÂN SỰ TOÀN DIỆN (HRM SYSTEM)
> **Đồ án Chuyên ngành:** Hệ Thống Thông Tin Doanh Nghiệp (HTTTDN)  
> **Kiến trúc:** Client - Server (RESTful API & Single Page Application)  
> **Backend:** ASP.NET Core 8 Web API | Entity Framework Core 8 | SQL Server  
> **Frontend:** React 19 | TypeScript | Vite | Ant Design 6 | Recharts  

---

## 📖 1. Giới thiệu tổng quan
Hệ thống Quản trị Nhân sự (HRM) được nghiên cứu và xây dựng nhằm giải quyết bài toán số hóa toàn diện quy trình quản lý nhân sự trong doanh nghiệp. Hệ thống tối ưu hóa các nghiệp vụ quản trị từ tuyển dụng, quản lý hồ sơ, hợp đồng lao động, chấm công thời gian thực, phê duyệt đơn từ phân cấp, tính lương tự động đa bậc, phân tích quỹ lương và tài chính doanh nghiệp, cho đến nhật ký kiểm toán hệ thống (Audit Logs) đảm bảo tính minh bạch, toàn vẹn và an toàn dữ liệu.

---

## 🎯 2. Mô hình phân quyền đa cấp (RBAC & Department-Based)
Hệ thống thiết kế mô hình phân quyền chặt chẽ kết hợp giữa **Vai trò (Role)** và **Phòng ban (Department)**, triệt tiêu hoàn toàn rủi ro vượt quyền (Privilege Escalation):

| Vai trò | Phạm vi & Thẩm quyền nghiệp vụ |
| :--- | :--- |
| **👑 Chủ doanh nghiệp (Owner)** | Toàn quyền kiểm soát hệ thống: xem Báo cáo & Thống kê tài chính toàn công ty; phê duyệt đơn từ cấp Trưởng phòng; phê duyệt chi trả kỳ lương phòng Kế toán và toàn doanh nghiệp; bổ nhiệm nhân sự Ban Giám đốc; xem toàn bộ Nhật ký hoạt động. |
| **🏢 Quản lý Nhân sự (HR Manager)** | Quản lý vòng đời nhân sự: thêm nhân sự mới, điều chỉnh hồ sơ, quản lý hợp đồng lao động, bổ nhiệm/thay đổi chức vụ, cho thôi việc (tự động thanh lý hợp đồng và khóa tài khoản). Giới hạn: Không được tự thao tác hợp đồng của chính mình, không được bổ nhiệm hoặc can thiệp nhân sự Ban Giám đốc. |
| **💰 Quản lý / NV Kế toán (Accounting)** | Kích hoạt tính bảng lương tự động hàng loạt; theo dõi bảng lương; cập nhật trạng thái chi trả và phê duyệt chi trả lương nhân sự (được kiểm soát chặt chẽ bởi cấp quản lý & Chủ doanh nghiệp). Chỉ Chủ doanh nghiệp và phòng Kế toán mới được xem quỹ lương công ty. |
| **📋 Quản lý phòng ban khác (Managers)** | Theo dõi lịch sử chấm công nhân sự trực thuộc phòng ban; phê duyệt đơn từ xin nghỉ phép/OT của nhân viên phòng ban mình. Không được duyệt chéo phòng ban khác và không thấy thông tin tài chính/hợp đồng toàn công ty. |
| **👤 Nhân viên (Employee)** | Điểm danh Check-in/Check-out hằng ngày; nộp đơn từ (nghỉ phép, nghỉ ốm, thai sản, OT...); theo dõi lịch sử chấm công; xem phiếu lương chi tiết từng tháng; xem hợp đồng lao động của chính mình; tự cập nhật thông tin cá nhân. |
| **🛡️ Quản trị viên (Admin)** | Quản trị tài khoản hệ thống: cấp tài khoản mới, phân quyền vai trò (chặn tự cấp quyền Chủ doanh nghiệp), khóa/mở khóa tài khoản; theo dõi Nhật ký hoạt động hệ thống (Audit Logs). |

---

## 🌟 3. Các phân hệ chức năng & Chuẩn hóa an toàn

### 3.1. Xác thực & Bảo mật (Authentication & Security)
- Xác thực Stateless thông qua **JSON Web Token (JWT)** chuẩn bảo mật cao (khoá ký bí mật quản lý qua cấu hình môi trường / user-secrets).
- Mật khẩu mã hóa một chiều bằng giải thuật **BCrypt**.
- Cơ chế chống dò quét tài khoản (Anti-Account Enumeration): Luôn kiểm tra mật khẩu trước khi thông báo trạng thái tài khoản bị khóa (*"Tài khoản đã bị khóa, liên hệ phòng nhân sự để biết thêm chi tiết"*).
- Chống IDOR khi đổi mật khẩu: Xác thực tài khoản yêu cầu trùng khớp với định danh trong JWT Claim.
- Chặn quyền leo thang (Privilege Escalation): Quản trị viên không thể tự gán quyền Chủ doanh nghiệp cho bất kỳ ai.

### 3.2. Quản lý Hồ sơ & Hợp đồng Lao động
- Quản lý hồ sơ nhân viên đầy đủ thông tin: CCCD, Ngày sinh, Giới tính, Trình độ, Số điện thoại, Email, Địa chỉ, Phòng ban, Chức vụ.
- Ràng buộc toàn vẹn cơ sở dữ liệu: Thiết lập UNIQUE cho CCCD, Email, Tên đăng nhập và cặp (Mã nhân viên, Ngày) trong chấm công.
- Kiểm soát quyền xem hợp đồng lao động: Nhân viên chỉ được xem hợp đồng của chính mình; chỉ Chủ doanh nghiệp và Quản lý phòng Nhân sự mới có thẩm quyền xem toàn bộ hợp đồng hoặc tạo, sửa, chấm dứt hợp đồng.
- Quy trình xóa mềm (Soft delete): Khi cho nhân viên thôi việc, hệ thống chuyển trạng thái sang `Đã nghỉ việc`, đồng thời tự động khóa tài khoản liên kết và thanh lý hợp đồng lao động đang hiệu lực.

### 3.3. Quản lý Chấm công thông minh
- Tích hợp Check-in / Check-out trên 1 API duy nhất với thời gian thực lấy từ máy chủ, ngăn chặn client giả mạo ngày giờ.
- Nhận diện đi làm muộn (sau 08:30 đánh dấu `Đi muộn`) và quên check-in (check-in sau 12:00 trưa đánh dấu `Thiếu giờ vào`).
- Tự động tính toán số giờ làm thêm (OT) khi thời gian làm việc vượt quá tiêu chuẩn 8 giờ/ngày.
- Phân quyền theo dõi chấm công: Quản lý xem nhân viên phòng ban mình; Chủ doanh nghiệp xem toàn công ty; lọc theo tháng và tìm kiếm tức thì.

### 3.4. Quản lý Đơn từ & Phê duyệt phân cấp
- Đa dạng loại đơn: *Nghỉ phép thường niên, Nghỉ ốm, Nghỉ thai sản (tối đa 180 ngày theo luật), Nghỉ không lương*.
- Kiểm tra tính hợp lệ: Whitelist loại đơn, chặn trùng lặp thời gian nghỉ, tự động trừ Thứ Bảy và Chủ Nhật khi tính số ngày nghỉ thực tế.
- Kiểm soát quỹ phép năm: Tính tổng ngày phép đã duyệt và đang chờ duyệt, chặn nộp vượt quá hạn mức 12 ngày phép/năm.
- Nguyên tắc chống tự duyệt: Nhân sự không thể tự duyệt đơn của chính mình; Quản lý cùng cấp không được duyệt chéo; đơn của cấp Quản lý phải do Chủ doanh nghiệp phê duyệt. Đơn đã duyệt không thể bị lật lại trạng thái tùy tiện.

### 3.5. Tính & Quản lý Lương tự động
- Chuẩn hóa chuỗi kỳ lương: Tự động chuẩn hóa về `MM/yyyy` (ví dụ `10/2026`), sắp xếp kỳ lương theo thứ tự thời gian số học chính xác.
- Bảo vệ bảng lương đã chi trả: Không ghi đè hoặc tính lại các bảng lương đã ở trạng thái `Đã chi trả` / `Đã thanh toán`.
- Lọc nhân sự đã nghỉ việc khỏi danh sách tính lương.
- Tích hợp ngày nghỉ phép hưởng lương: Số ngày công tính lương bao gồm các ngày chấm công hợp lệ cộng với số ngày nghỉ phép năm đã được phê duyệt.
- Quy định pháp lý áp dụng:
  - Dự án áp dụng quy định pháp luật hiện hành theo **Thông tư 111/2013/TT-BTC** và **Nghị quyết 954/2020/UBTVQH14** (Mức giảm trừ gia cảnh cho bản thân: 11.000.000 VNĐ/tháng, Biểu thuế lũy tiến từng phần 7 bậc từ 5% đến 35%).
  - Tỷ lệ bảo hiểm bắt buộc trích nộp người lao động: **10.5%** (8% BHXH + 1.5% BHYT + 1% BHTN).
- Xuất bảng lương an toàn: Xuất file CSV UTF-8 BOM, mã hóa và escape toàn diện dấu phẩy/ngoặc kép, chống CSV Formula Injection (các ký tự `=`, `+`, `-`, `@`), định dạng số thập phân chuẩn quốc tế.

### 3.6. Báo cáo & Thống kê trực quan (Dashboard Analytics)
- Phân quyền dữ liệu tài chính: Chỉ Chủ doanh nghiệp và phòng Kế toán mới được xem tổng quỹ lương và phân bổ thu nhập.
- Đồng bộ mốc thời gian: Lọc Dashboard theo kỳ lương (`thoiGian`) tự động đồng bộ thống kê nghỉ phép và nhân sự mới trong kỳ tương ứng.
- Biểu đồ phân tích trực quan: Cơ cấu nhân sự theo Phòng ban, Phân bổ theo Trình độ học vấn, Phân bổ theo Thâm niên, Phân bổ theo Mức thu nhập.

### 3.7. Nhật ký hoạt động hệ thống (Audit Logs)
- Độc lập DbContext: Cơ chế ghi log sử dụng Service Scope riêng biệt, không ảnh hưởng hay commit dở dang các giao dịch nghiệp vụ của Controller.
- Ghi nhận chi tiết mọi thao tác: Đăng nhập/Đăng nhập thất bại, Cấp tài khoản, Phân quyền, Đổi mật khẩu, Khóa/Mở khóa tài khoản, Thêm/Sửa/Thôi việc nhân sự, Hợp đồng lao động, Nộp/Hủy/Duyệt đơn từ, Chấm công, Tính lương, Phê duyệt chi trả lương.
- Thông tin nhật ký: Thời gian (chuẩn giờ địa phương Việt Nam), Người thực hiện (Username + Họ tên), Hành động, Chi tiết thao tác, Trạng thái (Thành công, Cảnh báo, Thất bại), Địa chỉ IP (chuẩn hóa IPv4).
- Bộ lọc đa năng kèm phân trang an toàn: Giới hạn `pageSize` từ 1 đến 100, bảo vệ `page` >= 1 chống ngoại lệ phân trang âm.

---

## 👥 4. Tài khoản kiểm thử hệ thống (Mật khẩu mặc định: `123456`)

| Tên đăng nhập | Họ và tên | Vai trò | Phòng ban | Chức vụ | Mục đích kiểm thử |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `an.nguyen` | Nguyễn Văn An | **Chủ doanh nghiệp** | Ban Giám đốc | Giám đốc | Toàn quyền kiểm soát, Dashboard tài chính, duyệt cấp cao |
| `admin` | Quản trị viên HT | **Quản trị viên** | Phòng CNTT | Quản trị viên | Quản lý tài khoản, phân quyền, xem Nhật ký hệ thống |
| `tri.trinh` | Trịnh Minh Trí | **Quản lý** | Phòng Nhân sự | Trưởng phòng | Thêm nhân sự, bổ nhiệm chức vụ, thôi việc nhân sự, quản lý hợp đồng |
| `nga.ta` | Tạ Quỳnh Nga | **Quản lý** | Phòng Kế toán | Trưởng phòng | Tính lương hàng loạt, duyệt chi trả lương, xuất CSV |
| `chau.le` | Lê Minh Châu | **Quản lý** | Phòng CNTT | Trưởng phòng | Duyệt đơn từ, theo dõi chấm công phòng CNTT |
| `huy.vu` | Vũ Quốc Huy | **Quản lý** | Phòng Kinh doanh | Trưởng phòng | Duyệt đơn từ, theo dõi chấm công phòng Kinh doanh |
| `bao.lam` | Lâm Quốc Bảo | **Quản lý** | Ban Giám đốc | Phó phòng | Ban giám đốc điều hành |
| `binh.tran` | Trần Thị Bình | **Quản lý** | Ban Giám đốc | Phó phòng | Ban giám đốc điều hành |
| `ngoc.mai` | Mai Hồng Ngọc | **Nhân viên** | Phòng Nhân sự | Nhân viên | Chấm công cá nhân, nộp đơn từ, xem phiếu lương |
| `trang.do` | Đỗ Thu Trang | **Nhân viên** | Phòng Kinh doanh | Nhân viên | Chấm công, nộp đơn từ |
| `dat.dinh` | Đinh Bá Đạt | **Nhân viên** | Phòng CNTT | Nhân viên | Chấm công, nộp đơn từ |
| `thang.hoang` | Hoàng Minh Thắng | **Nhân viên** | Phòng Kế toán | Nhân viên | Chấm công, nộp đơn từ |
| `phuong.bui` | Bùi Lan Phương | **Nhân viên** | Phòng Kinh doanh | Nhân viên | Chấm công, nộp đơn từ |
| `cuong.cao` | Cao Văn Cường | **Nhân viên** | Phòng Kinh doanh | Nhân viên | *(Tài khoản bị khóa - dùng test thông báo khóa)* |
| `em.hoang` | Hoàng Văn Em | **Nhân viên** | Phòng CNTT | Nhân viên | *(Tài khoản bị khóa - dùng test thông báo khóa)* |

---

## 🚀 5. Hướng dẫn Cài đặt & Khởi chạy

### 5.1. Khởi tạo Cơ sở dữ liệu (SQL Server)
1. Mở **SQL Server Management Studio (SSMS)** và kết nối tới SQL Server `localhost`.
2. Tạo cơ sở dữ liệu và các bảng: Chạy file script [`schema_sqlserver.sql`](schema_sqlserver.sql).
3. Nạp dữ liệu mẫu khởi tạo: Chạy file script [`mock_data.sql`](mock_data.sql).

### 5.2. Khởi chạy Backend (.NET 8 Web API)
1. Cấu hình chuỗi kết nối trong file `HrmApp/HrmApp.Api/appsettings.json`:
   ```json
   "ConnectionStrings": {
     "HrmConnection": "Server=localhost;Database=QuanLyNhanSu;Trusted_Connection=True;TrustServerCertificate=True;"
   }
   ```
2. Mở Solution bằng **Visual Studio 2022** và nhấn `F5` / `Ctrl + F5`, hoặc mở terminal tại thư mục Backend:
   ```bash
   cd HrmApp/HrmApp.Api
   dotnet restore
   dotnet run
   ```
3. Backend khởi chạy tại: `http://localhost:5111`
4. Tài liệu Swagger API: `http://localhost:5111/swagger`
5. Kiểm tra Health check: `http://localhost:5111/api/health`

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
| **Hệ thống** | `GET` | `/api/health` | Public | Kiểm tra trạng thái máy chủ & CSDL |
| **Auth** | `POST` | `/api/auth/login` | Public | Đăng nhập hệ thống, nhận JWT Token |
| **Nhân viên** | `GET` | `/api/nhanvien` | Quản lý, Chủ DN | Danh sách nhân sự kèm tìm kiếm & lọc |
| | `GET` | `/api/nhanvien/{id}` | Authenticated | Chi tiết thông tin nhân sự |
| | `POST` | `/api/nhanvien` | Quản lý Nhân sự, Chủ DN | Thêm mới nhân sự |
| | `PUT` | `/api/nhanvien/{id}` | Quản lý Nhân sự, Chủ DN | Cập nhật thông tin nhân sự |
| | `PUT` | `/api/nhanvien/{id}/chuc-vu` | Quản lý Nhân sự, Chủ DN | Điều chỉnh/bổ nhiệm chức vụ |
| | `DELETE` | `/api/nhanvien/{id}` | Quản lý Nhân sự, Chủ DN | Thôi việc nhân sự, tự động khóa tài khoản |
| | `PUT` | `/api/nhanvien/ho-so-cua-toi`| Authenticated | Nhân viên tự cập nhật SĐT, địa chỉ |
| **Hợp đồng** | `GET` | `/api/hopdong` | Authenticated | Xem hợp đồng (cá nhân hoặc toàn cty theo quyền) |
| | `GET` | `/api/hopdong/{id}` | Authenticated | Xem chi tiết hợp đồng được phân quyền |
| | `POST` | `/api/hopdong` | Quản lý Nhân sự, Chủ DN | Tạo mới hợp đồng lao động |
| | `PUT` | `/api/hopdong/{id}` | Quản lý Nhân sự, Chủ DN | Cập nhật thông tin hợp đồng |
| | `PUT` | `/api/hopdong/{id}/cham-dut` | Quản lý Nhân sự, Chủ DN | Chấm dứt hợp đồng lao động |
| **Tài khoản** | `GET` | `/api/taikhoan` | Quản trị viên, Chủ DN | Danh sách tài khoản hệ thống |
| | `POST` | `/api/taikhoan` | Quản trị viên, Chủ DN | Cấp tài khoản mới (chặn tự gán Chủ DN) |
| | `PUT` | `/api/taikhoan/{id}/vai-tro` | Quản trị viên, Chủ DN | Phân quyền vai trò |
| | `PUT` | `/api/taikhoan/{id}/khoa` | Quản trị viên, Chủ DN | Khóa tài khoản |
| | `PUT` | `/api/taikhoan/{id}/mo-khoa` | Quản trị viên, Chủ DN | Mở khóa tài khoản |
| | `PUT` | `/api/taikhoan/{id}/doi-mat-khau` | Authenticated | Đổi mật khẩu tài khoản cá nhân |
| **Chấm công**| `POST` | `/api/chamcong/check-in-out` | Nhân viên, Quản lý | Điểm danh Check-in / Check-out theo giờ máy chủ |
| | `GET` | `/api/chamcong/cua-toi` | Authenticated | Lịch sử chấm công cá nhân |
| | `GET` | `/api/chamcong` | Quản lý, Chủ DN | Xem chấm công phòng ban / toàn công ty |
| **Đơn từ** | `POST` | `/api/dontu` | Nhân viên, Quản lý | Nộp đơn từ (kiểm tra hạn mức 12 ngày & trùng lặp) |
| | `GET` | `/api/dontu/cua-toi` | Authenticated | Danh sách đơn từ của cá nhân |
| | `GET` | `/api/dontu` | Quản lý, Chủ DN | Danh sách đơn từ cần phê duyệt |
| | `PUT` | `/api/dontu/{id}/duyet` | Quản lý, Chủ DN | Phê duyệt hoặc từ chối đơn từ |
| | `DELETE` | `/api/dontu/{id}` | Authenticated | Hủy đơn từ khi đang chờ duyệt |
| **Bảng lương**| `POST` | `/api/bangluong/tinh-luong` | Kế toán, Chủ DN | Tính lương hàng loạt (không ghi đè đã chi trả) |
| | `GET` | `/api/bangluong/cua-toi` | Authenticated | Xem phiếu lương cá nhân (sắp xếp chuẩn thời gian) |
| | `GET` | `/api/bangluong` | Kế toán, Chủ DN | Xem bảng lương toàn công ty |
| | `PUT` | `/api/bangluong/{id}/trang-thai` | Kế toán, Chủ DN | Cập nhật trạng thái chi trả |
| | `POST` | `/api/bangluong/phe-duyet-ky-luong` | Kế toán, Chủ DN | Phê duyệt chi trả toàn kỳ lương |
| | `GET` | `/api/export/bang-luong` | Kế toán, Chủ DN | Xuất bảng lương ra Excel CSV an toàn |
| **Thống kê** | `GET` | `/api/thongke/dashboard` | Quản lý, Chủ DN | Lấy số liệu Dashboard (quỹ lương bảo mật cho Kế toán/Chủ DN) |
| **Nhật ký** | `GET` | `/api/nhatky` | Quản trị viên, Chủ DN | Lấy danh sách Audit Logs kèm phân trang an toàn |
| | `GET` | `/api/nhatky/actions` | Quản trị viên, Chủ DN | Lấy danh mục các hành động log |

---
*Dự án hoàn thiện phục vụ Đồ án Chuyên ngành Hệ Thống Thông Tin Doanh Nghiệp.*