using System.Collections.Generic;
using HrmApp.Api.Services;
using Microsoft.Extensions.Options;
using Xunit;

namespace HrmApp.Tests;

public class PayrollTaxCalculatorTests
{
    private readonly PayrollOptions _options2020 = new()
    {
        GiamTruBanThan = 11000000m,
        GiamTruNguoiPhuThuoc = 4400000m,
        TyLeBaoHiem = 0.105m,
        NgayCongChuan = 22,
        BieuThue = new List<BieuThueBac>
        {
            new() { Den = 5000000m, ThueSuat = 0.05m },
            new() { Den = 10000000m, ThueSuat = 0.10m },
            new() { Den = 18000000m, ThueSuat = 0.15m },
            new() { Den = 32000000m, ThueSuat = 0.20m },
            new() { Den = 52000000m, ThueSuat = 0.25m },
            new() { Den = 80000000m, ThueSuat = 0.30m },
            new() { Den = null, ThueSuat = 0.35m }
        }
    };

    private readonly PayrollOptions _options2026 = new()
    {
        GiamTruBanThan = 15500000m,
        GiamTruNguoiPhuThuoc = 6200000m,
        TyLeBaoHiem = 0.105m,
        NgayCongChuan = 22,
        BieuThue = new List<BieuThueBac>
        {
            new() { Den = 10000000m, ThueSuat = 0.05m },
            new() { Den = 30000000m, ThueSuat = 0.10m },
            new() { Den = 60000000m, ThueSuat = 0.20m },
            new() { Den = 100000000m, ThueSuat = 0.30m },
            new() { Den = null, ThueSuat = 0.35m }
        }
    };

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(-10000000)]
    public void CalculateTax_ZeroOrNegative_ReturnsZero(decimal income)
    {
        var calc = new PayrollTaxCalculator(Options.Create(_options2020));
        var tax = calc.TinhThue(income);
        Assert.Equal(0m, tax);
    }

    [Theory]
    [InlineData(5000000, 250000)]
    [InlineData(4999999, 249999.95)]
    [InlineData(5000001, 250000.10)]
    [InlineData(10000000, 750000)]
    [InlineData(9999999, 749999.90)]
    [InlineData(10000001, 750000.15)]
    [InlineData(18000000, 1950000)]
    [InlineData(17999999, 1949999.85)]
    [InlineData(18000001, 1950000.20)]
    [InlineData(32000000, 4750000)]
    [InlineData(31999999, 4749999.80)]
    [InlineData(32000001, 4750000.25)]
    [InlineData(52000000, 9750000)]
    [InlineData(51999999, 9749999.75)]
    [InlineData(52000001, 9750000.30)]
    [InlineData(80000000, 18150000)]
    [InlineData(79999999, 18149999.70)]
    [InlineData(80000001, 18150000.35)]
    public void CalculateTax_2020Thresholds_MatchesExpected(decimal income, decimal expected)
    {
        var calc = new PayrollTaxCalculator(Options.Create(_options2020));
        var tax = calc.TinhThue(income);
        Assert.Equal(expected, tax);
    }

    [Theory]
    [InlineData(10000000, 500000)]
    [InlineData(9999999, 499999.95)]
    [InlineData(10000001, 500000.10)]
    [InlineData(30000000, 2500000)]
    [InlineData(29999999, 2499999.90)]
    [InlineData(30000001, 2500000.20)]
    [InlineData(60000000, 8500000)]
    [InlineData(59999999, 8499999.80)]
    [InlineData(60000001, 8500000.30)]
    [InlineData(100000000, 20500000)]
    [InlineData(99999999, 20499999.70)]
    [InlineData(100000001, 20500000.35)]
    public void CalculateTax_2026Thresholds_MatchesExpected(decimal income, decimal expected)
    {
        var calc = new PayrollTaxCalculator(Options.Create(_options2026));
        var tax = calc.TinhThue(income);
        Assert.Equal(expected, tax);
    }
}