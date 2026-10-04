using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace HrmApp.Api.Data.Models;

[Table("TaiKhoan")]
public partial class TaiKhoan
{
    [Key]
    public Guid MaTaiKhoan { get; set; }

    public Guid MaNhanVien { get; set; }

    [StringLength(50)]
    [Unicode(false)]
    public string TenDangNhap { get; set; } = null!;

    [StringLength(255)]
    [Unicode(false)]
    public string MatKhauHash { get; set; } = null!;

    public Guid MaVaiTro { get; set; }

    [StringLength(50)]
    public string TrangThai { get; set; } = null!;

    public DateOnly NgayTao { get; set; }

    [ForeignKey("MaNhanVien")]
    [InverseProperty("TaiKhoans")]
    public virtual NhanVien MaNhanVienNavigation { get; set; } = null!;

    [ForeignKey("MaVaiTro")]
    [InverseProperty("TaiKhoans")]
    public virtual VaiTro MaVaiTroNavigation { get; set; } = null!;
}
