using System;

namespace HrmApp.Api.DTOs.DonTu
{
    public class DonTuResponseDto
    {
        public Guid MaDon { get; set; }
        public Guid MaNhanVien { get; set; }
        public string HoTen { get; set; } = null!;
        public string LoaiDon { get; set; } = null!;
        public string? LoaiNghi { get; set; }
        public DateOnly NgayBatDau { get; set; }
        public DateOnly NgayKetThuc { get; set; }
        public decimal SoNgayNghi { get; set; }
        public string LyDo { get; set; } = null!;
        public string TrangThai { get; set; } = null!;
        public Guid? NguoiDuyetMa { get; set; }
        public string? TenNguoiDuyet { get; set; }
        public DateOnly? NgayDuyet { get; set; }
        public string? GhiChuDuyet { get; set; }
    }
}
