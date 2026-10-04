using System.ComponentModel.DataAnnotations;

namespace HrmApp.Api.DTOs.TaiKhoan
{
    public class ChangePasswordDto
    {
        [Required(ErrorMessage = "Mật khẩu cũ là bắt buộc")]
        public string MatKhauCu { get; set; } = null!;
        
        [Required(ErrorMessage = "Mật khẩu mới là bắt buộc")]
        public string MatKhauMoi { get; set; } = null!;
    }
}
