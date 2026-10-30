using System.Reflection;
using HrmApp.Api.Controllers;
using Microsoft.AspNetCore.Authorization;

namespace HrmApp.Tests;

public class AdminRouteAuthorizationTests
{
    private static readonly string[] AdminAccountActions =
    {
        nameof(TaiKhoanController.GetTaiKhoans),
        nameof(TaiKhoanController.GetTaiKhoan),
        nameof(TaiKhoanController.PostTaiKhoan),
        nameof(TaiKhoanController.PutTaiKhoan),
        nameof(TaiKhoanController.ChangeRole),
        nameof(TaiKhoanController.DeleteTaiKhoan),
        nameof(TaiKhoanController.KhoaTaiKhoan),
        nameof(TaiKhoanController.MoKhoaTaiKhoan)
    };

    [Fact]
    public void AccountAdministrationRoutes_AreAdminOnly()
    {
        foreach (var actionName in AdminAccountActions)
        {
            var method = typeof(TaiKhoanController).GetMethod(actionName, BindingFlags.Instance | BindingFlags.Public);
            Assert.NotNull(method);
            var authorization = method!.GetCustomAttribute<AuthorizeAttribute>();
            Assert.NotNull(authorization);
            Assert.Equal("Quản trị viên", authorization!.Roles);
        }

    }

    [Fact]
    public void ActivityLogRoute_IsAvailableToAdminAndBusinessOwner()
    {
        var authorization = typeof(NhatKyController).GetCustomAttribute<AuthorizeAttribute>();
        Assert.NotNull(authorization);
        var roles = authorization!.Roles!
            .Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);

        Assert.Equal(new[] { "Quản trị viên", "Chủ doanh nghiệp" }, roles);
    }

    [Theory]
    [InlineData("Quản lý", false)]
    [InlineData("Nhân viên", false)]
    [InlineData("Chủ doanh nghiệp", false)]
    [InlineData("Quản trị viên", true)]
    public void AccountAdministrationRolePolicy_RejectsNonAdminActors(string role, bool expectedAccess)
    {
        var roles = typeof(TaiKhoanController)
            .GetMethod(nameof(TaiKhoanController.KhoaTaiKhoan))!
            .GetCustomAttribute<AuthorizeAttribute>()!
            .Roles!
            .Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);

        Assert.Equal(expectedAccess, roles.Contains(role, StringComparer.Ordinal));
    }

    [Theory]
    [InlineData("Quản lý", false)]
    [InlineData("Nhân viên", false)]
    [InlineData("Chủ doanh nghiệp", true)]
    [InlineData("Quản trị viên", true)]
    public void ActivityLogRolePolicy_AllowsAdminAndBusinessOwnerOnly(string role, bool expectedAccess)
    {
        var roles = typeof(NhatKyController)
            .GetCustomAttribute<AuthorizeAttribute>()!
            .Roles!
            .Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);

        Assert.Equal(expectedAccess, roles.Contains(role, StringComparer.Ordinal));
    }
}
