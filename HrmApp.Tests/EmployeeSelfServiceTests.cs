using HrmApp.Api.Controllers;
using HrmApp.Api.Data.Models;
using HrmApp.Api.DTOs.NhanVien;
using HrmApp.Api.DTOs.Shared;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HrmApp.Tests;

public class EmployeeSelfServiceTests
{
    [Fact]
    public async Task EmployeeCannotReadAnotherEmployeeByChangingRouteId_EvenWithinSameDepartment()
    {
        using var db = HrTestSupport.CreateDbContext();
        var (employeeA, employeeB) = await AddEmployeePairAsync(db, "Phòng Kinh doanh");
        var controller = new NhanVienController(db, HrTestSupport.CreateAuditMock().Object);
        HrTestSupport.SetUser(controller, employeeA.MaNhanVien, "Nhân viên");

        var result = await controller.GetNhanVien(employeeB.MaNhanVien);

        var forbidden = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(403, forbidden.StatusCode);
    }

    [Fact]
    public async Task EmployeeCanReadAndUpdateOnlyTheirOwnProfile()
    {
        using var db = HrTestSupport.CreateDbContext();
        var (employeeA, employeeB) = await AddEmployeePairAsync(db, "Phòng Nhân sự");
        var controller = new NhanVienController(db, HrTestSupport.CreateAuditMock().Object);
        HrTestSupport.SetUser(controller, employeeA.MaNhanVien, "Nhân viên");

        var ownProfile = await controller.GetNhanVien(employeeA.MaNhanVien);
        Assert.IsType<OkObjectResult>(ownProfile.Result);

        var foreignUpdate = await controller.PutNhanVien(employeeB.MaNhanVien, new UpdateNhanVienDto
        {
            HoTen = "Đổi tên trái phép",
            NgaySinh = employeeB.NgaySinh,
            GioiTinh = employeeB.GioiTinh,
            Cccd = employeeB.Cccd,
            Email = employeeB.Email,
            SoDienThoai = employeeB.SoDienThoai,
            DiaChi = employeeB.DiaChi,
            TrinhDoHocVan = employeeB.TrinhDoHocVan,
            MaPhongBan = employeeB.MaPhongBan
        });
        Assert.Equal(403, Assert.IsType<ObjectResult>(foreignUpdate).StatusCode);

        var selfUpdate = await controller.UpdateHoSoCuaToi(new UpdateHoSoCuaToiDto
        {
            SoDienThoai = "0901234567",
            Email = "employee.a.updated@example.test",
            DiaChi = "Quận 1, TP. Hồ Chí Minh"
        });

        Assert.IsType<OkObjectResult>(selfUpdate);
        Assert.Equal("employee.a.updated@example.test", (await db.NhanViens.SingleAsync(n => n.MaNhanVien == employeeA.MaNhanVien)).Email);
        Assert.Equal("employee.b@example.test", (await db.NhanViens.SingleAsync(n => n.MaNhanVien == employeeB.MaNhanVien)).Email);
    }

    [Fact]
    public async Task EmployeeInHrDepartmentCannotUseManagerDirectoryPrivileges()
    {
        using var db = HrTestSupport.CreateDbContext();
        var (employeeA, _) = await AddEmployeePairAsync(db, "Phòng Nhân sự");
        var controller = new NhanVienController(db, HrTestSupport.CreateAuditMock().Object);
        HrTestSupport.SetUser(controller, employeeA.MaNhanVien, "Nhân viên");

        var result = await controller.GetNhanViens(new NhanVienSearchDto());

        Assert.Equal(403, Assert.IsType<ObjectResult>(result.Result).StatusCode);
    }

    [Fact]
    public async Task ManagerCanViewOnlyEmployeesInTheirDepartment_InListSearchAndDetails()
    {
        using var db = HrTestSupport.CreateDbContext();
        var sales = new PhongBan { MaPhongBan = Guid.NewGuid(), TenPhongBan = "Phòng Kinh doanh" };
        var warehouse = new PhongBan { MaPhongBan = Guid.NewGuid(), TenPhongBan = "Phòng Kho" };
        var position = new ChucVu { MaChucVu = Guid.NewGuid(), TenChucVu = "Nhân viên" };
        var manager = NewEmployee("Quản lý kinh doanh", "manager.sales@example.test", "079100000011", sales, position);
        var coworker = NewEmployee("Nhân viên kinh doanh", "sales.staff@example.test", "079100000012", sales, position);
        var otherDepartmentEmployee = NewEmployee("Nhân viên kho", "warehouse.staff@example.test", "079100000013", warehouse, position);

        db.PhongBans.AddRange(sales, warehouse);
        db.ChucVus.Add(position);
        db.NhanViens.AddRange(manager, coworker, otherDepartmentEmployee);
        await db.SaveChangesAsync();

        var controller = new NhanVienController(db, HrTestSupport.CreateAuditMock().Object);
        HrTestSupport.SetUser(controller, manager.MaNhanVien, "Quản lý");

        var listResult = await controller.GetNhanViens(new NhanVienSearchDto
        {
            MaPhongBan = warehouse.MaPhongBan,
            PageSize = 100
        });
        var page = Assert.IsType<PagedResultDto<NhanVienResponseDto>>(Assert.IsType<OkObjectResult>(listResult.Result).Value);
        Assert.Equal(2, page.TotalCount);
        Assert.Contains(page.Items, employee => employee.MaNhanVien == manager.MaNhanVien);
        Assert.Contains(page.Items, employee => employee.MaNhanVien == coworker.MaNhanVien);
        Assert.DoesNotContain(page.Items, employee => employee.MaNhanVien == otherDepartmentEmployee.MaNhanVien);
        Assert.All(page.Items, employee => Assert.Equal(sales.MaPhongBan, employee.MaPhongBan));

        var ownDepartmentDetail = await controller.GetNhanVien(coworker.MaNhanVien);
        Assert.IsType<OkObjectResult>(ownDepartmentDetail.Result);

        var crossDepartmentDetail = await controller.GetNhanVien(otherDepartmentEmployee.MaNhanVien);
        Assert.Equal(403, Assert.IsType<ObjectResult>(crossDepartmentDetail.Result).StatusCode);

        var crossDepartmentSearch = await controller.Search(otherDepartmentEmployee.HoTen);
        var searchResults = Assert.IsAssignableFrom<IEnumerable<NhanVienResponseDto>>(
            Assert.IsType<OkObjectResult>(crossDepartmentSearch.Result).Value);
        Assert.Empty(searchResults);
    }

    [Fact]
    public async Task EmployeeSearchCannotRevealAnotherEmployeesProfile()
    {
        using var db = HrTestSupport.CreateDbContext();
        var (employeeA, employeeB) = await AddEmployeePairAsync(db, "Phòng Kinh doanh");
        var controller = new NhanVienController(db, HrTestSupport.CreateAuditMock().Object);
        HrTestSupport.SetUser(controller, employeeA.MaNhanVien, "Nhân viên");

        var result = await controller.Search(employeeB.HoTen);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Empty(Assert.IsAssignableFrom<IEnumerable<NhanVienResponseDto>>(ok.Value));
    }

    [Fact]
    public async Task AdminCannotEnterManagerEmployeeDirectoryEndpoints()
    {
        using var db = HrTestSupport.CreateDbContext();
        var (employee, _) = await AddEmployeePairAsync(db, "Phòng Kinh doanh");
        var controller = new NhanVienController(db, HrTestSupport.CreateAuditMock().Object);
        HrTestSupport.SetUser(controller, employee.MaNhanVien, "Quản trị viên");

        var list = await controller.GetNhanViens(new NhanVienSearchDto());
        var detail = await controller.GetNhanVien(employee.MaNhanVien);
        var search = await controller.Search(employee.HoTen);

        Assert.Equal(403, Assert.IsType<ObjectResult>(list.Result).StatusCode);
        Assert.Equal(403, Assert.IsType<ObjectResult>(detail.Result).StatusCode);
        Assert.Equal(403, Assert.IsType<ObjectResult>(search.Result).StatusCode);
    }

    private static async Task<(NhanVien EmployeeA, NhanVien EmployeeB)> AddEmployeePairAsync(
        HrmApp.Api.Data.QuanLyNhanSuDbContext db,
        string departmentName)
    {
        var department = new PhongBan { MaPhongBan = Guid.NewGuid(), TenPhongBan = departmentName };
        var position = new ChucVu { MaChucVu = Guid.NewGuid(), TenChucVu = "Nhân viên" };
        var employeeA = NewEmployee("Nhân viên A", "employee.a@example.test", "079100000001", department, position);
        var employeeB = NewEmployee("Nhân viên B", "employee.b@example.test", "079100000002", department, position);

        db.PhongBans.Add(department);
        db.ChucVus.Add(position);
        db.NhanViens.AddRange(employeeA, employeeB);
        await db.SaveChangesAsync();
        return (employeeA, employeeB);
    }

    private static NhanVien NewEmployee(string name, string email, string cccd, PhongBan department, ChucVu position) => new()
    {
        MaNhanVien = Guid.NewGuid(),
        HoTen = name,
        NgaySinh = new DateOnly(1998, 2, 10),
        GioiTinh = "Nữ",
        Cccd = cccd,
        Email = email,
        SoDienThoai = "0900000000",
        DiaChi = "TP. Hồ Chí Minh",
        TrinhDoHocVan = "Đại học",
        MaPhongBan = department.MaPhongBan,
        MaPhongBanNavigation = department,
        MaChucVu = position.MaChucVu,
        MaChucVuNavigation = position,
        NgayVaoLam = new DateOnly(2023, 1, 1),
        TrangThaiLamViec = "Đang làm việc"
    };
}
