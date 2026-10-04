using System;

namespace HrmApp.Api.DTOs.ChamCong
{
    public class ChamCongResponseDto
    {
        public Guid MaChamCong { get; set; }
        public Guid? MaNhanVien { get; set; }
        public string HoTen { get; set; }
        public DateOnly Ngay { get; set; }
        public TimeOnly GioVao { get; set; }
        public TimeOnly? GioRa { get; set; }
        public decimal? SoGioTangCa { get; set; }
        public string TrangThai { get; set; }
    }
}
