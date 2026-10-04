using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace HrmApp.Api.Data.Models;

[Table("BangLuong")]
public partial class BangLuong
{
    [Key]
    public Guid MaBangLuong { get; set; }

    public Guid MaNhanVien { get; set; }

    [StringLength(10)]
    [Unicode(false)]
    public string ThoiGian { get; set; } = null!;

    [Column(TypeName = "decimal(4, 2)")]
    public decimal NgayCongChuan { get; set; }

    [Column(TypeName = "decimal(4, 2)")]
    public decimal SoNgayCong { get; set; }

    [Column("TongGioOT", TypeName = "decimal(5, 2)")]
    public decimal TongGioOt { get; set; }

    [Column(TypeName = "decimal(18, 2)")]
    public decimal LuongCoBan { get; set; }

    [Column(TypeName = "decimal(18, 2)")]
    public decimal? PhuCap { get; set; }

    [Column(TypeName = "decimal(18, 2)")]
    public decimal? TienThuong { get; set; }

    [Column("LuongOT", TypeName = "decimal(18, 2)")]
    public decimal? LuongOt { get; set; }

    [Column(TypeName = "decimal(18, 2)")]
    public decimal? BaoHiemXaHoi { get; set; }

    [Column("ThueTNCN", TypeName = "decimal(18, 2)")]
    public decimal? ThueTncn { get; set; }

    [Column(TypeName = "decimal(18, 2)")]
    public decimal? ThucLinh { get; set; }

    [StringLength(50)]
    public string TrangThaiChiTra { get; set; } = null!;

    [ForeignKey("MaNhanVien")]
    [InverseProperty("BangLuongs")]
    public virtual NhanVien MaNhanVienNavigation { get; set; } = null!;
}
