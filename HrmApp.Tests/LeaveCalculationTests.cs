using System;
using System.Collections.Generic;
using HrmApp.Api.Controllers;
using Xunit;

namespace HrmApp.Tests;

public class LeaveCalculationTests
{
    [Fact]
    public void TinhSoNgayNghiTrongThang_MonthBoundary_CountsOnlyWeekdaysInMonth()
    {
        var start = new DateOnly(2025, 1, 28);
        var end = new DateOnly(2025, 2, 3);
        var validAttendanceDates = new HashSet<DateOnly>();

        var daysInJan = BangLuongController.TinhSoNgayNghiTrongThang(start, end, 1, 2025, validAttendanceDates);
        Assert.Equal(4, daysInJan);

        var daysInFeb = BangLuongController.TinhSoNgayNghiTrongThang(start, end, 2, 2025, validAttendanceDates);
        Assert.Equal(1, daysInFeb);
    }

    [Fact]
    public void TinhSoNgayNghiTrongThang_WeekendDays_AreExcluded()
    {
        var start = new DateOnly(2026, 1, 28);
        var end = new DateOnly(2026, 2, 3);
        var validAttendanceDates = new HashSet<DateOnly>();

        var daysInJan = BangLuongController.TinhSoNgayNghiTrongThang(start, end, 1, 2026, validAttendanceDates);
        Assert.Equal(3, daysInJan);

        var daysInFeb = BangLuongController.TinhSoNgayNghiTrongThang(start, end, 2, 2026, validAttendanceDates);
        Assert.Equal(2, daysInFeb);
    }

    [Fact]
    public void TinhSoNgayNghiTrongThang_WithOverlappingAttendance_ExcludesAttendedDates()
    {
        var start = new DateOnly(2025, 1, 28);
        var end = new DateOnly(2025, 2, 3);
        var validAttendanceDates = new HashSet<DateOnly>
        {
            new(2025, 1, 29)
        };

        var daysInJan = BangLuongController.TinhSoNgayNghiTrongThang(start, end, 1, 2025, validAttendanceDates);
        Assert.Equal(3, daysInJan);
    }

    [Fact]
    public void TinhSoNgayNghiTrongThang_InvalidRange_ReturnsZero()
    {
        var start = new DateOnly(2025, 2, 10);
        var end = new DateOnly(2025, 2, 5);

        var days = BangLuongController.TinhSoNgayNghiTrongThang(start, end, 2, 2025);
        Assert.Equal(0, days);
    }
}