using HrmApp.Api.Controllers;
using Xunit;

namespace HrmApp.Tests;

public class NormalizeThoiGianTests
{
    [Theory]
    [InlineData("01/2026", "01/2026")]
    [InlineData("1/2026", "01/2026")]
    [InlineData(" 1/2026 ", "01/2026")]
    [InlineData("09/2024", "09/2024")]
    [InlineData("9/2024", "09/2024")]
    [InlineData("12/2025", "12/2025")]
    public void NormalizeThoiGian_ValidInputs_ReturnsTrueAndFormattedMonth(string input, string expected)
    {
        var isValid = BangLuongController.NormalizeThoiGian(input, out var normalized);
        Assert.True(isValid);
        Assert.Equal(expected, normalized);
    }

    [Theory]
    [InlineData("13/2026")]
    [InlineData("00/2026")]
    [InlineData("0/2026")]
    [InlineData("-1/2026")]
    [InlineData("abc")]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    [InlineData("05-2026")]
    [InlineData("2026/05")]
    [InlineData("05/1999")]
    [InlineData("05/2101")]
    public void NormalizeThoiGian_InvalidInputs_ReturnsFalse(string? input)
    {
        var isValid = BangLuongController.NormalizeThoiGian(input, out var normalized);
        Assert.False(isValid);
        Assert.Equal(string.Empty, normalized);
    }
}