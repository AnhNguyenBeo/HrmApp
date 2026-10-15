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
            if (nhanVien == null) return NotFound(new { message = "Không tìm thấy nhân viên." });

            if (request.NgayKetThuc < request.NgayBatDau)
            {
                return BadRequest(new { message = "Ngày kết thúc không được nhỏ hơn ngày bắt đầu." });
            }

            int songaynghi = 0;
            for (var d = request.NgayBatDau; d <= request.NgayKetThuc; d = d.AddDays(1))
            {
                if (d.DayOfWeek != DayOfWeek.Saturday && d.DayOfWeek != DayOfWeek.Sunday) songaynghi++;
            }

            if (songaynghi == 0) return BadRequest(new { message = "Khoảng thời gian nghỉ không bao gồm ngày làm việc." });

            if (request.LoaiDon == "Nghỉ phép")
            {
                var year = request.NgayBatDau.Year;
                var nghiDaDung = await _context.DonTus
                    .Where(d => d.MaNhanVien == maNhanVien && d.LoaiDon == "Nghỉ phép" && d.TrangThai == "Đã duyệt" && d.NgayBatDau.Year == year)
                    .SumAsync(d => d.SoNgayNghi);

                if (nghiDaDung + songaynghi > 12)
                {
                    return BadRequest(new { message = $"Hạn mức nghỉ phép 12 ngày/năm đã vượt quá (Đã nghỉ: {nghiDaDung} ngày, xin thêm: {songaynghi} ngày)." });
                }
            }

            var donTu = new DonTu
            {
                MaDon = Guid.NewGuid(),
                MaNhanVien = maNhanVien,
                HoTen = nhanVien.HoTen,
                LoaiDon = request.LoaiDon,
                LoaiNghi = request.LoaiNghi ?? request.LoaiDon,
                NgayBatDau = request.NgayBatDau,
                NgayKetThuc = request.NgayKetThuc,
                SoNgayNghi = songaynghi,
                LyDo = request.LyDo,
                TrangThai = "Chờ duyệt"
            };

            await _context.DonTus.AddAsync(donTu);
            await _context.SaveChangesAsync();
            return Ok(new { message = "Nộp đơn thành công.", data = donTu });
        }

        [HttpGet("cua-toi")]
        [Authorize]
        public async Task<IActionResult> GetMyDonTu()
        {
            var maNhanVienStr = User.FindFirst("MaNhanVien")?.Value;
            if (!Guid.TryParse(maNhanVienStr, out var maNhanVien)) return Unauthorized();

            var donTus = await _context.DonTus
                .Include(d => d.NguoiDuyetMaNavigation)
                .Include(d => d.MaNhanVienNavigation).ThenInclude(nv => nv.MaChucVuNavigation)
                .Include(d => d.MaNhanVienNavigation).ThenInclude(nv => nv.MaPhongBanNavigation)
                .Where(d => d.MaNhanVien == maNhanVien)
                .OrderByDescending(d => d.NgayBatDau)
                .Select(d => new DonTuResponseDto {
                    MaDon = d.MaDon,
                    MaNhanVien = d.MaNhanVien,
                    HoTen = d.HoTen,
                    TenChucVu = d.MaNhanVienNavigation != null && d.MaNhanVienNavigation.MaChucVuNavigation != null ? d.MaNhanVienNavigation.MaChucVuNavigation.TenChucVu : null,
                    TenPhongBan = d.MaNhanVienNavigation != null && d.MaNhanVienNavigation.MaPhongBanNavigation != null ? d.MaNhanVienNavigation.MaPhongBanNavigation.TenPhongBan : null,
                    LoaiDon = d.LoaiDon,
                    LoaiNghi = d.LoaiNghi,
                    NgayBatDau = d.NgayBatDau,
                    NgayKetThuc = d.NgayKetThuc,
                    SoNgayNghi = d.SoNgayNghi,
                    LyDo = d.LyDo,
                    TrangThai = d.TrangThai,
                    TenNguoiDuyet = d.NguoiDuyetMaNavigation != null ? d.NguoiDuyetMaNavigation.HoTen : null,
                    NgayDuyet = d.NgayDuyet,
                    GhiChuDuyet = d.GhiChuDuyet
                }).ToListAsync();
            return Ok(donTus);
        }

        [HttpGet]
        [Authorize(Roles = "Quản trị viên, Quản lý")]
        public async Task<IActionResult> GetAllDonTu()
        {
            var donTus = await _context.DonTus
                .Include(d => d.NguoiDuyetMaNavigation)
                .Include(d => d.MaNhanVienNavigation).ThenInclude(nv => nv.MaChucVuNavigation)
                .Include(d => d.MaNhanVienNavigation).ThenInclude(nv => nv.MaPhongBanNavigation)
                .OrderByDescending(d => d.NgayBatDau)
                .Select(d => new DonTuResponseDto {
                    MaDon = d.MaDon,
                    MaNhanVien = d.MaNhanVien,
                    HoTen = d.HoTen,
                    TenChucVu = d.MaNhanVienNavigation != null && d.MaNhanVienNavigation.MaChucVuNavigation != null ? d.MaNhanVienNavigation.MaChucVuNavigation.TenChucVu : null,
                    TenPhongBan = d.MaNhanVienNavigation != null && d.MaNhanVienNavigation.MaPhongBanNavigation != null ? d.MaNhanVienNavigation.MaPhongBanNavigation.TenPhongBan : null,
                    LoaiDon = d.LoaiDon,
                    LoaiNghi = d.LoaiNghi,
                    NgayBatDau = d.NgayBatDau,
                    NgayKetThuc = d.NgayKetThuc,
                    SoNgayNghi = d.SoNgayNghi,
                    LyDo = d.LyDo,
                    TrangThai = d.TrangThai,
                    TenNguoiDuyet = d.NguoiDuyetMaNavigation != null ? d.NguoiDuyetMaNavigation.HoTen : null,
                    NgayDuyet = d.NgayDuyet,
                    GhiChuDuyet = d.GhiChuDuyet
                }).ToListAsync();
            return Ok(donTus);
        }

        [HttpPut("{id}/duyet")]
        [Authorize(Roles = "Quản trị viên, Quản lý")]
        public async Task<IActionResult> DuyetDonTu(Guid id, [FromBody] DuyetDonTuDto request)
        {
            var donTu = await _context.DonTus.FindAsync(id);
            if (donTu == null) return NotFound(new { message = "Không tìm thấy đơn từ." });

            var maNguoiDuyetStr = User.FindFirst("MaNhanVien")?.Value;
            if (!Guid.TryParse(maNguoiDuyetStr, out var nguoiDuyetMa)) return Unauthorized();

            // 1. QUY TẮC CHỐNG TỰ PHÊ DUYỆT (ANTI-SELF-APPROVAL)
            if (donTu.MaNhanVien == nguoiDuyetMa)
            {
                return BadRequest(new { message = "Quy định doanh nghiệp: Bạn không thể tự phê duyệt đơn từ của chính mình!" });
            }

            // 2. QUY TẮC PHÂN CẤP PHÊ DUYỆT (APPROVAL HIERARCHY)
            var nguoiLamDon = await _context.NhanViens
                .Include(n => n.MaChucVuNavigation)
                .Include(n => n.MaPhongBanNavigation)
                .FirstOrDefaultAsync(n => n.MaNhanVien == donTu.MaNhanVien);

            var nguoiDuyet = await _context.NhanViens
                .Include(n => n.MaChucVuNavigation)
                .Include(n => n.MaPhongBanNavigation)
                .FirstOrDefaultAsync(n => n.MaNhanVien == nguoiDuyetMa);

            if (nguoiLamDon != null && nguoiDuyet != null)
            {
                var chucVuNguoiLamDon = nguoiLamDon.MaChucVuNavigation?.TenChucVu;
                var chucVuNguoiDuyet = nguoiDuyet.MaChucVuNavigation?.TenChucVu;
                var phongBanNguoiDuyet = nguoiDuyet.MaPhongBanNavigation?.TenPhongBan;

                // Nếu người làm đơn là Quản lý (Trưởng phòng, Phó phòng):
                if (chucVuNguoiLamDon == "Trưởng phòng" || chucVuNguoiLamDon == "Phó phòng")
                {
                    // Chỉ Ban Giám đốc (Giám đốc, Phó Giám đốc) mới có thẩm quyền duyệt:
                    if (phongBanNguoiDuyet != "Ban Giám đốc" && chucVuNguoiDuyet != "Giám đốc")
                    {
                        return StatusCode(403, new { message = $"Đơn từ của {chucVuNguoiLamDon} ({nguoiLamDon.HoTen}) phải do Ban Giám đốc phê duyệt! Quản lý cùng cấp không được duyệt chéo." });
                    }
                }
            }

            donTu.TrangThai = request.TrangThai;
            donTu.NguoiDuyetMa = nguoiDuyetMa;
            donTu.NgayDuyet = DateOnly.FromDateTime(DateTime.UtcNow);
            donTu.GhiChuDuyet = request.GhiChuDuyet;

            _context.DonTus.Update(donTu);
            await _context.SaveChangesAsync();
            return Ok(new { message = $"Đã {request.TrangThai.ToLower()} đơn từ." });
        }

        [HttpDelete("{id}")]
        [Authorize]
        public async Task<IActionResult> CancelDonTu(Guid id)
        {
            var donTu = await _context.DonTus.FindAsync(id);
            if (donTu == null) return NotFound(new { message = "Không tìm thấy đơn từ." });
            var maNhanVienStr = User.FindFirst("MaNhanVien")?.Value;
            if (donTu.MaNhanVien.ToString() != maNhanVienStr) return StatusCode(403, new { message = "Bạn không có quyền huỷ đơn của người khác." });
            if (donTu.TrangThai != "Chờ duyệt") return BadRequest(new { message = "Chỉ có thể huỷ đơn khi đang ở trạng thái Chờ duyệt." });

            _context.DonTus.Remove(donTu);
            await _context.SaveChangesAsync();
            return Ok(new { message = "Đã huỷ đơn thành công." });
        }
    }
}