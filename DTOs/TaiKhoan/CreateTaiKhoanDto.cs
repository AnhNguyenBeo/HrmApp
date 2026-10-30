using System;
using System.ComponentModel.DataAnnotations;

namespace HrmApp.Api.DTOs.TaiKhoan
{
    public class CreateTaiKhoanDto
    {
        [Required(ErrorMessage = "Nhân viên là bắt buộc")]
        public Guid MaNhanVien { get; set; }
        
        [Required(ErrorMessage = "Tên đăng nhập là bắt buộc")]
        [RegularExpression(@"^\S+$", ErrorMessage = "Tên đăng nhập không được chứa khoảng trắng")]
        public string TenDangNhap { get; set; } = null!;
        
        [Required(ErrorMessage = "Mật khẩu là bắt buộc")]
        [MinLength(8, ErrorMessage = "Mật khẩu phải có ít nhất 8 ký tự")]
        public string MatKhau { get; set; } = null!;
        
        [Required(ErrorMessage = "Vai trò là bắt buộc")]
        public Guid MaVaiTro { get; set; }
        
        public string TrangThai { get; set; } = "Hoạt động";
    }
}