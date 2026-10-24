using System;
using System.Collections.Generic;
using Microsoft.Extensions.Options;

namespace HrmApp.Api.Services;

public class BieuThueBac
{
    public decimal? Den { get; set; }
    public decimal ThueSuat { get; set; }
}

public class PayrollOptions
{
    public decimal GiamTruBanThan { get; set; } = 15500000m;
    public decimal GiamTruNguoiPhuThuoc { get; set; } = 6200000m;
    public decimal TyLeBaoHiem { get; set; } = 0.105m;
    public decimal NgayCongChuan { get; set; } = 22m;
    public List<BieuThueBac> BieuThue { get; set; } = new()
    {
        new BieuThueBac { Den = 10000000m, ThueSuat = 0.05m },
        new BieuThueBac { Den = 30000000m, ThueSuat = 0.10m },
        new BieuThueBac { Den = 60000000m, ThueSuat = 0.20m },
        new BieuThueBac { Den = 100000000m, ThueSuat = 0.30m },
        new BieuThueBac { Den = null, ThueSuat = 0.35m }
    };
}

public interface IPayrollTaxCalculator
{
    decimal TinhThue(decimal thuNhapTinhThue);
    PayrollOptions Options { get; }
}

public class PayrollTaxCalculator : IPayrollTaxCalculator
{
    public PayrollOptions Options { get; }

    public PayrollTaxCalculator(IOptions<PayrollOptions> options)
    {
        Options = options?.Value ?? new PayrollOptions();
        if (Options.BieuThue == null || Options.BieuThue.Count == 0)
        {
            Options.BieuThue = new List<BieuThueBac>
            {
                new BieuThueBac { Den = 10000000m, ThueSuat = 0.05m },
                new BieuThueBac { Den = 30000000m, ThueSuat = 0.10m },
                new BieuThueBac { Den = 60000000m, ThueSuat = 0.20m },
                new BieuThueBac { Den = 100000000m, ThueSuat = 0.30m },
                new BieuThueBac { Den = null, ThueSuat = 0.35m }
            };
        }
    }

    public decimal TinhThue(decimal thuNhapTinhThue)
    {
        if (thuNhapTinhThue <= 0) return 0m;

        decimal tongThue = 0m;
        decimal previousLimit = 0m;

        foreach (var bac in Options.BieuThue)
        {
            if (bac.Den.HasValue)
            {
                decimal limit = bac.Den.Value;
                if (thuNhapTinhThue > previousLimit)
                {
                    decimal taxableAmount = Math.Min(thuNhapTinhThue, limit) - previousLimit;
                    tongThue += taxableAmount * bac.ThueSuat;
                }
                previousLimit = limit;
            }
            else
            {
                if (thuNhapTinhThue > previousLimit)
                {
                    decimal taxableAmount = thuNhapTinhThue - previousLimit;
                    tongThue += taxableAmount * bac.ThueSuat;
                }
                break;
            }

            if (thuNhapTinhThue <= previousLimit) break;
        }

        return Math.Round(tongThue, 2);
    }
}