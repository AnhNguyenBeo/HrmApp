using HrmApp.Api.Data;
using HrmApp.Api.Data.Models;
using HrmApp.Api.DTOs.DonTu;
using HrmApp.Api.Services;
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
        private readonly INhatKyService _nhatKyService;
        public DonTuController(QuanLyNhanSuDbContext context, INhatKyService nhatKyService)
        {
            _context = context;
            _nhatKyService = nhatKyService;
        }

        [HttpPost]
        [Authorize]
        public async Task<IActionResult> CreateDonTu([FromBody] CreateDonTuDto request)
        {
            var userRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value ?? User.FindFirst("role")?.Value;
            if (userRole == "Chủ doanh nghiệp" || userRole == "Quản trị viên")
            {
                return BadRequest(new { message = "Tài khoản Chủ doanh nghiệp và Quản trị viên không cần nộp đơn xin nghỉ cá nhân." });
            }

            var maNhanVienStr = User.FindFirst("MaNhanVien")?.Value;
            if (string.IsNullOrEmpty(maNhanVienStr) || !Guid.TryParse(maNhanVienStr, out var maNhanVien)) return Unauthorized();

            var nhanVien = await _context.NhanViens
                .Include(n => n.MaPhongBanNavigation)
                .Include(n => n.MaChucVuNavigation)
                .FirstOrDefaultAsync(n => n.MaNhanVien == maNhanVien);
            if (nhanVien == null) return NotFound(new { message = "Không tìm thấy nhân viên." });

            var validLoaiDon = new[] { "Nghỉ phép", "Nghỉ phép năm", "Nghỉ không lương", "Thai sản", "Nghỉ thai sản", "Nghỉ ốm", "Nghỉ ốm đau", "Nghỉ việc", "Thôi việc" };
            if (string.IsNullOrEmpty(request.LoaiDon) || !validLoaiDon.Contains(request.LoaiDon))
            {
                return BadRequest(new { message = "Loại đơn không hợp lệ." });
            }

            if (request.NgayKetThuc < request.NgayBatDau)
            {
                return BadRequest(new { message = "Ngày kết thúc không được nhỏ hơn ngày bắt đầu." });
            }

            int songaynghi = 0;
            if (request.LoaiDon == "Thai sản" || request.LoaiDon == "Nghỉ thai sản")
            {
                songaynghi = request.NgayKetThuc.DayNumber - request.NgayBatDau.DayNumber + 1;
                if (songaynghi > 180)
                {
                    return BadRequest(new { message = "Thời gian nghỉ thai sản tối đa là 180 ngày (6 tháng)." });
                }
            }
            else
            {
                for (var d = request.NgayBatDau; d <= request.NgayKetThuc; d = d.AddDays(1))
                {
                    if (d.DayOfWeek != DayOfWeek.Saturday && d.DayOfWeek != DayOfWeek.Sunday) songaynghi++;
                }
            }

            if (songaynghi <= 0) return BadRequest(new { message = "Khoảng thời gian nghỉ không bao gồm ngày làm việc hợp lệ." });

            var hasOverlap = await _context.DonTus.AnyAsync(d =>
                d.MaNhanVien == maNhanVien &&
                d.TrangThai != "Từ chối" &&
                d.TrangThai != "Đã hủy" &&
                request.NgayBatDau <= d.NgayKetThuc &&
                request.NgayKetThuc >= d.NgayBatDau);

            if (hasOverlap)
            {
                return BadRequest(new { message = "Bạn đã có đơn từ khác đang chờ duyệt hoặc đã duyệt trong khoảng thời gian này." });
            }

            if (request.LoaiDon == "Nghỉ phép" || request.LoaiDon == "Nghỉ phép năm")
            {
                var year = request.NgayBatDau.Year;
                var nghiDaDung = await _context.DonTus
                    .Where(d => d.MaNhanVien == maNhanVien && 
                               (d.LoaiDon == "Nghỉ phép" || d.LoaiDon == "Nghỉ phép năm") && 
                               (d.TrangThai == "Đã duyệt" || d.TrangThai == "Chờ duyệt") && 
                               d.NgayBatDau.Year == year)
                    .SumAsync(d => d.SoNgayNghi);

                if (nghiDaDung + songaynghi > 12)
                {
                    return BadRequest(new { message = $"Hạn mức nghỉ phép 12 ngày/năm đã vượt quá (Đã nộp/duyệt: {nghiDaDung} ngày, xin thêm: {songaynghi} ngày, tối đa: 12 ngày)." });
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

            var callerUser = User.FindFirst("TenDangNhap")?.Value ?? User.Identity?.Name ?? "Hệ thống";
            var callerName = User.FindFirst("HoTen")?.Value ?? nhanVien.HoTen;
            var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
            await _nhatKyService.GhiLogAsync(callerUser, callerName, "Tạo đơn từ", $"Nộp đơn {donTu.LoaiDon} (từ {donTu.NgayBatDau} đến {donTu.NgayKetThuc})", "Thành công", ip);

            var responseDto = new DonTuResponseDto
            {
                MaDon = donTu.MaDon,
                MaNhanVien = donTu.MaNhanVien,
                HoTen = donTu.HoTen,
                MaPhongBan = nhanVien.MaPhongBan,
                TenPhongBan = nhanVien.MaPhongBanNavigation?.TenPhongBan,
                TenChucVu = nhanVien.MaChucVuNavigation?.TenChucVu,
                LoaiDon = donTu.LoaiDon,
                LoaiNghi = donTu.LoaiNghi,
                NgayBatDau = donTu.NgayBatDau,
                NgayKetThuc = donTu.NgayKetThuc,
                SoNgayNghi = donTu.SoNgayNghi,
                LyDo = donTu.LyDo,
                TrangThai = donTu.TrangThai
            };

            return Ok(new { message = "Nộp đơn thành công.", data = responseDto });
        }

        [HttpGet("cua-toi")]
        [Authorize]
        public async Task<IActionResult> GetMyDonTu()
        {
            var maNhanVienStr = User.FindFirst("MaNhanVien")?.Value;
            if (!Guid.TryParse(maNhanVienStr, out var maNhanVien)) return Unauthorized();

            var donTus = await _context.DonTus
                .Include(d => d.NguoiDuyetMaNavigation)
                .Include(d => d.MaNhanVienNavigation)
                    .ThenInclude(nv => nv.MaPhongBanNavigation)
                .Include(d => d.MaNhanVienNavigation)
                    .ThenInclude(nv => nv.MaChucVuNavigation)
                .Where(d => d.MaNhanVien == maNhanVien)
                .OrderByDescending(d => d.NgayBatDau)
                .Select(d => new DonTuResponseDto
                {
                    MaDon = d.MaDon,
                    MaNhanVien = d.MaNhanVien,
                    HoTen = d.HoTen,
                    MaPhongBan = d.MaNhanVienNavigation != null ? d.MaNhanVienNavigation.MaPhongBan : null,
                    TenPhongBan = d.MaNhanVienNavigation != null && d.MaNhanVienNavigation.MaPhongBanNavigation != null
                        ? d.MaNhanVienNavigation.MaPhongBanNavigation.TenPhongBan
                        : null,
                    TenChucVu = d.MaNhanVienNavigation != null && d.MaNhanVienNavigation.MaChucVuNavigation != null
                        ? d.MaNhanVienNavigation.MaChucVuNavigation.TenChucVu
                        : null,
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
        [Authorize(Roles = "Chủ doanh nghiệp, Quản lý")]
        public async Task<IActionResult> GetAllDonTu()
        {
            var userRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value ?? User.FindFirst("role")?.Value;
            var maNhanVienStr = User.FindFirst("MaNhanVien")?.Value;
            Guid.TryParse(maNhanVienStr, out var currentNhanVienId);

            var query = _context.DonTus
                .Include(d => d.NguoiDuyetMaNavigation)
                .Include(d => d.MaNhanVienNavigation).ThenInclude(nv => nv.MaChucVuNavigation)
                .Include(d => d.MaNhanVienNavigation).ThenInclude(nv => nv.MaPhongBanNavigation)
                .AsQueryable();

            if (userRole != "Chủ doanh nghiệp")
            {
                var currentNhanVien = await _context.NhanViens
                    .Include(n => n.MaChucVuNavigation)
                    .Include(n => n.MaPhongBanNavigation)
                    .FirstOrDefaultAsync(n => n.MaNhanVien == currentNhanVienId);

                if (currentNhanVien == null || currentNhanVien.MaPhongBan == Guid.Empty)
                {
                    return StatusCode(403, new { message = "Không xác định được phòng ban của người dùng." });
                }

                var chucVu = currentNhanVien.MaChucVuNavigation?.TenChucVu ?? "";
                var phongBan = currentNhanVien.MaPhongBanNavigation?.TenPhongBan ?? "";
                bool isDirector = chucVu.Contains("Giám đốc") || phongBan.Contains("Ban Giám đốc");

                if (!isDirector)
                {
                    query = query.Where(d => d.MaNhanVienNavigation != null && d.MaNhanVienNavigation.MaPhongBan == currentNhanVien.MaPhongBan);
                }
            }

            var donTus = await query
                .OrderByDescending(d => d.NgayBatDau)
                .Select(d => new DonTuResponseDto {
                    MaDon = d.MaDon,
                    MaNhanVien = d.MaNhanVien,
                    HoTen = d.HoTen,
                    MaPhongBan = d.MaNhanVienNavigation != null ? d.MaNhanVienNavigation.MaPhongBan : null,
                    TenPhongBan = d.MaNhanVienNavigation != null && d.MaNhanVienNavigation.MaPhongBanNavigation != null
                        ? d.MaNhanVienNavigation.MaPhongBanNavigation.TenPhongBan
                        : null,
                    TenChucVu = d.MaNhanVienNavigation != null && d.MaNhanVienNavigation.MaChucVuNavigation != null
                        ? d.MaNhanVienNavigation.MaChucVuNavigation.TenChucVu
                        : null,
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
        [Authorize(Roles = "Chủ doanh nghiệp, Quản lý")]
        public async Task<IActionResult> DuyetDonTu(Guid id, [FromBody] DuyetDonTuDto request)
        {
            var donTu = await _context.DonTus.FindAsync(id);
            if (donTu == null) return NotFound(new { message = "Không tìm thấy đơn từ." });

            if (donTu.TrangThai != "Chờ duyệt")
            {
                return BadRequest(new { message = "Chỉ có thể phê duyệt hoặc từ chối đơn từ đang ở trạng thái Chờ duyệt." });
            }

            if (request.TrangThai != "Đã duyệt" && request.TrangThai != "Từ chối")
            {
                return BadRequest(new { message = "Trạng thái phê duyệt không hợp lệ (chỉ chấp nhận 'Đã duyệt' hoặc 'Từ chối')." });
            }

            var maNguoiDuyetStr = User.FindFirst("MaNhanVien")?.Value;
            if (!Guid.TryParse(maNguoiDuyetStr, out var nguoiDuyetMa)) return Unauthorized();

            if (donTu.MaNhanVien == nguoiDuyetMa)
            {
                return BadRequest(new { message = "Quy định doanh nghiệp: Bạn không thể tự phê duyệt đơn từ của chính mình!" });
            }

            var nguoiLamDon = await _context.NhanViens
                .Include(n => n.MaChucVuNavigation)
                .Include(n => n.MaPhongBanNavigation)
                .FirstOrDefaultAsync(n => n.MaNhanVien == donTu.MaNhanVien);

            var nguoiDuyet = await _context.NhanViens
                .Include(n => n.MaChucVuNavigation)
                .Include(n => n.MaPhongBanNavigation)
                .FirstOrDefaultAsync(n => n.MaNhanVien == nguoiDuyetMa);

            if (nguoiLamDon == null || nguoiDuyet == null)
            {
                return BadRequest(new { message = "Không xác định được thông tin nhân sự của người làm đơn hoặc người duyệt." });
            }

            var userRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value ?? User.FindFirst("role")?.Value;
            var chucVuNguoiLamDon = nguoiLamDon.MaChucVuNavigation?.TenChucVu ?? "";
            var chucVuNguoiDuyet = nguoiDuyet.MaChucVuNavigation?.TenChucVu ?? "";
            var phongBanNguoiDuyet = nguoiDuyet.MaPhongBanNavigation?.TenPhongBan ?? "";

            bool isDirector = userRole == "Chủ doanh nghiệp" || chucVuNguoiDuyet.Contains("Giám đốc") || phongBanNguoiDuyet.Contains("Ban Giám đốc");

            if (!isDirector)
            {
                if (nguoiLamDon.MaPhongBan != nguoiDuyet.MaPhongBan)
                {
                    return StatusCode(403, new { message = "Trưởng phòng / Quản lý chỉ được quyền phê duyệt đơn từ của nhân sự thuộc phòng ban của mình!" });
                }

                if (chucVuNguoiLamDon.Contains("Trưởng") || chucVuNguoiLamDon.Contains("Phó"))
                {
                    return StatusCode(403, new { message = $"Đơn từ của {chucVuNguoiLamDon} ({nguoiLamDon.HoTen}) phải do Chủ doanh nghiệp phê duyệt! Quản lý cùng cấp không được duyệt chéo." });
                }
            }

            donTu.TrangThai = request.TrangThai;
            donTu.NguoiDuyetMa = nguoiDuyetMa;
            donTu.NgayDuyet = DateOnly.FromDateTime(DateTime.Now);
            donTu.GhiChuDuyet = request.GhiChuDuyet;

            if (request.TrangThai == "Đã duyệt" && (donTu.LoaiDon == "Nghỉ việc" || donTu.LoaiDon == "Thôi việc"))
            {
                nguoiLamDon.TrangThaiLamViec = "Đã nghỉ việc";
                nguoiLamDon.NgayNghiViec = donTu.NgayKetThuc;

                var taiKhoans = await _context.TaiKhoans
                    .Where(t => t.MaNhanVien == nguoiLamDon.MaNhanVien)
                    .ToListAsync();
                foreach (var taiKhoan in taiKhoans)
                {
                    taiKhoan.TrangThai = "Bị khóa";
                }

                var hopDongs = await _context.HopDongLaoDongs
                    .Where(h => h.MaNhanVien == nguoiLamDon.MaNhanVien &&
                                (h.TrangThai == "Có hiệu lực" || h.TrangThai == "Đang hiệu lực"))
                    .ToListAsync();
                foreach (var hopDong in hopDongs)
                {
                    hopDong.TrangThai = "Đã thanh lý";
                    hopDong.NgayKetThuc = donTu.NgayKetThuc;
                }
            }

            _context.DonTus.Update(donTu);
            await _context.SaveChangesAsync();

            var actionText = request.TrangThai == "Đã duyệt" ? "phê duyệt" : "từ chối";
            var callerUser = User.FindFirst("TenDangNhap")?.Value ?? User.Identity?.Name ?? "Hệ thống";
            var callerName = User.FindFirst("HoTen")?.Value;
            var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
            await _nhatKyService.GhiLogAsync(callerUser, callerName, request.TrangThai == "Đã duyệt" ? "Phê duyệt đơn từ" : "Từ chối đơn từ", $"Đã {actionText} đơn {donTu.LoaiDon} của {donTu.HoTen}", "Thành công", ip);

            return Ok(new { message = $"Đã {actionText} đơn từ thành công." });
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

            donTu.TrangThai = "Đã hủy";
            await _context.SaveChangesAsync();

            var callerUser = User.FindFirst("TenDangNhap")?.Value ?? User.Identity?.Name ?? "Hệ thống";
            var callerName = User.FindFirst("HoTen")?.Value ?? donTu.HoTen;
            var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
            await _nhatKyService.GhiLogAsync(callerUser, callerName, "Hủy đơn từ", $"Hủy đơn {donTu.LoaiDon} ({donTu.NgayBatDau} - {donTu.NgayKetThuc})", "Thành công", ip);

            return Ok(new { message = "Đã huỷ đơn thành công." });
        }
    }
}
