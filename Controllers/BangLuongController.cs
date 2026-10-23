using HrmApp.Api.Data;
using HrmApp.Api.Data.Models;
using HrmApp.Api.DTOs.BangLuong;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
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
        public BangLuongController(QuanLyNhanSuDbContext context) { _context = context; }

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

        [HttpPost("tinh-luong")]
        [Authorize(Roles = "Chủ doanh nghiệp, Quản lý")]
        public async Task<IActionResult> CalculateSalary([FromBody] TinhLuongRequestDto request)
        {
            if (!await CanManageSalaryAsync())
            {
                return StatusCode(403, new { message = "Chỉ Quản lý phòng Kế toán và Chủ doanh nghiệp mới có quyền tính toán và quản lý lương." });
            }

            if (string.IsNullOrEmpty(request.ThoiGian)) return BadRequest("ThoiGian is required");
            var parts = request.ThoiGian.Split('/');
            if (parts.Length != 2 || !int.TryParse(parts[0], out int month) || !int.TryParse(parts[1], out int year))
                return BadRequest("Invalid ThoiGian format, expected MM/yyyy");

            var nhanVienQuery = _context.NhanViens.AsQueryable();
            if (request.MaNhanVien.HasValue) nhanVienQuery = nhanVienQuery.Where(nv => nv.MaNhanVien == request.MaNhanVien);

            var nhanViens = await nhanVienQuery.ToListAsync();
            int ngayCongChuan = 22; 

            foreach (var nv in nhanViens)
            {
                var soNgayCong = await _context.ChamCongs.Where(c => c.MaNhanVien == nv.MaNhanVien && c.Ngay.Month == month && c.Ngay.Year == year).CountAsync();
                var tongGioOt = await _context.ChamCongs.Where(c => c.MaNhanVien == nv.MaNhanVien && c.Ngay.Month == month && c.Ngay.Year == year).SumAsync(c => c.SoGioTangCa ?? 0);

                var hopDong = await _context.HopDongLaoDongs
                    .Where(h => h.MaNhanVien == nv.MaNhanVien && (h.TrangThai == "Có hiệu lực" || h.TrangThai == "Đang hiệu lực" || h.TrangThai.Contains("hiệu lực")))
                    .OrderByDescending(h => h.NgayBatDau)
                    .FirstOrDefaultAsync();

                if (hopDong == null)
                {
                    hopDong = await _context.HopDongLaoDongs
                        .Where(h => h.MaNhanVien == nv.MaNhanVien)
                        .OrderByDescending(h => h.NgayBatDau)
                        .FirstOrDefaultAsync();
                }

                decimal luongCoBan = hopDong != null ? hopDong.LuongCoBan : 0;
                
                decimal grossSalary = ngayCongChuan > 0 ? (luongCoBan / ngayCongChuan) * soNgayCong : 0;
                decimal luongOt = ngayCongChuan > 0 ? (luongCoBan / ngayCongChuan / 8) * tongGioOt * 1.5m : 0;
                grossSalary += luongOt;

                decimal baoHiem = luongCoBan * 0.105m;
                
                decimal thuNhapChiuThue = grossSalary - baoHiem;
                decimal thuNhapTinhThue = thuNhapChiuThue - 11000000m;
                decimal thue = 0;
                if (thuNhapTinhThue > 0) {
                    if (thuNhapTinhThue <= 5000000) thue = thuNhapTinhThue * 0.05m;
                    else if (thuNhapTinhThue <= 10000000) thue = thuNhapTinhThue * 0.10m - 250000m;
                    else if (thuNhapTinhThue <= 18000000) thue = thuNhapTinhThue * 0.15m - 750000m;
                    else if (thuNhapTinhThue <= 32000000) thue = thuNhapTinhThue * 0.20m - 1650000m;
                    else if (thuNhapTinhThue <= 52000000) thue = thuNhapTinhThue * 0.25m - 3250000m;
                    else if (thuNhapTinhThue <= 80000000) thue = thuNhapTinhThue * 0.30m - 5850000m;
                    else thue = thuNhapTinhThue * 0.35m - 9850000m;
                }

                decimal thucLinh = grossSalary - baoHiem - thue;

                var existingBangLuong = await _context.BangLuongs.FirstOrDefaultAsync(b => b.MaNhanVien == nv.MaNhanVien && b.ThoiGian == request.ThoiGian);
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
                    var newBangLuong = new BangLuong {
                        MaBangLuong = Guid.NewGuid(), MaNhanVien = nv.MaNhanVien, ThoiGian = request.ThoiGian,
                        NgayCongChuan = ngayCongChuan, SoNgayCong = soNgayCong, TongGioOt = tongGioOt,
                        LuongCoBan = luongCoBan, LuongOt = luongOt, BaoHiemXaHoi = baoHiem, ThueTncn = thue,
                        ThucLinh = thucLinh, TrangThaiChiTra = "Chờ duyệt"
                    };
                    await _context.BangLuongs.AddAsync(newBangLuong);
                }
            }
            await _context.SaveChangesAsync();
            return Ok(new { message = "Tính lương hàng loạt hoàn tất." });
        }

        [HttpGet("cua-toi")]
        [Authorize]
        public async Task<IActionResult> GetMySalaries()
        {
            var maNhanVienStr = User.FindFirst("MaNhanVien")?.Value;
            if (!Guid.TryParse(maNhanVienStr, out var maNhanVien)) return Unauthorized();

            var bangLuongs = await _context.BangLuongs.Include(b => b.MaNhanVienNavigation).Where(b => b.MaNhanVien == maNhanVien)
                .Select(b => new BangLuongResponseDto {
                    MaBangLuong = b.MaBangLuong, MaNhanVien = b.MaNhanVien,
                    HoTen = b.MaNhanVienNavigation != null ? b.MaNhanVienNavigation.HoTen : null!,
                    ThoiGian = b.ThoiGian, LuongCoBan = b.LuongCoBan, PhuCap = b.PhuCap,
                    NgayCongChuan = b.NgayCongChuan, SoNgayCong = b.SoNgayCong, TongGioOt = b.TongGioOt,
                    LuongOt = b.LuongOt, BaoHiemXaHoi = b.BaoHiemXaHoi, ThueTncn = b.ThueTncn,
                    ThucLinh = b.ThucLinh, TrangThaiChiTra = b.TrangThaiChiTra
                }).OrderByDescending(b => b.ThoiGian).ToListAsync();
            return Ok(bangLuongs);
        }

        [HttpGet]
        [Authorize(Roles = "Chủ doanh nghiệp, Quản lý")]
        public async Task<IActionResult> GetAllSalaries([FromQuery] string? thoiGian)
        {
            if (!await CanManageSalaryAsync())
            {
                return StatusCode(403, new { message = "Chỉ Quản lý phòng Kế toán và Chủ doanh nghiệp mới có quyền xem thông tin lương nhân viên." });
            }

            var query = _context.BangLuongs.Include(b => b.MaNhanVienNavigation).AsQueryable();
            if (!string.IsNullOrEmpty(thoiGian)) query = query.Where(b => b.ThoiGian == thoiGian);

            var bangLuongs = await query
                .Select(b => new BangLuongResponseDto {
                    MaBangLuong = b.MaBangLuong, MaNhanVien = b.MaNhanVien,
                    HoTen = b.MaNhanVienNavigation != null ? b.MaNhanVienNavigation.HoTen : null!,
                    ThoiGian = b.ThoiGian, LuongCoBan = b.LuongCoBan, PhuCap = b.PhuCap,
                    NgayCongChuan = b.NgayCongChuan, SoNgayCong = b.SoNgayCong, TongGioOt = b.TongGioOt,
                    LuongOt = b.LuongOt, BaoHiemXaHoi = b.BaoHiemXaHoi, ThueTncn = b.ThueTncn,
                    ThucLinh = b.ThucLinh, TrangThaiChiTra = b.TrangThaiChiTra
                }).OrderByDescending(b => b.ThoiGian).ToListAsync();
            return Ok(bangLuongs);
        }

        [HttpPut("{id}/trang-thai")]
        [Authorize(Roles = "Chủ doanh nghiệp, Quản lý")]
        public async Task<IActionResult> UpdateTrangThai(Guid id, [FromBody] UpdateTrangThaiDto dto)
        {
            if (!await CanManageSalaryAsync())
            {
                return StatusCode(403, new { message = "Chỉ Quản lý phòng Kế toán và Chủ doanh nghiệp mới có quyền chi trả lương." });
            }

            var bangLuong = await _context.BangLuongs.FindAsync(id);
            if (bangLuong == null) return NotFound(new { message = "Không tìm thấy bảng lương." });

            bangLuong.TrangThaiChiTra = dto.TrangThai ?? "Đã chi trả";
            await _context.SaveChangesAsync();
            return Ok(new { message = $"Cập nhật trạng thái thành công ({bangLuong.TrangThaiChiTra})." });
        }

        [HttpPost("phe-duyet-ky-luong")]
        [Authorize(Roles = "Chủ doanh nghiệp, Quản lý")]
        public async Task<IActionResult> PheDuyetKyLuong([FromBody] PheDuyetKyLuongDto dto)
        {
            if (!await CanManageSalaryAsync())
            {
                return StatusCode(403, new { message = "Chỉ Quản lý phòng Kế toán và Chủ doanh nghiệp mới có quyền phê duyệt và chi trả lương." });
            }

            if (string.IsNullOrEmpty(dto.ThoiGian)) return BadRequest(new { message = "Vui lòng cung cấp kỳ lương (MM/yyyy)." });

            var records = await _context.BangLuongs.Where(b => b.ThoiGian == dto.ThoiGian).ToListAsync();
            if (!records.Any()) return NotFound(new { message = $"Không có dữ liệu bảng lương kỳ {dto.ThoiGian}." });

            var targetStatus = dto.TrangThai ?? "Đã chi trả";
            foreach (var r in records)
            {
                r.TrangThaiChiTra = targetStatus;
            }
            await _context.SaveChangesAsync();
            return Ok(new { message = $"Đã phê duyệt và chi trả toàn bộ bảng lương kỳ {dto.ThoiGian} ({records.Count} nhân sự)." });
        }
    }
}