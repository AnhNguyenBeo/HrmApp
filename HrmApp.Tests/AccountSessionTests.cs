using System.IdentityModel.Tokens.Jwt;
using System.IO;
using System.Security.Claims;
using HrmApp.Api.Controllers;
using HrmApp.Api.Data;
using HrmApp.Api.Data.Models;
using HrmApp.Api.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Moq;

namespace HrmApp.Tests;

public class AccountSessionTests
{
    [Fact]
    public async Task AdminLocksActiveAccount_NextRequestReturns401WithRequiredMessage()
    {
        using var db = HrTestSupport.CreateDbContext();
        var (employee, account, role) = await AddEmployeeAccountAsync(db, "employee.lock.test");

        var beforeLock = await ValidateTokenAsync(db, account.MaTaiKhoan);
        Assert.Null(beforeLock.Context.Result?.Failure);

        var audit = HrTestSupport.CreateAuditMock();
        var admin = new TaiKhoanController(db, audit.Object);
        HrTestSupport.SetUser(admin, Guid.NewGuid(), "Quản trị viên", Guid.NewGuid());

        var lockResult = await admin.KhoaTaiKhoan(account.MaTaiKhoan);
        Assert.IsType<OkObjectResult>(lockResult);
        Assert.Equal("Bị khóa", (await db.TaiKhoans.SingleAsync(t => t.MaTaiKhoan == account.MaTaiKhoan)).TrangThai);

        var afterLock = await ValidateTokenAsync(db, account.MaTaiKhoan);
        Assert.NotNull(afterLock.Context.Result?.Failure);
        Assert.True((bool)afterLock.HttpContext.Items[TokenValidationHandler.DisabledAccountItemKey]!);

        var challenge = await ChallengeAsync(afterLock.HttpContext, afterLock.Scheme, afterLock.Options);
        Assert.True(challenge.Handled);
        Assert.Equal(StatusCodes.Status401Unauthorized, afterLock.HttpContext.Response.StatusCode);
        Assert.Equal("application/json", afterLock.HttpContext.Response.ContentType);
        Assert.Contains("\"message\":\"Tài khoản của bạn đã bị khóa\"", ReadResponse(afterLock.HttpContext));
        audit.Verify(x => x.GhiLogAsync(
            It.IsAny<string>(), It.IsAny<string?>(), "Khóa tài khoản", It.IsAny<string>(),
            It.IsAny<string>(), It.IsAny<string?>()), Times.Once);

        _ = employee;
        _ = role;
    }

    [Fact]
    public async Task AdminDeletesActiveAccount_DeleteIsSoftLockAndInvalidatesExistingJwt()
    {
        using var db = HrTestSupport.CreateDbContext();
        var (_, account, _) = await AddEmployeeAccountAsync(db, "employee.delete.test");
        var audit = HrTestSupport.CreateAuditMock();

        var admin = new TaiKhoanController(db, audit.Object);
        HrTestSupport.SetUser(admin, Guid.NewGuid(), "Quản trị viên", Guid.NewGuid());

        var deleteResult = await admin.DeleteTaiKhoan(account.MaTaiKhoan);
        Assert.IsType<OkObjectResult>(deleteResult);
        Assert.Equal("Bị khóa", (await db.TaiKhoans.SingleAsync(t => t.MaTaiKhoan == account.MaTaiKhoan)).TrangThai);

        var afterDelete = await ValidateTokenAsync(db, account.MaTaiKhoan);
        Assert.NotNull(afterDelete.Context.Result?.Failure);
        Assert.True((bool)afterDelete.HttpContext.Items[TokenValidationHandler.DisabledAccountItemKey]!);
    }

    private static async Task<(NhanVien Employee, TaiKhoan Account, VaiTro Role)> AddEmployeeAccountAsync(
        QuanLyNhanSuDbContext db,
        string username)
    {
        var role = new VaiTro { MaVaiTro = Guid.NewGuid(), TenVaiTro = "Nhân viên" };
        var employee = new NhanVien
        {
            MaNhanVien = Guid.NewGuid(),
            HoTen = "Nhân viên kiểm thử",
            Cccd = Guid.NewGuid().ToString("N")[..12],
            DiaChi = "TP. Hồ Chí Minh",
            Email = $"{Guid.NewGuid():N}@example.test",
            GioiTinh = "Nữ",
            SoDienThoai = "0900000000",
            TrangThaiLamViec = "Đang làm việc",
            TrinhDoHocVan = "Đại học",
            NgaySinh = new DateOnly(1998, 5, 4),
            NgayVaoLam = new DateOnly(2024, 1, 8),
            MaPhongBan = Guid.NewGuid(),
            MaChucVu = Guid.NewGuid()
        };
        var account = new TaiKhoan
        {
            MaTaiKhoan = Guid.NewGuid(),
            MaNhanVien = employee.MaNhanVien,
            MaNhanVienNavigation = employee,
            TenDangNhap = username,
            MatKhauHash = BCrypt.Net.BCrypt.HashPassword("Pass@123"),
            MaVaiTro = role.MaVaiTro,
            MaVaiTroNavigation = role,
            TrangThai = "Hoạt động",
            NgayTao = new DateOnly(2024, 1, 8)
        };

        db.VaiTros.Add(role);
        db.NhanViens.Add(employee);
        db.TaiKhoans.Add(account);
        await db.SaveChangesAsync();
        return (employee, account, role);
    }

    private static async Task<(TokenValidatedContext Context, DefaultHttpContext HttpContext, AuthenticationScheme Scheme, JwtBearerOptions Options)> ValidateTokenAsync(
        QuanLyNhanSuDbContext db,
        Guid accountId)
    {
        var services = new ServiceCollection();
        services.AddSingleton(db);
        var http = new DefaultHttpContext
        {
            RequestServices = services.BuildServiceProvider()
        };
        http.Response.Body = new MemoryStream();

        var scheme = CreateScheme();
        var options = new JwtBearerOptions();
        var principal = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim("MaTaiKhoan", accountId.ToString()),
            new Claim(ClaimTypes.NameIdentifier, accountId.ToString()),
            new Claim(JwtRegisteredClaimNames.Sub, accountId.ToString()),
            new Claim(ClaimTypes.Role, "Nhân viên")
        }, "Bearer"));
        var token = new TokenValidatedContext(http, scheme, options) { Principal = principal };
        await TokenValidationHandler.ValidateTokenAsync(token);
        return (token, http, scheme, options);
    }

    private static async Task<JwtBearerChallengeContext> ChallengeAsync(
        DefaultHttpContext http,
        AuthenticationScheme scheme,
        JwtBearerOptions options)
    {
        var challenge = new JwtBearerChallengeContext(http, scheme, options, new AuthenticationProperties());
        await TokenValidationHandler.HandleChallengeAsync(challenge);
        return challenge;
    }

    private static AuthenticationScheme CreateScheme() => new(
        JwtBearerDefaults.AuthenticationScheme,
        displayName: null,
        handlerType: typeof(JwtBearerHandler));

    private static string ReadResponse(DefaultHttpContext http)
    {
        http.Response.Body.Seek(0, SeekOrigin.Begin);
        using var reader = new StreamReader(http.Response.Body);
        return reader.ReadToEnd();
    }
}
