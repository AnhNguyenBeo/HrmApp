using System;
using System.ComponentModel.DataAnnotations;

namespace HrmApp.Api.DTOs.TaiKhoan
{
    public class UpdateTaiKhoanDto
    {
        [Required(ErrorMessage = "Vai trò là bắt buộc")]
        public Guid MaVaiTro { get; set; }
        
        [Required(ErrorMessage = "Trạng thái là bắt buộc")]
        public string TrangThai { get; set; } = null!;
    }
}
