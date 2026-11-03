using System;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using HrmApp.Api.Data;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace HrmApp.Api.Services;

public static class TokenValidationHandler
{
    public const string DisabledAccountItemKey = "IsAccountDisabled";
    public const string DisabledAccountMessage = "Tài khoản của bạn đã bị khóa";

    public static async Task ValidateTokenAsync(TokenValidatedContext context)
    {
        var principal = context.Principal;
        if (principal == null)
        {
            context.Fail("Không tìm thấy thông tin xác thực.");
            return;
        }

        var accountIdStr = principal.FindFirst("MaTaiKhoan")?.Value
            ?? principal.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? principal.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(accountIdStr) || !Guid.TryParse(accountIdStr, out var accountId))
        {
            context.Fail("Token không chứa thông tin tài khoản hợp lệ.");
            return;
        }

        var dbContext = context.HttpContext.RequestServices.GetRequiredService<QuanLyNhanSuDbContext>();

        var accountInfo = await dbContext.TaiKhoans
            .AsNoTracking()
            .Where(t => t.MaTaiKhoan == accountId)
            .Select(t => new
            {
                t.TrangThai,
                TrangThaiLamViec = t.MaNhanVienNavigation != null ? t.MaNhanVienNavigation.TrangThaiLamViec : null
            })
            .FirstOrDefaultAsync();

        if (accountInfo == null)
        {
            context.HttpContext.Items[DisabledAccountItemKey] = true;
            context.Fail(DisabledAccountMessage);
            return;
        }

        var isResigned = accountInfo.TrangThaiLamViec != null &&
            (accountInfo.TrangThaiLamViec == "Đã nghỉ việc" ||
             accountInfo.TrangThaiLamViec == "Đã thôi việc" ||
             accountInfo.TrangThaiLamViec == "Đã thôi việc / Nghỉ việc" ||
             accountInfo.TrangThaiLamViec.Contains("nghỉ việc") ||
             accountInfo.TrangThaiLamViec.Contains("thôi việc"));

        if (accountInfo.TrangThai != "Hoạt động" || isResigned)
        {
            context.HttpContext.Items[DisabledAccountItemKey] = true;
            context.Fail(DisabledAccountMessage);
            return;
        }
    }

    public static async Task HandleChallengeAsync(JwtBearerChallengeContext context)
    {
        if (context.HttpContext.Items.ContainsKey(DisabledAccountItemKey))
        {
            context.HandleResponse();
            if (!context.Response.HasStarted)
            {
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                context.Response.ContentType = "application/json";
                await context.Response.WriteAsync("{\"message\":\"" + DisabledAccountMessage + "\"}");
            }
        }
    }
}
