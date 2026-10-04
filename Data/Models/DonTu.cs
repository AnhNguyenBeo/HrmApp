using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace HrmApp.Api.Data.Models;

[Table("DonTu")]
public partial class DonTu
{
    [Key]
    public Guid MaDon { get; set; }

    public Guid MaNhanVien { get; set; }

    [StringLength(100)]
    public string HoTen { get; set; } = null!;

    [StringLength(50)]
    public string LoaiDon { get; set; } = null!;

    [StringLength(50)]
    public string? LoaiNghi { get; set; }

    public DateOnly NgayBatDau { get; set; }

    public DateOnly NgayKetThuc { get; set; }

    [Column(TypeName = "decimal(5, 2)")]
    public decimal SoNgayNghi { get; set; }

    [StringLength(255)]
    public string LyDo { get; set; } = null!;

    [StringLength(50)]
    public string TrangThai { get; set; } = null!;

    public Guid? NguoiDuyetMa { get; set; }

    public DateOnly? NgayDuyet { get; set; }

    public string? GhiChuDuyet { get; set; }

    [ForeignKey("MaNhanVien")]
    [InverseProperty("DonTuMaNhanVienNavigations")]
    public virtual NhanVien MaNhanVienNavigation { get; set; } = null!;

    [ForeignKey("NguoiDuyetMa")]
    [InverseProperty("DonTuNguoiDuyetMaNavigations")]
    public virtual NhanVien? NguoiDuyetMaNavigation { get; set; }
}
