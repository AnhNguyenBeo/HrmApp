using HrmApp.Api.Data;
using HrmApp.Api.DTOs.Auth;
using HrmApp.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

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

    /// <summary>Ðang nh?p và nh?n JWT token.</summary>
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequestDto request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        // 1. Tìm tài kho?n theo TenDangNhap, include Navigation properties
        var taiKhoan = await _context.TaiKhoans
            .Include(t => t.MaNhanVienNavigation)   // NhanVien
            .Include(t => t.MaVaiTroNavigation)     // VaiTro
            .FirstOrDefaultAsync(t => t.TenDangNhap == request.TenDangNhap);

        // 2. Ki?m tra tài kho?n t?n t?i
        if (taiKhoan is null)
            return Unauthorized(new { message = "Tên dang nh?p ho?c m?t kh?u không dúng." });

        // 3. Ki?m tra tr?ng thái tài kho?n
        if (taiKhoan.TrangThai != "Ho?t d?ng")
            return Unauthorized(new { message = "Tài kho?n dã b? khoá ho?c vô hi?u hoá." });

        // 4. Verify m?t kh?u BCrypt
        bool isPasswordValid = BCrypt.Net.BCrypt.Verify(request.MatKhau, taiKhoan.MatKhauHash);
        if (!isPasswordValid)
            return Unauthorized(new { message = "Tên dang nh?p ho?c m?t kh?u không dúng." });

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
