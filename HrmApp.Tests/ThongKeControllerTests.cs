using HrmApp.Api.Controllers;
using HrmApp.Api.Data.Models;
using HrmApp.Api.DTOs.ThongKe;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HrmApp.Tests;

public class ThongKeControllerTests
{
    [Fact]
    public async Task Dashboard_MonthSnapshotSeparatesWorkingLeaveAndResignedEmployees()
    {
        using var db = HrTestSupport.CreateDbContext();
        var department = new PhongBan { MaPhongBan = Guid.NewGuid(), TenPhongBan = "Phòng Kinh doanh" };
        var position = new ChucVu { MaChucVu = Guid.NewGuid(), TenChucVu = "Nhân viên" };
        var working = NewEmployee("Đang làm", department, position, "Đang làm việc", new DateOnly(2020, 1, 1));
        var onLeave = NewEmployee("Đang nghỉ phép", department, position, "Đang làm việc", new DateOnly(2022, 1, 1));
        var resignedInMonth = NewEmployee("Nghỉ trong tháng", department, position, "Đã nghỉ việc", new DateOnly(2019, 1, 1));
        resignedInMonth.NgayNghiViec = new DateOnly(2026, 10, 12);
        var resignedEarlier = NewEmployee("Nghỉ tháng trước", department, position, "Đã nghỉ việc", new DateOnly(2018, 1, 1));
        resignedEarlier.NgayNghiViec = new DateOnly(2026, 9, 30);

        db.PhongBans.Add(department);
        db.ChucVus.Add(position);
        db.NhanViens.AddRange(working, onLeave, resignedInMonth, resignedEarlier);
        db.DonTus.AddRange(
            NewRequest(onLeave, "Nghỉ phép", new DateOnly(2026, 9, 30), new DateOnly(2026, 11, 2), "Đã duyệt"),
            NewRequest(working, "Làm thêm giờ", new DateOnly(2026, 10, 15), new DateOnly(2026, 10, 15), "Đã duyệt"));
        await db.SaveChangesAsync();

        var controller = new ThongKeController(db);
        HrTestSupport.SetUser(controller, Guid.NewGuid(), "Quản lý");
        var response = Assert.IsType<DashboardResponseDto>(Assert.IsType<OkObjectResult>(
            await controller.GetDashboardStats("10/2026")).Value);

        Assert.Equal(2, response.TongSoNhanVien);
        Assert.Single(response.TinhHinhNhanSu.DangLamViec);
        Assert.Equal(working.MaNhanVien, response.TinhHinhNhanSu.DangLamViec[0].MaNhanVien);
        Assert.Single(response.TinhHinhNhanSu.NghiPhep);
        Assert.Equal(onLeave.MaNhanVien, response.TinhHinhNhanSu.NghiPhep[0].MaNhanVien);
        Assert.Single(response.TinhHinhNhanSu.DaNghiViec);
        Assert.Equal(resignedInMonth.MaNhanVien, response.TinhHinhNhanSu.DaNghiViec[0].MaNhanVien);
    }

    [Fact]
    public async Task Dashboard_GroupsEducationSalaryAndTenureWithoutLosingBoundaryValues()
    {
        using var db = HrTestSupport.CreateDbContext();
        var accounting = new PhongBan { MaPhongBan = Guid.NewGuid(), TenPhongBan = "Phòng Kế toán" };
        var sales = new PhongBan { MaPhongBan = Guid.NewGuid(), TenPhongBan = "Phòng Kinh doanh" };
        var position = new ChucVu { MaChucVu = Guid.NewGuid(), TenChucVu = "Nhân viên" };
        var now = DateOnly.FromDateTime(DateTime.Now);
        var payrollManager = NewEmployee("Kế toán", accounting, position, "Đang làm việc", new DateOnly(now.Year - 4, now.Month, 1));

        var staff = new[]
        {
            NewEmployee("Mức dưới 15", sales, position, "Đang làm việc", new DateOnly(now.Year, now.Month, 1), "Đại học"),
            NewEmployee("Mức 15", sales, position, "Đang làm việc", new DateOnly(now.AddMonths(-12).Year, now.AddMonths(-12).Month, 1), "Cao đẳng"),
            NewEmployee("Mức 25", sales, position, "Đang làm việc", new DateOnly(now.AddMonths(-36).Year, now.AddMonths(-36).Month, 1), "Đại học"),
            NewEmployee("Mức trên 35", sales, position, "Đang làm việc", new DateOnly(now.AddMonths(-48).Year, now.AddMonths(-48).Month, 1), "Thạc sĩ")
        };
        var salaryBands = new[] { 14999999m, 15000000m, 25000000m, 35000000m };

        db.PhongBans.AddRange(accounting, sales);
        db.ChucVus.Add(position);
        db.NhanViens.Add(payrollManager);
        db.NhanViens.AddRange(staff);
        foreach (var (employee, salary) in staff.Zip(salaryBands))
        {
            db.HopDongLaoDongs.Add(new HopDongLaoDong
            {
                MaHopDong = Guid.NewGuid(),
                MaNhanVien = employee.MaNhanVien,
                MaNhanVienNavigation = employee,
                LoaiHopDong = "Không xác định thời hạn",
                NgayBatDau = employee.NgayVaoLam,
                LuongCoBan = salary,
                TrangThai = "Có hiệu lực"
            });
        }
        await db.SaveChangesAsync();

        var controller = new ThongKeController(db);
        HrTestSupport.SetUser(controller, payrollManager.MaNhanVien, "Quản lý");
        var response = Assert.IsType<DashboardResponseDto>(Assert.IsType<OkObjectResult>(
            await controller.GetDashboardStats($"{now.Month:D2}/{now.Year}")).Value);

        Assert.True(response.CanViewPayroll);
        Assert.Equal(1, response.NhanVienTheoMucLuong.Single(x => x.MucLuong == "Dưới 15 triệu").SoLuong);
        Assert.Equal(1, response.NhanVienTheoMucLuong.Single(x => x.MucLuong == "15 - 25 triệu").SoLuong);
        Assert.Equal(1, response.NhanVienTheoMucLuong.Single(x => x.MucLuong == "25 - 35 triệu").SoLuong);
        Assert.Equal(1, response.NhanVienTheoMucLuong.Single(x => x.MucLuong == "Trên 35 triệu").SoLuong);
        Assert.Equal(3, response.NhanVienTheoTrinhDo.Single(x => x.TrinhDo == "Đại học").SoLuong);
        Assert.Equal(1, response.NhanVienTheoThamNien.Single(x => x.NhomThamNien == "Dưới 1 năm").SoLuong);
        Assert.Equal(2, response.NhanVienTheoThamNien.Single(x => x.NhomThamNien == "1 - 3 năm").SoLuong);
        Assert.Equal(2, response.NhanVienTheoThamNien.Single(x => x.NhomThamNien == "Trên 3 năm").SoLuong);
    }

    private static NhanVien NewEmployee(
        string name,
        PhongBan department,
        ChucVu position,
        string employmentStatus,
        DateOnly startDate,
        string education = "Đại học") => new()
    {
        MaNhanVien = Guid.NewGuid(),
        HoTen = name,
        NgaySinh = new DateOnly(1990, 1, 1),
        GioiTinh = "Nữ",
        Cccd = Guid.NewGuid().ToString("N")[..12],
        Email = $"{Guid.NewGuid():N}@example.test",
        SoDienThoai = "0900000000",
        DiaChi = "TP. Hồ Chí Minh",
        TrinhDoHocVan = education,
        MaPhongBan = department.MaPhongBan,
        MaPhongBanNavigation = department,
        MaChucVu = position.MaChucVu,
        MaChucVuNavigation = position,
        NgayVaoLam = startDate,
        TrangThaiLamViec = employmentStatus
    };

    private static DonTu NewRequest(NhanVien employee, string type, DateOnly start, DateOnly end, string status) => new()
    {
        MaDon = Guid.NewGuid(),
        MaNhanVien = employee.MaNhanVien,
        MaNhanVienNavigation = employee,
        HoTen = employee.HoTen,
        LoaiDon = type,
        LoaiNghi = type,
        NgayBatDau = start,
        NgayKetThuc = end,
        SoNgayNghi = 1,
        LyDo = "Đơn phục vụ kiểm thử thống kê",
        TrangThai = status
    };
}
