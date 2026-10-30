using HrmApp.Api.Controllers;
using HrmApp.Api.Data;
using HrmApp.Api.Data.Models;
using HrmApp.Api.DTOs.DonTu;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HrmApp.Tests;

public class DonTuControllerTests
{
    [Theory]
    [InlineData("Nghỉ phép")]
    [InlineData("Nghỉ ốm")]
    [InlineData("Nghỉ ốm đau")]
    [InlineData("Thai sản")]
    [InlineData("Nghỉ thai sản")]
    [InlineData("Nghỉ việc")]
    [InlineData("Thôi việc")]
    public async Task CreateDonTu_StoresCorrectRequestTypeAndPendingStatus(string requestType)
    {
        using var db = HrTestSupport.CreateDbContext();
        var employee = await AddEmployeeAsync(db, "Nhân viên A", "Phòng Kinh doanh", "Nhân viên");
        var audit = HrTestSupport.CreateAuditMock();
        var controller = new DonTuController(db, audit.Object);
        HrTestSupport.SetUser(controller, employee.MaNhanVien, "Nhân viên");

        var start = requestType.Contains("thai sản", StringComparison.OrdinalIgnoreCase)
            || requestType == "Thai sản"
            ? new DateOnly(2026, 1, 1)
            : new DateOnly(2026, 11, 2);
        var end = requestType.Contains("thai sản", StringComparison.OrdinalIgnoreCase)
            || requestType == "Thai sản"
            ? new DateOnly(2026, 6, 29)
            : new DateOnly(2026, 11, 2);

        var result = await controller.CreateDonTu(new CreateDonTuDto
        {
            LoaiDon = requestType,
            NgayBatDau = start,
            NgayKetThuc = end,
            LyDo = "Dữ liệu kiểm thử hợp lệ"
        });

        Assert.IsType<OkObjectResult>(result);
        var saved = await db.DonTus.SingleAsync();
        Assert.Equal(requestType, saved.LoaiDon);
        Assert.Equal("Chờ duyệt", saved.TrangThai);
        Assert.Equal(employee.MaNhanVien, saved.MaNhanVien);
        Assert.Equal(requestType is "Thai sản" or "Nghỉ thai sản" ? 180m : 1m, saved.SoNgayNghi);
    }

    [Fact]
    public async Task CreateDonTu_MaternityOver180Days_IsRejected()
    {
        using var db = HrTestSupport.CreateDbContext();
        var employee = await AddEmployeeAsync(db, "Nhân viên A", "Phòng Kinh doanh", "Nhân viên");
        var controller = new DonTuController(db, HrTestSupport.CreateAuditMock().Object);
        HrTestSupport.SetUser(controller, employee.MaNhanVien, "Nhân viên");

        var result = await controller.CreateDonTu(new CreateDonTuDto
        {
            LoaiDon = "Nghỉ thai sản",
            NgayBatDau = new DateOnly(2026, 1, 1),
            NgayKetThuc = new DateOnly(2026, 6, 30),
            LyDo = "Yêu cầu vượt giới hạn"
        });

        Assert.IsType<BadRequestObjectResult>(result);
        Assert.Empty(await db.DonTus.ToListAsync());
    }

    [Fact]
    public async Task CreateDonTu_RejectsInvalidDateRangeAndOverlappingPendingRequest()
    {
        using var db = HrTestSupport.CreateDbContext();
        var employee = await AddEmployeeAsync(db, "Nhân viên A", "Phòng Kinh doanh", "Nhân viên");
        var controller = new DonTuController(db, HrTestSupport.CreateAuditMock().Object);
        HrTestSupport.SetUser(controller, employee.MaNhanVien, "Nhân viên");

        var invalidRange = await controller.CreateDonTu(new CreateDonTuDto
        {
            LoaiDon = "Nghỉ phép",
            NgayBatDau = new DateOnly(2026, 11, 5),
            NgayKetThuc = new DateOnly(2026, 11, 4),
            LyDo = "Ngày kết thúc trước ngày bắt đầu"
        });
        Assert.IsType<BadRequestObjectResult>(invalidRange);

        db.DonTus.Add(new DonTu
        {
            MaDon = Guid.NewGuid(),
            MaNhanVien = employee.MaNhanVien,
            HoTen = employee.HoTen,
            LoaiDon = "Nghỉ phép",
            LoaiNghi = "Nghỉ phép",
            NgayBatDau = new DateOnly(2026, 11, 2),
            NgayKetThuc = new DateOnly(2026, 11, 3),
            SoNgayNghi = 2,
            LyDo = "Đơn đang chờ",
            TrangThai = "Chờ duyệt"
        });
        await db.SaveChangesAsync();

        var overlap = await controller.CreateDonTu(new CreateDonTuDto
        {
            LoaiDon = "Nghỉ ốm",
            NgayBatDau = new DateOnly(2026, 11, 3),
            NgayKetThuc = new DateOnly(2026, 11, 4),
            LyDo = "Trùng lịch"
        });
        Assert.IsType<BadRequestObjectResult>(overlap);
        Assert.Single(await db.DonTus.ToListAsync());
    }

    [Fact]
    public async Task ManagerApproval_ResignationMarksEmployeeResignedAndLocksAccount()
    {
        using var db = HrTestSupport.CreateDbContext();
        var department = new PhongBan { MaPhongBan = Guid.NewGuid(), TenPhongBan = "Phòng Kinh doanh" };
        var managerPosition = new ChucVu { MaChucVu = Guid.NewGuid(), TenChucVu = "Quản lý" };
        var employeePosition = new ChucVu { MaChucVu = Guid.NewGuid(), TenChucVu = "Nhân viên" };
        var employeeRole = new VaiTro { MaVaiTro = Guid.NewGuid(), TenVaiTro = "Nhân viên" };
        var manager = NewEmployee("Quản lý A", department, managerPosition);
        var employee = NewEmployee("Nhân viên A", department, employeePosition);
        var account = new TaiKhoan
        {
            MaTaiKhoan = Guid.NewGuid(),
            MaNhanVien = employee.MaNhanVien,
            MaNhanVienNavigation = employee,
            TenDangNhap = "resigning.employee",
            MatKhauHash = BCrypt.Net.BCrypt.HashPassword("Pass@123"),
            MaVaiTro = employeeRole.MaVaiTro,
            MaVaiTroNavigation = employeeRole,
            TrangThai = "Hoạt động",
            NgayTao = new DateOnly(2024, 1, 1)
        };
        var contract = new HopDongLaoDong
        {
            MaHopDong = Guid.NewGuid(),
            MaNhanVien = employee.MaNhanVien,
            LoaiHopDong = "Không xác định thời hạn",
            NgayBatDau = new DateOnly(2024, 1, 1),
            LuongCoBan = 18000000m,
            TrangThai = "Có hiệu lực",
            MaNhanVienNavigation = employee
        };
        var request = new DonTu
        {
            MaDon = Guid.NewGuid(),
            MaNhanVien = employee.MaNhanVien,
            HoTen = employee.HoTen,
            LoaiDon = "Nghỉ việc",
            LoaiNghi = "Nghỉ việc",
            NgayBatDau = new DateOnly(2026, 12, 1),
            NgayKetThuc = new DateOnly(2026, 12, 1),
            SoNgayNghi = 1,
            LyDo = "Chuyển nơi ở",
            TrangThai = "Chờ duyệt"
        };

        db.PhongBans.Add(department);
        db.ChucVus.AddRange(managerPosition, employeePosition);
        db.VaiTros.Add(employeeRole);
        db.NhanViens.AddRange(manager, employee);
        db.TaiKhoans.Add(account);
        db.HopDongLaoDongs.Add(contract);
        db.DonTus.Add(request);
        await db.SaveChangesAsync();

        var controller = new DonTuController(db, HrTestSupport.CreateAuditMock().Object);
        HrTestSupport.SetUser(controller, manager.MaNhanVien, "Quản lý");
        var result = await controller.DuyetDonTu(request.MaDon, new DuyetDonTuDto { TrangThai = "Đã duyệt" });

        Assert.IsType<OkObjectResult>(result);
        Assert.Equal("Đã nghỉ việc", employee.TrangThaiLamViec);
        Assert.Equal(new DateOnly(2026, 12, 1), employee.NgayNghiViec);
        Assert.Equal("Bị khóa", account.TrangThai);
        Assert.Equal("Đã thanh lý", contract.TrangThai);
        Assert.Equal(new DateOnly(2026, 12, 1), contract.NgayKetThuc);
        Assert.Equal("Đã duyệt", request.TrangThai);
    }

    [Fact]
    public async Task ManagerCannotApproveOwnOrCrossDepartmentRequest()
    {
        using var db = HrTestSupport.CreateDbContext();
        var teamA = new PhongBan { MaPhongBan = Guid.NewGuid(), TenPhongBan = "Phòng Kinh doanh" };
        var teamB = new PhongBan { MaPhongBan = Guid.NewGuid(), TenPhongBan = "Phòng Kho" };
        var position = new ChucVu { MaChucVu = Guid.NewGuid(), TenChucVu = "Nhân viên" };
        var manager = NewEmployee("Quản lý A", teamA, position);
        var employee = NewEmployee("Nhân viên B", teamB, position);
        var ownRequest = NewRequest(manager, "Nghỉ phép");
        var foreignRequest = NewRequest(employee, "Nghỉ phép");

        db.PhongBans.AddRange(teamA, teamB);
        db.ChucVus.Add(position);
        db.NhanViens.AddRange(manager, employee);
        db.DonTus.AddRange(ownRequest, foreignRequest);
        await db.SaveChangesAsync();

        var controller = new DonTuController(db, HrTestSupport.CreateAuditMock().Object);
        HrTestSupport.SetUser(controller, manager.MaNhanVien, "Quản lý");
        var self = await controller.DuyetDonTu(ownRequest.MaDon, new DuyetDonTuDto { TrangThai = "Đã duyệt" });
        Assert.IsType<BadRequestObjectResult>(self);

        var crossDepartment = await controller.DuyetDonTu(foreignRequest.MaDon, new DuyetDonTuDto { TrangThai = "Đã duyệt" });
        Assert.Equal(403, Assert.IsType<ObjectResult>(crossDepartment).StatusCode);
        Assert.Equal("Chờ duyệt", ownRequest.TrangThai);
        Assert.Equal("Chờ duyệt", foreignRequest.TrangThai);
    }

    [Fact]
    public async Task RejectedRequestCannotBeApprovedLater()
    {
        using var db = HrTestSupport.CreateDbContext();
        var department = new PhongBan { MaPhongBan = Guid.NewGuid(), TenPhongBan = "Phòng Kinh doanh" };
        var position = new ChucVu { MaChucVu = Guid.NewGuid(), TenChucVu = "Nhân viên" };
        var manager = NewEmployee("Quản lý A", department, position);
        var employee = NewEmployee("Nhân viên B", department, position);
        var request = NewRequest(employee, "Nghỉ phép");
        db.PhongBans.Add(department);
        db.ChucVus.Add(position);
        db.NhanViens.AddRange(manager, employee);
        db.DonTus.Add(request);
        await db.SaveChangesAsync();

        var controller = new DonTuController(db, HrTestSupport.CreateAuditMock().Object);
        HrTestSupport.SetUser(controller, manager.MaNhanVien, "Quản lý");
        var rejection = await controller.DuyetDonTu(request.MaDon, new DuyetDonTuDto { TrangThai = "Từ chối" });
        var secondDecision = await controller.DuyetDonTu(request.MaDon, new DuyetDonTuDto { TrangThai = "Đã duyệt" });

        Assert.IsType<OkObjectResult>(rejection);
        Assert.IsType<BadRequestObjectResult>(secondDecision);
        Assert.Equal("Từ chối", request.TrangThai);
    }

    private static async Task<NhanVien> AddEmployeeAsync(QuanLyNhanSuDbContext db, string name, string departmentName, string positionName)
    {
        var department = new PhongBan { MaPhongBan = Guid.NewGuid(), TenPhongBan = departmentName };
        var position = new ChucVu { MaChucVu = Guid.NewGuid(), TenChucVu = positionName };
        var employee = NewEmployee(name, department, position);
        db.PhongBans.Add(department);
        db.ChucVus.Add(position);
        db.NhanViens.Add(employee);
        await db.SaveChangesAsync();
        return employee;
    }

    private static NhanVien NewEmployee(string name, PhongBan department, ChucVu position) => new()
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
        MaPhongBan = department.MaPhongBan,
        MaPhongBanNavigation = department,
        MaChucVu = position.MaChucVu,
        MaChucVuNavigation = position,
        NgayVaoLam = new DateOnly(2020, 1, 1),
        TrangThaiLamViec = "Đang làm việc"
    };

    private static DonTu NewRequest(NhanVien employee, string type) => new()
    {
        MaDon = Guid.NewGuid(),
        MaNhanVien = employee.MaNhanVien,
        MaNhanVienNavigation = employee,
        HoTen = employee.HoTen,
        LoaiDon = type,
        LoaiNghi = type,
        NgayBatDau = new DateOnly(2026, 11, 2),
        NgayKetThuc = new DateOnly(2026, 11, 2),
        SoNgayNghi = 1,
        LyDo = "Yêu cầu kiểm thử",
        TrangThai = "Chờ duyệt"
    };
}
