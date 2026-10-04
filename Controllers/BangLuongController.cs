using HrmApp.Api.Data;
using HrmApp.Api.Data.Models;
using HrmApp.Api.DTOs.BangLuong;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace HrmApp.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class BangLuongController : ControllerBase
    {
        private readonly QuanLyNhanSuDbContext _context;
        public BangLuongController(QuanLyNhanSuDbContext context) { _context = context; }

        [HttpPost("tinh-luong")]
        [Authorize(Roles = "K? toán")]
        public async Task<IActionResult> CalculateSalary([FromBody] TinhLuongRequestDto request)
        {
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

                var hopDong = await _context.HopDongLaoDongs.Where(h => h.MaNhanVien == nv.MaNhanVien && h.TrangThai == "Có hi?u l?c").OrderByDescending(h => h.NgayBatDau).FirstOrDefaultAsync();
                decimal luongCoBan = hopDong != null ? hopDong.LuongCoBan : 0;
                
                // Gross & OT
                decimal grossSalary = ngayCongChuan > 0 ? (luongCoBan / ngayCongChuan) * soNgayCong : 0;
                decimal luongOt = ngayCongChuan > 0 ? (luongCoBan / ngayCongChuan / 8) * tongGioOt * 1.5m : 0;
                grossSalary += luongOt;

                // Insurance (10.5%)
                decimal baoHiem = luongCoBan * 0.105m;
                
                // Progressive Tax calculation
                decimal thuNhapChiuThue = grossSalary - baoHiem;
                decimal thuNhapTinhThue = thuNhapChiuThue - 11000000m; // Personal deduction
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
                        ThucLinh = thucLinh, TrangThaiChiTra = "Ch? duy?t"
                    };
                    await _context.BangLuongs.AddAsync(newBangLuong);
                }
            }
            await _context.SaveChangesAsync();
            return Ok(new { message = "Tính luong hàng lo?t hoàn t?t." });
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
                    HoTen = b.MaNhanVienNavigation != null ? b.MaNhanVienNavigation.HoTen : null,
                    ThoiGian = b.ThoiGian, LuongCoBan = b.LuongCoBan, PhuCap = b.PhuCap, ThucLinh = b.ThucLinh
                }).ToListAsync();
            return Ok(bangLuongs);
        }

        [HttpGet]
        [Authorize(Roles = "K? toán, Qu?n lý")]
        public async Task<IActionResult> GetAllSalaries()
        {
            var bangLuongs = await _context.BangLuongs.Include(b => b.MaNhanVienNavigation)
                .Select(b => new BangLuongResponseDto {
                    MaBangLuong = b.MaBangLuong, MaNhanVien = b.MaNhanVien,
                    HoTen = b.MaNhanVienNavigation != null ? b.MaNhanVienNavigation.HoTen : null,
                    ThoiGian = b.ThoiGian, LuongCoBan = b.LuongCoBan, PhuCap = b.PhuCap, ThucLinh = b.ThucLinh
                }).ToListAsync();
            return Ok(bangLuongs);
        }
    }
}
