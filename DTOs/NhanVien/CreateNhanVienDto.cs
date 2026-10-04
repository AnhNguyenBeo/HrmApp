using System;
using System.ComponentModel.DataAnnotations;

namespace HrmApp.Api.DTOs.NhanVien
{
    public class CreateNhanVienDto
    {
        [Required(ErrorMessage = "Họ tên là bắt buộc")]
        public string HoTen { get; set; } = null!;
        
        [Required(ErrorMessage = "Ngày sinh là bắt buộc")]
        public DateOnly NgaySinh { get; set; }
        
        [Required(ErrorMessage = "Giới tính là bắt buộc")]
        public string GioiTinh { get; set; } = null!;
        
        [Required(ErrorMessage = "CCCD là bắt buộc")]
        public string Cccd { get; set; } = null!;
        
        [Required(ErrorMessage = "Email là bắt buộc")]
        [EmailAddress(ErrorMessage = "Email không hợp lệ")]
        public string Email { get; set; } = null!;
        
        [Required(ErrorMessage = "Số điện thoại là bắt buộc")]
        public string SoDienThoai { get; set; } = null!;
        
        [Required(ErrorMessage = "Địa chỉ là bắt buộc")]
        public string DiaChi { get; set; } = null!;
        
        [Required(ErrorMessage = "Trình độ học vấn là bắt buộc")]
        public string TrinhDoHocVan { get; set; } = null!;
        
        [Required(ErrorMessage = "Phòng ban là bắt buộc")]
        public Guid MaPhongBan { get; set; }
        
        [Required(ErrorMessage = "Chức vụ là bắt buộc")]
        public Guid MaChucVu { get; set; }
        
        [Required(ErrorMessage = "Ngày vào làm là bắt buộc")]
        public DateOnly NgayVaoLam { get; set; }
        
        [Required(ErrorMessage = "Trạng thái làm việc là bắt buộc")]
        public string TrangThaiLamViec { get; set; } = null!;
        
        public string? GhiChu { get; set; }
    }
}
