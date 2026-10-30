using System;
using System.Linq;
using System.Security.Claims;
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

        private (bool IsOwner, Guid CallerTaiKhoanId) GetCallerContext()
        {
            var callerRole = User.FindFirst(ClaimTypes.Role)?.Value ?? User.FindFirst("role")?.Value;
            var callerTaiKhoanIdStr = User.FindFirst("MaTaiKhoan")?.Value;
            Guid.TryParse(callerTaiKhoanIdStr, out var callerTaiKhoanId);
            return (callerRole == "Chủ doanh nghiệp", callerTaiKhoanId);
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
            var tenDangNhap = dto.TenDangNhap.Trim();
            if (tenDangNhap.Contains(" "))
            {
                return BadRequest(new { message = "Tên đăng nhập không được chứa khoảng trắng." });
            }

            if (string.IsNullOrWhiteSpace(dto.TrangThai))
            {
                dto.TrangThai = "Hoạt động";
            }

            if (dto.TrangThai != "Hoạt động" && dto.TrangThai != "Bị khóa")
            {
                return BadRequest(new { message = "Trạng thái tài khoản không hợp lệ, chỉ chấp nhận 'Hoạt động' hoặc 'Bị khóa'." });
            }

            var exists = await _context.TaiKhoans.AnyAsync(t => t.TenDangNhap == tenDangNhap);
            if (exists)
            {
                return BadRequest(new { message = "Tên đăng nhập đã tồn tại." });
            }

            var nhanVienHasAccount = await _context.TaiKhoans.AnyAsync(t => t.MaNhanVien == dto.MaNhanVien);
            if (nhanVienHasAccount)
            {
                return BadRequest(new { message = "Nhân viên này đã được cấp tài khoản trong hệ thống." });
            }

            var nhanVien = await _context.NhanViens
                .Include(nv => nv.MaPhongBanNavigation)
                .Include(nv => nv.MaChucVuNavigation)
                .FirstOrDefaultAsync(nv => nv.MaNhanVien == dto.MaNhanVien);
            if (nhanVien == null)
            {
                return BadRequest(new { message = "Nhân viên không tồn tại trong hệ thống." });
            }

            if (nhanVien.TrangThaiLamViec == "Đã nghỉ việc")
            {
                return BadRequest(new { message = "Không thể cấp tài khoản cho nhân viên đã nghỉ việc." });
            }

            var vaiTro = await _context.VaiTros.FindAsync(dto.MaVaiTro);
            if (vaiTro == null)
            {
                return BadRequest(new { message = "Vai trò không tồn tại trong hệ thống." });
            }

            var (isOwner, _) = GetCallerContext();
            if (vaiTro.TenVaiTro == "Chủ doanh nghiệp" && !isOwner)
            {
                return StatusCode(403, new { message = "Chỉ Chủ doanh nghiệp mới có quyền gán vai trò Chủ doanh nghiệp." });
            }

            var taiKhoan = new TaiKhoan
            {
                MaTaiKhoan = Guid.NewGuid(),
                MaNhanVien = dto.MaNhanVien,
                TenDangNhap = tenDangNhap,
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
            await _nhatKyService.GhiLogAsync(callerUser, callerName, "Tạo tài khoản", $"Tạo mới tài khoản '{taiKhoan.TenDangNhap}' cho nhân viên '{nhanVien.HoTen}'", "Thành công", ip);

            var responseDto = new TaiKhoanResponseDto
            {
                MaTaiKhoan = taiKhoan.MaTaiKhoan,
                MaNhanVien = taiKhoan.MaNhanVien,
                TenNhanVien = nhanVien.HoTen,
                TenPhongBan = nhanVien.MaPhongBanNavigation != null ? nhanVien.MaPhongBanNavigation.TenPhongBan : "",
                TenChucVu = nhanVien.MaChucVuNavigation != null ? nhanVien.MaChucVuNavigation.TenChucVu : "",
                TenDangNhap = taiKhoan.TenDangNhap,
                MaVaiTro = taiKhoan.MaVaiTro,
                TenVaiTro = vaiTro.TenVaiTro,
                TrangThai = taiKhoan.TrangThai,
                NgayTao = taiKhoan.NgayTao
            };

            return CreatedAtAction(nameof(GetTaiKhoan), new { id = taiKhoan.MaTaiKhoan }, responseDto);
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Quản trị viên")]
        public async Task<IActionResult> PutTaiKhoan(Guid id, [FromBody] UpdateTaiKhoanDto dto)
        {
            if (dto.TrangThai != "Hoạt động" && dto.TrangThai != "Bị khóa")
            {
                return BadRequest(new { message = "Trạng thái tài khoản không hợp lệ, chỉ chấp nhận 'Hoạt động' hoặc 'Bị khóa'." });
            }

            var taiKhoan = await _context.TaiKhoans
                .Include(t => t.MaVaiTroNavigation)
                .FirstOrDefaultAsync(t => t.MaTaiKhoan == id);

            if (taiKhoan == null)
            {
                return NotFound(new { message = "Không tìm thấy tài khoản." });
            }

            var (isOwner, callerTaiKhoanId) = GetCallerContext();

            bool targetIsOwner = taiKhoan.MaVaiTroNavigation?.TenVaiTro == "Chủ doanh nghiệp";
            if (targetIsOwner && !isOwner)
            {
                return StatusCode(403, new { message = "Chỉ Chủ doanh nghiệp mới có quyền thao tác trên tài khoản Chủ doanh nghiệp." });
            }

            if (id == callerTaiKhoanId && dto.TrangThai == "Bị khóa")
            {
                return BadRequest(new { message = "Bạn không thể tự khóa tài khoản của chính mình." });
            }

            if (id == callerTaiKhoanId && dto.MaVaiTro != taiKhoan.MaVaiTro)
            {
                return BadRequest(new { message = "Bạn không thể tự đổi vai trò của chính mình." });
            }

            var vaiTro = await _context.VaiTros.FindAsync(dto.MaVaiTro);
            if (vaiTro == null)
            {
                return BadRequest(new { message = "Vai trò không tồn tại." });
            }

            if (vaiTro.TenVaiTro == "Chủ doanh nghiệp" && !isOwner)
            {
                return StatusCode(403, new { message = "Chỉ Chủ doanh nghiệp mới có quyền gán vai trò Chủ doanh nghiệp." });
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
            var callerTaiKhoanIdStr = User.FindFirst("MaTaiKhoan")?.Value;
            if (!Guid.TryParse(callerTaiKhoanIdStr, out var callerTaiKhoanId) || callerTaiKhoanId != id)
            {
                return StatusCode(403, new { message = "Bạn không có quyền đổi mật khẩu của tài khoản khác." });
            }

            var taiKhoan = await _context.TaiKhoans.FindAsync(id);
            if (taiKhoan == null)
            {
                return NotFound(new { message = "Không tìm thấy tài khoản." });
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
            var taiKhoan = await _context.TaiKhoans
                .Include(t => t.MaVaiTroNavigation)
                .FirstOrDefaultAsync(t => t.MaTaiKhoan == id);

            if (taiKhoan == null)
            {
                return NotFound(new { message = "Không tìm thấy tài khoản." });
            }

            var (isOwner, callerTaiKhoanId) = GetCallerContext();

            bool targetIsOwner = taiKhoan.MaVaiTroNavigation?.TenVaiTro == "Chủ doanh nghiệp";
            if (targetIsOwner && !isOwner)
            {
                return StatusCode(403, new { message = "Chỉ Chủ doanh nghiệp mới có quyền thao tác trên tài khoản Chủ doanh nghiệp." });
            }

            if (id == callerTaiKhoanId)
            {
                return BadRequest(new { message = "Bạn không thể tự đổi vai trò của chính mình." });
            }

            var vaiTro = await _context.VaiTros.FindAsync(maVaiTro);
            if (vaiTro == null)
            {
                return BadRequest(new { message = "Vai trò không tồn tại." });
            }

            if (vaiTro.TenVaiTro == "Chủ doanh nghiệp" && !isOwner)
            {
                return StatusCode(403, new { message = "Chỉ Chủ doanh nghiệp mới có quyền gán vai trò Chủ doanh nghiệp." });
            }

            taiKhoan.MaVaiTro = maVaiTro;
            await _context.SaveChangesAsync();

            var callerUser = User.FindFirst("TenDangNhap")?.Value ?? User.Identity?.Name ?? "Hệ thống";
            var callerName = User.FindFirst("HoTen")?.Value;
            var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
            await _nhatKyService.GhiLogAsync(callerUser, callerName, "Phân quyền", $"Thay đổi vai trò thành '{vaiTro.TenVaiTro}' cho tài khoản '{taiKhoan.TenDangNhap}'", "Thành công", ip);

            return NoContent();
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Quản trị viên")]
        public async Task<IActionResult> DeleteTaiKhoan(Guid id)
        {
            var taiKhoan = await _context.TaiKhoans
                .Include(t => t.MaVaiTroNavigation)
                .FirstOrDefaultAsync(t => t.MaTaiKhoan == id);

            if (taiKhoan == null)
            {
                return NotFound(new { message = "Không tìm thấy tài khoản." });
            }

            var (isOwner, callerTaiKhoanId) = GetCallerContext();

            bool targetIsOwner = taiKhoan.MaVaiTroNavigation?.TenVaiTro == "Chủ doanh nghiệp";
            if (targetIsOwner && !isOwner)
            {
                return StatusCode(403, new { message = "Chỉ Chủ doanh nghiệp mới có quyền thao tác trên tài khoản Chủ doanh nghiệp." });
            }

            if (id == callerTaiKhoanId)
            {
                return BadRequest(new { message = "Bạn không thể tự khóa tài khoản của chính mình." });
            }

            taiKhoan.TrangThai = "Bị khóa";
            await _context.SaveChangesAsync();

            var callerUser = User.FindFirst("TenDangNhap")?.Value ?? User.Identity?.Name ?? "Hệ thống";
            var callerName = User.FindFirst("HoTen")?.Value;
            var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
            await _nhatKyService.GhiLogAsync(callerUser, callerName, "Khóa tài khoản", $"Khóa tài khoản '{taiKhoan.TenDangNhap}'", "Thành công", ip);

            return Ok(new { message = "Đã khóa tài khoản thành công.", trangThai = taiKhoan.TrangThai });
        }

        [HttpPut("{id}/khoa")]
        [Authorize(Roles = "Quản trị viên")]
        public async Task<IActionResult> KhoaTaiKhoan(Guid id)
        {
            var taiKhoan = await _context.TaiKhoans
                .Include(t => t.MaVaiTroNavigation)
                .FirstOrDefaultAsync(t => t.MaTaiKhoan == id);

            if (taiKhoan == null)
            {
                return NotFound(new { message = "Không tìm thấy tài khoản." });
            }

            var (isOwner, callerTaiKhoanId) = GetCallerContext();

            bool targetIsOwner = taiKhoan.MaVaiTroNavigation?.TenVaiTro == "Chủ doanh nghiệp";
            if (targetIsOwner && !isOwner)
            {
                return StatusCode(403, new { message = "Chỉ Chủ doanh nghiệp mới có quyền thao tác trên tài khoản Chủ doanh nghiệp." });
            }

            if (id == callerTaiKhoanId)
            {
                return BadRequest(new { message = "Bạn không thể tự khóa tài khoản của chính mình." });
            }

            taiKhoan.TrangThai = "Bị khóa";
            await _context.SaveChangesAsync();

            var callerUser = User.FindFirst("TenDangNhap")?.Value ?? User.Identity?.Name ?? "Hệ thống";
            var callerName = User.FindFirst("HoTen")?.Value;
            var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
            await _nhatKyService.GhiLogAsync(callerUser, callerName, "Khóa tài khoản", $"Khóa tài khoản '{taiKhoan.TenDangNhap}'", "Thành công", ip);

            return Ok(new { message = "Khóa tài khoản thành công." });
        }

        [HttpPut("{id}/mo-khoa")]
        [Authorize(Roles = "Quản trị viên")]
        public async Task<IActionResult> MoKhoaTaiKhoan(Guid id)
        {
            var taiKhoan = await _context.TaiKhoans
                .Include(t => t.MaVaiTroNavigation)
                .FirstOrDefaultAsync(t => t.MaTaiKhoan == id);

            if (taiKhoan == null)
            {
                return NotFound(new { message = "Không tìm thấy tài khoản." });
            }

            var (isOwner, _) = GetCallerContext();

            bool targetIsOwner = taiKhoan.MaVaiTroNavigation?.TenVaiTro == "Chủ doanh nghiệp";
            if (targetIsOwner && !isOwner)
            {
                return StatusCode(403, new { message = "Chỉ Chủ doanh nghiệp mới có quyền thao tác trên tài khoản Chủ doanh nghiệp." });
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
