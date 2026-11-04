using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HrmApp.Api.Data;
using HrmApp.Api.Data.Models;
using HrmApp.Api.DTOs.NhanVien;
using HrmApp.Api.DTOs.Shared;
using HrmApp.Api.Services;

namespace HrmApp.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class NhanVienController : ControllerBase
    {
        private static bool IsBanGiamDocOrAdmin(NhanVien nhanVien)
        {
            var dept = nhanVien.MaPhongBanNavigation?.TenPhongBan ?? "";
            var title = nhanVien.MaChucVuNavigation?.TenChucVu ?? "";
            return dept.Contains("Ban Giám đốc") 
                || title.Contains("Giám đốc") 
                || title.Contains("Chủ doanh nghiệp") 
                || title.Contains("Quản trị viên");
        }
        private readonly QuanLyNhanSuDbContext _context;
        private readonly INhatKyService _nhatKyService;

        public NhanVienController(QuanLyNhanSuDbContext context, INhatKyService nhatKyService)
        {
            _context = context;
            _nhatKyService = nhatKyService;
        }

        [HttpGet]
        [Authorize]
        public async Task<ActionResult<PagedResultDto<NhanVienResponseDto>>> GetNhanViens([FromQuery] NhanVienSearchDto search)
        {
            var currentUserIdStr = User.FindFirst("MaNhanVien")?.Value;
            var currentUserRole = User.FindFirst(ClaimTypes.Role)?.Value ?? User.FindFirst("role")?.Value;
            Guid.TryParse(currentUserIdStr, out var currentNhanVienId);

            var currentNhanVien = await _context.NhanViens
                .Include(n => n.MaPhongBanNavigation)
                .Include(n => n.MaChucVuNavigation)
                .FirstOrDefaultAsync(n => n.MaNhanVien == currentNhanVienId);

            var myDeptName = currentNhanVien?.MaPhongBanNavigation?.TenPhongBan ?? "";
            bool isOwner = currentUserRole == "Chủ doanh nghiệp";
            bool isAdmin = currentUserRole == "Quản trị viên";
            bool isManager = currentUserRole == "Quản lý";
            bool isHRManager = isManager && myDeptName.Contains("Nhân sự");
            bool isOtherManager = isManager && !isHRManager;
            bool isHREmployee = currentUserRole == "Nhân viên" && myDeptName.Contains("Nhân sự");

            if (!isOwner && !isAdmin && !isManager && !isHREmployee)
            {
                return StatusCode(403, new { message = "Bạn không có quyền truy cập danh sách nhân sự." });
            }

            var query = _context.NhanViens
                .Include(n => n.MaPhongBanNavigation)
                .Include(n => n.MaChucVuNavigation)
                .AsQueryable();

            if (isOtherManager)
            {
                if (currentNhanVien != null)
                {
                    query = query.Where(n => n.MaPhongBan == currentNhanVien.MaPhongBan);
                }
            }
            else if (search.MaPhongBan.HasValue)
            {
                query = query.Where(n => n.MaPhongBan == search.MaPhongBan.Value);
            }

            if (!string.IsNullOrEmpty(search.Keyword))
            {
                var kw = search.Keyword.ToLower();
                query = query.Where(n => n.HoTen.ToLower().Contains(kw) 
                                      || n.Email.ToLower().Contains(kw) 
                                      || n.Cccd.Contains(kw)
                                      || n.SoDienThoai.Contains(kw));
            }

            if (search.MaChucVu.HasValue)
            {
                query = query.Where(n => n.MaChucVu == search.MaChucVu.Value);
            }

            if (!string.IsNullOrEmpty(search.TrangThaiLamViec))
            {
                query = query.Where(n => n.TrangThaiLamViec == search.TrangThaiLamViec);
            }

            var page = Math.Max(1, search.Page);
            var pageSize = Math.Clamp(search.PageSize <= 0 ? 10 : search.PageSize, 1, 100);

            var totalCount = await query.CountAsync();
            
            var items = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(n => new NhanVienResponseDto
                {
                    MaNhanVien = n.MaNhanVien,
                    HoTen = n.HoTen,
                    NgaySinh = n.NgaySinh,
                    GioiTinh = n.GioiTinh,
                    Cccd = n.Cccd,
                    Email = n.Email,
                    SoDienThoai = n.SoDienThoai,
                    DiaChi = n.DiaChi,
                    TrinhDoHocVan = n.TrinhDoHocVan,
                    MaPhongBan = n.MaPhongBan,
                    TenPhongBan = n.MaPhongBanNavigation != null ? n.MaPhongBanNavigation.TenPhongBan : "",
                    MaChucVu = n.MaChucVu,
                    TenChucVu = n.MaChucVuNavigation != null ? n.MaChucVuNavigation.TenChucVu : "",
                    NgayVaoLam = n.NgayVaoLam,
                    TrangThaiLamViec = n.TrangThaiLamViec,
                    NgayNghiViec = n.NgayNghiViec,
                    GhiChu = n.GhiChu
                })
                .ToListAsync();

            return Ok(new PagedResultDto<NhanVienResponseDto>
            {
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize,
                Items = items
            });
        }

        [HttpGet("{id}")]
        [Authorize]
        public async Task<ActionResult<NhanVienResponseDto>> GetNhanVien(Guid id)
        {
            var currentUserIdStr = User.FindFirst("MaNhanVien")?.Value;
            var currentUserRole = User.FindFirst(ClaimTypes.Role)?.Value ?? User.FindFirst("role")?.Value;
            Guid.TryParse(currentUserIdStr, out var currentNhanVienId);

            var currentNhanVien = await _context.NhanViens
                .Include(n => n.MaPhongBanNavigation)
                .FirstOrDefaultAsync(n => n.MaNhanVien == currentNhanVienId);

            bool isOwner = currentUserRole == "Chủ doanh nghiệp";
            bool isAdmin = currentUserRole == "Quản trị viên";

            var nhanVien = await _context.NhanViens
                .Include(n => n.MaPhongBanNavigation)
                .Include(n => n.MaChucVuNavigation)
                .Where(n => n.MaNhanVien == id)
                .Select(n => new NhanVienResponseDto
                {
                    MaNhanVien = n.MaNhanVien,
                    HoTen = n.HoTen,
                    NgaySinh = n.NgaySinh,
                    GioiTinh = n.GioiTinh,
                    Cccd = n.Cccd,
                    Email = n.Email,
                    SoDienThoai = n.SoDienThoai,
                    DiaChi = n.DiaChi,
                    TrinhDoHocVan = n.TrinhDoHocVan,
                    MaPhongBan = n.MaPhongBan,
                    TenPhongBan = n.MaPhongBanNavigation != null ? n.MaPhongBanNavigation.TenPhongBan : "",
                    MaChucVu = n.MaChucVu,
                    TenChucVu = n.MaChucVuNavigation != null ? n.MaChucVuNavigation.TenChucVu : "",
                    NgayVaoLam = n.NgayVaoLam,
                    TrangThaiLamViec = n.TrangThaiLamViec,
                    NgayNghiViec = n.NgayNghiViec,
                    GhiChu = n.GhiChu
                })
                .FirstOrDefaultAsync();

            if (nhanVien == null)
            {
                return NotFound("Không tìm thấy nhân viên.");
            }

            var myDeptName = currentNhanVien?.MaPhongBanNavigation?.TenPhongBan ?? "";
            bool isManager = currentUserRole == "Quản lý";
            bool isHRManager = isManager && myDeptName.Contains("Nhân sự");
            bool isOtherManager = isManager && !isHRManager;
            bool isHREmployee = currentUserRole == "Nhân viên" && myDeptName.Contains("Nhân sự");

            if (currentNhanVienId != Guid.Empty && id == currentNhanVienId)
            {
                return Ok(nhanVien);
            }

            if (isOwner || isAdmin || isHRManager || isHREmployee)
            {
                return Ok(nhanVien);
            }

            if (isOtherManager && currentNhanVien != null && nhanVien.MaPhongBan == currentNhanVien.MaPhongBan)
            {
                return Ok(nhanVien);
            }

            return StatusCode(403, new { message = "Bạn không có quyền xem thông tin nhân sự này." });
        }

        [HttpGet("search")]
        [Authorize]
        public async Task<ActionResult<System.Collections.Generic.IEnumerable<NhanVienResponseDto>>> Search([FromQuery] string keyword)
        {
            if (string.IsNullOrEmpty(keyword))
            {
                return BadRequest("Từ khóa tìm kiếm không được để trống.");
            }

            var currentUserIdStr = User.FindFirst("MaNhanVien")?.Value;
            var currentUserRole = User.FindFirst(ClaimTypes.Role)?.Value ?? User.FindFirst("role")?.Value;
            Guid.TryParse(currentUserIdStr, out var currentNhanVienId);

            var currentNhanVien = await _context.NhanViens
                .Include(n => n.MaPhongBanNavigation)
                .FirstOrDefaultAsync(n => n.MaNhanVien == currentNhanVienId);

            bool isOwner = currentUserRole == "Chủ doanh nghiệp";
            bool isAdmin = currentUserRole == "Quản trị viên";

            var kw = keyword.ToLower();
            var query = _context.NhanViens
                .Include(n => n.MaPhongBanNavigation)
                .Include(n => n.MaChucVuNavigation)
                .Where(n => n.HoTen.ToLower().Contains(kw) || n.Email.ToLower().Contains(kw) || n.Cccd.Contains(kw));

            if (currentUserRole == "Nhân viên")
            {
                query = query.Where(n => n.MaNhanVien == currentNhanVienId);
            }
            else if (currentUserRole == "Quản lý")
            {
                if (currentNhanVien == null || currentNhanVien.MaPhongBan == Guid.Empty)
                {
                    return StatusCode(403, new { message = "Không xác định được phòng ban của người dùng." });
                }
                query = query.Where(n => n.MaPhongBan == currentNhanVien.MaPhongBan);
            }
            else if (!isOwner && !isAdmin)
            {
                return StatusCode(403, new { message = "Bạn không có quyền tìm kiếm danh sách nhân sự." });
            }

            var nhanViens = await query
                .Select(n => new NhanVienResponseDto
                {
                    MaNhanVien = n.MaNhanVien,
                    HoTen = n.HoTen,
                    NgaySinh = n.NgaySinh,
                    GioiTinh = n.GioiTinh,
                    Cccd = n.Cccd,
                    Email = n.Email,
                    SoDienThoai = n.SoDienThoai,
                    DiaChi = n.DiaChi,
                    TrinhDoHocVan = n.TrinhDoHocVan,
                    MaPhongBan = n.MaPhongBan,
                    TenPhongBan = n.MaPhongBanNavigation != null ? n.MaPhongBanNavigation.TenPhongBan : "",
                    MaChucVu = n.MaChucVu,
                    TenChucVu = n.MaChucVuNavigation != null ? n.MaChucVuNavigation.TenChucVu : "",
                    NgayVaoLam = n.NgayVaoLam,
                    TrangThaiLamViec = n.TrangThaiLamViec,
                    NgayNghiViec = n.NgayNghiViec,
                    GhiChu = n.GhiChu
                })
                .ToListAsync();

            return Ok(nhanViens);
        }

        [HttpPost]
        [Authorize]
        public async Task<ActionResult<NhanVienResponseDto>> PostNhanVien([FromBody] CreateNhanVienDto dto)
        {
            var currentUserIdStr = User.FindFirst("MaNhanVien")?.Value;
            var currentUserRole = User.FindFirst(ClaimTypes.Role)?.Value ?? User.FindFirst("role")?.Value;
            Guid.TryParse(currentUserIdStr, out var currentNhanVienId);

            var currentNhanVien = await _context.NhanViens
                .Include(n => n.MaChucVuNavigation)
                .Include(n => n.MaPhongBanNavigation)
                .FirstOrDefaultAsync(n => n.MaNhanVien == currentNhanVienId);

            var myDeptName = currentNhanVien?.MaPhongBanNavigation?.TenPhongBan ?? "";
            bool isOwner = currentUserRole == "Chủ doanh nghiệp";
            bool isHRManager = currentUserRole == "Quản lý" && myDeptName.Contains("Nhân sự");

            if (!isOwner && !isHRManager)
            {
                return StatusCode(403, new { message = "Chỉ Quản lý phòng Nhân sự hoặc Ban Giám Đốc mới có quyền thêm mới nhân sự." });
            }

            if (!isOwner)
            {
                var targetPb = await _context.PhongBans.FindAsync(dto.MaPhongBan);
                if (targetPb != null && targetPb.TenPhongBan.Contains("Ban Giám đốc"))
                {
                    return StatusCode(403, new { message = "Bạn không có quyền tác động hoặc thêm nhân sự vào Ban Giám Đốc." });
                }

                var newCv = await _context.ChucVus.FindAsync(dto.MaChucVu);
                if (newCv != null && (newCv.TenChucVu.Contains("Giám đốc") || newCv.TenChucVu.Contains("Chủ doanh nghiệp") || newCv.TenChucVu.Contains("Quản trị viên")))
                {
                    return StatusCode(403, new { message = "Bạn không có quyền cấp chức vụ thuộc Ban Giám Đốc." });
                }
            }

            var today = DateOnly.FromDateTime(DateTime.Today);
            if (dto.NgaySinh > today)
            {
                return BadRequest(new { message = "Ngày sinh không hợp lệ (không được lớn hơn ngày hiện tại)." });
            }

            if (dto.NgayVaoLam < dto.NgaySinh)
            {
                return BadRequest(new { message = "Ngày vào làm không được trước ngày sinh." });
            }

            if (dto.NgayVaoLam < dto.NgaySinh.AddYears(18))
            {
                return BadRequest(new { message = "Nhân sự chưa đủ độ tuổi lao động (phải từ đủ 18 tuổi tính đến ngày vào làm)." });
            }

            var cccdTrimmed = dto.Cccd.Trim();
            var cccdExists = await _context.NhanViens.AnyAsync(n => n.Cccd == cccdTrimmed);
            if (cccdExists)
            {
                return BadRequest(new { message = "Số CCCD này đã tồn tại trong hệ thống, không được trùng lặp." });
            }

            var phoneTrimmed = dto.SoDienThoai?.Trim();
            if (!string.IsNullOrEmpty(phoneTrimmed))
            {
                var phoneExists = await _context.NhanViens.AnyAsync(n => n.SoDienThoai == phoneTrimmed);
                if (phoneExists)
                {
                    return BadRequest(new { message = "Số điện thoại này đã tồn tại trong hệ thống, không được trùng lặp." });
                }
            }

            var nhanVien = new NhanVien
            {
                MaNhanVien = Guid.NewGuid(),
                HoTen = dto.HoTen,
                NgaySinh = dto.NgaySinh,
                GioiTinh = dto.GioiTinh,
                Cccd = cccdTrimmed,
                Email = dto.Email,
                SoDienThoai = dto.SoDienThoai,
                DiaChi = dto.DiaChi,
                TrinhDoHocVan = dto.TrinhDoHocVan,
                MaPhongBan = dto.MaPhongBan,
                MaChucVu = dto.MaChucVu,
                NgayVaoLam = dto.NgayVaoLam,
                TrangThaiLamViec = dto.TrangThaiLamViec,
                GhiChu = dto.GhiChu
            };

            _context.NhanViens.Add(nhanVien);
            await _context.SaveChangesAsync();

            var callerUser = User.FindFirst("TenDangNhap")?.Value ?? User.Identity?.Name ?? "Hệ thống";
            var callerName = User.FindFirst("HoTen")?.Value;
            var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
            await _nhatKyService.GhiLogAsync(callerUser, callerName, "Thêm nhân sự", $"Thêm mới nhân sự '{nhanVien.HoTen}'", "Thành công", ip);

            return CreatedAtAction(nameof(GetNhanVien), new { id = nhanVien.MaNhanVien }, null);
        }

        [HttpPut("{id}")]
        [Authorize]
        public async Task<IActionResult> PutNhanVien(Guid id, [FromBody] UpdateNhanVienDto dto)
        {
            var nhanVien = await _context.NhanViens
                .Include(n => n.MaPhongBanNavigation)
                .Include(n => n.MaChucVuNavigation)
                .FirstOrDefaultAsync(n => n.MaNhanVien == id);

            if (nhanVien == null)
            {
                return NotFound(new { message = "Không tìm thấy nhân viên." });
            }

            if (nhanVien.TrangThaiLamViec == "Đã nghỉ việc" || nhanVien.TrangThaiLamViec == "Đã thôi việc" || nhanVien.TrangThaiLamViec == "Đã thôi việc / Nghỉ việc" || nhanVien.TrangThaiLamViec.Contains("nghỉ việc") || nhanVien.TrangThaiLamViec.Contains("thôi việc"))
            {
                return BadRequest(new { message = "Nhân sự đã thôi việc, không thể sửa thông tin!" });
            }

            var currentUserIdStr = User.FindFirst("MaNhanVien")?.Value;
            var currentUserRole = User.FindFirst(ClaimTypes.Role)?.Value ?? User.FindFirst("role")?.Value;
            Guid.TryParse(currentUserIdStr, out var currentNhanVienId);

            var currentNhanVien = await _context.NhanViens
                .Include(n => n.MaChucVuNavigation)
                .Include(n => n.MaPhongBanNavigation)
                .FirstOrDefaultAsync(n => n.MaNhanVien == currentNhanVienId);

            var myDeptName = currentNhanVien?.MaPhongBanNavigation?.TenPhongBan ?? "";
            bool isOwner = currentUserRole == "Chủ doanh nghiệp";
            bool isHRManager = currentUserRole == "Quản lý" && myDeptName.Contains("Nhân sự");

            if (!isOwner && !isHRManager)
            {
                return StatusCode(403, new { message = "Chỉ Quản lý phòng Nhân sự hoặc Ban Giám Đốc mới có quyền chỉnh sửa nhân sự khác." });
            }

            if (!isOwner)
            {
                if (IsBanGiamDocOrAdmin(nhanVien))
                {
                    return StatusCode(403, new { message = "Bạn không có quyền tác động đến nhân sự thuộc Ban Giám Đốc." });
                }

                var targetPb = await _context.PhongBans.FindAsync(dto.MaPhongBan);
                if (targetPb != null && targetPb.TenPhongBan.Contains("Ban Giám đốc"))
                {
                    return StatusCode(403, new { message = "Bạn không có quyền chuyển nhân sự sang Ban Giám đốc." });
                }

                if (dto.MaChucVu.HasValue && dto.MaChucVu.Value != Guid.Empty)
                {
                    var targetCv = await _context.ChucVus.FindAsync(dto.MaChucVu.Value);
                    if (targetCv != null && (targetCv.TenChucVu.Contains("Giám đốc") || targetCv.TenChucVu.Contains("Chủ doanh nghiệp") || targetCv.TenChucVu.Contains("Quản trị viên")))
                    {
                        return StatusCode(403, new { message = "Bạn không có quyền cấp chức vụ thuộc Ban Giám Đốc." });
                    }
                }
            }

            var today = DateOnly.FromDateTime(DateTime.Today);
            if (dto.NgaySinh > today)
            {
                return BadRequest(new { message = "Ngày sinh không hợp lệ (không được lớn hơn ngày hiện tại)." });
            }

            if (nhanVien.NgayVaoLam < dto.NgaySinh)
            {
                return BadRequest(new { message = "Ngày vào làm không được trước ngày sinh." });
            }

            if (nhanVien.NgayVaoLam < dto.NgaySinh.AddYears(18))
            {
                return BadRequest(new { message = "Nhân sự chưa đủ độ tuổi lao động (phải từ đủ 18 tuổi tính đến ngày vào làm)." });
            }

            var cccdTrimmed = dto.Cccd.Trim();
            var cccdExists = await _context.NhanViens.AnyAsync(n => n.Cccd == cccdTrimmed && n.MaNhanVien != id);
            if (cccdExists)
            {
                return BadRequest(new { message = "Số CCCD này đã tồn tại ở nhân viên khác trong hệ thống." });
            }

            var phoneTrimmed = dto.SoDienThoai?.Trim();
            if (!string.IsNullOrEmpty(phoneTrimmed))
            {
                var phoneExists = await _context.NhanViens.AnyAsync(n => n.SoDienThoai == phoneTrimmed && n.MaNhanVien != id);
                if (phoneExists)
                {
                    return BadRequest(new { message = "Số điện thoại này đã tồn tại ở nhân sự khác, không được trùng lặp." });
                }
            }

            nhanVien.HoTen = dto.HoTen;
            nhanVien.NgaySinh = dto.NgaySinh;
            nhanVien.GioiTinh = dto.GioiTinh;
            nhanVien.Cccd = cccdTrimmed;
            nhanVien.Email = dto.Email;
            nhanVien.SoDienThoai = dto.SoDienThoai;
            nhanVien.DiaChi = dto.DiaChi;
            nhanVien.TrinhDoHocVan = dto.TrinhDoHocVan;
            nhanVien.MaPhongBan = dto.MaPhongBan;
            if (dto.MaChucVu.HasValue && dto.MaChucVu.Value != Guid.Empty && isOwner)
            {
                var targetChucVu = await _context.ChucVus.FindAsync(dto.MaChucVu.Value);
                if (targetChucVu != null && targetChucVu.TenChucVu.Contains("Thực tập") && nhanVien.MaChucVuNavigation?.TenChucVu != "Thực tập sinh")
                {
                    return BadRequest(new { message = "Nhân viên không thể chuyển chức vụ thành Thực tập sinh!" });
                }
                nhanVien.MaChucVu = dto.MaChucVu.Value;
            }
            if (!string.IsNullOrEmpty(dto.TrangThaiLamViec) && isOwner)
            {
                nhanVien.TrangThaiLamViec = dto.TrangThaiLamViec;
            }
            nhanVien.NgayNghiViec = dto.NgayNghiViec;
            nhanVien.GhiChu = dto.GhiChu;

            await _context.SaveChangesAsync();

            var callerUser = User.FindFirst("TenDangNhap")?.Value ?? User.Identity?.Name ?? "Hệ thống";
            var callerName = User.FindFirst("HoTen")?.Value;
            var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
            await _nhatKyService.GhiLogAsync(callerUser, callerName, "Cập nhật nhân sự", $"Cập nhật thông tin nhân sự '{nhanVien.HoTen}'", "Thành công", ip);

            return Ok(new { message = "Cập nhật thông tin nhân sự thành công." });
        }

        [HttpPut("{id}/chuc-vu")]
        [Authorize]
        public async Task<IActionResult> ChangeChucVu(Guid id, [FromBody] Guid maChucVu)
        {
            var nhanVien = await _context.NhanViens
                .Include(n => n.MaPhongBanNavigation)
                .Include(n => n.MaChucVuNavigation)
                .FirstOrDefaultAsync(n => n.MaNhanVien == id);

            if (nhanVien == null)
            {
                return NotFound(new { message = "Không tìm thấy nhân viên." });
            }

            if (nhanVien.TrangThaiLamViec == "Đã nghỉ việc" || nhanVien.TrangThaiLamViec == "Đã thôi việc" || nhanVien.TrangThaiLamViec == "Đã thôi việc / Nghỉ việc" || nhanVien.TrangThaiLamViec.Contains("nghỉ việc") || nhanVien.TrangThaiLamViec.Contains("thôi việc"))
            {
                return BadRequest(new { message = "Nhân sự đã thôi việc, không thể cấp chức vụ hoặc phân quyền!" });
            }

            var newChucVu = await _context.ChucVus.FindAsync(maChucVu);
            if (newChucVu == null)
            {
                return NotFound(new { message = "Không tìm thấy chức vụ." });
            }

            if (newChucVu.TenChucVu.Contains("Thực tập") || newChucVu.TenChucVu.Contains("Thực tập sinh"))
            {
                return BadRequest(new { message = "Không thể cấp chức thành Thực tập sinh!" });
            }

            var currentUserIdStr = User.FindFirst("MaNhanVien")?.Value;
            var currentUserRole = User.FindFirst(ClaimTypes.Role)?.Value ?? User.FindFirst("role")?.Value;
            Guid.TryParse(currentUserIdStr, out var currentNhanVienId);

            if (nhanVien.MaNhanVien == currentNhanVienId)
            {
                return BadRequest(new { message = "Bạn không thể tự cấp chức cho chính mình!" });
            }

            var currentNhanVien = await _context.NhanViens
                .Include(n => n.MaChucVuNavigation)
                .Include(n => n.MaPhongBanNavigation)
                .FirstOrDefaultAsync(n => n.MaNhanVien == currentNhanVienId);

            var myDeptName = currentNhanVien?.MaPhongBanNavigation?.TenPhongBan ?? "";
            bool isOwner = currentUserRole == "Chủ doanh nghiệp";
            bool isHRManager = currentUserRole == "Quản lý" && myDeptName.Contains("Nhân sự");

            if (!isOwner && !isHRManager)
            {
                return StatusCode(403, new { message = "Chỉ Quản lý phòng Nhân sự hoặc Ban Giám Đốc mới có quyền phân quyền hay thay đổi chức vụ." });
            }

            if (!isOwner)
            {
                if (IsBanGiamDocOrAdmin(nhanVien))
                {
                    return StatusCode(403, new { message = "Bạn không có quyền tác động đến nhân sự thuộc Ban Giám Đốc." });
                }

                if (newChucVu.TenChucVu.Contains("Giám đốc") || newChucVu.TenChucVu.Contains("Chủ doanh nghiệp") || newChucVu.TenChucVu.Contains("Quản trị viên") || (newChucVu.TenChucVu.Contains("Trưởng") && newChucVu.TenChucVu.Contains("Nhân sự")))
                {
                    return StatusCode(403, new { message = "Bạn không có quyền cấp chức vụ thuộc Ban Giám Đốc hoặc Trưởng phòng Nhân sự." });
                }
            }

            var oldChucVuName = nhanVien.MaChucVuNavigation?.TenChucVu ?? "Chưa rõ";
            nhanVien.MaChucVu = maChucVu;
            await _context.SaveChangesAsync();

            var callerUser = User.FindFirst("TenDangNhap")?.Value ?? User.Identity?.Name ?? "Hệ thống";
            var callerName = User.FindFirst("HoTen")?.Value;
            var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
            await _nhatKyService.GhiLogAsync(callerUser, callerName, "Bổ nhiệm chức vụ", $"Thay đổi chức vụ của '{nhanVien.HoTen}' từ '{oldChucVuName}' thành '{newChucVu.TenChucVu}'", "Thành công", ip);

            return Ok(new { message = $"Đã cập nhật chức vụ thành công thành {newChucVu.TenChucVu}." });
        }

        [HttpDelete("{id}")]
        [Authorize]
        public async Task<IActionResult> DeleteNhanVien(Guid id)
        {
            var nhanVien = await _context.NhanViens
                .Include(n => n.MaPhongBanNavigation)
                .Include(n => n.MaChucVuNavigation)
                .FirstOrDefaultAsync(n => n.MaNhanVien == id);

            if (nhanVien == null)
            {
                return NotFound(new { message = "Không tìm thấy nhân viên." });
            }

            var currentUserIdStr = User.FindFirst("MaNhanVien")?.Value;
            var currentUserRole = User.FindFirst(ClaimTypes.Role)?.Value ?? User.FindFirst("role")?.Value;
            Guid.TryParse(currentUserIdStr, out var currentNhanVienId);

            if (nhanVien.MaNhanVien == currentNhanVienId)
            {
                return BadRequest(new { message = "Bạn không thể tự cho chính mình thôi việc!" });
            }

            var currentNhanVien = await _context.NhanViens
                .Include(n => n.MaChucVuNavigation)
                .Include(n => n.MaPhongBanNavigation)
                .FirstOrDefaultAsync(n => n.MaNhanVien == currentNhanVienId);

            var myDeptName = currentNhanVien?.MaPhongBanNavigation?.TenPhongBan ?? "";
            bool isOwner = currentUserRole == "Chủ doanh nghiệp";
            bool isHRManager = currentUserRole == "Quản lý" && myDeptName.Contains("Nhân sự");

            if (!isOwner && !isHRManager)
            {
                return StatusCode(403, new { message = "Chỉ Quản lý phòng Nhân sự hoặc Ban Giám Đốc mới có quyền xử lý thôi việc." });
            }

            if (!isOwner)
            {
                if (IsBanGiamDocOrAdmin(nhanVien))
                {
                    return StatusCode(403, new { message = "Bạn không có quyền tác động đến nhân sự thuộc Ban Giám Đốc." });
                }
            }

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                nhanVien.TrangThaiLamViec = "Đã thôi việc / Nghỉ việc";
            nhanVien.NgayNghiViec = DateOnly.FromDateTime(DateTime.Now);

            var taiKhoans = await _context.TaiKhoans.Where(t => t.MaNhanVien == nhanVien.MaNhanVien).ToListAsync();
            foreach (var tk in taiKhoans)
            {
                tk.TrangThai = "Bị khóa";
            }

            var hopDongs = await _context.HopDongLaoDongs
                .Where(h => h.MaNhanVien == nhanVien.MaNhanVien && (h.TrangThai == "Có hiệu lực" || h.TrangThai == "Đang hiệu lực"))
                .ToListAsync();
            foreach (var hd in hopDongs)
            {
                hd.TrangThai = "Đã thanh lý";
                hd.NgayKetThuc = DateOnly.FromDateTime(DateTime.Now);
            }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }

            var callerUser = User.FindFirst("TenDangNhap")?.Value ?? User.Identity?.Name ?? "Hệ thống";
            var callerName = User.FindFirst("HoTen")?.Value;
            var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
            await _nhatKyService.GhiLogAsync(callerUser, callerName, "Thôi việc nhân sự", $"Cho nhân sự '{nhanVien.HoTen}' thôi việc và khóa tài khoản liên kết", "Thành công", ip);

            return Ok(new { message = $"Đã cho nhân sự {nhanVien.HoTen} thôi việc và tự động khóa tài khoản liên kết." });
        }

        [HttpPost("{id}/khoi-phuc")]
        [Authorize(Roles = "Chủ doanh nghiệp, Quản lý")]
        public async Task<IActionResult> KhoiPhucNhanSu(Guid id)
        {
            var nhanVien = await _context.NhanViens
                .Include(n => n.MaPhongBanNavigation)
                .Include(n => n.MaChucVuNavigation)
                .FirstOrDefaultAsync(n => n.MaNhanVien == id);

            if (nhanVien == null)
            {
                return NotFound(new { message = "Không tìm thấy nhân viên." });
            }

            var currentUserIdStr = User.FindFirst("MaNhanVien")?.Value;
            var currentUserRole = User.FindFirst(ClaimTypes.Role)?.Value ?? User.FindFirst("role")?.Value;
            Guid.TryParse(currentUserIdStr, out var currentNhanVienId);

            var currentNhanVien = await _context.NhanViens
                .Include(n => n.MaChucVuNavigation)
                .Include(n => n.MaPhongBanNavigation)
                .FirstOrDefaultAsync(n => n.MaNhanVien == currentNhanVienId);

            var myDeptName = currentNhanVien?.MaPhongBanNavigation?.TenPhongBan ?? "";
            bool isOwner = currentUserRole == "Chủ doanh nghiệp";
            bool isHRManager = currentUserRole == "Quản lý" && myDeptName.Contains("Nhân sự");

            if (!isOwner && !isHRManager)
            {
                return StatusCode(403, new { message = "Chỉ Quản lý phòng Nhân sự hoặc Chủ doanh nghiệp mới có quyền khôi phục nhân sự." });
            }

            if (!isOwner && IsBanGiamDocOrAdmin(nhanVien))
            {
                return StatusCode(403, new { message = "Bạn không có quyền tác động đến nhân sự thuộc Ban Giám Đốc." });
            }

            var tt = nhanVien.TrangThaiLamViec ?? string.Empty;
            bool isResigned = tt == "Đã nghỉ việc" || tt == "Đã thôi việc" || tt == "Đã thôi việc / Nghỉ việc" || tt.Contains("thôi việc") || tt.Contains("nghỉ việc");
            if (!isResigned)
            {
                return BadRequest(new { message = "Nhân sự này đang làm việc, không cần khôi phục!" });
            }

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                nhanVien.TrangThaiLamViec = "Đang làm việc";
                nhanVien.NgayNghiViec = null;

                var taiKhoans = await _context.TaiKhoans.Where(t => t.MaNhanVien == nhanVien.MaNhanVien).ToListAsync();
                foreach (var tk in taiKhoans)
                {
                    tk.TrangThai = "Hoạt động";
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                var callerUser = User.FindFirst("TenDangNhap")?.Value ?? User.Identity?.Name ?? "Hệ thống";
                var callerName = User.FindFirst("HoTen")?.Value;
                var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
                await _nhatKyService.GhiLogAsync(callerUser, callerName, "Khôi phục nhân sự", $"Khôi phục trạng thái làm việc cho nhân sự '{nhanVien.HoTen}' và mở khóa tài khoản", "Thành công", ip);

                return Ok(new { message = $"Đã khôi phục trạng thái làm việc cho nhân sự {nhanVien.HoTen} và mở khóa tài khoản thành công." });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, new { message = "Có lỗi xảy ra trong quá trình khôi phục: " + ex.Message });
            }
        }

        [HttpPut("ho-so-cua-toi")]
        [Authorize]
        public async Task<IActionResult> UpdateHoSoCuaToi([FromBody] UpdateHoSoCuaToiDto request)
        {
            var maNhanVienStr = User.FindFirst("MaNhanVien")?.Value;
            if (!Guid.TryParse(maNhanVienStr, out var maNhanVien)) return Unauthorized();

            var nhanVien = await _context.NhanViens.FindAsync(maNhanVien);
            if (nhanVien == null) return NotFound(new { message = "Không tìm thấy nhân viên." });

            if (!string.IsNullOrEmpty(request.SoDienThoai)) nhanVien.SoDienThoai = request.SoDienThoai;
            if (!string.IsNullOrEmpty(request.Email)) nhanVien.Email = request.Email;
            if (!string.IsNullOrEmpty(request.DiaChi)) nhanVien.DiaChi = request.DiaChi;

            _context.NhanViens.Update(nhanVien);
            await _context.SaveChangesAsync();

            var callerUser = User.FindFirst("TenDangNhap")?.Value ?? User.Identity?.Name ?? "Hệ thống";
            var callerName = User.FindFirst("HoTen")?.Value ?? nhanVien.HoTen;
            var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
            await _nhatKyService.GhiLogAsync(callerUser, callerName, "Cập nhật hồ sơ", "Cập nhật thông tin hồ sơ cá nhân", "Thành công", ip);

            return Ok(new { message = "Cập nhật hồ sơ cá nhân thành công." });
        }
    }
}

namespace HrmApp.Api.DTOs.NhanVien {
    public class UpdateHoSoCuaToiDto {
        public string? SoDienThoai { get; set; }
        public string? Email { get; set; }
        public string? DiaChi { get; set; }
    }
}
