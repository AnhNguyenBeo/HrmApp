using System.Security.Claims;
using HrmApp.Api.Data;
using HrmApp.Api.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Moq;

namespace HrmApp.Tests;

internal static class HrTestSupport
{
    public static QuanLyNhanSuDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<QuanLyNhanSuDbContext>()
            .UseInMemoryDatabase($"hrm-tests-{Guid.NewGuid():N}")
            .Options;
        return new QuanLyNhanSuDbContext(options);
    }

    public static Mock<INhatKyService> CreateAuditMock()
    {
        var mock = new Mock<INhatKyService>();
        mock.Setup(x => x.GhiLogAsync(
                It.IsAny<string>(),
                It.IsAny<string?>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string?>()))
            .Returns(Task.CompletedTask);
        return mock;
    }

    public static void SetUser(ControllerBase controller, Guid employeeId, string role, Guid? accountId = null)
    {
        var claims = new List<Claim>
        {
            new("MaNhanVien", employeeId.ToString()),
            new(ClaimTypes.Role, role),
            new("role", role),
            new("TenDangNhap", $"test.{role}"),
            new("HoTen", "Nhân sự kiểm thử")
        };

        if (accountId.HasValue)
        {
            claims.Add(new Claim("MaTaiKhoan", accountId.Value.ToString()));
        }

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(claims, "TestAuth"))
            }
        };
    }
}
