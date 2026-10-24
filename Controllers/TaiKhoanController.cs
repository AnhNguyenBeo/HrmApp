using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HrmApp.Api.Data;
using HrmApp.Api.Data.Models;
using HrmApp.Api.DTOs.TaiKhoan;
using HrmApp.Api.Services;

namespace HrmApp.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TaiKhoanController : ControllerBase
    {
        private readonly QuanLyNhanSuDbContext _context;
        private readonly INhatKyService _nhatKyService;

        public TaiKhoanController(QuanLyNhanSuDbContext context, INhatKyService nhatKyService)
        {
            _context = context;
            _nhatKyService = nhatKyService;
        }

        [HttpGet]
        [Authorize(Roles = "Quản trị viên")]
        public async Task<ActionResult<System.Collections.Generic.IEnumerable<TaiKhoanResponseDto>>> GetTaiKhoans()
        {
            var result = await _context.TaiKhoans
                .Include(t => t.MaNhanVienNavigation)
                    .ThenInclude(nv => nv.MaPhongBanNavigation)
                .Include(t => t.MaNhanVienNavigation)
                    .ThenInclude(nv => nv.MaChucVuNavigation)
                .Include(t => t.MaVaiTroNavigation)
                .Select(t => new TaiKhoanResponseDto
                {
                    MaTaiKhoan = t.MaTaiKhoan,
                    MaNhanVien = t.MaNhanVien,
                    TenNhanVien = t.MaNhanVienNavigation != null ? t.MaNhanVienNavigation.HoTen : "",
                    TenPhongBan = t.MaNhanVienNavigation != null && t.MaNhanVienNavigation.MaPhongBanNavigation != null ? t.MaNhanVienNavigation.MaPhongBanNavigation.TenPhongBan : "",
                    TenChucVu = t.MaNhanVienNavigation != null && t.MaNhanVienNavigation.MaChucVuNavigation != null ? t.MaNhanVienNavigation.MaChucVuNavigation.TenChucVu : "",
                    TenDangNhap = t.TenDangNhap,
                    MaVaiTro = t.MaVaiTro,
                    TenVaiTro = t.MaVaiTroNavigation != null ? t.MaVaiTroNavigation.TenVaiTro : "",
                    TrangThai = t.TrangThai,
                    NgayTao = t.NgayTao
                })
                .ToListAsync();

            return Ok(result);
        }

        [HttpGet("{id}")]
        [Authorize(Roles = "Quản trị viên")]
        public async Task<ActionResult<TaiKhoanResponseDto>> GetTaiKhoan(Guid id)
        {
            var taiKhoan = await _context.TaiKhoans
                .Include(t => t.MaNhanVienNavigation)
                    .ThenInclude(nv => nv.MaPhongBanNavigation)
                .Include(t => t.MaNhanVienNavigation)
                    .ThenInclude(nv => nv.MaChucVuNavigation)
                .Include(t => t.MaVaiTroNavigation)
                .Where(t => t.MaTaiKhoan == id)
                .Select(t => new TaiKhoanResponseDto
                {
                    MaTaiKhoan = t.MaTaiKhoan,
                    MaNhanVien = t.MaNhanVien,
                    TenNhanVien = t.MaNhanVienNavigation != null ? t.MaNhanVienNavigation.HoTen : "",
                    TenPhongBan = t.MaNhanVienNavigation != null && t.MaNhanVienNavigation.MaPhongBanNavigation != null ? t.MaNhanVienNavigation.MaPhongBanNavigation.TenPhongBan : "",
                    TenChucVu = t.MaNhanVienNavigation != null && t.MaNhanVienNavigation.MaChucVuNavigation != null ? t.MaNhanVienNavigation.MaChucVuNavigation.TenChucVu : "",
                    TenDangNhap = t.TenDangNhap,
                    MaVaiTro = t.MaVaiTro,
                    TenVaiTro = t.MaVaiTroNavigation != null ? t.MaVaiTroNavigation.TenVaiTro : "",
                    TrangThai = t.TrangThai,
                    NgayTao = t.NgayTao
                })
                .FirstOrDefaultAsync();

            if (taiKhoan == null)
            {
                return NotFound("Không tìm thấy tài khoản.");
            }

            return Ok(taiKhoan);
        }

        [HttpPost]
        [Authorize(Roles = "Quản trị viên")]
        public async Task<ActionResult<TaiKhoanResponseDto>> PostTaiKhoan([FromBody] CreateTaiKhoanDto dto)
        {
            var exists = await _context.TaiKhoans.AnyAsync(t => t.TenDangNhap == dto.TenDangNhap);
            if (exists)
            {
                return BadRequest("Tên đăng nhập đã tồn tại.");
            }

            var taiKhoan = new TaiKhoan
            {
                MaTaiKhoan = Guid.NewGuid(),
                MaNhanVien = dto.MaNhanVien,
                TenDangNhap = dto.TenDangNhap,
                MatKhauHash = BCrypt.Net.BCrypt.HashPassword(dto.MatKhau),
                MaVaiTro = dto.MaVaiTro,
                TrangThai = dto.TrangThai,
                NgayTao = DateOnly.FromDateTime(DateTime.Now)
            };

            _context.TaiKhoans.Add(taiKhoan);
            await _context.SaveChangesAsync();

            var callerUser = User.FindFirst("TenDangNhap")?.Value ?? User.Identity?.Name ?? "Hệ thống";
            var callerName = User.FindFirst("HoTen")?.Value;
            var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
            await _nhatKyService.GhiLogAsync(callerUser, callerName, "Cấp tài khoản", $"Tạo mới tài khoản '{dto.TenDangNhap}' cho nhân viên", "Thành công", ip);

            return CreatedAtAction(nameof(GetTaiKhoan), new { id = taiKhoan.MaTaiKhoan }, null);
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Quản trị viên")]
        public async Task<IActionResult> PutTaiKhoan(Guid id, [FromBody] UpdateTaiKhoanDto dto)
        {
            var taiKhoan = await _context.TaiKhoans.FindAsync(id);
            if (taiKhoan == null)
            {
                return NotFound("Không tìm thấy tài khoản.");
            }

            taiKhoan.MaVaiTro = dto.MaVaiTro;
            taiKhoan.TrangThai = dto.TrangThai;

            await _context.SaveChangesAsync();

            var callerUser = User.FindFirst("TenDangNhap")?.Value ?? User.Identity?.Name ?? "Hệ thống";
            var callerName = User.FindFirst("HoTen")?.Value;
            var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
            await _nhatKyService.GhiLogAsync(callerUser, callerName, "Cập nhật tài khoản", $"Cập nhật trạng thái/vai trò cho tài khoản '{taiKhoan.TenDangNhap}'", "Thành công", ip);

            return NoContent();
        }

        [HttpPut("{id}/doi-mat-khau")]
        [Authorize]
        public async Task<IActionResult> DoiMatKhau(Guid id, [FromBody] ChangePasswordDto dto)
        {
            var taiKhoan = await _context.TaiKhoans.FindAsync(id);
            if (taiKhoan == null)
            {
                return NotFound("Không tìm thấy tài khoản.");
            }

            var callerUser = User.FindFirst("TenDangNhap")?.Value ?? User.Identity?.Name ?? taiKhoan.TenDangNhap;
            var callerName = User.FindFirst("HoTen")?.Value;
            var ip = HttpContext.Connection.RemoteIpAddress?.ToString();

            if (!BCrypt.Net.BCrypt.Verify(dto.MatKhauCu, taiKhoan.MatKhauHash))
            {
                await _nhatKyService.GhiLogAsync(callerUser, callerName, "Đổi mật khẩu", $"Đổi mật khẩu thất bại (mật khẩu cũ sai) cho '{taiKhoan.TenDangNhap}'", "Thất bại", ip);
                return BadRequest("Mật khẩu cũ không chính xác.");
            }

            taiKhoan.MatKhauHash = BCrypt.Net.BCrypt.HashPassword(dto.MatKhauMoi);
            await _context.SaveChangesAsync();

            await _nhatKyService.GhiLogAsync(callerUser, callerName, "Đổi mật khẩu", $"Đổi mật khẩu thành công cho tài khoản '{taiKhoan.TenDangNhap}'", "Thành công", ip);

            return NoContent();
        }

        [HttpPut("{id}/vai-tro")]
        [Authorize(Roles = "Quản trị viên")]
        public async Task<IActionResult> ChangeRole(Guid id, [FromBody] Guid maVaiTro)
        {
            var taiKhoan = await _context.TaiKhoans.FindAsync(id);
            if (taiKhoan == null)
            {
                return NotFound("Không tìm thấy tài khoản.");
            }

            taiKhoan.MaVaiTro = maVaiTro;
            await _context.SaveChangesAsync();

            var callerUser = User.FindFirst("TenDangNhap")?.Value ?? User.Identity?.Name ?? "Hệ thống";
            var callerName = User.FindFirst("HoTen")?.Value;
            var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
            await _nhatKyService.GhiLogAsync(callerUser, callerName, "Phân quyền", $"Thay đổi vai trò cho tài khoản '{taiKhoan.TenDangNhap}'", "Thành công", ip);

            return NoContent();
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Quản trị viên")]
        public async Task<IActionResult> DeleteTaiKhoan(Guid id)
        {
            var taiKhoan = await _context.TaiKhoans.FindAsync(id);
            if (taiKhoan == null)
            {
                return NotFound("Không tìm thấy tài khoản.");
            }

            taiKhoan.TrangThai = taiKhoan.TrangThai == "Hoạt động" ? "Bị khóa" : "Hoạt động";
            await _context.SaveChangesAsync();

            var callerUser = User.FindFirst("TenDangNhap")?.Value ?? User.Identity?.Name ?? "Hệ thống";
            var callerName = User.FindFirst("HoTen")?.Value;
            var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
            var act = taiKhoan.TrangThai == "Hoạt động" ? "Mở khóa tài khoản" : "Khóa tài khoản";
            await _nhatKyService.GhiLogAsync(callerUser, callerName, act, $"{act} '{taiKhoan.TenDangNhap}'", "Thành công", ip);

            return Ok(new { message = taiKhoan.TrangThai == "Hoạt động" ? "Mở khóa tài khoản thành công." : "Đã khóa tài khoản.", trangThai = taiKhoan.TrangThai });
        }

        [HttpPut("{id}/mo-khoa")]
        [Authorize(Roles = "Quản trị viên")]
        public async Task<IActionResult> MoKhoaTaiKhoan(Guid id)
        {
            var taiKhoan = await _context.TaiKhoans.FindAsync(id);
            if (taiKhoan == null)
            {
                return NotFound("Không tìm thấy tài khoản.");
            }

            taiKhoan.TrangThai = "Hoạt động";
            await _context.SaveChangesAsync();

            var callerUser = User.FindFirst("TenDangNhap")?.Value ?? User.Identity?.Name ?? "Hệ thống";
            var callerName = User.FindFirst("HoTen")?.Value;
            var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
            await _nhatKyService.GhiLogAsync(callerUser, callerName, "Mở khóa tài khoản", $"Mở khóa tài khoản '{taiKhoan.TenDangNhap}'", "Thành công", ip);

            return Ok(new { message = "Mở khóa tài khoản thành công." });
        }
    }
}
