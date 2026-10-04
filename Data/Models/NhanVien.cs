using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace HrmApp.Api.Data.Models;

[Table("NhanVien")]
public partial class NhanVien
{
    [Key]
    public Guid MaNhanVien { get; set; }

    [StringLength(100)]
    public string HoTen { get; set; } = null!;

    public DateOnly NgaySinh { get; set; }

    [StringLength(10)]
    public string GioiTinh { get; set; } = null!;

    [Column("CCCD")]
    [StringLength(20)]
    [Unicode(false)]
    public string Cccd { get; set; } = null!;

    [StringLength(100)]
    [Unicode(false)]
    public string Email { get; set; } = null!;

    [StringLength(15)]
    [Unicode(false)]
    public string SoDienThoai { get; set; } = null!;

    [StringLength(255)]
    public string DiaChi { get; set; } = null!;

    [StringLength(100)]
    public string TrinhDoHocVan { get; set; } = null!;

    public Guid MaPhongBan { get; set; }

    public Guid MaChucVu { get; set; }

    public DateOnly NgayVaoLam { get; set; }

    [StringLength(50)]
    public string TrangThaiLamViec { get; set; } = null!;

    public DateOnly? NgayNghiViec { get; set; }

    public string? GhiChu { get; set; }

    [InverseProperty("MaNhanVienNavigation")]
    public virtual ICollection<BangLuong> BangLuongs { get; set; } = new List<BangLuong>();

    [InverseProperty("MaNhanVienNavigation")]
    public virtual ICollection<ChamCong> ChamCongs { get; set; } = new List<ChamCong>();

    [InverseProperty("MaNhanVienNavigation")]
    public virtual ICollection<DonTu> DonTuMaNhanVienNavigations { get; set; } = new List<DonTu>();

    [InverseProperty("NguoiDuyetMaNavigation")]
    public virtual ICollection<DonTu> DonTuNguoiDuyetMaNavigations { get; set; } = new List<DonTu>();

    [InverseProperty("MaNhanVienNavigation")]
    public virtual ICollection<HopDongLaoDong> HopDongLaoDongs { get; set; } = new List<HopDongLaoDong>();

    [ForeignKey("MaChucVu")]
    [InverseProperty("NhanViens")]
    public virtual ChucVu MaChucVuNavigation { get; set; } = null!;

    [ForeignKey("MaPhongBan")]
    [InverseProperty("NhanViens")]
    public virtual PhongBan MaPhongBanNavigation { get; set; } = null!;

    [InverseProperty("MaNhanVienNavigation")]
    public virtual ICollection<TaiKhoan> TaiKhoans { get; set; } = new List<TaiKhoan>();
}
