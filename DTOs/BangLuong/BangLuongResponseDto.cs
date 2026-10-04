using System;

namespace HrmApp.Api.DTOs.BangLuong
{
    public class BangLuongResponseDto
    {
        public Guid MaBangLuong { get; set; }
        public Guid? MaNhanVien { get; set; }
        public string HoTen { get; set; }
        public string ThoiGian { get; set; }
        public decimal? LuongCoBan { get; set; }
        public decimal? PhuCap { get; set; }
        public decimal? KhauTru { get; set; }
        public decimal? ThucLinh { get; set; }
    }
}
