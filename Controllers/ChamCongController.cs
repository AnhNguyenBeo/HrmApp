using HrmApp.Api.Constants;
using HrmApp.Api.Data;
using HrmApp.Api.Data.Models;
using HrmApp.Api.DTOs.ChamCong;
using HrmApp.Api.Services;
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
    public class ChamCongController : ControllerBase
    {
        private readonly QuanLyNhanSuDbContext _context;
        private readonly INhatKyService _nhatKyService;

        public ChamCongController(QuanLyNhanSuDbContext context, INhatKyService nhatKyService)
        {
            _context = context;
            _nhatKyService = nhatKyService;
        }

        [HttpPost("check-in-out")]
        [Authorize]
        public async Task<IActionResult> CheckInOut([FromBody] CheckInOutDto request)
        {
            var maNhanVienStr = User.FindFirst("MaNhanVien")?.Value;
            if (string.IsNullOrEmpty(maNhanVienStr) || !Guid.TryParse(maNhanVienStr, out var maNhanVien))
                return Unauthorized();

            var userRole = User.FindFirst(ClaimTypes.Role)?.Value ?? User.FindFirst("role")?.Value;
            if (userRole == "Chủ doanh nghiệp" || userRole == "Quản trị viên")
            {
                return BadRequest(new { message = "Tài khoản Chủ doanh nghiệp và Quản trị viên không yêu cầu chấm công cá nhân." });
            }

            var today = DateOnly.FromDateTime(DateTime.Now);
            var nowTime = TimeOnly.FromDateTime(DateTime.Now);

            var chamCong = await _context.ChamCongs.FirstOrDefaultAsync(c => c.MaNhanVien == maNhanVien && c.Ngay == today);

            string actionType;
            if (chamCong != null)
            {
                var diffTime = nowTime.ToTimeSpan() - chamCong.GioVao.ToTimeSpan();
                if (diffTime.TotalSeconds >= 0 && diffTime.TotalSeconds < 60)
                {
                    return BadRequest(new { message = "Bạn vừa check-in, vui lòng chờ ít nhất 1 phút trước khi check-out." });
                }

                actionType = "Check-out";
                chamCong.GioRa = nowTime;
                var gioVao = chamCong.GioVao.ToTimeSpan();
                var gioRa = chamCong.GioRa.ToTimeSpan();
                var duration = gioRa - gioVao;
                
                if (duration.TotalHours > 8)
                {
                    chamCong.SoGioTangCa = Math.Round((decimal)(duration.TotalHours - 8), 2);
                }
                else
                {
                    chamCong.SoGioTangCa = 0;
                }
                
                if (chamCong.TrangThai == TrangThaiChamCong.ThieuGioVao)
                {
                    chamCong.TrangThai = TrangThaiChamCong.ThieuGioVaoDaRa;
                }
                else if (chamCong.TrangThai != TrangThaiChamCong.DiMuon)
                {
                    chamCong.TrangThai = TrangThaiChamCong.HoanThanh;
                }

                _context.ChamCongs.Update(chamCong);
            }
            else
            {
                actionType = "Check-in";
                var newChamCong = new ChamCong
                {
                    MaChamCong = Guid.NewGuid(),
                    MaNhanVien = maNhanVien,
                    Ngay = today,
                    GioVao = nowTime,
                    GioRa = TimeOnly.MinValue
                };
                
                if (nowTime.Hour >= 12)
                {
                    newChamCong.TrangThai = TrangThaiChamCong.ThieuGioVao;
                }
                else if (nowTime > new TimeOnly(8, 30))
                {
                    newChamCong.TrangThai = TrangThaiChamCong.DiMuon;
                }
                else
                {
                    newChamCong.TrangThai = TrangThaiChamCong.DaCheckIn;
                }
                await _context.ChamCongs.AddAsync(newChamCong);
            }

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                return Conflict(new { message = "Yêu cầu chấm công bị trùng, vui lòng thử lại." });
            }

            var callerUser = User.FindFirst("TenDangNhap")?.Value ?? User.Identity?.Name ?? "Hệ thống";
            var callerName = User.FindFirst("HoTen")?.Value;
            var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
            await _nhatKyService.GhiLogAsync(callerUser, callerName, "Chấm công", $"{actionType} ngày {today:dd/MM/yyyy} vào lúc {nowTime:HH\\:mm\\:ss}", "Thành công", ip);

            return Ok(new { message = $"Ghi nhận {actionType} thành công." });
        }

        [HttpGet("cua-toi")]
        [Authorize]
        public async Task<IActionResult> GetMyAttendance([FromQuery] int? month, [FromQuery] int? year)
        {
            var maNhanVienStr = User.FindFirst("MaNhanVien")?.Value;
            if (string.IsNullOrEmpty(maNhanVienStr) || !Guid.TryParse(maNhanVienStr, out var maNhanVien)) return Unauthorized();

            if ((month.HasValue && !year.HasValue) || (!month.HasValue && year.HasValue))
            {
                return BadRequest(new { message = "Vui lòng cung cấp cả tháng và năm để lọc dữ liệu." });
            }

            var query = _context.ChamCongs
                .Include(c => c.MaNhanVienNavigation)
                    .ThenInclude(nv => nv.MaPhongBanNavigation)
                .Include(c => c.MaNhanVienNavigation)
                    .ThenInclude(nv => nv.MaChucVuNavigation)
                .Where(c => c.MaNhanVien == maNhanVien);

            if (month.HasValue && year.HasValue) query = query.Where(c => c.Ngay.Month == month.Value && c.Ngay.Year == year.Value);

            var result = await query.Select(c => new ChamCongResponseDto {
                MaChamCong = c.MaChamCong,
                MaNhanVien = c.MaNhanVien,
                HoTen = c.MaNhanVienNavigation != null ? c.MaNhanVienNavigation.HoTen : null,
                MaPhongBan = c.MaNhanVienNavigation != null ? c.MaNhanVienNavigation.MaPhongBan : null,
                TenPhongBan = c.MaNhanVienNavigation != null && c.MaNhanVienNavigation.MaPhongBanNavigation != null ? c.MaNhanVienNavigation.MaPhongBanNavigation.TenPhongBan : null,
                TenChucVu = c.MaNhanVienNavigation != null && c.MaNhanVienNavigation.MaChucVuNavigation != null ? c.MaNhanVienNavigation.MaChucVuNavigation.TenChucVu : null,
                Ngay = c.Ngay,
                GioVao = c.GioVao,
                GioRa = c.GioRa,
                SoGioTangCa = c.SoGioTangCa,
                TrangThai = c.TrangThai
            }).OrderByDescending(c => c.Ngay).ToListAsync();

            return Ok(result);
        }

        [HttpGet]
        [Authorize(Roles = "Chủ doanh nghiệp, Quản lý")]
        public async Task<IActionResult> GetAllAttendance([FromQuery] int? month, [FromQuery] int? year, [FromQuery] Guid? maPhongBan)
        {
            var userRole = User.FindFirst(ClaimTypes.Role)?.Value ?? User.FindFirst("role")?.Value;
            var maNhanVienStr = User.FindFirst("MaNhanVien")?.Value;
            Guid.TryParse(maNhanVienStr, out var currentNhanVienId);

            if ((month.HasValue && !year.HasValue) || (!month.HasValue && year.HasValue))
            {
                return BadRequest(new { message = "Vui lòng cung cấp cả tháng và năm để lọc dữ liệu." });
            }

            var query = _context.ChamCongs
                .Include(c => c.MaNhanVienNavigation)
                    .ThenInclude(nv => nv.MaPhongBanNavigation)
                .Include(c => c.MaNhanVienNavigation)
                    .ThenInclude(nv => nv.MaChucVuNavigation)
                .AsQueryable();

            if (month.HasValue && year.HasValue)
            {
                query = query.Where(c => c.Ngay.Month == month.Value && c.Ngay.Year == year.Value);
            }

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

                var myChucVu = currentNhanVien.MaChucVuNavigation?.TenChucVu ?? "";
                var myPhongBan = currentNhanVien.MaPhongBanNavigation?.TenPhongBan ?? "";
                bool isDirector = myChucVu.Contains("Giám đốc") || myPhongBan.Contains("Ban Giám đốc");

                if (!isDirector)
                {
                    query = query.Where(c => c.MaNhanVienNavigation != null && c.MaNhanVienNavigation.MaPhongBan == currentNhanVien.MaPhongBan);
                }
            }
            else if (maPhongBan.HasValue)
            {
                query = query.Where(c => c.MaNhanVienNavigation != null && c.MaNhanVienNavigation.MaPhongBan == maPhongBan.Value);
            }

            var result = await query
                .OrderByDescending(c => c.Ngay)
                .Select(c => new ChamCongResponseDto
                {
                    MaChamCong = c.MaChamCong,
                    MaNhanVien = c.MaNhanVien,
                    HoTen = c.MaNhanVienNavigation != null ? c.MaNhanVienNavigation.HoTen : null,
                    MaPhongBan = c.MaNhanVienNavigation != null ? c.MaNhanVienNavigation.MaPhongBan : null,
                    TenPhongBan = c.MaNhanVienNavigation != null && c.MaNhanVienNavigation.MaPhongBanNavigation != null ? c.MaNhanVienNavigation.MaPhongBanNavigation.TenPhongBan : null,
                    TenChucVu = c.MaNhanVienNavigation != null && c.MaNhanVienNavigation.MaChucVuNavigation != null ? c.MaNhanVienNavigation.MaChucVuNavigation.TenChucVu : null,
                    Ngay = c.Ngay,
                    GioVao = c.GioVao,
                    GioRa = c.GioRa,
                    SoGioTangCa = c.SoGioTangCa,
                    TrangThai = c.TrangThai
                })
                .ToListAsync();

            return Ok(result);
        }
    }
}