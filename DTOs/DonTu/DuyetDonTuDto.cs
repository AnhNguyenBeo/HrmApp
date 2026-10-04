using System.ComponentModel.DataAnnotations;

namespace HrmApp.Api.DTOs.DonTu
{
    public class DuyetDonTuDto
    {
        [Required]
        public string TrangThai { get; set; } = null!;
        public string? GhiChuDuyet { get; set; }
    }
}
