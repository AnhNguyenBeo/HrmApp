using HrmApp.Api.Constants;
using HrmApp.Api.Controllers;
using HrmApp.Api.Data.Models;
using HrmApp.Api.DTOs.ChamCong;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HrmApp.Tests;

public class ChamCongControllerTests
{
    [Theory]
    [InlineData(8, 30, TrangThaiChamCong.DaCheckIn)]
    [InlineData(8, 31, TrangThaiChamCong.DiMuon)]
    [InlineData(12, 0, TrangThaiChamCong.ThieuGioVao)]
    [InlineData(12, 1, TrangThaiChamCong.ThieuGioVao)]
    public async Task CheckIn_UsesServerTimeAndExpectedThreshold(int hour, int minute, string expectedStatus)
    {
        using var db = HrTestSupport.CreateDbContext();
        var employeeId = Guid.NewGuid();
        var clock = new FixedLocalTimeProvider(new DateTime(2026, 10, 30, hour, minute, 0));
        var controller = new ChamCongController(db, HrTestSupport.CreateAuditMock().Object, clock);
        HrTestSupport.SetUser(controller, employeeId, "Nhân viên");

        var result = await controller.CheckInOut(new CheckInOutDto());

        Assert.IsType<OkObjectResult>(result);
        var attendance = await db.ChamCongs.SingleAsync();
        Assert.Equal(new DateOnly(2026, 10, 30), attendance.Ngay);
        Assert.Equal(new TimeOnly(hour, minute), attendance.GioVao);
        Assert.Equal(expectedStatus, attendance.TrangThai);
    }

    [Fact]
    public async Task CheckOut_DoubleClickIsBlockedAndOvertimeIsCalculated()
    {
        using var db = HrTestSupport.CreateDbContext();
        var employeeId = Guid.NewGuid();
        var clock = new FixedLocalTimeProvider(new DateTime(2026, 10, 30, 8, 0, 0));
        var controller = new ChamCongController(db, HrTestSupport.CreateAuditMock().Object, clock);
        HrTestSupport.SetUser(controller, employeeId, "Nhân viên");

        Assert.IsType<OkObjectResult>(await controller.CheckInOut(new CheckInOutDto()));

        clock.SetLocalTime(new DateTime(2026, 10, 30, 8, 0, 30));
        Assert.IsType<BadRequestObjectResult>(await controller.CheckInOut(new CheckInOutDto()));
        var afterBlockedClick = await db.ChamCongs.SingleAsync();
        Assert.Equal(TimeOnly.MinValue, afterBlockedClick.GioRa);

        clock.SetLocalTime(new DateTime(2026, 10, 30, 19, 0, 0));
        Assert.IsType<OkObjectResult>(await controller.CheckInOut(new CheckInOutDto()));
        var completed = await db.ChamCongs.SingleAsync();
        Assert.Equal(new TimeOnly(19, 0), completed.GioRa);
        Assert.Equal(3m, completed.SoGioTangCa.GetValueOrDefault());
        Assert.Equal(TrangThaiChamCong.HoanThanh, completed.TrangThai);
    }

    private sealed class FixedLocalTimeProvider : TimeProvider
    {
        private static readonly TimeZoneInfo SaigonTimeZone = TimeZoneInfo.CreateCustomTimeZone(
            "Asia/Saigon-Test", TimeSpan.FromHours(7), "Asia/Saigon-Test", "Asia/Saigon-Test");

        private DateTimeOffset _utcNow;

        public FixedLocalTimeProvider(DateTime localTime) => SetLocalTime(localTime);

        public override TimeZoneInfo LocalTimeZone => SaigonTimeZone;

        public override DateTimeOffset GetUtcNow() => _utcNow;

        public void SetLocalTime(DateTime localTime)
        {
            var unspecified = DateTime.SpecifyKind(localTime, DateTimeKind.Unspecified);
            _utcNow = new DateTimeOffset(unspecified, TimeSpan.FromHours(7)).ToUniversalTime();
        }
    }
}
