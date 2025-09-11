import pytz
from etl_utils import format_timestamp_with_timezone, get_available_timezones

def test_format_timestamp_with_timezone():
    """Test timestamp formatting with timezone"""
    # Test with UTC timezone
    timestamp = 1640995200  # 2022-01-01 00:00:00 UTC
    result = format_timestamp_with_timezone(timestamp, 'UTC')
    assert '2022-01-01 00:00:00 UTC' in result
    
def test_get_available_timezones():
    """Test getting available timezones"""
    timezones = get_available_timezones()
    assert 'UTC' in timezones
    assert 'US/Eastern' in timezones
    assert len(timezones) > 0

def test_pytz_import():
    """Test that pytz can be imported successfully"""
    assert pytz.UTC is not None