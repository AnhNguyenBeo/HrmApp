using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HrmApp.Api.Data.Models;

[Table("NhatKyHoatDong")]
public partial class NhatKyHoatDong
{
    [Key]
    public Guid MaLog { get; set; }

    public DateTime ThoiGian { get; set; } = DateTime.UtcNow;

    [StringLength(100)]
    public string TenDangNhap { get; set; } = null!;

    [StringLength(150)]
    public string? HoTen { get; set; }

    [StringLength(100)]
    public string HanhDong { get; set; } = null!;

    public string? ChiTiet { get; set; }

    [StringLength(50)]
    public string TrangThai { get; set; } = "Thành công";

    [StringLength(50)]
    public string? DiaChiIP { get; set; }
}
