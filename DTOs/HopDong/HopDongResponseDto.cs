using System;

namespace HrmApp.Api.DTOs.HopDong
{
    public class HopDongResponseDto
    {
        public Guid MaHopDong { get; set; }
        public Guid MaNhanVien { get; set; }
        public string TenNhanVien { get; set; } = null!;
        public string LoaiHopDong { get; set; } = null!;
        public DateOnly NgayBatDau { get; set; }
        public DateOnly? NgayKetThuc { get; set; }
        public decimal LuongCoBan { get; set; }
        public string TrangThai { get; set; } = null!;
        public decimal? LuongThuong { get; set; }
    }
}
