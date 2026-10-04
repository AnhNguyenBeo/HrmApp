using System;
using System.Collections.Generic;
using HrmApp.Api.Data.Models;
using Microsoft.EntityFrameworkCore;

namespace HrmApp.Api.Data;

public partial class QuanLyNhanSuDbContext : DbContext
{
    public QuanLyNhanSuDbContext(DbContextOptions<QuanLyNhanSuDbContext> options)
        : base(options)
    {
    }

    public virtual DbSet<BangLuong> BangLuongs { get; set; }

    public virtual DbSet<ChamCong> ChamCongs { get; set; }

    public virtual DbSet<ChucVu> ChucVus { get; set; }

    public virtual DbSet<DonTu> DonTus { get; set; }

    public virtual DbSet<HopDongLaoDong> HopDongLaoDongs { get; set; }

    public virtual DbSet<NhanVien> NhanViens { get; set; }

    public virtual DbSet<PhongBan> PhongBans { get; set; }

    public virtual DbSet<TaiKhoan> TaiKhoans { get; set; }

    public virtual DbSet<VaiTro> VaiTros { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<BangLuong>(entity =>
        {
            entity.Property(e => e.MaBangLuong).HasDefaultValueSql("(newid())");

            entity.HasOne(d => d.MaNhanVienNavigation).WithMany(p => p.BangLuongs)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_BangLuong_NhanVien");
        });

        modelBuilder.Entity<ChamCong>(entity =>
        {
            entity.Property(e => e.MaChamCong).HasDefaultValueSql("(newid())");

            entity.HasOne(d => d.MaNhanVienNavigation).WithMany(p => p.ChamCongs)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ChamCong_NhanVien");
        });

        modelBuilder.Entity<ChucVu>(entity =>
        {
            entity.Property(e => e.MaChucVu).HasDefaultValueSql("(newid())");
        });

        modelBuilder.Entity<DonTu>(entity =>
        {
            entity.Property(e => e.MaDon).HasDefaultValueSql("(newid())");

            entity.HasOne(d => d.MaNhanVienNavigation).WithMany(p => p.DonTuMaNhanVienNavigations)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_DonTu_NhanVien");

            entity.HasOne(d => d.NguoiDuyetMaNavigation).WithMany(p => p.DonTuNguoiDuyetMaNavigations).HasConstraintName("FK_DonTu_NguoiDuyet");
        });

        modelBuilder.Entity<HopDongLaoDong>(entity =>
        {
            entity.Property(e => e.MaHopDong).HasDefaultValueSql("(newid())");

            entity.HasOne(d => d.MaNhanVienNavigation).WithMany(p => p.HopDongLaoDongs)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_HopDongLaoDong_NhanVien");
        });

        modelBuilder.Entity<NhanVien>(entity =>
        {
            entity.Property(e => e.MaNhanVien).HasDefaultValueSql("(newid())");

            entity.HasOne(d => d.MaChucVuNavigation).WithMany(p => p.NhanViens)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_NhanVien_ChucVu");

            entity.HasOne(d => d.MaPhongBanNavigation).WithMany(p => p.NhanViens)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_NhanVien_PhongBan");
        });

        modelBuilder.Entity<PhongBan>(entity =>
        {
            entity.Property(e => e.MaPhongBan).HasDefaultValueSql("(newid())");
        });

        modelBuilder.Entity<TaiKhoan>(entity =>
        {
            entity.Property(e => e.MaTaiKhoan).HasDefaultValueSql("(newid())");

            entity.HasOne(d => d.MaNhanVienNavigation).WithMany(p => p.TaiKhoans)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_TaiKhoan_NhanVien");

            entity.HasOne(d => d.MaVaiTroNavigation).WithMany(p => p.TaiKhoans)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_TaiKhoan_VaiTro");
        });

        modelBuilder.Entity<VaiTro>(entity =>
        {
            entity.Property(e => e.MaVaiTro).HasDefaultValueSql("(newid())");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
