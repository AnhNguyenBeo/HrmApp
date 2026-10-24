using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using HrmApp.Api.Controllers;
using HrmApp.Api.Data;
using HrmApp.Api.Data.Models;
using HrmApp.Api.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace HrmApp.Tests;

public class FakeNhatKyService : INhatKyService
{
    public Task GhiLogAsync(string tenDangNhap, string? hoTen, string hanhDong, string chiTiet, string trangThai = "Thành công", string? diaChiIp = null)
    {
        return Task.CompletedTask;
    }
}

public class ChangeChucVuTests
{
    private static QuanLyNhanSuDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<QuanLyNhanSuDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        return new QuanLyNhanSuDbContext(options);
    }

    private static NhanVien CreateEmployee(Guid id, string hoTen, Guid phongBanId, Guid chucVuId)
    {
        return new NhanVien
        {
            MaNhanVien = id,
            HoTen = hoTen,
            MaPhongBan = phongBanId,
            MaChucVu = chucVuId,
            Cccd = "012345678901",
            DiaChi = "Hà Nội",
            Email = $"{id}@example.com",
            GioiTinh = "Nam",
            SoDienThoai = "0987654321",
            TrangThaiLamViec = "Đang làm việc",
            TrinhDoHocVan = "Đại học",
            NgaySinh = new DateOnly(1990, 1, 1),
            NgayVaoLam = new DateOnly(2020, 1, 1)
        };
    }

    private static NhanVienController CreateController(QuanLyNhanSuDbContext context, Guid callerNhanVienId, string role, string username = "caller")
    {
        var controller = new NhanVienController(context, new FakeNhatKyService());
        var claims = new List<Claim>
        {
            new("MaNhanVien", callerNhanVienId.ToString()),
            new(ClaimTypes.Role, role),
            new("role", role),
            new("TenDangNhap", username),
            new("HoTen", username)
        };
        var identity = new ClaimsIdentity(claims, "TestAuth");
        var principal = new ClaimsPrincipal(identity);
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = principal }
        };
        return controller;
    }

    [Fact]
    public async Task ChangeChucVu_SelfAppointment_ReturnsBadRequest()
    {
        using var context = CreateDbContext();
        var pb = new PhongBan { MaPhongBan = Guid.NewGuid(), TenPhongBan = "Phòng Ban Giám đốc" };
        var cv1 = new ChucVu { MaChucVu = Guid.NewGuid(), TenChucVu = "Chủ doanh nghiệp" };
        var cv2 = new ChucVu { MaChucVu = Guid.NewGuid(), TenChucVu = "Tổng Giám đốc" };
        var ownerId = Guid.NewGuid();
        var owner = CreateEmployee(ownerId, "Chủ Doanh Nghiệp", pb.MaPhongBan, cv1.MaChucVu);

        context.PhongBans.Add(pb);
        context.ChucVus.AddRange(cv1, cv2);
        context.NhanViens.Add(owner);
        await context.SaveChangesAsync();

        var controller = CreateController(context, ownerId, "Chủ doanh nghiệp");

        var result = await controller.ChangeChucVu(ownerId, cv2.MaChucVu);

        var badRequestResult = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal(400, badRequestResult.StatusCode);
    }

    [Fact]
    public async Task ChangeChucVu_HrManagerPromotesToHrDirector_ReturnsForbidden()
    {
        using var context = CreateDbContext();
        var pbHr = new PhongBan { MaPhongBan = Guid.NewGuid(), TenPhongBan = "Phòng Nhân sự" };
        var cvQuanLy = new ChucVu { MaChucVu = Guid.NewGuid(), TenChucVu = "Quản lý Nhân sự" };
        var cvNhanVien = new ChucVu { MaChucVu = Guid.NewGuid(), TenChucVu = "Nhân viên" };
        var cvTruongPhongHr = new ChucVu { MaChucVu = Guid.NewGuid(), TenChucVu = "Trưởng phòng Nhân sự" };

        var hrManagerId = Guid.NewGuid();
        var hrManager = CreateEmployee(hrManagerId, "Nguyễn Văn HR", pbHr.MaPhongBan, cvQuanLy.MaChucVu);

        var targetStaffId = Guid.NewGuid();
        var targetStaff = CreateEmployee(targetStaffId, "Trần Thị Nhân Viên", pbHr.MaPhongBan, cvNhanVien.MaChucVu);

        context.PhongBans.Add(pbHr);
        context.ChucVus.AddRange(cvQuanLy, cvNhanVien, cvTruongPhongHr);
        context.NhanViens.AddRange(hrManager, targetStaff);
        await context.SaveChangesAsync();

        var controller = CreateController(context, hrManagerId, "Quản lý");

        var result = await controller.ChangeChucVu(targetStaffId, cvTruongPhongHr.MaChucVu);

        var objectResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(403, objectResult.StatusCode);
    }

    [Fact]
    public async Task ChangeChucVu_OwnerPromotesToHrDirector_ReturnsOkAndUpdatesPosition()
    {
        using var context = CreateDbContext();
        var pbHr = new PhongBan { MaPhongBan = Guid.NewGuid(), TenPhongBan = "Phòng Nhân sự" };
        var cvOwner = new ChucVu { MaChucVu = Guid.NewGuid(), TenChucVu = "Chủ doanh nghiệp" };
        var cvNhanVien = new ChucVu { MaChucVu = Guid.NewGuid(), TenChucVu = "Nhân viên" };
        var cvTruongPhongHr = new ChucVu { MaChucVu = Guid.NewGuid(), TenChucVu = "Trưởng phòng Nhân sự" };

        var ownerId = Guid.NewGuid();
        var owner = CreateEmployee(ownerId, "Chủ Doanh Nghiệp", pbHr.MaPhongBan, cvOwner.MaChucVu);

        var targetStaffId = Guid.NewGuid();
        var targetStaff = CreateEmployee(targetStaffId, "Trần Thị Nhân Viên", pbHr.MaPhongBan, cvNhanVien.MaChucVu);

        context.PhongBans.Add(pbHr);
        context.ChucVus.AddRange(cvOwner, cvNhanVien, cvTruongPhongHr);
        context.NhanViens.AddRange(owner, targetStaff);
        await context.SaveChangesAsync();

        var controller = CreateController(context, ownerId, "Chủ doanh nghiệp");

        var result = await controller.ChangeChucVu(targetStaffId, cvTruongPhongHr.MaChucVu);

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(200, okResult.StatusCode);

        var updatedEmployee = await context.NhanViens.FindAsync(targetStaffId);
        Assert.NotNull(updatedEmployee);
        Assert.Equal(cvTruongPhongHr.MaChucVu, updatedEmployee.MaChucVu);
    }
}