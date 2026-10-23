using System;

namespace HrmApp.Api.DTOs.TaiKhoan
{
    public class TaiKhoanResponseDto
    {
        public Guid MaTaiKhoan { get; set; }
        public Guid MaNhanVien { get; set; }
        public string TenNhanVien { get; set; } = null!;
        public string? TenPhongBan { get; set; }
        public string? TenChucVu { get; set; }
        public string TenDangNhap { get; set; } = null!;
        public Guid MaVaiTro { get; set; }
        public string TenVaiTro { get; set; } = null!;
        public string TrangThai { get; set; } = null!;
        public DateOnly NgayTao { get; set; }
    }
}
