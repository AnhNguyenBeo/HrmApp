using HrmApp.Api.Data;
using HrmApp.Api.Data.Models;
using System;
using System.Threading.Tasks;

namespace HrmApp.Api.Services;

public class NhatKyService : INhatKyService
{
    private readonly QuanLyNhanSuDbContext _context;

    public NhatKyService(QuanLyNhanSuDbContext context)
    {
        _context = context;
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

            await _context.NhatKyHoatDongs.AddAsync(log);
            await _context.SaveChangesAsync();
        }
        catch
        {
        }
    }
}