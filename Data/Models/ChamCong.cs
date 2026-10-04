using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace HrmApp.Api.Data.Models;

[Table("ChamCong")]
public partial class ChamCong
{
    [Key]
    public Guid MaChamCong { get; set; }

    public Guid MaNhanVien { get; set; }

    public DateOnly Ngay { get; set; }

    public TimeOnly GioVao { get; set; }

    public TimeOnly GioRa { get; set; }

    [Column(TypeName = "decimal(4, 2)")]
    public decimal? SoGioTangCa { get; set; }

    [StringLength(50)]
    public string TrangThai { get; set; } = null!;

    [ForeignKey("MaNhanVien")]
    [InverseProperty("ChamCongs")]
    public virtual NhanVien MaNhanVienNavigation { get; set; } = null!;
}
