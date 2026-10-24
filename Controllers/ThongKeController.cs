using HrmApp.Api.Constants;
using HrmApp.Api.Data;
using HrmApp.Api.DTOs.ThongKe;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

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
        public async Task<IActionResult> GetDashboardStats([FromQuery] string? thoiGian)
        {
            var now = DateTime.Now;
            int targetMonth = now.Month;
            int targetYear = now.Year;

            if (!string.IsNullOrEmpty(thoiGian))
            {
                var p = thoiGian.Trim().Split('/');
                if (p.Length == 2 && int.TryParse(p[0], out var m) && int.TryParse(p[1], out var y) && m >= 1 && m <= 12 && y >= 2000 && y <= 2100)
                {
                    targetMonth = m;
                    targetYear = y;
                }
            }

            var currentMonthStr = $"{targetMonth:D2}/{targetYear}";

            var callerRole = User.FindFirst(ClaimTypes.Role)?.Value ?? User.FindFirst("role")?.Value;
            var callerMaNhanVienStr = User.FindFirst("MaNhanVien")?.Value;
            Guid.TryParse(callerMaNhanVienStr, out var callerMaNhanVien);

            var callerNv = await _context.NhanViens
                .Include(n => n.MaPhongBanNavigation)
                .FirstOrDefaultAsync(n => n.MaNhanVien == callerMaNhanVien);

            var myDept = callerNv?.MaPhongBanNavigation?.TenPhongBan ?? "";
            bool canViewPayroll = callerRole == "Chủ doanh nghiệp" || myDept.ToLower().Contains("kế toán");

            var allActive = await _context.NhanViens
                .Include(nv => nv.MaPhongBanNavigation)
                .Include(nv => nv.MaChucVuNavigation)
                .Where(nv => nv.TrangThaiLamViec != "Đã nghỉ việc")
                .ToListAsync();

            var allResigned = await _context.NhanViens
                .Include(nv => nv.MaPhongBanNavigation)
                .Include(nv => nv.MaChucVuNavigation)
                .Where(nv => nv.TrangThaiLamViec == "Đã nghỉ việc")
                .ToListAsync();

            var approvedLeavesInMonth = await _context.DonTus
                .Include(d => d.MaNhanVienNavigation)
                .ThenInclude(nv => nv.MaPhongBanNavigation)
                .Where(d => d.TrangThai == "Đã duyệt" &&
                            d.LoaiDon != "Làm thêm giờ" &&
                            ((d.NgayBatDau.Month == targetMonth && d.NgayBatDau.Year == targetYear) ||
                             (d.NgayKetThuc.Month == targetMonth && d.NgayKetThuc.Year == targetYear)))
                .ToListAsync();

            var bangLuongsThang = await _context.BangLuongs
                .Where(b => b.ThoiGian == currentMonthStr)
                .ToListAsync();

            decimal tongQuyLuong = canViewPayroll ? bangLuongsThang.Sum(b => b.ThucLinh ?? 0) : 0;
            decimal luongDaChiTra = canViewPayroll ? bangLuongsThang
                .Where(b => b.TrangThaiChiTra == "Đã chi trả" || b.TrangThaiChiTra == "Đã thanh toán")
                .Sum(b => b.ThucLinh ?? 0) : 0;
            decimal luongChoChiTra = canViewPayroll ? bangLuongsThang
                .Where(b => b.TrangThaiChiTra != "Đã chi trả" && b.TrangThaiChiTra != "Đã thanh toán")
                .Sum(b => b.ThucLinh ?? 0) : 0;

            var soBangLuongDaChiTra = canViewPayroll ? bangLuongsThang
                .Count(b => b.TrangThaiChiTra == "Đã chi trả" || b.TrangThaiChiTra == "Đã thanh toán") : 0;
            var soBangLuongChoChiTra = canViewPayroll ? bangLuongsThang
                .Count(b => b.TrangThaiChiTra != "Đã chi trả" && b.TrangThaiChiTra != "Đã thanh toán") : 0;

            var activeSalaries = new List<decimal>();
            if (canViewPayroll)
            {
                var activeEmpIds = allActive.Select(nv => nv.MaNhanVien).ToList();
                activeSalaries = await _context.HopDongLaoDongs
                    .Where(h => activeEmpIds.Contains(h.MaNhanVien) && (h.TrangThai == "Có hiệu lực" || h.TrangThai == "Đang hiệu lực"))
                    .Select(h => h.LuongCoBan)
                    .ToListAsync();
            }

            var response = new DashboardResponseDto
            {
                TongSoNhanVien = allActive.Count,
                NhanVienMoiTrongThang = allActive.Count(nv => nv.NgayVaoLam.Month == targetMonth && nv.NgayVaoLam.Year == targetYear),
                DonTuChoDuyet = await _context.DonTus.CountAsync(d => d.TrangThai == "Chờ duyệt"),
                TongQuyLuongThang = tongQuyLuong,
                LuongDaChiTraThang = luongDaChiTra,
                LuongChoChiTraThang = luongChoChiTra,
                SoBangLuongDaChiTra = soBangLuongDaChiTra,
                SoBangLuongChoChiTra = soBangLuongChoChiTra,
                
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

                NhanVienTheoMucLuong = canViewPayroll ? new List<ThongKeMucLuongDto>
                {
                    new ThongKeMucLuongDto { MucLuong = "Dưới 15 triệu", SoLuong = activeSalaries.Count(s => s < 15_000_000) },
                    new ThongKeMucLuongDto { MucLuong = "15 - 25 triệu", SoLuong = activeSalaries.Count(s => s >= 15_000_000 && s < 25_000_000) },
                    new ThongKeMucLuongDto { MucLuong = "25 - 35 triệu", SoLuong = activeSalaries.Count(s => s >= 25_000_000 && s < 35_000_000) },
                    new ThongKeMucLuongDto { MucLuong = "Trên 35 triệu", SoLuong = activeSalaries.Count(s => s >= 35_000_000) }
                } : new List<ThongKeMucLuongDto>(),

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