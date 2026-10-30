using HrmApp.Api.Constants;
using HrmApp.Api.Data;
using HrmApp.Api.Data.Models;
using HrmApp.Api.DTOs.BangLuong;
using HrmApp.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace HrmApp.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class BangLuongController : ControllerBase
    {
        private readonly QuanLyNhanSuDbContext _context;
        private readonly INhatKyService _nhatKyService;
        private readonly IPayrollTaxCalculator _taxCalculator;

        public BangLuongController(QuanLyNhanSuDbContext context, INhatKyService nhatKyService, IPayrollTaxCalculator taxCalculator)
        {
            _context = context;
            _nhatKyService = nhatKyService;
            _taxCalculator = taxCalculator;
        }

        public static bool NormalizeThoiGian(string? input, out string normalized)
        {
            normalized = string.Empty;
            if (string.IsNullOrWhiteSpace(input)) return false;

            var parts = input.Trim().Split('/');
            if (parts.Length != 2) return false;

            if (!int.TryParse(parts[0], out int month) || !int.TryParse(parts[1], out int year)) return false;

            if (month < 1 || month > 12 || year < 2000 || year > 2100) return false;

            normalized = $"{month:D2}/{year}";
            return true;
        }

        public static int TinhSoNgayNghiTrongThang(
            DateOnly ngayBatDau,
            DateOnly ngayKetThuc,
            int month,
            int year,
            HashSet<DateOnly>? ngayDaChamCong = null)
        {
            if (ngayKetThuc < ngayBatDau) return 0;
            if (month < 1 || month > 12 || year < 2000 || year > 2100) return 0;

            var startOfMonth = new DateOnly(year, month, 1);
            var endOfMonth = new DateOnly(year, month, DateTime.DaysInMonth(year, month));

            var effStart = ngayBatDau > startOfMonth ? ngayBatDau : startOfMonth;
            var effEnd = ngayKetThuc < endOfMonth ? ngayKetThuc : endOfMonth;

            if (effStart > effEnd) return 0;

            int count = 0;
            for (var d = effStart; d <= effEnd; d = d.AddDays(1))
            {
                if (d.DayOfWeek != DayOfWeek.Saturday && d.DayOfWeek != DayOfWeek.Sunday)
                {
                    if (ngayDaChamCong == null || !ngayDaChamCong.Contains(d))
                    {
                        count++;
                    }
                }
            }

            return count;
        }

        private static int ParseThoiGianKey(string? thoiGian)
        {
            if (string.IsNullOrEmpty(thoiGian)) return 0;
            var p = thoiGian.Trim().Split('/');
            if (p.Length == 2 && int.TryParse(p[0], out var m) && int.TryParse(p[1], out var y))
            {
                return y * 100 + m;
            }
            return 0;
        }

        private async Task<bool> CanManageSalaryAsync()
        {
            var roleClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Role || c.Type == "role");
            var role = roleClaim?.Value;
            if (role == "Chủ doanh nghiệp") return true;
            if (role != "Quản lý") return false;

            var maNhanVienStr = User.FindFirst("MaNhanVien")?.Value;
            if (!Guid.TryParse(maNhanVienStr, out var maNhanVien)) return false;

            var nhanVien = await _context.NhanViens
                .Include(n => n.MaPhongBanNavigation)
                .FirstOrDefaultAsync(n => n.MaNhanVien == maNhanVien);

            var tenPB = nhanVien?.MaPhongBanNavigation?.TenPhongBan ?? "";
            return tenPB.ToLower().Contains("kế toán");
        }

        private static (bool CanApprove, string? ErrorMessage) CanApproveSalaryPreloaded(
            BangLuong bangLuong,
            NhanVien? targetNv,
            NhanVien? approverNv,
            string? role,
            Guid approverMaNhanVien)
        {
            var isOwner = role == "Chủ doanh nghiệp";

            if (!isOwner && role != "Quản lý")
            {
                return (false, "Chỉ người quản lý được phép phê duyệt chi trả bảng lương.");
            }

            if (approverMaNhanVien != Guid.Empty && bangLuong.MaNhanVien == approverMaNhanVien)
            {
                return (false, "Bạn không thể tự phê duyệt bảng lương của chính mình.");
            }

            var targetDept = targetNv?.MaPhongBanNavigation?.TenPhongBan ?? "";
            var targetChucVu = targetNv?.MaChucVuNavigation?.TenChucVu ?? "";
            var targetRole = targetNv?.TaiKhoans.FirstOrDefault()?.MaVaiTroNavigation?.TenVaiTro ?? "";

            bool isTargetAccounting = targetDept.ToLower().Contains("kế toán");
            bool isTargetAccountingManager = isTargetAccounting && (targetRole == "Quản lý" || targetChucVu.Contains("Trưởng") || targetChucVu.Contains("Phó"));
            bool isTargetAccountingStaff = isTargetAccounting && !isTargetAccountingManager;

            if (isTargetAccountingManager)
            {
                if (!isOwner)
                {
                    return (false, "Bảng lương của Quản lý phòng Kế toán chỉ có thể được phê duyệt bởi Chủ doanh nghiệp.");
                }
                return (true, null);
            }

            if (isOwner)
            {
                return (true, null);
            }

            var approverDept = approverNv?.MaPhongBanNavigation?.TenPhongBan ?? "";
            var approverChucVu = approverNv?.MaChucVuNavigation?.TenChucVu ?? "";
            var approverRoleFromNv = approverNv?.TaiKhoans.FirstOrDefault()?.MaVaiTroNavigation?.TenVaiTro ?? role ?? "";

            bool isApproverAccounting = approverDept.ToLower().Contains("kế toán");
            if (!isApproverAccounting)
            {
                return (false, "Chỉ các thành viên phòng Kế toán và Chủ doanh nghiệp mới có quyền phê duyệt lương.");
            }

            bool isApproverAccountingManager = approverRoleFromNv == "Quản lý" || approverChucVu.Contains("Trưởng") || approverChucVu.Contains("Phó");

            if (isTargetAccountingStaff)
            {
                if (!isApproverAccountingManager)
                {
                    return (false, "Bảng lương của nhân viên phòng Kế toán chỉ có thể được phê duyệt bởi Quản lý phòng Kế toán hoặc Chủ doanh nghiệp.");
                }
                return (true, null);
            }

            return (true, null);
        }

        private async Task<(bool CanApprove, string? ErrorMessage)> CanApproveSalaryAsync(BangLuong bangLuong)
        {
            var roleClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Role || c.Type == "role");
            var role = roleClaim?.Value;

            var approverMaNhanVienStr = User.FindFirst("MaNhanVien")?.Value;
            Guid.TryParse(approverMaNhanVienStr, out var approverMaNhanVien);

            var targetNv = await _context.NhanViens
                .Include(n => n.MaPhongBanNavigation)
                .Include(n => n.MaChucVuNavigation)
                .Include(n => n.TaiKhoans).ThenInclude(t => t.MaVaiTroNavigation)
                .FirstOrDefaultAsync(n => n.MaNhanVien == bangLuong.MaNhanVien);

            var approverNv = await _context.NhanViens
                .Include(n => n.MaPhongBanNavigation)
                .Include(n => n.MaChucVuNavigation)
                .Include(n => n.TaiKhoans).ThenInclude(t => t.MaVaiTroNavigation)
                .FirstOrDefaultAsync(n => n.MaNhanVien == approverMaNhanVien);

            return CanApproveSalaryPreloaded(bangLuong, targetNv, approverNv, role, approverMaNhanVien);
        }

        [HttpPost("tinh-luong")]
        [Authorize]
        public async Task<IActionResult> CalculateSalary([FromBody] TinhLuongRequestDto request)
        {
            if (!await CanManageSalaryAsync())
            {
                return StatusCode(403, new { message = "Chỉ các thành viên phòng Kế toán và Chủ doanh nghiệp mới có quyền tính toán và quản lý lương." });
            }

            if (!NormalizeThoiGian(request.ThoiGian, out var thoiGianChuan))
            {
                return BadRequest(new { message = "Định dạng kỳ lương không hợp lệ, yêu cầu MM/yyyy." });
            }

            var parts = thoiGianChuan.Split('/');
            int month = int.Parse(parts[0]);
            int year = int.Parse(parts[1]);

            var startOfMonth = new DateOnly(year, month, 1);
            var endOfMonth = new DateOnly(year, month, DateTime.DaysInMonth(year, month));

            var nhanVienQuery = _context.NhanViens
                .Where(nv => nv.TrangThaiLamViec != "Đã nghỉ việc")
                .AsQueryable();

            if (request.MaNhanVien.HasValue)
            {
                nhanVienQuery = nhanVienQuery.Where(nv => nv.MaNhanVien == request.MaNhanVien);
            }

            var nhanViens = await nhanVienQuery.ToListAsync();
            var empIds = nhanViens.Select(nv => nv.MaNhanVien).ToList();

            var existingBangLuongs = await _context.BangLuongs
                .Where(b => empIds.Contains(b.MaNhanVien) && b.ThoiGian == thoiGianChuan)
                .ToDictionaryAsync(b => b.MaNhanVien);

            var chamCongs = await _context.ChamCongs
                .Where(c => empIds.Contains(c.MaNhanVien) && c.Ngay.Month == month && c.Ngay.Year == year)
                .ToListAsync();
            var chamCongsByEmp = chamCongs.GroupBy(c => c.MaNhanVien).ToDictionary(g => g.Key, g => g.ToList());

            var donTus = await _context.DonTus
                .Where(d => empIds.Contains(d.MaNhanVien) &&
                            (d.LoaiDon == "Nghỉ phép" || d.LoaiDon == "Nghỉ phép năm") &&
                            d.TrangThai == "Đã duyệt" &&
                            d.NgayBatDau <= endOfMonth && d.NgayKetThuc >= startOfMonth)
                .ToListAsync();
            var donTusByEmp = donTus.GroupBy(d => d.MaNhanVien).ToDictionary(g => g.Key, g => g.ToList());

            var hopDongs = await _context.HopDongLaoDongs
                .Where(h => empIds.Contains(h.MaNhanVien))
                .ToListAsync();
            var hopDongsByEmp = hopDongs.GroupBy(h => h.MaNhanVien).ToDictionary(g => g.Key, g => g.ToList());

            decimal ngayCongChuan = _taxCalculator.Options.NgayCongChuan > 0 ? _taxCalculator.Options.NgayCongChuan : 22m;
            int calculatedCount = 0;
            int skippedCount = 0;

            foreach (var nv in nhanViens)
            {
                existingBangLuongs.TryGetValue(nv.MaNhanVien, out var existingBangLuong);

                if (existingBangLuong != null && TrangThaiLuong.IsDaChiTra(existingBangLuong.TrangThaiChiTra))
                {
                    skippedCount++;
                    continue;
                }

                var empChamCongs = chamCongsByEmp.TryGetValue(nv.MaNhanVien, out var cList) ? cList : new List<ChamCong>();
                var validAttendanceDates = empChamCongs
                    .Where(c => c.TrangThai != "Thiếu giờ vào" && c.TrangThai != "Thiếu giờ vào (Đã ra)" && c.TrangThai != "Vắng mặt")
                    .Select(c => c.Ngay)
                    .ToHashSet();

                var empDonTus = donTusByEmp.TryGetValue(nv.MaNhanVien, out var dList) ? dList : new List<DonTu>();
                int approvedPaidLeaveDays = 0;
                foreach (var dt in empDonTus)
                {
                    approvedPaidLeaveDays += TinhSoNgayNghiTrongThang(dt.NgayBatDau, dt.NgayKetThuc, month, year, validAttendanceDates);
                }

                decimal soNgayCong = validAttendanceDates.Count + approvedPaidLeaveDays;

                var tongGioOt = empChamCongs.Sum(c => c.SoGioTangCa ?? 0);

                var empHopDongs = hopDongsByEmp.TryGetValue(nv.MaNhanVien, out var hList) ? hList : new List<HopDongLaoDong>();
                var hopDong = empHopDongs
                    .Where(h => h.TrangThai == "Có hiệu lực" || h.TrangThai == "Đang hiệu lực" || h.TrangThai.Contains("hiệu lực"))
                    .OrderByDescending(h => h.NgayBatDau)
                    .FirstOrDefault()
                    ?? empHopDongs.OrderByDescending(h => h.NgayBatDau).FirstOrDefault();

                decimal luongCoBan = hopDong != null ? hopDong.LuongCoBan : 0;
                
                decimal grossSalary = ngayCongChuan > 0 ? (luongCoBan / ngayCongChuan) * soNgayCong : 0;
                decimal luongOt = ngayCongChuan > 0 ? (luongCoBan / ngayCongChuan / 8) * tongGioOt * 1.5m : 0;
                grossSalary += luongOt;

                decimal baoHiem = luongCoBan * _taxCalculator.Options.TyLeBaoHiem;
                
                decimal thuNhapChiuThue = grossSalary - baoHiem;
                decimal thuNhapTinhThue = thuNhapChiuThue - _taxCalculator.Options.GiamTruBanThan;
                decimal thue = _taxCalculator.TinhThue(thuNhapTinhThue);

                decimal thucLinh = grossSalary - baoHiem - thue;

                if (existingBangLuong != null)
                {
                    existingBangLuong.NgayCongChuan = ngayCongChuan;
                    existingBangLuong.SoNgayCong = soNgayCong;
                    existingBangLuong.TongGioOt = tongGioOt;
                    existingBangLuong.LuongCoBan = luongCoBan;
                    existingBangLuong.LuongOt = luongOt;
                    existingBangLuong.BaoHiemXaHoi = baoHiem;
                    existingBangLuong.ThueTncn = thue;
                    existingBangLuong.ThucLinh = thucLinh;
                    _context.BangLuongs.Update(existingBangLuong);
                }
                else
                {
                    var newBangLuong = new BangLuong
                    {
                        MaBangLuong = Guid.NewGuid(),
                        MaNhanVien = nv.MaNhanVien,
                        ThoiGian = thoiGianChuan,
                        NgayCongChuan = ngayCongChuan,
                        SoNgayCong = soNgayCong,
                        TongGioOt = tongGioOt,
                        LuongCoBan = luongCoBan,
                        LuongOt = luongOt,
                        BaoHiemXaHoi = baoHiem,
                        ThueTncn = thue,
                        ThucLinh = thucLinh,
                        TrangThaiChiTra = TrangThaiLuong.ChoDuyet
                    };
                    await _context.BangLuongs.AddAsync(newBangLuong);
                }

                calculatedCount++;
            }

            await _context.SaveChangesAsync();

            var callerUser = User.FindFirst("TenDangNhap")?.Value ?? User.Identity?.Name ?? "Hệ thống";
            var callerName = User.FindFirst("HoTen")?.Value;
            var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
            await _nhatKyService.GhiLogAsync(callerUser, callerName, "Tính bảng lương", $"Chạy tính lương hàng loạt cho kỳ {thoiGianChuan} ({calculatedCount} nhân sự được tính, {skippedCount} nhân sự đã chi trả được giữ nguyên)", "Thành công", ip);

            return Ok(new { message = $"Tính lương kỳ {thoiGianChuan} hoàn tất ({calculatedCount} nhân sự được tính, {skippedCount} nhân sự đã chi trả được giữ nguyên)." });
        }

        [HttpGet("cua-toi")]
        [Authorize]
        public async Task<IActionResult> GetMySalaries()
        {
            var maNhanVienStr = User.FindFirst("MaNhanVien")?.Value;
            if (!Guid.TryParse(maNhanVienStr, out var maNhanVien)) return Unauthorized();

            var list = await _context.BangLuongs
                .Include(b => b.MaNhanVienNavigation)
                    .ThenInclude(n => n.MaPhongBanNavigation)
                .Include(b => b.MaNhanVienNavigation)
                    .ThenInclude(n => n.MaChucVuNavigation)
                .Include(b => b.MaNhanVienNavigation)
                    .ThenInclude(n => n.TaiKhoans)
                        .ThenInclude(t => t.MaVaiTroNavigation)
                .Where(b => b.MaNhanVien == maNhanVien)
                .Select(b => new BangLuongResponseDto {
                    MaBangLuong = b.MaBangLuong,
                    MaNhanVien = b.MaNhanVien,
                    HoTen = b.MaNhanVienNavigation != null ? b.MaNhanVienNavigation.HoTen : null!,
                    TenPhongBan = b.MaNhanVienNavigation != null && b.MaNhanVienNavigation.MaPhongBanNavigation != null ? b.MaNhanVienNavigation.MaPhongBanNavigation.TenPhongBan : null,
                    TenChucVu = b.MaNhanVienNavigation != null && b.MaNhanVienNavigation.MaChucVuNavigation != null ? b.MaNhanVienNavigation.MaChucVuNavigation.TenChucVu : null,
                    VaiTro = b.MaNhanVienNavigation != null ? b.MaNhanVienNavigation.TaiKhoans.Select(t => t.MaVaiTroNavigation != null ? t.MaVaiTroNavigation.TenVaiTro : null).FirstOrDefault() : null,
                    ThoiGian = b.ThoiGian,
                    LuongCoBan = b.LuongCoBan,
                    PhuCap = b.PhuCap,
                    NgayCongChuan = b.NgayCongChuan,
                    SoNgayCong = b.SoNgayCong,
                    TongGioOt = b.TongGioOt,
                    LuongOt = b.LuongOt,
                    BaoHiemXaHoi = b.BaoHiemXaHoi,
                    ThueTncn = b.ThueTncn,
                    ThucLinh = b.ThucLinh,
                    TrangThaiChiTra = b.TrangThaiChiTra
                }).ToListAsync();

            var sorted = list.OrderByDescending(b => ParseThoiGianKey(b.ThoiGian)).ToList();
            return Ok(sorted);
        }

        [HttpGet]
        [Authorize]
        public async Task<IActionResult> GetAllSalaries([FromQuery] string? thoiGian)
        {
            if (!await CanManageSalaryAsync())
            {
                return StatusCode(403, new { message = "Chỉ các thành viên phòng Kế toán và Chủ doanh nghiệp mới có quyền xem thông tin lương nhân viên." });
            }

            var query = _context.BangLuongs
                .Include(b => b.MaNhanVienNavigation)
                    .ThenInclude(n => n.MaPhongBanNavigation)
                .Include(b => b.MaNhanVienNavigation)
                    .ThenInclude(n => n.MaChucVuNavigation)
                .Include(b => b.MaNhanVienNavigation)
                    .ThenInclude(n => n.TaiKhoans)
                        .ThenInclude(t => t.MaVaiTroNavigation)
                .AsQueryable();

            if (!string.IsNullOrEmpty(thoiGian))
            {
                if (!NormalizeThoiGian(thoiGian, out var thoiGianNormalized))
                {
                    return BadRequest(new { message = "Định dạng kỳ lương không hợp lệ, yêu cầu MM/yyyy." });
                }
                query = query.Where(b => b.ThoiGian == thoiGianNormalized);
            }

            var list = await query
                .Select(b => new BangLuongResponseDto {
                    MaBangLuong = b.MaBangLuong,
                    MaNhanVien = b.MaNhanVien,
                    HoTen = b.MaNhanVienNavigation != null ? b.MaNhanVienNavigation.HoTen : null!,
                    TenPhongBan = b.MaNhanVienNavigation != null && b.MaNhanVienNavigation.MaPhongBanNavigation != null ? b.MaNhanVienNavigation.MaPhongBanNavigation.TenPhongBan : null,
                    TenChucVu = b.MaNhanVienNavigation != null && b.MaNhanVienNavigation.MaChucVuNavigation != null ? b.MaNhanVienNavigation.MaChucVuNavigation.TenChucVu : null,
                    VaiTro = b.MaNhanVienNavigation != null ? b.MaNhanVienNavigation.TaiKhoans.Select(t => t.MaVaiTroNavigation != null ? t.MaVaiTroNavigation.TenVaiTro : null).FirstOrDefault() : null,
                    ThoiGian = b.ThoiGian,
                    LuongCoBan = b.LuongCoBan,
                    PhuCap = b.PhuCap,
                    NgayCongChuan = b.NgayCongChuan,
                    SoNgayCong = b.SoNgayCong,
                    TongGioOt = b.TongGioOt,
                    LuongOt = b.LuongOt,
                    BaoHiemXaHoi = b.BaoHiemXaHoi,
                    ThueTncn = b.ThueTncn,
                    ThucLinh = b.ThucLinh,
                    TrangThaiChiTra = b.TrangThaiChiTra
                }).ToListAsync();

            var sorted = list.OrderByDescending(b => ParseThoiGianKey(b.ThoiGian)).ToList();
            return Ok(sorted);
        }

        [HttpPut("{id}/trang-thai")]
        [Authorize]
        public async Task<IActionResult> UpdateTrangThai(Guid id, [FromBody] UpdateTrangThaiDto dto)
        {
            var bangLuong = await _context.BangLuongs
                .Include(b => b.MaNhanVienNavigation)
                .FirstOrDefaultAsync(b => b.MaBangLuong == id);
            if (bangLuong == null) return NotFound(new { message = "Không tìm thấy bảng lương." });

            var targetStatus = string.IsNullOrWhiteSpace(dto.TrangThai) ? TrangThaiLuong.DaChiTra : dto.TrangThai;
            if (!TrangThaiLuong.IsValidTargetStatus(targetStatus))
            {
                return BadRequest(new { message = "Trạng thái không hợp lệ, chỉ chấp nhận 'Chờ duyệt' hoặc 'Đã chi trả'." });
            }

            if (TrangThaiLuong.IsDaChiTra(bangLuong.TrangThaiChiTra) && targetStatus == TrangThaiLuong.ChoDuyet)
            {
                return BadRequest(new { message = "Bảng lương đã chi trả, không thể hoàn lại trạng thái." });
            }

            var (canApprove, errorMessage) = await CanApproveSalaryAsync(bangLuong);
            if (!canApprove)
            {
                return StatusCode(403, new { message = errorMessage });
            }

            bangLuong.TrangThaiChiTra = targetStatus;
            await _context.SaveChangesAsync();

            var tenNhanVien = bangLuong.MaNhanVienNavigation?.HoTen ?? bangLuong.MaNhanVien.ToString();
            var callerUser = User.FindFirst("TenDangNhap")?.Value ?? User.Identity?.Name ?? "Hệ thống";
            var callerName = User.FindFirst("HoTen")?.Value;
            var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
            await _nhatKyService.GhiLogAsync(callerUser, callerName, "Chi trả lương", $"Cập nhật trạng thái chi trả bảng lương ({bangLuong.ThoiGian}) của nhân sự {tenNhanVien} thành '{bangLuong.TrangThaiChiTra}'", "Thành công", ip);

            return Ok(new { message = $"Cập nhật trạng thái thành công ({bangLuong.TrangThaiChiTra})." });
        }

        [HttpPost("phe-duyet-ky-luong")]
        [Authorize]
        public async Task<IActionResult> PheDuyetKyLuong([FromBody] PheDuyetKyLuongDto dto)
        {
            if (!await CanManageSalaryAsync())
            {
                return StatusCode(403, new { message = "Chỉ các thành viên phòng Kế toán và Chủ doanh nghiệp mới có quyền phê duyệt và chi trả lương." });
            }

            if (!NormalizeThoiGian(dto.ThoiGian, out var thoiGianNormalized))
            {
                return BadRequest(new { message = "Định dạng kỳ lương không hợp lệ, yêu cầu MM/yyyy." });
            }

            var targetStatus = string.IsNullOrWhiteSpace(dto.TrangThai) ? TrangThaiLuong.DaChiTra : dto.TrangThai;
            if (!TrangThaiLuong.IsValidTargetStatus(targetStatus))
            {
                return BadRequest(new { message = "Trạng thái không hợp lệ, chỉ chấp nhận 'Chờ duyệt' hoặc 'Đã chi trả'." });
            }

            var records = await _context.BangLuongs.Where(b => b.ThoiGian == thoiGianNormalized).ToListAsync();
            if (!records.Any()) return NotFound(new { message = $"Không có dữ liệu bảng lương kỳ {thoiGianNormalized}." });

            var roleClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Role || c.Type == "role");
            var role = roleClaim?.Value;
            var approverMaNhanVienStr = User.FindFirst("MaNhanVien")?.Value;
            Guid.TryParse(approverMaNhanVienStr, out var approverMaNhanVien);

            var approverNv = await _context.NhanViens
                .Include(n => n.MaPhongBanNavigation)
                .Include(n => n.MaChucVuNavigation)
                .Include(n => n.TaiKhoans).ThenInclude(t => t.MaVaiTroNavigation)
                .FirstOrDefaultAsync(n => n.MaNhanVien == approverMaNhanVien);

            var empIds = records.Select(r => r.MaNhanVien).Distinct().ToList();
            var targetNvs = await _context.NhanViens
                .Include(n => n.MaPhongBanNavigation)
                .Include(n => n.MaChucVuNavigation)
                .Include(n => n.TaiKhoans).ThenInclude(t => t.MaVaiTroNavigation)
                .Where(n => empIds.Contains(n.MaNhanVien))
                .ToDictionaryAsync(n => n.MaNhanVien);

            int approvedCount = 0;
            int skippedCount = 0;

            foreach (var r in records)
            {
                if (r.TrangThaiChiTra == targetStatus) continue;

                if (TrangThaiLuong.IsDaChiTra(r.TrangThaiChiTra) && targetStatus == TrangThaiLuong.ChoDuyet)
                {
                    continue;
                }

                targetNvs.TryGetValue(r.MaNhanVien, out var targetNv);
                var (canApprove, _) = CanApproveSalaryPreloaded(r, targetNv, approverNv, role, approverMaNhanVien);
                if (canApprove)
                {
                    r.TrangThaiChiTra = targetStatus;
                    approvedCount++;
                }
                else
                {
                    skippedCount++;
                }
            }

            if (approvedCount > 0)
            {
                await _context.SaveChangesAsync();

                var callerUser = User.FindFirst("TenDangNhap")?.Value ?? User.Identity?.Name ?? "Hệ thống";
                var callerName = User.FindFirst("HoTen")?.Value;
                var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
                await _nhatKyService.GhiLogAsync(callerUser, callerName, "Phê duyệt chi trả", $"Phê duyệt chi trả bảng lương kỳ {thoiGianNormalized} cho {approvedCount} nhân sự", "Thành công", ip);
            }

            if (skippedCount > 0)
            {
                return Ok(new { message = $"Đã duyệt và chi trả {approvedCount} bảng lương kỳ {thoiGianNormalized}. Còn {skippedCount} bảng lương cần cấp thẩm quyền cao hơn phê duyệt (Quản lý Kế toán / Chủ doanh nghiệp)." });
            }

            return Ok(new { message = $"Đã phê duyệt và chi trả toàn bộ bảng lương kỳ {thoiGianNormalized} ({approvedCount} nhân sự)." });
        }
    }
}
