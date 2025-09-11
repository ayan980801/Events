import pytz
from datetime import datetime

def format_timestamp_with_timezone(timestamp, timezone='UTC'):
    """
    Format timestamp with timezone using pytz
    """
    tz = pytz.timezone(timezone)
    dt = datetime.fromtimestamp(timestamp, tz=tz)
    return dt.strftime('%Y-%m-%d %H:%M:%S %Z')

def get_available_timezones():
    """
    Return list of available timezones
    """
    return pytz.all_timezones