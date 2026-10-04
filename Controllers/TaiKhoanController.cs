using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HrmApp.Api.Data;
using HrmApp.Api.Data.Models;
using HrmApp.Api.DTOs.TaiKhoan;

namespace HrmApp.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TaiKhoanController : ControllerBase
    {
        private readonly QuanLyNhanSuDbContext _context;

        public TaiKhoanController(QuanLyNhanSuDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Lấy danh sách tài khoản
        /// </summary>
        [HttpGet]
        [Authorize(Roles = "Quản trị viên")]
        public async Task<ActionResult<System.Collections.Generic.IEnumerable<TaiKhoanResponseDto>>> GetTaiKhoans()
        {
            var result = await _context.TaiKhoans
                .Include(t => t.MaNhanVienNavigation)
                .Include(t => t.MaVaiTroNavigation)
                .Select(t => new TaiKhoanResponseDto
                {
                    MaTaiKhoan = t.MaTaiKhoan,
                    MaNhanVien = t.MaNhanVien,
                    TenNhanVien = t.MaNhanVienNavigation != null ? t.MaNhanVienNavigation.HoTen : "",
                    TenDangNhap = t.TenDangNhap,
                    MaVaiTro = t.MaVaiTro,
                    TenVaiTro = t.MaVaiTroNavigation != null ? t.MaVaiTroNavigation.TenVaiTro : "",
                    TrangThai = t.TrangThai,
                    NgayTao = t.NgayTao
                })
                .ToListAsync();

            return Ok(result);
        }

        /// <summary>
        /// Lấy thông tin tài khoản
        /// </summary>
        [HttpGet("{id}")]
        [Authorize(Roles = "Quản trị viên")]
        public async Task<ActionResult<TaiKhoanResponseDto>> GetTaiKhoan(Guid id)
        {
            var taiKhoan = await _context.TaiKhoans
                .Include(t => t.MaNhanVienNavigation)
                .Include(t => t.MaVaiTroNavigation)
                .Where(t => t.MaTaiKhoan == id)
                .Select(t => new TaiKhoanResponseDto
                {
                    MaTaiKhoan = t.MaTaiKhoan,
                    MaNhanVien = t.MaNhanVien,
                    TenNhanVien = t.MaNhanVienNavigation != null ? t.MaNhanVienNavigation.HoTen : "",
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

        /// <summary>
        /// Tạo tài khoản mới
        /// </summary>
        [HttpPost]
        [Authorize(Roles = "Quản trị viên")]
        public async Task<ActionResult<TaiKhoanResponseDto>> PostTaiKhoan([FromBody] CreateTaiKhoanDto dto)
        {
            // Kiểm tra trùng tên đăng nhập
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

            return CreatedAtAction(nameof(GetTaiKhoan), new { id = taiKhoan.MaTaiKhoan }, null);
        }

        /// <summary>
        /// Cập nhật tài khoản (Vai trò, Trạng thái)
        /// </summary>
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

            return NoContent();
        }

        /// <summary>
        /// Đổi mật khẩu
        /// </summary>
        [HttpPut("{id}/doi-mat-khau")]
        [Authorize]
        public async Task<IActionResult> DoiMatKhau(Guid id, [FromBody] ChangePasswordDto dto)
        {
            var taiKhoan = await _context.TaiKhoans.FindAsync(id);
            if (taiKhoan == null)
            {
                return NotFound("Không tìm thấy tài khoản.");
            }

            if (!BCrypt.Net.BCrypt.Verify(dto.MatKhauCu, taiKhoan.MatKhauHash))
            {
                return BadRequest("Mật khẩu cũ không chính xác.");
            }

            taiKhoan.MatKhauHash = BCrypt.Net.BCrypt.HashPassword(dto.MatKhauMoi);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        /// <summary>
        /// Đổi vai trò
        /// </summary>
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

            return NoContent();
        }

        /// <summary>
        /// Khóa tài khoản
        /// </summary>
        [HttpDelete("{id}")]
        [Authorize(Roles = "Quản trị viên")]
        public async Task<IActionResult> DeleteTaiKhoan(Guid id)
        {
            var taiKhoan = await _context.TaiKhoans.FindAsync(id);
            if (taiKhoan == null)
            {
                return NotFound("Không tìm thấy tài khoản.");
            }

            taiKhoan.TrangThai = "Bị khóa";
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}
