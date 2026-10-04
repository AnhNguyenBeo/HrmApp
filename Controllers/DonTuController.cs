using HrmApp.Api.Data;
using HrmApp.Api.Data.Models;
using HrmApp.Api.DTOs.DonTu;
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
    public class DonTuController : ControllerBase
    {
        private readonly QuanLyNhanSuDbContext _context;
        public DonTuController(QuanLyNhanSuDbContext context) { _context = context; }

        [HttpPost]
        [Authorize]
        public async Task<IActionResult> CreateDonTu([FromBody] CreateDonTuDto request)
        {
            var maNhanVienStr = User.FindFirst("MaNhanVien")?.Value;
            if (string.IsNullOrEmpty(maNhanVienStr) || !Guid.TryParse(maNhanVienStr, out var maNhanVien)) return Unauthorized();

            var nhanVien = await _context.NhanViens.FindAsync(maNhanVien);
            if (nhanVien == null) return NotFound(new { message = "Không tìm th?y nhân viên." });

            // Count business days
            int days = 0;
            for (var date = request.NgayBatDau.ToDateTime(TimeOnly.MinValue); date <= request.NgayKetThuc.ToDateTime(TimeOnly.MinValue); date = date.AddDays(1))
            {
                if (date.DayOfWeek != DayOfWeek.Saturday && date.DayOfWeek != DayOfWeek.Sunday) {
                    days++;
                }
            }
            if (days <= 0) return BadRequest(new { message = "Kho?ng th?i gian ngh? không h?p l? (trùng ngày cu?i tu?n)." });

            // Validate Leave Balance (12 days/year)
            if (request.LoaiDon == "Ngh? phép")
            {
                var year = request.NgayBatDau.Year;
                var usedLeaves = await _context.DonTus
                    .Where(d => d.MaNhanVien == maNhanVien && d.LoaiDon == "Ngh? phép" && d.TrangThai == "Ðã duy?t" && d.NgayBatDau.Year == year)
                    .SumAsync(d => d.SoNgayNghi);
                
                if (usedLeaves + days > 12) {
                    return BadRequest(new { message = $"B?n dã s? d?ng {usedLeaves}/12 ngày phép. Không d? d? ngh? thêm {days} ngày n?a." });
                }
            }

            var donTu = new DonTu {
                MaDon = Guid.NewGuid(), MaNhanVien = maNhanVien, HoTen = nhanVien.HoTen,
                LoaiDon = request.LoaiDon, LoaiNghi = request.LoaiNghi,
                NgayBatDau = request.NgayBatDau, NgayKetThuc = request.NgayKetThuc,
                SoNgayNghi = days, LyDo = request.LyDo, TrangThai = "Ch? duy?t"
            };

            await _context.DonTus.AddAsync(donTu);
            await _context.SaveChangesAsync();
            return Ok(new { message = "N?p don thành công", maDon = donTu.MaDon, soNgayNghiTinhToan = days });
        }

        [HttpGet("cua-toi")]
        [Authorize]
        public async Task<IActionResult> GetMyDonTu()
        {
            var maNhanVienStr = User.FindFirst("MaNhanVien")?.Value;
            if (!Guid.TryParse(maNhanVienStr, out var maNhanVien)) return Unauthorized();

            var donTus = await _context.DonTus.Include(d => d.NguoiDuyetMaNavigation).Where(d => d.MaNhanVien == maNhanVien)
                .OrderByDescending(d => d.NgayBatDau)
                .Select(d => new DonTuResponseDto {
                    MaDon = d.MaDon, MaNhanVien = d.MaNhanVien, HoTen = d.HoTen,
                    LoaiDon = d.LoaiDon, LoaiNghi = d.LoaiNghi, NgayBatDau = d.NgayBatDau, NgayKetThuc = d.NgayKetThuc,
                    SoNgayNghi = d.SoNgayNghi, LyDo = d.LyDo, TrangThai = d.TrangThai,
                    TenNguoiDuyet = d.NguoiDuyetMaNavigation != null ? d.NguoiDuyetMaNavigation.HoTen : null,
                    NgayDuyet = d.NgayDuyet, GhiChuDuyet = d.GhiChuDuyet
                }).ToListAsync();
            return Ok(donTus);
        }

        [HttpGet]
        [Authorize(Roles = "Qu?n tr? viên, Qu?n lý")]
        public async Task<IActionResult> GetAllDonTu()
        {
            var donTus = await _context.DonTus.Include(d => d.NguoiDuyetMaNavigation).OrderByDescending(d => d.NgayBatDau)
                .Select(d => new DonTuResponseDto {
                    MaDon = d.MaDon, MaNhanVien = d.MaNhanVien, HoTen = d.HoTen, LoaiDon = d.LoaiDon, LoaiNghi = d.LoaiNghi,
                    NgayBatDau = d.NgayBatDau, NgayKetThuc = d.NgayKetThuc, SoNgayNghi = d.SoNgayNghi, LyDo = d.LyDo, TrangThai = d.TrangThai,
                    TenNguoiDuyet = d.NguoiDuyetMaNavigation != null ? d.NguoiDuyetMaNavigation.HoTen : null,
                    NgayDuyet = d.NgayDuyet, GhiChuDuyet = d.GhiChuDuyet
                }).ToListAsync();
            return Ok(donTus);
        }

        [HttpPut("{id}/duyet")]
        [Authorize(Roles = "Qu?n tr? viên, Qu?n lý")]
        public async Task<IActionResult> DuyetDonTu(Guid id, [FromBody] DuyetDonTuDto request)
        {
            var donTu = await _context.DonTus.FindAsync(id);
            if (donTu == null) return NotFound(new { message = "Không tìm th?y don t?." });

            var maNguoiDuyetStr = User.FindFirst("MaNhanVien")?.Value;
            if (!Guid.TryParse(maNguoiDuyetStr, out var nguoiDuyetMa)) return Unauthorized();

            donTu.TrangThai = request.TrangThai;
            donTu.NguoiDuyetMa = nguoiDuyetMa;
            donTu.NgayDuyet = DateOnly.FromDateTime(DateTime.UtcNow);
            donTu.GhiChuDuyet = request.GhiChuDuyet;

            _context.DonTus.Update(donTu);
            await _context.SaveChangesAsync();
            return Ok(new { message = $"Ðã {request.TrangThai.ToLower()} don t?." });
        }

        [HttpDelete("{id}")]
        [Authorize]
        public async Task<IActionResult> CancelDonTu(Guid id)
        {
            var donTu = await _context.DonTus.FindAsync(id);
            if (donTu == null) return NotFound(new { message = "Không tìm th?y don t?." });
            var maNhanVienStr = User.FindFirst("MaNhanVien")?.Value;
            if (donTu.MaNhanVien.ToString() != maNhanVienStr) return StatusCode(403, new { message = "B?n không có quy?n hu? don c?a ngu?i khác." });
            if (donTu.TrangThai != "Ch? duy?t") return BadRequest(new { message = "Ch? có th? hu? don khi dang ? tr?ng thái Ch? duy?t." });

            _context.DonTus.Remove(donTu);
            await _context.SaveChangesAsync();
            return Ok(new { message = "Ðã hu? don thành công." });
        }
    }
}
