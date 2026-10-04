using System;

namespace HrmApp.Api.DTOs.NhanVien
{
    public class NhanVienSearchDto
    {
        public string? Keyword { get; set; }
        public Guid? MaPhongBan { get; set; }
        public Guid? MaChucVu { get; set; }
        public string? TrangThaiLamViec { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 10;
    }
}
