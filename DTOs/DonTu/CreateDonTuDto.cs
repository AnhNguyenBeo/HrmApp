using System;
using System.ComponentModel.DataAnnotations;

namespace HrmApp.Api.DTOs.DonTu
{
    public class CreateDonTuDto
    {
        [Required]
        public string LoaiDon { get; set; } = null!;
        public string? LoaiNghi { get; set; }
        [Required]
        public DateOnly NgayBatDau { get; set; }
        [Required]
        public DateOnly NgayKetThuc { get; set; }
        [Required]
        public string LyDo { get; set; } = null!;
    }
}
