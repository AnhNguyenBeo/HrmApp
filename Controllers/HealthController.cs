using HrmApp.Api.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HrmApp.Api.Data;

[ApiController]
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    private readonly QuanLyNhanSuDbContext _context;

    public HealthController(QuanLyNhanSuDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var canConnect = await _context.Database.CanConnectAsync();
        return Ok(new
        {
            Status = canConnect ? "Connected" : "Failed",
            Database = _context.Database.GetDbConnection().Database,
            Time = DateTime.Now
        });
    }
}