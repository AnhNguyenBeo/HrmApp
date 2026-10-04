using System;

namespace HrmApp.Api.DTOs.NhanVien
{
    public class NhanVienResponseDto
    {
        public Guid MaNhanVien { get; set; }
        public string HoTen { get; set; } = null!;
        public DateOnly NgaySinh { get; set; }
        public string GioiTinh { get; set; } = null!;
        public string Cccd { get; set; } = null!;
        public string Email { get; set; } = null!;
        public string SoDienThoai { get; set; } = null!;
        public string DiaChi { get; set; } = null!;
        public string TrinhDoHocVan { get; set; } = null!;
        public Guid MaPhongBan { get; set; }
        public string TenPhongBan { get; set; } = null!;
        public Guid MaChucVu { get; set; }
        public string TenChucVu { get; set; } = null!;
        public DateOnly NgayVaoLam { get; set; }
        public string TrangThaiLamViec { get; set; } = null!;
        public DateOnly? NgayNghiViec { get; set; }
        public string? GhiChu { get; set; }
    }
}
