using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HrmApp.Api.Data;
using HrmApp.Api.Data.Models;
using HrmApp.Api.DTOs.HopDong;
using HrmApp.Api.Services;

namespace HrmApp.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class HopDongController : ControllerBase
    {
        private readonly QuanLyNhanSuDbContext _context;
        private readonly INhatKyService _nhatKyService;

        public HopDongController(QuanLyNhanSuDbContext context, INhatKyService nhatKyService)
        {
            _context = context;
            _nhatKyService = nhatKyService;
        }

        private async Task<(bool IsOwner, bool IsHRManager, Guid CurrentNhanVienId)> GetCallerInfoAsync()
        {
            var callerRole = User.FindFirst(ClaimTypes.Role)?.Value ?? User.FindFirst("role")?.Value;
            var callerNhanVienIdStr = User.FindFirst("MaNhanVien")?.Value;
            Guid.TryParse(callerNhanVienIdStr, out var currentNhanVienId);

            bool isOwner = callerRole == "Chủ doanh nghiệp";
            if (isOwner) return (true, false, currentNhanVienId);

            var callerNhanVien = await _context.NhanViens
                .Include(n => n.MaPhongBanNavigation)
                .FirstOrDefaultAsync(n => n.MaNhanVien == currentNhanVienId);

            var deptName = callerNhanVien?.MaPhongBanNavigation?.TenPhongBan ?? "";
            bool isHRManager = callerRole == "Quản lý" && deptName.Contains("Nhân sự");

            return (false, isHRManager, currentNhanVienId);
        }

        [HttpGet]
        [Authorize]
        public async Task<ActionResult<System.Collections.Generic.IEnumerable<HopDongResponseDto>>> GetHopDongs([FromQuery] Guid? nhanVienId)
        {
            var (isOwner, isHRManager, currentNhanVienId) = await GetCallerInfoAsync();

            var query = _context.HopDongLaoDongs
                .Include(h => h.MaNhanVienNavigation)
                .AsQueryable();

            if (!isOwner && !isHRManager)
            {
                if (nhanVienId.HasValue && nhanVienId.Value != currentNhanVienId)
                {
                    return StatusCode(403, new { message = "Bạn chỉ có quyền xem hợp đồng lao động của chính mình." });
                }
                query = query.Where(h => h.MaNhanVien == currentNhanVienId);
            }
            else if (nhanVienId.HasValue)
            {
                query = query.Where(h => h.MaNhanVien == nhanVienId.Value);
            }

            var result = await query.Select(h => new HopDongResponseDto
            {
                MaHopDong = h.MaHopDong,
                MaNhanVien = h.MaNhanVien,
                TenNhanVien = h.MaNhanVienNavigation != null ? h.MaNhanVienNavigation.HoTen : "",
                LoaiHopDong = h.LoaiHopDong,
                NgayBatDau = h.NgayBatDau,
                NgayKetThuc = h.NgayKetThuc,
                LuongCoBan = h.LuongCoBan,
                TrangThai = h.TrangThai,
                LuongThuong = h.LuongThuong
            }).ToListAsync();

            return Ok(result);
        }

        [HttpGet("{id}")]
        [Authorize]
        public async Task<ActionResult<HopDongResponseDto>> GetHopDong(Guid id)
        {
            var (isOwner, isHRManager, currentNhanVienId) = await GetCallerInfoAsync();

            var hopDong = await _context.HopDongLaoDongs
                .Include(h => h.MaNhanVienNavigation)
                .FirstOrDefaultAsync(h => h.MaHopDong == id);

            if (hopDong == null)
            {
                return NotFound(new { message = "Không tìm thấy hợp đồng." });
            }

            if (!isOwner && !isHRManager && hopDong.MaNhanVien != currentNhanVienId)
            {
                return StatusCode(403, new { message = "Bạn không có quyền xem hợp đồng của người khác." });
            }

            var response = new HopDongResponseDto
            {
                MaHopDong = hopDong.MaHopDong,
                MaNhanVien = hopDong.MaNhanVien,
                TenNhanVien = hopDong.MaNhanVienNavigation != null ? hopDong.MaNhanVienNavigation.HoTen : "",
                LoaiHopDong = hopDong.LoaiHopDong,
                NgayBatDau = hopDong.NgayBatDau,
                NgayKetThuc = hopDong.NgayKetThuc,
                LuongCoBan = hopDong.LuongCoBan,
                TrangThai = hopDong.TrangThai,
                LuongThuong = hopDong.LuongThuong
            };

            return Ok(response);
        }

        [HttpPost]
        [Authorize]
        public async Task<ActionResult<HopDongResponseDto>> PostHopDong([FromBody] CreateHopDongDto dto)
        {
            var (isOwner, isHRManager, currentNhanVienId) = await GetCallerInfoAsync();
            if (!isOwner && !isHRManager)
            {
                return StatusCode(403, new { message = "Chỉ Chủ doanh nghiệp và Quản lý phòng Nhân sự mới có quyền tạo hợp đồng lao động." });
            }

            if (!isOwner && dto.MaNhanVien == currentNhanVienId)
            {
                return BadRequest(new { message = "Bạn không thể tự tạo hợp đồng cho chính mình." });
            }

            var nhanVien = await _context.NhanViens.FindAsync(dto.MaNhanVien);
            if (nhanVien == null)
            {
                return NotFound(new { message = "Không tìm thấy nhân viên được gán hợp đồng." });
            }

            var hopDong = new HopDongLaoDong
            {
                MaHopDong = Guid.NewGuid(),
                MaNhanVien = dto.MaNhanVien,
                LoaiHopDong = dto.LoaiHopDong,
                NgayBatDau = dto.NgayBatDau,
                NgayKetThuc = dto.NgayKetThuc,
                LuongCoBan = dto.LuongCoBan,
                TrangThai = dto.TrangThai,
                LuongThuong = dto.LuongThuong
            };

            _context.HopDongLaoDongs.Add(hopDong);
            await _context.SaveChangesAsync();

            var callerUser = User.FindFirst("TenDangNhap")?.Value ?? User.Identity?.Name ?? "Hệ thống";
            var callerName = User.FindFirst("HoTen")?.Value;
            var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
            await _nhatKyService.GhiLogAsync(callerUser, callerName, "Tạo hợp đồng", $"Tạo hợp đồng {hopDong.LoaiHopDong} cho nhân sự '{nhanVien.HoTen}'", "Thành công", ip);

            return CreatedAtAction(nameof(GetHopDong), new { id = hopDong.MaHopDong }, null);
        }

        [HttpPut("{id}")]
        [Authorize]
        public async Task<IActionResult> PutHopDong(Guid id, [FromBody] UpdateHopDongDto dto)
        {
            var (isOwner, isHRManager, currentNhanVienId) = await GetCallerInfoAsync();
            if (!isOwner && !isHRManager)
            {
                return StatusCode(403, new { message = "Chỉ Chủ doanh nghiệp và Quản lý phòng Nhân sự mới có quyền cập nhật hợp đồng lao động." });
            }

            var hopDong = await _context.HopDongLaoDongs
                .Include(h => h.MaNhanVienNavigation)
                .FirstOrDefaultAsync(h => h.MaHopDong == id);

            if (hopDong == null)
            {
                return NotFound(new { message = "Không tìm thấy hợp đồng." });
            }

            if (!isOwner && hopDong.MaNhanVien == currentNhanVienId)
            {
                return BadRequest(new { message = "Bạn không thể tự chỉnh sửa hợp đồng của chính mình." });
            }

            hopDong.LoaiHopDong = dto.LoaiHopDong;
            hopDong.NgayBatDau = dto.NgayBatDau;
            hopDong.NgayKetThuc = dto.NgayKetThuc;
            hopDong.LuongCoBan = dto.LuongCoBan;
            hopDong.TrangThai = dto.TrangThai;
            hopDong.LuongThuong = dto.LuongThuong;

            await _context.SaveChangesAsync();

            var callerUser = User.FindFirst("TenDangNhap")?.Value ?? User.Identity?.Name ?? "Hệ thống";
            var callerName = User.FindFirst("HoTen")?.Value;
            var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
            var targetName = hopDong.MaNhanVienNavigation?.HoTen ?? hopDong.MaNhanVien.ToString();
            await _nhatKyService.GhiLogAsync(callerUser, callerName, "Cập nhật hợp đồng", $"Cập nhật hợp đồng {hopDong.LoaiHopDong} của nhân sự '{targetName}'", "Thành công", ip);

            return NoContent();
        }

        [HttpPut("{id}/cham-dut")]
        [Authorize]
        public async Task<IActionResult> TerminateHopDong(Guid id)
        {
            var (isOwner, isHRManager, currentNhanVienId) = await GetCallerInfoAsync();
            if (!isOwner && !isHRManager)
            {
                return StatusCode(403, new { message = "Chỉ Chủ doanh nghiệp và Quản lý phòng Nhân sự mới có quyền chấm dứt hợp đồng lao động." });
            }

            var hopDong = await _context.HopDongLaoDongs
                .Include(h => h.MaNhanVienNavigation)
                .FirstOrDefaultAsync(h => h.MaHopDong == id);

            if (hopDong == null)
            {
                return NotFound(new { message = "Không tìm thấy hợp đồng." });
            }

            if (!isOwner && hopDong.MaNhanVien == currentNhanVienId)
            {
                return BadRequest(new { message = "Bạn không thể tự chấm dứt hợp đồng của chính mình." });
            }

            hopDong.TrangThai = "Đã chấm dứt";
            hopDong.NgayKetThuc = DateOnly.FromDateTime(DateTime.Now);

            await _context.SaveChangesAsync();

            var callerUser = User.FindFirst("TenDangNhap")?.Value ?? User.Identity?.Name ?? "Hệ thống";
            var callerName = User.FindFirst("HoTen")?.Value;
            var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
            var targetName = hopDong.MaNhanVienNavigation?.HoTen ?? hopDong.MaNhanVien.ToString();
            await _nhatKyService.GhiLogAsync(callerUser, callerName, "Chấm dứt hợp đồng", $"Chấm dứt hợp đồng của nhân sự '{targetName}'", "Thành công", ip);

            return NoContent();
        }
    }
}