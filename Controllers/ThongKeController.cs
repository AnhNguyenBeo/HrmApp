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
    [Authorize(Roles = "Chủ doanh nghiệp, Quản lý")]
    public class ThongKeController : ControllerBase
    {
        private readonly QuanLyNhanSuDbContext _context;
        public ThongKeController(QuanLyNhanSuDbContext context) { _context = context; }

        [HttpGet("dashboard")]
        public async Task<IActionResult> GetDashboardStats()
        {
            var now = DateTime.UtcNow;
            var currentMonthStr = $"{now.Month:D2}/{now.Year}";

            var allEmployees = await _context.NhanViens
                .Include(nv => nv.MaPhongBanNavigation)
                .Include(nv => nv.MaChucVuNavigation)
                .Include(nv => nv.HopDongLaoDongs)
                .ToListAsync();

            var allActive = allEmployees.Where(nv => nv.TrangThaiLamViec != "Đã nghỉ việc").ToList();
            var allResigned = allEmployees.Where(nv => nv.TrangThaiLamViec == "Đã nghỉ việc").ToList();

            var approvedLeavesInMonth = await _context.DonTus
                .Include(d => d.MaNhanVienNavigation)
                .ThenInclude(nv => nv.MaPhongBanNavigation)
                .Where(d => d.TrangThai == "Đã duyệt" &&
                            d.LoaiDon != "Làm thêm giờ" &&
                            ((d.NgayBatDau.Month == now.Month && d.NgayBatDau.Year == now.Year) ||
                             (d.NgayKetThuc.Month == now.Month && d.NgayKetThuc.Year == now.Year)))
                .ToListAsync();

            var activeSalaries = allActive.Select(nv => {
                var hd = nv.HopDongLaoDongs.FirstOrDefault(h => h.TrangThai == "Có hiệu lực");
                return hd?.LuongCoBan ?? 0;
            }).ToList();

            var response = new DashboardResponseDto
            {
                TongSoNhanVien = allActive.Count,
                NhanVienMoiTrongThang = allActive.Count(nv => nv.NgayVaoLam.Month == now.Month && nv.NgayVaoLam.Year == now.Year),
                DonTuChoDuyet = await _context.DonTus.CountAsync(d => d.TrangThai == "Chờ duyệt"),
                TongQuyLuongThang = await _context.BangLuongs.Where(b => b.ThoiGian == currentMonthStr).SumAsync(b => b.ThucLinh ?? 0),
                
                NhanVienTheoPhongBan = await _context.PhongBans.Select(pb => new ThongKePhongBanDto {
                    TenPhongBan = pb.TenPhongBan,
                    SoLuongNhanVien = pb.NhanViens.Count(nv => nv.TrangThaiLamViec != "Đã nghỉ việc")
                }).ToListAsync(),

                NhanVienTheoTrinhDo = allActive.GroupBy(nv => string.IsNullOrEmpty(nv.TrinhDoHocVan) ? "Chưa cập nhật" : nv.TrinhDoHocVan)
                    .Select(g => new ThongKeTrinhDoDto { TrinhDo = g.Key, SoLuong = g.Count() }).ToList(),

                NhanVienTheoThamNien = new List<ThongKeThamNienDto>
                {
                    new ThongKeThamNienDto { NhomThamNien = "Dưới 1 năm", SoLuong = allActive.Count(nv => (now.Year - nv.NgayVaoLam.Year) * 12 + now.Month - nv.NgayVaoLam.Month < 12) },
                    new ThongKeThamNienDto { NhomThamNien = "1 - 3 năm", SoLuong = allActive.Count(nv => {
                        var m = (now.Year - nv.NgayVaoLam.Year) * 12 + now.Month - nv.NgayVaoLam.Month;
                        return m >= 12 && m <= 36;
                    })},
                    new ThongKeThamNienDto { NhomThamNien = "Trên 3 năm", SoLuong = allActive.Count(nv => (now.Year - nv.NgayVaoLam.Year) * 12 + now.Month - nv.NgayVaoLam.Month > 36) }
                },

                NhanVienTheoMucLuong = new List<ThongKeMucLuongDto>
                {
                    new ThongKeMucLuongDto { MucLuong = "Dưới 15 triệu", SoLuong = activeSalaries.Count(s => s < 15_000_000) },
                    new ThongKeMucLuongDto { MucLuong = "15 - 25 triệu", SoLuong = activeSalaries.Count(s => s >= 15_000_000 && s < 25_000_000) },
                    new ThongKeMucLuongDto { MucLuong = "25 - 35 triệu", SoLuong = activeSalaries.Count(s => s >= 25_000_000 && s < 35_000_000) },
                    new ThongKeMucLuongDto { MucLuong = "Trên 35 triệu", SoLuong = activeSalaries.Count(s => s >= 35_000_000) }
                },

                TinhHinhNhanSu = new TinhHinhNhanSuThangDto
                {
                    DangLamViec = allActive.Select(nv => new NhanSuStatusDto
                    {
                        MaNhanVien = nv.MaNhanVien,
                        HoTen = nv.HoTen,
                        TenPhongBan = nv.MaPhongBanNavigation?.TenPhongBan ?? "",
                        TenChucVu = nv.MaChucVuNavigation?.TenChucVu ?? "",
                        NgayVaoLam = nv.NgayVaoLam
                    }).ToList(),

                    NghiPhep = approvedLeavesInMonth.Select(d => new NhanSuNghiPhepDto
                    {
                        MaNhanVien = d.MaNhanVien,
                        HoTen = d.MaNhanVienNavigation?.HoTen ?? "Nhân viên",
                        TenPhongBan = d.MaNhanVienNavigation?.MaPhongBanNavigation?.TenPhongBan ?? "",
                        LoaiDon = d.LoaiDon,
                        SoNgayNghi = d.SoNgayNghi,
                        NgayBatDau = d.NgayBatDau,
                        NgayKetThuc = d.NgayKetThuc
                    }).ToList(),

                    DaNghiViec = allResigned.Select(nv => new NhanSuStatusDto
                    {
                        MaNhanVien = nv.MaNhanVien,
                        HoTen = nv.HoTen,
                        TenPhongBan = nv.MaPhongBanNavigation?.TenPhongBan ?? "",
                        TenChucVu = nv.MaChucVuNavigation?.TenChucVu ?? "",
                        NgayNghiViec = nv.NgayNghiViec
                    }).ToList()
                }
            };
            return Ok(response);
        }
    }
}
