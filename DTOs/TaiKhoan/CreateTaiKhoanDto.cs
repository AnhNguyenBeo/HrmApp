using System;
using System.ComponentModel.DataAnnotations;

namespace HrmApp.Api.DTOs.TaiKhoan
{
    public class CreateTaiKhoanDto
    {
        [Required(ErrorMessage = "Nhân viên là bắt buộc")]
        public Guid MaNhanVien { get; set; }
        
        [Required(ErrorMessage = "Tên đăng nhập là bắt buộc")]
        public string TenDangNhap { get; set; } = null!;
        
        [Required(ErrorMessage = "Mật khẩu là bắt buộc")]
        public string MatKhau { get; set; } = null!;
        
        [Required(ErrorMessage = "Vai trò là bắt buộc")]
        public Guid MaVaiTro { get; set; }
        
        [Required(ErrorMessage = "Trạng thái là bắt buộc")]
        public string TrangThai { get; set; } = null!;
    }
}
