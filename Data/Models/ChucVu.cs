using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace HrmApp.Api.Data.Models;

[Table("ChucVu")]
public partial class ChucVu
{
    [Key]
    public Guid MaChucVu { get; set; }

    [StringLength(100)]
    public string TenChucVu { get; set; } = null!;

    [Column(TypeName = "decimal(18, 2)")]
    public decimal PhuCapChucVu { get; set; }

    [InverseProperty("MaChucVuNavigation")]
    public virtual ICollection<NhanVien> NhanViens { get; set; } = new List<NhanVien>();
}
