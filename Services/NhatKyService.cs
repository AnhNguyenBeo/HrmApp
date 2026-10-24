using HrmApp.Api.Data;
using HrmApp.Api.Data.Models;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using System;
using System.Threading.Tasks;

namespace HrmApp.Api.Services;

public class NhatKyService : INhatKyService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<NhatKyService> _logger;

    public NhatKyService(IServiceScopeFactory scopeFactory, ILogger<NhatKyService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    private static string NormalizeIp(string? ip)
    {
        if (string.IsNullOrEmpty(ip) || ip == "::1") return "127.0.0.1";
        if (ip.StartsWith("::ffff:")) return ip.Substring(7);
        return ip;
    }

    public async Task GhiLogAsync(string tenDangNhap, string? hoTen, string hanhDong, string chiTiet, string trangThai = "Thành công", string? diaChiIp = null)
    {
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<QuanLyNhanSuDbContext>();
            var log = new NhatKyHoatDong
            {
                MaLog = Guid.NewGuid(),
                ThoiGian = DateTime.Now,
                TenDangNhap = string.IsNullOrEmpty(tenDangNhap) ? "Khách / Ẩn danh" : tenDangNhap,
                HoTen = hoTen,
                HanhDong = hanhDong,
                ChiTiet = chiTiet,
                TrangThai = trangThai,
                DiaChiIP = NormalizeIp(diaChiIp)
            };

            await context.NhatKyHoatDongs.AddAsync(log);
            await context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi ghi nhật ký: {Message}", ex.Message);
        }
    }
}