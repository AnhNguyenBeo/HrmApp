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

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequestDto request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var taiKhoan = await _context.TaiKhoans
            .Include(t => t.MaNhanVienNavigation)
                .ThenInclude(n => n.MaPhongBanNavigation)
            .Include(t => t.MaVaiTroNavigation)
            .FirstOrDefaultAsync(t => t.TenDangNhap == request.TenDangNhap);

        if (taiKhoan is null)
            return Unauthorized(new { message = "Tên đăng nhập hoặc mật khẩu không đúng." });

        if (taiKhoan.TrangThai != "Hoạt động")
            return Unauthorized(new { message = "Tài khoản đã bị khoá hoặc vô hiệu hoá." });

        if (taiKhoan.MaNhanVienNavigation?.TrangThaiLamViec == "Đã nghỉ việc")
            return Unauthorized(new { message = "Tài khoản đã bị khóa do nhân sự đã thôi việc." });

        bool isPasswordValid = BCrypt.Net.BCrypt.Verify(request.MatKhau, taiKhoan.MatKhauHash);
        if (!isPasswordValid)
            return Unauthorized(new { message = "Tên đăng nhập hoặc mật khẩu không đúng." });

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
