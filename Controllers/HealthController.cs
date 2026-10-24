using System;
using System.Threading.Tasks;
using HrmApp.Api.Data;
using Microsoft.AspNetCore.Mvc;

namespace HrmApp.Api.Controllers;

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
            Status = canConnect ? "Healthy" : "Unhealthy",
            Time = DateTime.Now
        });
    }
}