using System.Text;
using HrmApp.Api.Controllers;
using HrmApp.Api.Data;
using HrmApp.Api.Data.Models;
using HrmApp.Api.DTOs.BangLuong;
using HrmApp.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace HrmApp.Tests;

public class PayrollAndExportTests
{
    [Fact]
    public async Task CalculateSalary_CombinesAttendanceApprovedLeaveOvertimeInsuranceAndTax()
    {
        using var db = HrTestSupport.CreateDbContext();
        var accounting = new PhongBan { MaPhongBan = Guid.NewGuid(), TenPhongBan = "Phòng Kế toán" };
        var sales = new PhongBan { MaPhongBan = Guid.NewGuid(), TenPhongBan = "Phòng Kinh doanh" };
        var position = new ChucVu { MaChucVu = Guid.NewGuid(), TenChucVu = "Nhân viên" };
        var payrollOperator = NewEmployee("Kế toán", "accounting@example.test", accounting, position);
        var employee = NewEmployee("Nhân viên", "employee@example.test", sales, position);
        var contract = new HopDongLaoDong
        {
            MaHopDong = Guid.NewGuid(),
            MaNhanVien = employee.MaNhanVien,
            MaNhanVienNavigation = employee,
            LoaiHopDong = "Không xác định thời hạn",
            NgayBatDau = new DateOnly(2024, 1, 1),
            LuongCoBan = 42000000m,
            TrangThai = "Có hiệu lực"
        };

        db.PhongBans.AddRange(accounting, sales);
        db.ChucVus.Add(position);
        db.NhanViens.AddRange(payrollOperator, employee);
        db.HopDongLaoDongs.Add(contract);
        foreach (var day in Enumerable.Range(1, 14)
                     .Select(day => new DateOnly(2026, 10, day))
                     .Where(day => day.DayOfWeek is not DayOfWeek.Saturday and not DayOfWeek.Sunday)
                     .Take(10))
        {
            db.ChamCongs.Add(new ChamCong
            {
                MaChamCong = Guid.NewGuid(),
                MaNhanVien = employee.MaNhanVien,
                MaNhanVienNavigation = employee,
                Ngay = day,
                GioVao = new TimeOnly(8, 0),
                GioRa = new TimeOnly(17, 0),
                SoGioTangCa = day == new DateOnly(2026, 10, 14) ? 2.5m : 0m,
                TrangThai = "Hoàn thành"
            });
        }
        db.DonTus.Add(new DonTu
        {
            MaDon = Guid.NewGuid(),
            MaNhanVien = employee.MaNhanVien,
            MaNhanVienNavigation = employee,
            HoTen = employee.HoTen,
            LoaiDon = "Nghỉ phép",
            LoaiNghi = "Nghỉ phép",
            NgayBatDau = new DateOnly(2026, 10, 15),
            NgayKetThuc = new DateOnly(2026, 10, 15),
            SoNgayNghi = 1,
            LyDo = "Nghỉ phép đã duyệt",
            TrangThai = "Đã duyệt"
        });
        await db.SaveChangesAsync();

        var controller = NewPayrollController(db);
        HrTestSupport.SetUser(controller, payrollOperator.MaNhanVien, "Quản lý");
        var result = await controller.CalculateSalary(new TinhLuongRequestDto
        {
            ThoiGian = "10/2026",
            MaNhanVien = employee.MaNhanVien
        });

        Assert.IsType<OkObjectResult>(result);
        var salary = await db.BangLuongs.SingleAsync();
        Assert.Equal("10/2026", salary.ThoiGian);
        Assert.Equal(11m, salary.SoNgayCong);
        Assert.Equal(2.5m, salary.TongGioOt);
        Assert.Equal(42000000m, salary.LuongCoBan);
        Assert.Equal(4410000m, salary.BaoHiemXaHoi);
        Assert.Equal(99244.32m, salary.ThueTncn);
        Assert.InRange(salary.LuongOt ?? 0m, 894886.36m, 894886.37m);
        Assert.InRange(salary.ThucLinh ?? 0m, 17385642.04m, 17385642.05m);
    }

    [Fact]
    public async Task CalculateSalary_DoesNotOverwritePaidSalary()
    {
        using var db = HrTestSupport.CreateDbContext();
        var accounting = new PhongBan { MaPhongBan = Guid.NewGuid(), TenPhongBan = "Phòng Kế toán" };
        var sales = new PhongBan { MaPhongBan = Guid.NewGuid(), TenPhongBan = "Phòng Kinh doanh" };
        var position = new ChucVu { MaChucVu = Guid.NewGuid(), TenChucVu = "Nhân viên" };
        var payrollOperator = NewEmployee("Kế toán", "accounting@example.test", accounting, position);
        var employee = NewEmployee("Nhân viên", "employee@example.test", sales, position);
        var paid = new BangLuong
        {
            MaBangLuong = Guid.NewGuid(),
            MaNhanVien = employee.MaNhanVien,
            MaNhanVienNavigation = employee,
            ThoiGian = "10/2026",
            NgayCongChuan = 22,
            SoNgayCong = 19,
            TongGioOt = 0,
            LuongCoBan = 18000000m,
            LuongOt = 0,
            BaoHiemXaHoi = 1890000m,
            ThueTncn = 0,
            ThucLinh = 16110000m,
            TrangThaiChiTra = "Đã chi trả"
        };
        db.PhongBans.AddRange(accounting, sales);
        db.ChucVus.Add(position);
        db.NhanViens.AddRange(payrollOperator, employee);
        db.BangLuongs.Add(paid);
        await db.SaveChangesAsync();

        var controller = NewPayrollController(db);
        HrTestSupport.SetUser(controller, payrollOperator.MaNhanVien, "Quản lý");
        var result = await controller.CalculateSalary(new TinhLuongRequestDto { ThoiGian = "10/2026" });

        Assert.IsType<OkObjectResult>(result);
        var unchanged = await db.BangLuongs.SingleAsync(b => b.MaNhanVien == employee.MaNhanVien);
        Assert.Equal(19m, unchanged.SoNgayCong);
        Assert.Equal(16110000m, unchanged.ThucLinh);
        Assert.Equal("Đã chi trả", unchanged.TrangThaiChiTra);
    }

    [Fact]
    public async Task EmployeeInAccountingDepartment_CannotCalculateCompanyPayroll()
    {
        using var db = HrTestSupport.CreateDbContext();
        var accounting = new PhongBan { MaPhongBan = Guid.NewGuid(), TenPhongBan = "Phòng Kế toán" };
        var position = new ChucVu { MaChucVu = Guid.NewGuid(), TenChucVu = "Nhân viên" };
        var employee = NewEmployee("Kế toán nhân viên", "accounting.staff@example.test", accounting, position);
        db.PhongBans.Add(accounting);
        db.ChucVus.Add(position);
        db.NhanViens.Add(employee);
        await db.SaveChangesAsync();

        var controller = NewPayrollController(db);
        HrTestSupport.SetUser(controller, employee.MaNhanVien, "Nhân viên");
        var result = await controller.CalculateSalary(new TinhLuongRequestDto { ThoiGian = "10/2026" });

        Assert.Equal(403, Assert.IsType<ObjectResult>(result).StatusCode);
    }

    [Fact]
    public async Task EmployeeInAccountingDepartment_CannotApproveAnotherEmployeesSalary()
    {
        using var db = HrTestSupport.CreateDbContext();
        var accounting = new PhongBan { MaPhongBan = Guid.NewGuid(), TenPhongBan = "Phòng Kế toán" };
        var sales = new PhongBan { MaPhongBan = Guid.NewGuid(), TenPhongBan = "Phòng Kinh doanh" };
        var position = new ChucVu { MaChucVu = Guid.NewGuid(), TenChucVu = "Nhân viên" };
        var employeeA = NewEmployee("Kế toán nhân viên", "accounting.staff@example.test", accounting, position);
        var employeeB = NewEmployee("Nhân viên B", "employee.b@example.test", sales, position);
        var salary = NewSalary(employeeB, "10/2026");
        db.PhongBans.AddRange(accounting, sales);
        db.ChucVus.Add(position);
        db.NhanViens.AddRange(employeeA, employeeB);
        db.BangLuongs.Add(salary);
        await db.SaveChangesAsync();

        var controller = NewPayrollController(db);
        HrTestSupport.SetUser(controller, employeeA.MaNhanVien, "Nhân viên");
        var result = await controller.UpdateTrangThai(salary.MaBangLuong, new UpdateTrangThaiDto { TrangThai = "Đã chi trả" });

        Assert.Equal(403, Assert.IsType<ObjectResult>(result).StatusCode);
        Assert.Equal("Chờ duyệt", (await db.BangLuongs.SingleAsync()).TrangThaiChiTra);
    }

    [Fact]
    public async Task EmployeeSalaryListAndCsvExport_AreLimitedToTheirOwnRecords()
    {
        using var db = HrTestSupport.CreateDbContext();
        var department = new PhongBan { MaPhongBan = Guid.NewGuid(), TenPhongBan = "Phòng Kinh doanh" };
        var position = new ChucVu { MaChucVu = Guid.NewGuid(), TenChucVu = "Nhân viên" };
        var employeeA = NewEmployee("Nguyễn A", "a@example.test", department, position);
        var employeeB = NewEmployee("Trần B", "b@example.test", department, position);
        db.PhongBans.Add(department);
        db.ChucVus.Add(position);
        db.NhanViens.AddRange(employeeA, employeeB);
        db.BangLuongs.AddRange(NewSalary(employeeA, "10/2026"), NewSalary(employeeB, "10/2026"), NewSalary(employeeB, "09/2026"));
        await db.SaveChangesAsync();

        var salaryController = NewPayrollController(db);
        HrTestSupport.SetUser(salaryController, employeeA.MaNhanVien, "Nhân viên");
        var salaries = Assert.IsType<OkObjectResult>(await salaryController.GetMySalaries());
        var rows = Assert.IsAssignableFrom<IEnumerable<BangLuongResponseDto>>(salaries.Value);
        Assert.Single(rows);
        Assert.All(rows, row => Assert.Equal(employeeA.MaNhanVien, row.MaNhanVien.GetValueOrDefault()));

        var exportController = new ExportController(db);
        HrTestSupport.SetUser(exportController, employeeA.MaNhanVien, "Nhân viên");
        var exported = Assert.IsType<FileContentResult>(await exportController.ExportBangLuong("10/2026", null));
        Assert.Equal("text/csv", exported.ContentType);
        Assert.Equal(new byte[] { 0xEF, 0xBB, 0xBF }, exported.FileContents.Take(3).ToArray());
        var csv = Encoding.UTF8.GetString(exported.FileContents, 3, exported.FileContents.Length - 3);
        Assert.Contains("Nguyễn A", csv);
        Assert.DoesNotContain("Trần B", csv);
    }

    [Fact]
    public async Task EmployeeAssignedToAccountingDepartment_CannotExportCoworkersSalaries()
    {
        using var db = HrTestSupport.CreateDbContext();
        var accounting = new PhongBan { MaPhongBan = Guid.NewGuid(), TenPhongBan = "Phòng Kế toán" };
        var position = new ChucVu { MaChucVu = Guid.NewGuid(), TenChucVu = "Nhân viên" };
        var employeeA = NewEmployee("Kế toán A", "accounting.a@example.test", accounting, position);
        var employeeB = NewEmployee("Kế toán B", "accounting.b@example.test", accounting, position);
        db.PhongBans.Add(accounting);
        db.ChucVus.Add(position);
        db.NhanViens.AddRange(employeeA, employeeB);
        db.BangLuongs.AddRange(NewSalary(employeeA, "10/2026"), NewSalary(employeeB, "10/2026"));
        await db.SaveChangesAsync();

        var controller = new ExportController(db);
        HrTestSupport.SetUser(controller, employeeA.MaNhanVien, "Nhân viên");
        var exported = Assert.IsType<FileContentResult>(await controller.ExportBangLuong("10/2026", null));
        var csv = Encoding.UTF8.GetString(exported.FileContents, 3, exported.FileContents.Length - 3);

        Assert.Contains("Kế toán A", csv);
        Assert.DoesNotContain("Kế toán B", csv);
    }

    private static BangLuongController NewPayrollController(QuanLyNhanSuDbContext db)
    {
        var taxOptions = Options.Create(new PayrollOptions());
        return new BangLuongController(
            db,
            HrTestSupport.CreateAuditMock().Object,
            new PayrollTaxCalculator(taxOptions));
    }

    private static NhanVien NewEmployee(string name, string email, PhongBan department, ChucVu position) => new()
    {
        MaNhanVien = Guid.NewGuid(),
        HoTen = name,
        NgaySinh = new DateOnly(1990, 1, 1),
        GioiTinh = "Nam",
        Cccd = Guid.NewGuid().ToString("N")[..12],
        Email = email,
        SoDienThoai = "0900000000",
        DiaChi = "TP. Hồ Chí Minh",
        TrinhDoHocVan = "Đại học",
        MaPhongBan = department.MaPhongBan,
        MaPhongBanNavigation = department,
        MaChucVu = position.MaChucVu,
        MaChucVuNavigation = position,
        NgayVaoLam = new DateOnly(2020, 1, 1),
        TrangThaiLamViec = "Đang làm việc"
    };

    private static BangLuong NewSalary(NhanVien employee, string month) => new()
    {
        MaBangLuong = Guid.NewGuid(),
        MaNhanVien = employee.MaNhanVien,
        MaNhanVienNavigation = employee,
        ThoiGian = month,
        NgayCongChuan = 22,
        SoNgayCong = 20,
        TongGioOt = 0,
        LuongCoBan = 18000000m,
        LuongOt = 0,
        BaoHiemXaHoi = 1890000m,
        ThueTncn = 0,
        ThucLinh = 16110000m,
        TrangThaiChiTra = "Chờ duyệt"
    };
}
