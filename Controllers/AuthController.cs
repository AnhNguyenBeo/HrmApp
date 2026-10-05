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

    public AuthController(QuanLyNhanSuDbContext context, IJwtService jwtService, IConfiguration config)
    {
        _context = context;
        _jwtService = jwtService;
        _config = config;
    }

    /// <summary>Đăng nhập và nhận JWT token.</summary>
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequestDto request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        // 1. Tìm tài khoản theo TenDangNhap, include Navigation properties
        var taiKhoan = await _context.TaiKhoans
            .Include(t => t.MaNhanVienNavigation)   // NhanVien
            .Include(t => t.MaVaiTroNavigation)     // VaiTro
            .FirstOrDefaultAsync(t => t.TenDangNhap == request.TenDangNhap);

        // 2. Kiểm tra tài khoản tồn tại
        if (taiKhoan is null)
            return Unauthorized(new { message = "Tên đăng nhập hoặc mật khẩu không đúng." });

        // 3. Kiểm tra trạng thái tài khoản
        if (taiKhoan.TrangThai != "Hoạt động")
            return Unauthorized(new { message = "Tài khoản đã bị khoá hoặc vô hiệu hoá." });

        // 4. Verify mật khẩu BCrypt
        bool isPasswordValid = BCrypt.Net.BCrypt.Verify(request.MatKhau, taiKhoan.MatKhauHash);
        if (!isPasswordValid)
            return Unauthorized(new { message = "Tên đăng nhập hoặc mật khẩu không đúng." });

        // 5. Sinh JWT token
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
            VaiTro = taiKhoan.MaVaiTroNavigation?.TenVaiTro ?? string.Empty
        });
    }
}
