using System;

namespace HrmApp.Api.DTOs.BangLuong
{
    public class TinhLuongRequestDto
    {
        public string ThoiGian { get; set; }
        public Guid? MaNhanVien { get; set; }
    }
}
