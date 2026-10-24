using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using HrmApp.Api.Data.Models;
using Microsoft.IdentityModel.Tokens;

namespace HrmApp.Api.Services;

public class JwtService : IJwtService
{
    private readonly IConfiguration _config;

    public JwtService(IConfiguration config)
    {
        _config = config;
    }

    public string GenerateToken(TaiKhoan taiKhoan)
    {
        var jwtSettings = _config.GetSection("JwtSettings");
        var secretKey = _config["JwtSettings:SecretKey"]
    ?? _config["JwtSettings__SecretKey"]
    ?? Environment.GetEnvironmentVariable("JwtSettings__SecretKey")
    ?? jwtSettings["SecretKey"];

if (string.IsNullOrWhiteSpace(secretKey) || secretKey.Length < 32)
{
    throw new InvalidOperationException("JwtSettings:SecretKey chưa được cấu hình hoặc ngắn hơn 32 ký tự.");
}
        var issuer = jwtSettings["Issuer"]!;
        var audience = jwtSettings["Audience"]!;
        var expiresInMin = int.Parse(jwtSettings["ExpiresInMinutes"]!);

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub,   taiKhoan.MaTaiKhoan.ToString()),
            new Claim(JwtRegisteredClaimNames.Jti,   Guid.NewGuid().ToString()),
            new Claim("MaTaiKhoan",                  taiKhoan.MaTaiKhoan.ToString()),
            new Claim("MaNhanVien",                  taiKhoan.MaNhanVien.ToString()),
            new Claim("TenDangNhap",                 taiKhoan.TenDangNhap),
            new Claim(ClaimTypes.Role,               taiKhoan.MaVaiTroNavigation?.TenVaiTro ?? string.Empty),
            new Claim("HoTen",                       taiKhoan.MaNhanVienNavigation?.HoTen ?? string.Empty),
            new Claim("TenPhongBan",                 taiKhoan.MaNhanVienNavigation?.MaPhongBanNavigation?.TenPhongBan ?? string.Empty),
        };

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expiresInMin),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}