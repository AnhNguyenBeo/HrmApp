using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace HrmApp.Api.Data.Models;

[Table("PhongBan")]
public partial class PhongBan
{
    [Key]
    public Guid MaPhongBan { get; set; }

    [StringLength(100)]
    public string TenPhongBan { get; set; } = null!;

    [StringLength(255)]
    public string? MoTa { get; set; }

    [InverseProperty("MaPhongBanNavigation")]
    public virtual ICollection<NhanVien> NhanViens { get; set; } = new List<NhanVien>();
}
