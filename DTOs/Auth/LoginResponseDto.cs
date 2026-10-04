namespace HrmApp.Api.DTOs.Auth;

public class LoginResponseDto
{
	public string Token { get; set; } = string.Empty;
	public DateTime ExpiresAt { get; set; }
	public string TenDangNhap { get; set; } = string.Empty;
	public Guid MaTaiKhoan { get; set; }
	public Guid MaNhanVien { get; set; }
	public string HoTen { get; set; } = string.Empty;
	public string VaiTro { get; set; } = string.Empty;
}