using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace HrmApp.Api.Data.Models;

[Table("HopDongLaoDong")]
public partial class HopDongLaoDong
{
    [Key]
    public Guid MaHopDong { get; set; }

    public Guid MaNhanVien { get; set; }

    [StringLength(100)]
    public string LoaiHopDong { get; set; } = null!;

    public DateOnly NgayBatDau { get; set; }

    public DateOnly? NgayKetThuc { get; set; }

    [Column(TypeName = "decimal(18, 2)")]
    public decimal LuongCoBan { get; set; }

    [StringLength(50)]
    public string TrangThai { get; set; } = null!;

    [Column(TypeName = "decimal(18, 2)")]
    public decimal? LuongThuong { get; set; }

    [ForeignKey("MaNhanVien")]
    [InverseProperty("HopDongLaoDongs")]
    public virtual NhanVien MaNhanVienNavigation { get; set; } = null!;
}
