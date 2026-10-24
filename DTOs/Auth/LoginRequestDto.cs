using System.ComponentModel.DataAnnotations;

namespace HrmApp.Api.DTOs.Auth;

public class LoginRequestDto
{
    [Required(ErrorMessage = "Tên đăng nhập không được để trống.")]
    public string TenDangNhap { get; set; } = string.Empty;

    [Required(ErrorMessage = "Mật khẩu không được để trống.")]
    public string MatKhau { get; set; } = string.Empty;
}