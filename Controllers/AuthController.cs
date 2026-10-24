using HrmApp.Api.Data;
using HrmApp.Api.DTOs.Auth;
using HrmApp.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using System;
using System.Threading.Tasks;

namespace HrmApp.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly QuanLyNhanSuDbContext _context;
    private readonly IJwtService _jwtService;
    private readonly IConfiguration _config;
    private readonly INhatKyService _nhatKyService;

    public AuthController(QuanLyNhanSuDbContext context, IJwtService jwtService, IConfiguration config, INhatKyService nhatKyService)
    {
        _context = context;
        _jwtService = jwtService;
        _config = config;
        _nhatKyService = nhatKyService;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequestDto request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();

        var taiKhoan = await _context.TaiKhoans
            .Include(t => t.MaNhanVienNavigation)
                .ThenInclude(n => n.MaPhongBanNavigation)
            .Include(t => t.MaVaiTroNavigation)
            .FirstOrDefaultAsync(t => t.TenDangNhap == request.TenDangNhap);

        if (taiKhoan is null)
        {
            await _nhatKyService.GhiLogAsync(request.TenDangNhap, null, "Đăng nhập thất bại", "Tài khoản không tồn tại trên hệ thống", "Thất bại", ip);
            return Unauthorized(new { message = "Tên đăng nhập hoặc mật khẩu không đúng." });
        }

        if (taiKhoan.TrangThai != "Hoạt động" || taiKhoan.MaNhanVienNavigation?.TrangThaiLamViec == "Đã nghỉ việc")
        {
            await _nhatKyService.GhiLogAsync(request.TenDangNhap, taiKhoan.MaNhanVienNavigation?.HoTen, "Đăng nhập thất bại", "Cố gắng đăng nhập khi tài khoản đã bị khóa", "Cảnh báo", ip);
            return Unauthorized(new { message = "Tài khoản đã bị khóa, liên hệ phòng nhân sự để biết thêm chi tiết." });
        }

        bool isPasswordValid = BCrypt.Net.BCrypt.Verify(request.MatKhau, taiKhoan.MatKhauHash);
        if (!isPasswordValid)
        {
            await _nhatKyService.GhiLogAsync(request.TenDangNhap, taiKhoan.MaNhanVienNavigation?.HoTen, "Đăng nhập thất bại", "Nhập sai mật khẩu đăng nhập", "Thất bại", ip);
            return Unauthorized(new { message = "Tên đăng nhập hoặc mật khẩu không đúng." });
        }

        await _nhatKyService.GhiLogAsync(taiKhoan.TenDangNhap, taiKhoan.MaNhanVienNavigation?.HoTen, "Đăng nhập", "Đăng nhập thành công vào hệ thống", "Thành công", ip);

        var token = _jwtService.GenerateToken(taiKhoan);
        var expiresAt = DateTime.UtcNow.AddMinutes(
            int.Parse(_config["JwtSettings:ExpiresInMinutes"] ?? "60"));

        return Ok(new LoginResponseDto
        {
            Token = token,
            ExpiresAt = expiresAt,
            TenDangNhap = taiKhoan.TenDangNhap,
            MaTaiKhoan = taiKhoan.MaTaiKhoan,
            MaNhanVien = taiKhoan.MaNhanVien,
            HoTen = taiKhoan.MaNhanVienNavigation?.HoTen ?? string.Empty,
            VaiTro = taiKhoan.MaVaiTroNavigation?.TenVaiTro ?? string.Empty,
            MaPhongBan = taiKhoan.MaNhanVienNavigation?.MaPhongBan,
            TenPhongBan = taiKhoan.MaNhanVienNavigation?.MaPhongBanNavigation?.TenPhongBan ?? string.Empty
        });
    }
}
