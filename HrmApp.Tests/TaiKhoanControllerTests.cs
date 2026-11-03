using HrmApp.Api.Controllers;
using HrmApp.Api.Data.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Moq;

namespace HrmApp.Tests;

public class TaiKhoanControllerTests
{
    [Fact]
    public async Task AdminChangesEmployeeRoleToManager()
    {
        using var db = HrTestSupport.CreateDbContext();
        var employeeRole = new VaiTro { MaVaiTro = Guid.NewGuid(), TenVaiTro = "Nhân viên" };
        var managerRole = new VaiTro { MaVaiTro = Guid.NewGuid(), TenVaiTro = "Quản lý" };
        var employee = NewEmployee("Nhân viên A");
        var account = NewAccount(employee, employeeRole, "employee.a");
        db.VaiTros.AddRange(employeeRole, managerRole);
        db.NhanViens.Add(employee);
        db.TaiKhoans.Add(account);
        await db.SaveChangesAsync();

        var audit = HrTestSupport.CreateAuditMock();
        var controller = new TaiKhoanController(db, audit.Object);
        HrTestSupport.SetUser(controller, Guid.NewGuid(), "Quản trị viên", Guid.NewGuid());
        var result = await controller.ChangeRole(account.MaTaiKhoan, managerRole.MaVaiTro);

        Assert.IsType<NoContentResult>(result);
        var changed = await db.TaiKhoans.Include(t => t.MaVaiTroNavigation).SingleAsync();
        Assert.Equal(managerRole.MaVaiTro, changed.MaVaiTro);
        Assert.Equal("Quản lý", changed.MaVaiTroNavigation.TenVaiTro);
        audit.Verify(x => x.GhiLogAsync(
            It.IsAny<string>(), It.IsAny<string?>(), "Phân quyền", It.IsAny<string>(),
            It.IsAny<string>(), It.IsAny<string?>()), Times.Once);
    }

    [Fact]
    public async Task AdminCannotPromoteTheirOwnAccount()
    {
        using var db = HrTestSupport.CreateDbContext();
        var adminRole = new VaiTro { MaVaiTro = Guid.NewGuid(), TenVaiTro = "Quản trị viên" };
        var managerRole = new VaiTro { MaVaiTro = Guid.NewGuid(), TenVaiTro = "Quản lý" };
        var adminEmployee = NewEmployee("Admin A");
        var account = NewAccount(adminEmployee, adminRole, "admin.a");
        db.VaiTros.AddRange(adminRole, managerRole);
        db.NhanViens.Add(adminEmployee);
        db.TaiKhoans.Add(account);
        await db.SaveChangesAsync();

        var controller = new TaiKhoanController(db, HrTestSupport.CreateAuditMock().Object);
        HrTestSupport.SetUser(controller, adminEmployee.MaNhanVien, "Quản trị viên", account.MaTaiKhoan);
        var result = await controller.ChangeRole(account.MaTaiKhoan, managerRole.MaVaiTro);

        Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal(adminRole.MaVaiTro, (await db.TaiKhoans.SingleAsync()).MaVaiTro);
    }

    [Fact]
    public async Task AdminUnlocksResignedEmployeeAccount_ReturnsBadRequest()
    {
        using var db = HrTestSupport.CreateDbContext();
        var employeeRole = new VaiTro { MaVaiTro = Guid.NewGuid(), TenVaiTro = "Nhân viên" };
        var employee = NewEmployee("Nhân viên Thôi Việc");
        employee.TrangThaiLamViec = "Đã thôi việc / Nghỉ việc";
        var account = NewAccount(employee, employeeRole, "employee.resigned");
        account.TrangThai = "Bị khóa";
        db.VaiTros.Add(employeeRole);
        db.NhanViens.Add(employee);
        db.TaiKhoans.Add(account);
        await db.SaveChangesAsync();

        var audit = HrTestSupport.CreateAuditMock();
        var controller = new TaiKhoanController(db, audit.Object);
        HrTestSupport.SetUser(controller, Guid.NewGuid(), "Quản trị viên", Guid.NewGuid());
        var result = await controller.MoKhoaTaiKhoan(account.MaTaiKhoan);

        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Contains("Nhân viên này đã thôi việc, không thể mở khóa tài khoản!", badRequest.Value?.ToString() ?? "");
    }

    [Fact]
    public async Task AdminUpdatesResignedEmployeeAccountToActive_ReturnsBadRequest()
    {
        using var db = HrTestSupport.CreateDbContext();
        var employeeRole = new VaiTro { MaVaiTro = Guid.NewGuid(), TenVaiTro = "Nhân viên" };
        var employee = NewEmployee("Nhân viên Nghỉ Việc");
        employee.TrangThaiLamViec = "Đã nghỉ việc";
        var account = NewAccount(employee, employeeRole, "employee.resigned2");
        account.TrangThai = "Bị khóa";
        db.VaiTros.Add(employeeRole);
        db.NhanViens.Add(employee);
        db.TaiKhoans.Add(account);
        await db.SaveChangesAsync();

        var audit = HrTestSupport.CreateAuditMock();
        var controller = new TaiKhoanController(db, audit.Object);
        HrTestSupport.SetUser(controller, Guid.NewGuid(), "Quản trị viên", Guid.NewGuid());
        var result = await controller.PutTaiKhoan(account.MaTaiKhoan, new HrmApp.Api.DTOs.TaiKhoan.UpdateTaiKhoanDto
        {
            MaVaiTro = employeeRole.MaVaiTro,
            TrangThai = "Hoạt động"
        });

        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Contains("Nhân viên này đã thôi việc, không thể mở khóa tài khoản!", badRequest.Value?.ToString() ?? "");
    }

    [Fact]
    public async Task AdminUnlocksActiveEmployeeAccount_Succeeds()
    {
        using var db = HrTestSupport.CreateDbContext();
        var employeeRole = new VaiTro { MaVaiTro = Guid.NewGuid(), TenVaiTro = "Nhân viên" };
        var employee = NewEmployee("Nhân viên Đang Làm");
        employee.TrangThaiLamViec = "Đang làm việc";
        var account = NewAccount(employee, employeeRole, "employee.active");
        account.TrangThai = "Bị khóa";
        db.VaiTros.Add(employeeRole);
        db.NhanViens.Add(employee);
        db.TaiKhoans.Add(account);
        await db.SaveChangesAsync();

        var audit = HrTestSupport.CreateAuditMock();
        var controller = new TaiKhoanController(db, audit.Object);
        HrTestSupport.SetUser(controller, Guid.NewGuid(), "Quản trị viên", Guid.NewGuid());
        var result = await controller.MoKhoaTaiKhoan(account.MaTaiKhoan);

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.Contains("Mở khóa tài khoản thành công", okResult.Value?.ToString() ?? "");
        var updated = await db.TaiKhoans.SingleAsync(t => t.MaTaiKhoan == account.MaTaiKhoan);
        Assert.Equal("Hoạt động", updated.TrangThai);
    }

    private static NhanVien NewEmployee(string name) => new()
    {
        MaNhanVien = Guid.NewGuid(),
        HoTen = name,
        NgaySinh = new DateOnly(1990, 1, 1),
        GioiTinh = "Nam",
        Cccd = Guid.NewGuid().ToString("N")[..12],
        Email = $"{Guid.NewGuid():N}@example.test",
        SoDienThoai = "0900000000",
        DiaChi = "TP. Hồ Chí Minh",
        TrinhDoHocVan = "Đại học",
        MaPhongBan = Guid.NewGuid(),
        MaChucVu = Guid.NewGuid(),
        NgayVaoLam = new DateOnly(2020, 1, 1),
        TrangThaiLamViec = "Đang làm việc"
    };

    private static TaiKhoan NewAccount(NhanVien employee, VaiTro role, string username) => new()
    {
        MaTaiKhoan = Guid.NewGuid(),
        MaNhanVien = employee.MaNhanVien,
        MaNhanVienNavigation = employee,
        TenDangNhap = username,
        MatKhauHash = BCrypt.Net.BCrypt.HashPassword("Pass@123"),
        MaVaiTro = role.MaVaiTro,
        MaVaiTroNavigation = role,
        TrangThai = "Hoạt động",
        NgayTao = new DateOnly(2024, 1, 1)
    };
}
