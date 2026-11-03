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
    public async Task EmployeeInHrDepartmentCanViewDirectoryReadOnly_CannotMutate()
    {
        using var db = HrTestSupport.CreateDbContext();
        var (employeeA, employeeB) = await AddEmployeePairAsync(db, "Phòng Nhân sự");
        var controller = new NhanVienController(db, HrTestSupport.CreateAuditMock().Object);
        HrTestSupport.SetUser(controller, employeeA.MaNhanVien, "Nhân viên");

        var result = await controller.GetNhanViens(new NhanVienSearchDto());
        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var page = Assert.IsType<PagedResultDto<NhanVienResponseDto>>(ok.Value);
        Assert.Equal(2, page.TotalCount);

        var addAttempt = await controller.PostNhanVien(new CreateNhanVienDto
        {
            HoTen = "Nhân viên mới",
            NgaySinh = new DateOnly(2000, 1, 1),
            GioiTinh = "Nam",
            Cccd = "079200999888",
            Email = "new.staff@example.test",
            SoDienThoai = "0900000000",
            DiaChi = "TP. HCM",
            TrinhDoHocVan = "Đại học",
            MaPhongBan = employeeA.MaPhongBan,
            MaChucVu = employeeA.MaChucVu,
            NgayVaoLam = new DateOnly(2025, 1, 1),
            TrangThaiLamViec = "Đang làm việc"
        });
        Assert.Equal(403, Assert.IsType<ObjectResult>(addAttempt.Result).StatusCode);

        var deleteAttempt = await controller.DeleteNhanVien(employeeB.MaNhanVien);
        Assert.Equal(403, Assert.IsType<ObjectResult>(deleteAttempt).StatusCode);
    }

    [Fact]
    public async Task ManagerCanManageAllDepartments_ExceptBoardOfDirectors()
    {
        using var db = HrTestSupport.CreateDbContext();
        var hrDept = new PhongBan { MaPhongBan = Guid.NewGuid(), TenPhongBan = "Phòng Nhân sự" };
        var warehouse = new PhongBan { MaPhongBan = Guid.NewGuid(), TenPhongBan = "Phòng Kho" };
        var board = new PhongBan { MaPhongBan = Guid.NewGuid(), TenPhongBan = "Ban Giám đốc" };
        var position = new ChucVu { MaChucVu = Guid.NewGuid(), TenChucVu = "Nhân viên" };
        var directorPosition = new ChucVu { MaChucVu = Guid.NewGuid(), TenChucVu = "Giám đốc" };

        var manager = NewEmployee("Quản lý nhân sự", "manager.hr@example.test", "079100000011", hrDept, position);
        var warehouseStaff = NewEmployee("Nhân viên kho", "warehouse.staff@example.test", "079100000013", warehouse, position);
        var director = NewEmployee("Giám đốc điều hành", "director@example.test", "079100000014", board, directorPosition);

        db.PhongBans.AddRange(hrDept, warehouse, board);
        db.ChucVus.AddRange(position, directorPosition);
        db.NhanViens.AddRange(manager, warehouseStaff, director);
        await db.SaveChangesAsync();

        var controller = new NhanVienController(db, HrTestSupport.CreateAuditMock().Object);
        HrTestSupport.SetUser(controller, manager.MaNhanVien, "Quản lý");

        var allList = await controller.GetNhanViens(new NhanVienSearchDto { PageSize = 100 });
        var allPage = Assert.IsType<PagedResultDto<NhanVienResponseDto>>(Assert.IsType<OkObjectResult>(allList.Result).Value);
        Assert.Equal(3, allPage.TotalCount);

        var editWarehouseStaff = await controller.PutNhanVien(warehouseStaff.MaNhanVien, new UpdateNhanVienDto
        {
            HoTen = "Nhân viên kho đã sửa",
            NgaySinh = warehouseStaff.NgaySinh,
            GioiTinh = warehouseStaff.GioiTinh,
            Cccd = warehouseStaff.Cccd,
            Email = warehouseStaff.Email,
            SoDienThoai = warehouseStaff.SoDienThoai,
            DiaChi = warehouseStaff.DiaChi,
            TrinhDoHocVan = warehouseStaff.TrinhDoHocVan,
            MaPhongBan = warehouseStaff.MaPhongBan
        });
        Assert.IsType<OkObjectResult>(editWarehouseStaff);

        var editDirectorAttempt = await controller.PutNhanVien(director.MaNhanVien, new UpdateNhanVienDto
        {
            HoTen = "Sửa giám đốc trái phép",
            NgaySinh = director.NgaySinh,
            GioiTinh = director.GioiTinh,
            Cccd = director.Cccd,
            Email = director.Email,
            SoDienThoai = director.SoDienThoai,
            DiaChi = director.DiaChi,
            TrinhDoHocVan = director.TrinhDoHocVan,
            MaPhongBan = director.MaPhongBan
        });
        Assert.Equal(403, Assert.IsType<ObjectResult>(editDirectorAttempt).StatusCode);

        var deleteDirectorAttempt = await controller.DeleteNhanVien(director.MaNhanVien);
        Assert.Equal(403, Assert.IsType<ObjectResult>(deleteDirectorAttempt).StatusCode);
    }

    [Fact]
    public async Task NonHrManager_CanOnlyViewOwnDepartment_AndCannotMutate()
    {
        using var db = HrTestSupport.CreateDbContext();
        var sales = new PhongBan { MaPhongBan = Guid.NewGuid(), TenPhongBan = "Phòng Kinh doanh" };
        var warehouse = new PhongBan { MaPhongBan = Guid.NewGuid(), TenPhongBan = "Phòng Kho" };
        var position = new ChucVu { MaChucVu = Guid.NewGuid(), TenChucVu = "Nhân viên" };

        var salesManager = NewEmployee("Quản lý kinh doanh", "manager.sales@example.test", "079100000055", sales, position);
        var salesStaff = NewEmployee("Nhân viên sale", "sale.staff@example.test", "079100000056", sales, position);
        var warehouseStaff = NewEmployee("Nhân viên kho", "warehouse.staff@example.test", "079100000057", warehouse, position);

        db.PhongBans.AddRange(sales, warehouse);
        db.ChucVus.Add(position);
        db.NhanViens.AddRange(salesManager, salesStaff, warehouseStaff);
        await db.SaveChangesAsync();

        var controller = new NhanVienController(db, HrTestSupport.CreateAuditMock().Object);
        HrTestSupport.SetUser(controller, salesManager.MaNhanVien, "Quản lý");

        var listResult = await controller.GetNhanViens(new NhanVienSearchDto { PageSize = 100 });
        var page = Assert.IsType<PagedResultDto<NhanVienResponseDto>>(Assert.IsType<OkObjectResult>(listResult.Result).Value);
        Assert.Equal(2, page.TotalCount);
        Assert.All(page.Items, item => Assert.Equal(sales.MaPhongBan, item.MaPhongBan));

        var viewOther = await controller.GetNhanVien(warehouseStaff.MaNhanVien);
        Assert.Equal(403, Assert.IsType<ObjectResult>(viewOther.Result).StatusCode);

        var viewOwn = await controller.GetNhanVien(salesStaff.MaNhanVien);
        Assert.IsType<OkObjectResult>(viewOwn.Result);

        var addAttempt = await controller.PostNhanVien(new CreateNhanVienDto
        {
            HoTen = "Nhân viên mới",
            Email = "new.staff@example.test",
            SoDienThoai = "0988776655",
            Cccd = "079100000058",
            DiaChi = "TP. HCM",
            GioiTinh = "Nam",
            NgaySinh = new DateOnly(1995, 1, 1),
            TrinhDoHocVan = "Đại học",
            MaPhongBan = sales.MaPhongBan,
            MaChucVu = position.MaChucVu
        });
        Assert.Equal(403, Assert.IsType<ObjectResult>(addAttempt.Result).StatusCode);

        var editAttempt = await controller.PutNhanVien(salesStaff.MaNhanVien, new UpdateNhanVienDto
        {
            HoTen = "Sửa nhân viên sale",
            NgaySinh = salesStaff.NgaySinh,
            GioiTinh = salesStaff.GioiTinh,
            Cccd = salesStaff.Cccd,
            Email = salesStaff.Email,
            SoDienThoai = salesStaff.SoDienThoai,
            DiaChi = salesStaff.DiaChi,
            TrinhDoHocVan = salesStaff.TrinhDoHocVan,
            MaPhongBan = salesStaff.MaPhongBan
        });
        Assert.Equal(403, Assert.IsType<ObjectResult>(editAttempt).StatusCode);

        var changeRoleAttempt = await controller.ChangeChucVu(salesStaff.MaNhanVien, position.MaChucVu);
        Assert.Equal(403, Assert.IsType<ObjectResult>(changeRoleAttempt).StatusCode);

        var deleteAttempt = await controller.DeleteNhanVien(salesStaff.MaNhanVien);
        Assert.Equal(403, Assert.IsType<ObjectResult>(deleteAttempt).StatusCode);
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
    public async Task AdminCanViewDirectoryAndProfile_ButCannotMutateHrRecords()
    {
        using var db = HrTestSupport.CreateDbContext();
        var (employee, otherEmployee) = await AddEmployeePairAsync(db, "Phòng Kinh doanh");
        var controller = new NhanVienController(db, HrTestSupport.CreateAuditMock().Object);
        HrTestSupport.SetUser(controller, employee.MaNhanVien, "Quản trị viên");

        var list = await controller.GetNhanViens(new NhanVienSearchDto());
        var detail = await controller.GetNhanVien(employee.MaNhanVien);
        var search = await controller.Search(employee.HoTen);

        Assert.IsType<OkObjectResult>(list.Result);
        Assert.IsType<OkObjectResult>(detail.Result);
        Assert.IsType<OkObjectResult>(search.Result);

        var mutateAttempt = await controller.PutNhanVien(otherEmployee.MaNhanVien, new UpdateNhanVienDto
        {
            HoTen = "Admin Chỉnh Sửa Trái Phép",
            NgaySinh = otherEmployee.NgaySinh,
            GioiTinh = otherEmployee.GioiTinh,
            Cccd = otherEmployee.Cccd,
            Email = otherEmployee.Email,
            SoDienThoai = otherEmployee.SoDienThoai,
            DiaChi = otherEmployee.DiaChi,
            TrinhDoHocVan = otherEmployee.TrinhDoHocVan,
            MaPhongBan = otherEmployee.MaPhongBan
        });
        Assert.Equal(403, Assert.IsType<ObjectResult>(mutateAttempt).StatusCode);

        var deleteAttempt = await controller.DeleteNhanVien(otherEmployee.MaNhanVien);
        Assert.Equal(403, Assert.IsType<ObjectResult>(deleteAttempt).StatusCode);
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
