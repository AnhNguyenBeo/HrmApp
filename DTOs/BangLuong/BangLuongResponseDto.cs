using System;

namespace HrmApp.Api.DTOs.BangLuong
{
    public class BangLuongResponseDto
    {
        public Guid MaBangLuong { get; set; }
        public Guid? MaNhanVien { get; set; }
        public string HoTen { get; set; } = null!;
        public string? TenPhongBan { get; set; }
        public string? TenChucVu { get; set; }
        public string? VaiTro { get; set; }
        public string ThoiGian { get; set; } = null!;
        public decimal? LuongCoBan { get; set; }
        public decimal? NgayCongChuan { get; set; }
        public decimal? SoNgayCong { get; set; }
        public decimal? TongGioOt { get; set; }
        public decimal? LuongOt { get; set; }
        public decimal? PhuCap { get; set; }
        public decimal? BaoHiemXaHoi { get; set; }
        public decimal? ThueTncn { get; set; }
        public decimal? ThucLinh { get; set; }
        public string? TrangThaiChiTra { get; set; }
    }
}