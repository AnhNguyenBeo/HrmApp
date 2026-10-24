using System;

namespace HrmApp.Api.DTOs.BangLuong
{
    public class TinhLuongRequestDto
    {
        public string ThoiGian { get; set; } = string.Empty;
        public Guid? MaNhanVien { get; set; }
    }
}