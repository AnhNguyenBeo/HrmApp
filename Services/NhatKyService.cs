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
                DiaChiIP = diaChiIp ?? "127.0.0.1"
            };

            await _context.NhatKyHoatDongs.AddAsync(log);
            await _context.SaveChangesAsync();
        }
        catch
        {
        }
    }
}
