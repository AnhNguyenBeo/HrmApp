using HrmApp.Api.Data;
using HrmApp.Api.DTOs.ThongKe;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;
using System.Collections.Generic;

namespace HrmApp.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Qu?n tr? viên, Qu?n lý")]
    public class ThongKeController : ControllerBase
    {
        private readonly QuanLyNhanSuDbContext _context;
        public ThongKeController(QuanLyNhanSuDbContext context) { _context = context; }

        [HttpGet("dashboard")]
        public async Task<IActionResult> GetDashboardStats()
        {
            var now = DateTime.UtcNow;
            var currentMonthStr = $"{now.Month:D2}/{now.Year}";

            var allActive = await _context.NhanViens.Where(nv => nv.TrangThaiLamViec != "Ðã ngh? vi?c").ToListAsync();

            var response = new DashboardResponseDto
            {
                TongSoNhanVien = allActive.Count,
                NhanVienMoiTrongThang = allActive.Count(nv => nv.NgayVaoLam.Month == now.Month && nv.NgayVaoLam.Year == now.Year),
                DonTuChoDuyet = await _context.DonTus.CountAsync(d => d.TrangThai == "Ch? duy?t"),
                TongQuyLuongThang = await _context.BangLuongs.Where(b => b.ThoiGian == currentMonthStr).SumAsync(b => b.ThucLinh ?? 0),
                
                NhanVienTheoPhongBan = await _context.PhongBans.Select(pb => new ThongKePhongBanDto {
                    TenPhongBan = pb.TenPhongBan,
                    SoLuongNhanVien = pb.NhanViens.Count(nv => nv.TrangThaiLamViec != "Ðã ngh? vi?c")
                }).ToListAsync(),

                NhanVienTheoTrinhDo = allActive.GroupBy(nv => string.IsNullOrEmpty(nv.TrinhDoHocVan) ? "Chua c?p nh?t" : nv.TrinhDoHocVan)
                    .Select(g => new ThongKeTrinhDoDto { TrinhDo = g.Key, SoLuong = g.Count() }).ToList(),

                NhanVienTheoThamNien = new List<ThongKeThamNienDto>
                {
                    new ThongKeThamNienDto { NhomThamNien = "Du?i 1 nam", SoLuong = allActive.Count(nv => (now.Year - nv.NgayVaoLam.Year) * 12 + now.Month - nv.NgayVaoLam.Month < 12) },
                    new ThongKeThamNienDto { NhomThamNien = "1 - 3 nam", SoLuong = allActive.Count(nv => {
                        var m = (now.Year - nv.NgayVaoLam.Year) * 12 + now.Month - nv.NgayVaoLam.Month;
                        return m >= 12 && m <= 36;
                    })},
                    new ThongKeThamNienDto { NhomThamNien = "Trên 3 nam", SoLuong = allActive.Count(nv => (now.Year - nv.NgayVaoLam.Year) * 12 + now.Month - nv.NgayVaoLam.Month > 36) }
                }
            };
            return Ok(response);
        }
    }
}
