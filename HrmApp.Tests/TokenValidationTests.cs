using System;
using System.Collections.Generic;
using System.IO;
using System.Security.Claims;
using System.Threading.Tasks;
using HrmApp.Api.Controllers;
using HrmApp.Api.Data;
using HrmApp.Api.Data.Models;
using HrmApp.Api.DTOs.Auth;
using HrmApp.Api.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace HrmApp.Tests;

public class TestJwtService : IJwtService
{
    public string GenerateToken(TaiKhoan taiKhoan) => "test-token";
}

public class TokenValidationTests
{
    private static QuanLyNhanSuDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<QuanLyNhanSuDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        return new QuanLyNhanSuDbContext(options);
    }

    private static (DefaultHttpContext HttpContext, AuthenticationScheme Scheme, JwtBearerOptions Options) CreateHttpContext(QuanLyNhanSuDbContext dbContext)
    {
        var httpContext = new DefaultHttpContext();
        var services = new ServiceCollection();
        services.AddSingleton(dbContext);
        httpContext.RequestServices = services.BuildServiceProvider();
        httpContext.Response.Body = new MemoryStream();

        var scheme = new AuthenticationScheme(
            JwtBearerDefaults.AuthenticationScheme,
            displayName: null,
            handlerType: typeof(JwtBearerHandler));

        var options = new JwtBearerOptions();
        return (httpContext, scheme, options);
    }

    private static TokenValidatedContext CreateTokenContext(DefaultHttpContext httpContext, AuthenticationScheme scheme, JwtBearerOptions options, Guid accountId)
    {
        var context = new TokenValidatedContext(httpContext, scheme, options)
        {
            Principal = new ClaimsPrincipal(new ClaimsIdentity(new[]
            {
                new Claim("MaTaiKhoan", accountId.ToString()),
                new Claim(ClaimTypes.NameIdentifier, accountId.ToString()),
                new Claim("TenDangNhap", "nhanvien1"),
                new Claim(ClaimTypes.Role, "Nhân viên")
            }, "Bearer"))
        };
        return context;
    }

    [Fact]
    public async Task ValidateToken_ActiveAccountAndEmployee_Succeeds()
    {
        using var context = CreateDbContext();
        var nhanVienId = Guid.NewGuid();
        var accountId = Guid.NewGuid();

        var nhanVien = new NhanVien
        {
            MaNhanVien = nhanVienId,
            HoTen = "Nguyễn Văn A",
            Cccd = "012345678901",
            DiaChi = "Hà Nội",
            Email = "a@example.com",
            GioiTinh = "Nam",
            SoDienThoai = "0987654321",
            TrangThaiLamViec = "Đang làm việc",
            TrinhDoHocVan = "Đại học",
            NgaySinh = new DateOnly(1995, 1, 1),
            NgayVaoLam = new DateOnly(2021, 1, 1),
            MaPhongBan = Guid.NewGuid(),
            MaChucVu = Guid.NewGuid()
        };

        var taiKhoan = new TaiKhoan
        {
            MaTaiKhoan = accountId,
            MaNhanVien = nhanVienId,
            TenDangNhap = "nhanvien1",
            MatKhauHash = BCrypt.Net.BCrypt.HashPassword("Pass@123"),
            TrangThai = "Hoạt động",
            MaVaiTro = Guid.NewGuid(),
            NgayTao = DateOnly.FromDateTime(DateTime.Now),
            MaNhanVienNavigation = nhanVien
        };

        context.NhanViens.Add(nhanVien);
        context.TaiKhoans.Add(taiKhoan);
        await context.SaveChangesAsync();

        var (httpContext, scheme, options) = CreateHttpContext(context);
        var tokenContext = CreateTokenContext(httpContext, scheme, options, accountId);

        await TokenValidationHandler.ValidateTokenAsync(tokenContext);

        Assert.Null(tokenContext.Result?.Failure);
        Assert.False(httpContext.Items.ContainsKey(TokenValidationHandler.DisabledAccountItemKey));
    }

    [Fact]
    public async Task ValidateToken_LockedAccount_FailsWith401AndJsonMessage()
    {
        using var context = CreateDbContext();
        var nhanVienId = Guid.NewGuid();
        var accountId = Guid.NewGuid();

        var nhanVien = new NhanVien
        {
            MaNhanVien = nhanVienId,
            HoTen = "Trần Thị B",
            Cccd = "012345678902",
            DiaChi = "Hà Nội",
            Email = "b@example.com",
            GioiTinh = "Nữ",
            SoDienThoai = "0987654322",
            TrangThaiLamViec = "Đang làm việc",
            TrinhDoHocVan = "Đại học",
            NgaySinh = new DateOnly(1996, 2, 2),
            NgayVaoLam = new DateOnly(2021, 2, 2),
            MaPhongBan = Guid.NewGuid(),
            MaChucVu = Guid.NewGuid()
        };

        var taiKhoan = new TaiKhoan
        {
            MaTaiKhoan = accountId,
            MaNhanVien = nhanVienId,
            TenDangNhap = "nhanvien2",
            MatKhauHash = BCrypt.Net.BCrypt.HashPassword("Pass@123"),
            TrangThai = "Bị khóa",
            MaVaiTro = Guid.NewGuid(),
            NgayTao = DateOnly.FromDateTime(DateTime.Now),
            MaNhanVienNavigation = nhanVien
        };

        context.NhanViens.Add(nhanVien);
        context.TaiKhoans.Add(taiKhoan);
        await context.SaveChangesAsync();

        var (httpContext, scheme, options) = CreateHttpContext(context);
        var tokenContext = CreateTokenContext(httpContext, scheme, options, accountId);

        await TokenValidationHandler.ValidateTokenAsync(tokenContext);

        Assert.NotNull(tokenContext.Result?.Failure);
        Assert.True((bool)httpContext.Items[TokenValidationHandler.DisabledAccountItemKey]!);

        var challengeContext = new JwtBearerChallengeContext(httpContext, scheme, options, new AuthenticationProperties());
        await TokenValidationHandler.HandleChallengeAsync(challengeContext);

        Assert.True(challengeContext.Handled);
        Assert.Equal(StatusCodes.Status401Unauthorized, httpContext.Response.StatusCode);
        Assert.Equal("application/json", httpContext.Response.ContentType);

        httpContext.Response.Body.Seek(0, SeekOrigin.Begin);
        using var reader = new StreamReader(httpContext.Response.Body);
        var body = await reader.ReadToEndAsync();
        Assert.Contains(TokenValidationHandler.DisabledAccountMessage, body);
    }

    [Fact]
    public async Task ValidateToken_ResignedEmployee_FailsWith401AndJsonMessage()
    {
        using var context = CreateDbContext();
        var nhanVienId = Guid.NewGuid();
        var accountId = Guid.NewGuid();

        var nhanVien = new NhanVien
        {
            MaNhanVien = nhanVienId,
            HoTen = "Lê Văn C",
            Cccd = "012345678903",
            DiaChi = "Đà Nẵng",
            Email = "c@example.com",
            GioiTinh = "Nam",
            SoDienThoai = "0987654323",
            TrangThaiLamViec = "Đã nghỉ việc",
            TrinhDoHocVan = "Đại học",
            NgaySinh = new DateOnly(1992, 3, 3),
            NgayVaoLam = new DateOnly(2020, 3, 3),
            MaPhongBan = Guid.NewGuid(),
            MaChucVu = Guid.NewGuid()
        };

        var taiKhoan = new TaiKhoan
        {
            MaTaiKhoan = accountId,
            MaNhanVien = nhanVienId,
            TenDangNhap = "nhanvien3",
            MatKhauHash = BCrypt.Net.BCrypt.HashPassword("Pass@123"),
            TrangThai = "Hoạt động",
            MaVaiTro = Guid.NewGuid(),
            NgayTao = DateOnly.FromDateTime(DateTime.Now),
            MaNhanVienNavigation = nhanVien
        };

        context.NhanViens.Add(nhanVien);
        context.TaiKhoans.Add(taiKhoan);
        await context.SaveChangesAsync();

        var (httpContext, scheme, options) = CreateHttpContext(context);
        var tokenContext = CreateTokenContext(httpContext, scheme, options, accountId);

        await TokenValidationHandler.ValidateTokenAsync(tokenContext);

        Assert.NotNull(tokenContext.Result?.Failure);
        Assert.True((bool)httpContext.Items[TokenValidationHandler.DisabledAccountItemKey]!);

        var challengeContext = new JwtBearerChallengeContext(httpContext, scheme, options, new AuthenticationProperties());
        await TokenValidationHandler.HandleChallengeAsync(challengeContext);

        Assert.True(challengeContext.Handled);
        Assert.Equal(StatusCodes.Status401Unauthorized, httpContext.Response.StatusCode);

        httpContext.Response.Body.Seek(0, SeekOrigin.Begin);
        using var reader = new StreamReader(httpContext.Response.Body);
        var body = await reader.ReadToEndAsync();
        Assert.Contains(TokenValidationHandler.DisabledAccountMessage, body);
    }

    [Fact]
    public async Task ValidateToken_ReactivatedAccount_TokenWorksAgainAndLoginSucceeds()
    {
        using var context = CreateDbContext();
        var nhanVienId = Guid.NewGuid();
        var accountId = Guid.NewGuid();
        var phongBan = new PhongBan { MaPhongBan = Guid.NewGuid(), TenPhongBan = "Phòng IT" };
        var vaiTro = new VaiTro { MaVaiTro = Guid.NewGuid(), TenVaiTro = "Nhân viên" };

        var nhanVien = new NhanVien
        {
            MaNhanVien = nhanVienId,
            HoTen = "Phạm Văn D",
            Cccd = "012345678904",
            DiaChi = "TP HCM",
            Email = "d@example.com",
            GioiTinh = "Nam",
            SoDienThoai = "0987654324",
            TrangThaiLamViec = "Đang làm việc",
            TrinhDoHocVan = "Thạc sĩ",
            NgaySinh = new DateOnly(1991, 4, 4),
            NgayVaoLam = new DateOnly(2021, 4, 4),
            MaPhongBan = phongBan.MaPhongBan,
            MaPhongBanNavigation = phongBan,
            MaChucVu = Guid.NewGuid()
        };

        var taiKhoan = new TaiKhoan
        {
            MaTaiKhoan = accountId,
            MaNhanVien = nhanVienId,
            TenDangNhap = "nhanvien4",
            MatKhauHash = BCrypt.Net.BCrypt.HashPassword("Pass@123"),
            TrangThai = "Bị khóa",
            MaVaiTro = vaiTro.MaVaiTro,
            MaVaiTroNavigation = vaiTro,
            NgayTao = DateOnly.FromDateTime(DateTime.Now),
            MaNhanVienNavigation = nhanVien
        };

        context.PhongBans.Add(phongBan);
        context.VaiTros.Add(vaiTro);
        context.NhanViens.Add(nhanVien);
        context.TaiKhoans.Add(taiKhoan);
        await context.SaveChangesAsync();

        var (httpContext1, scheme1, options1) = CreateHttpContext(context);
        var tokenContext1 = CreateTokenContext(httpContext1, scheme1, options1, accountId);
        await TokenValidationHandler.ValidateTokenAsync(tokenContext1);
        Assert.NotNull(tokenContext1.Result?.Failure);

        var inMemoryConfig = new Dictionary<string, string?>
        {
            ["JwtSettings:ExpiresInMinutes"] = "60"
        };
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(inMemoryConfig).Build();
        var authController = new AuthController(context, new TestJwtService(), configuration, new FakeNhatKyService())
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext()
            }
        };
        var loginResultLocked = await authController.Login(new LoginRequestDto { TenDangNhap = "nhanvien4", MatKhau = "Pass@123" });
        var unauthResult = Assert.IsType<UnauthorizedObjectResult>(loginResultLocked);
        Assert.Contains("khóa", unauthResult.Value?.ToString() ?? "");

        taiKhoan.TrangThai = "Hoạt động";
        await context.SaveChangesAsync();

        var (httpContext2, scheme2, options2) = CreateHttpContext(context);
        var tokenContext2 = CreateTokenContext(httpContext2, scheme2, options2, accountId);
        await TokenValidationHandler.ValidateTokenAsync(tokenContext2);
        Assert.Null(tokenContext2.Result?.Failure);
        Assert.False(httpContext2.Items.ContainsKey(TokenValidationHandler.DisabledAccountItemKey));

        var loginResultUnlocked = await authController.Login(new LoginRequestDto { TenDangNhap = "nhanvien4", MatKhau = "Pass@123" });
        var okResult = Assert.IsType<OkObjectResult>(loginResultUnlocked);
        var responseDto = Assert.IsType<LoginResponseDto>(okResult.Value);
        Assert.Equal("nhanvien4", responseDto.TenDangNhap);
        Assert.Equal("test-token", responseDto.Token);
    }

    [Fact]
    public async Task HandleChallenge_WhenNotDisabledAccount_DoesNotHandleResponse()
    {
        using var context = CreateDbContext();
        var (httpContext, scheme, options) = CreateHttpContext(context);

        var challengeContext = new JwtBearerChallengeContext(httpContext, scheme, options, new AuthenticationProperties());
        await TokenValidationHandler.HandleChallengeAsync(challengeContext);

        Assert.False(challengeContext.Handled);
        Assert.Equal(200, httpContext.Response.StatusCode);
    }
}