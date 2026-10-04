using System;
using System.ComponentModel.DataAnnotations;

namespace HrmApp.Api.DTOs.HopDong
{
    public class UpdateHopDongDto
    {
        [Required(ErrorMessage = "Loại hợp đồng là bắt buộc")]
        public string LoaiHopDong { get; set; } = null!;
        
        [Required(ErrorMessage = "Ngày bắt đầu là bắt buộc")]
        public DateOnly NgayBatDau { get; set; }
        
        public DateOnly? NgayKetThuc { get; set; }
        
        [Required(ErrorMessage = "Lương cơ bản là bắt buộc")]
        public decimal LuongCoBan { get; set; }
        
        [Required(ErrorMessage = "Trạng thái là bắt buộc")]
        public string TrangThai { get; set; } = null!;
        
        public decimal? LuongThuong { get; set; }
    }
}
