using System.ComponentModel.DataAnnotations;

namespace HrmApp.Api.DTOs.TaiKhoan
{
    public class ChangePasswordDto
    {
        [Required(ErrorMessage = "Mật khẩu cũ là bắt buộc")]
        public string MatKhauCu { get; set; } = null!;
        
        [Required(ErrorMessage = "Mật khẩu mới là bắt buộc")]
        [MinLength(8, ErrorMessage = "Mật khẩu mới phải có ít nhất 8 ký tự")]
        public string MatKhauMoi { get; set; } = null!;
    }
}