using System.ComponentModel.DataAnnotations;

namespace HrmApp.Api.DTOs.Auth;

public class LoginRequestDto
{
    [Required(ErrorMessage = "Tên ??ng nh?p không ???c ?? tr?ng.")]
    public string TenDangNhap { get; set; } = string.Empty;

    [Required(ErrorMessage = "M?t kh?u không ???c ?? tr?ng.")]
    public string MatKhau { get; set; } = string.Empty;
}