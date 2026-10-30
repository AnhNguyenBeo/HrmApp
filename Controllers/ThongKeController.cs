using HrmApp.Api.Constants;
using HrmApp.Api.Data;
using HrmApp.Api.Data.Models;
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
            var startOfMonth = new DateOnly(targetYear, targetMonth, 1);
            var endOfMonth = new DateOnly(targetYear, targetMonth, DateTime.DaysInMonth(targetYear, targetMonth));

            var callerRole = User.FindFirst(ClaimTypes.Role)?.Value ?? User.FindFirst("role")?.Value;
            var callerMaNhanVienStr = User.FindFirst("MaNhanVien")?.Value;
            Guid.TryParse(callerMaNhanVienStr, out var callerMaNhanVien);

            var callerNv = await _context.NhanViens
                .Include(n => n.MaPhongBanNavigation)
                .FirstOrDefaultAsync(n => n.MaNhanVien == callerMaNhanVien);

            var myDept = callerNv?.MaPhongBanNavigation?.TenPhongBan ?? "";
            bool canViewPayroll = callerRole == "Chủ doanh nghiệp" ||
                                  (callerRole == "Quản lý" && myDept.ToLower().Contains("kế toán"));

            var allEmployees = await _context.NhanViens
                .Include(nv => nv.MaPhongBanNavigation)
                .Include(nv => nv.MaChucVuNavigation)
                .ToListAsync();

            var activeInMonth = allEmployees
                .Where(nv => nv.NgayVaoLam <= endOfMonth &&
                             ((nv.TrangThaiLamViec != "Đã nghỉ việc" && !nv.NgayNghiViec.HasValue) ||
                              (nv.NgayNghiViec.HasValue && nv.NgayNghiViec.Value > endOfMonth)))
                .ToList();

            var resignedInMonth = allEmployees
                .Where(nv => nv.TrangThaiLamViec == "Đã nghỉ việc" &&
                             nv.NgayNghiViec.HasValue &&
                             nv.NgayNghiViec.Value >= startOfMonth &&
                             nv.NgayNghiViec.Value <= endOfMonth)
                .ToList();

            var approvedLeavesInMonth = await _context.DonTus
                .Include(d => d.MaNhanVienNavigation)
                .ThenInclude(nv => nv.MaPhongBanNavigation)
                .Where(d => d.TrangThai == "Đã duyệt" &&
                            (d.LoaiDon == "Nghỉ phép" || d.LoaiDon == "Nghỉ phép năm" ||
                             d.LoaiDon == "Nghỉ không lương" || d.LoaiDon == "Thai sản" ||
                             d.LoaiDon == "Nghỉ thai sản" || d.LoaiDon == "Nghỉ ốm" ||
                             d.LoaiDon == "Nghỉ ốm đau") &&
                            d.NgayBatDau <= endOfMonth && d.NgayKetThuc >= startOfMonth)
                .ToListAsync();

            var employeeIdsInMonth = activeInMonth.Select(nv => nv.MaNhanVien).ToHashSet();
            approvedLeavesInMonth = approvedLeavesInMonth
                .Where(d => employeeIdsInMonth.Contains(d.MaNhanVien))
                .ToList();
            var employeeIdsOnLeave = approvedLeavesInMonth.Select(d => d.MaNhanVien).ToHashSet();

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
                var activeEmpIds = activeInMonth.Select(nv => nv.MaNhanVien).ToList();
                var contractsInMonth = await _context.HopDongLaoDongs
                    .Where(h => activeEmpIds.Contains(h.MaNhanVien) &&
                                h.NgayBatDau <= endOfMonth &&
                                (!h.NgayKetThuc.HasValue || h.NgayKetThuc.Value >= startOfMonth) &&
                                (h.TrangThai == "Có hiệu lực" || h.TrangThai == "Đang hiệu lực" || h.TrangThai == "Đã thanh lý"))
                    .ToListAsync();
                activeSalaries = contractsInMonth
                    .GroupBy(h => h.MaNhanVien)
                    .Select(g => g.OrderByDescending(h => h.NgayBatDau).First().LuongCoBan)
                    .ToList();
            }

            var departments = await _context.PhongBans
                .Select(pb => new { pb.MaPhongBan, pb.TenPhongBan })
                .ToListAsync();
            var employeeCountsByDepartment = activeInMonth
                .GroupBy(nv => nv.MaPhongBan)
                .ToDictionary(g => g.Key, g => g.Count());
            int TenureMonths(NhanVien nv) => (targetYear - nv.NgayVaoLam.Year) * 12 + targetMonth - nv.NgayVaoLam.Month;

            var response = new DashboardResponseDto
            {
                CanViewPayroll = canViewPayroll,
                TongSoNhanVien = activeInMonth.Count,
                NhanVienMoiTrongThang = allEmployees.Count(nv => nv.NgayVaoLam.Month == targetMonth && nv.NgayVaoLam.Year == targetYear),
                DonTuChoDuyet = await _context.DonTus.CountAsync(d => d.TrangThai == "Chờ duyệt"),
                TongQuyLuongThang = tongQuyLuong,
                LuongDaChiTraThang = luongDaChiTra,
                LuongChoChiTraThang = luongChoChiTra,
                SoBangLuongDaChiTra = soBangLuongDaChiTra,
                SoBangLuongChoChiTra = soBangLuongChoChiTra,
                
                NhanVienTheoPhongBan = departments.Select(pb => new ThongKePhongBanDto
                {
                    TenPhongBan = pb.TenPhongBan,
                    SoLuongNhanVien = employeeCountsByDepartment.TryGetValue(pb.MaPhongBan, out var count) ? count : 0
                }).ToList(),

                NhanVienTheoTrinhDo = activeInMonth.GroupBy(nv => string.IsNullOrEmpty(nv.TrinhDoHocVan) ? "Chưa cập nhật" : nv.TrinhDoHocVan)
                    .Select(g => new ThongKeTrinhDoDto { TrinhDo = g.Key, SoLuong = g.Count() }).ToList(),

                NhanVienTheoThamNien = new List<ThongKeThamNienDto>
                {
                    new ThongKeThamNienDto { NhomThamNien = "Dưới 1 năm", SoLuong = activeInMonth.Count(nv => TenureMonths(nv) < 12) },
                    new ThongKeThamNienDto { NhomThamNien = "1 - 3 năm", SoLuong = activeInMonth.Count(nv => {
                        var m = TenureMonths(nv);
                        return m >= 12 && m <= 36;
                    })},
                    new ThongKeThamNienDto { NhomThamNien = "Trên 3 năm", SoLuong = activeInMonth.Count(nv => TenureMonths(nv) > 36) }
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
                    DangLamViec = activeInMonth.Where(nv => !employeeIdsOnLeave.Contains(nv.MaNhanVien)).Select(nv => new NhanSuStatusDto
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

                    DaNghiViec = resignedInMonth.Select(nv => new NhanSuStatusDto
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
