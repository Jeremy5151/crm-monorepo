'use client';

const TIMEZONES = [
  { value: 'UTC', label: 'UTC (GMT+0)' },
  { value: 'Europe/London', label: '🇬🇧 London (GMT+0/+1)' },
  { value: 'Europe/Paris', label: '🇫🇷 Paris (GMT+1/+2)' },
  { value: 'Europe/Berlin', label: '🇩🇪 Berlin (GMT+1/+2)' },
  { value: 'Europe/Rome', label: '🇮🇹 Rome (GMT+1/+2)' },
  { value: 'Europe/Madrid', label: '🇪🇸 Madrid (GMT+1/+2)' },
  { value: 'Europe/Amsterdam', label: '🇳🇱 Amsterdam (GMT+1/+2)' },
  { value: 'Europe/Brussels', label: '🇧🇪 Brussels (GMT+1/+2)' },
  { value: 'Europe/Vienna', label: '🇦🇹 Vienna (GMT+1/+2)' },
  { value: 'Europe/Zurich', label: '🇨🇭 Zurich (GMT+1/+2)' },
  { value: 'Europe/Stockholm', label: '🇸🇪 Stockholm (GMT+1/+2)' },
  { value: 'Europe/Oslo', label: '🇳🇴 Oslo (GMT+1/+2)' },
  { value: 'Europe/Copenhagen', label: '🇩🇰 Copenhagen (GMT+1/+2)' },
  { value: 'Europe/Helsinki', label: '🇫🇮 Helsinki (GMT+2/+3)' },
  { value: 'Europe/Warsaw', label: '🇵🇱 Warsaw (GMT+1/+2)' },
  { value: 'Europe/Prague', label: '🇨🇿 Prague (GMT+1/+2)' },
  { value: 'Europe/Budapest', label: '🇭🇺 Budapest (GMT+1/+2)' },
  { value: 'Europe/Bucharest', label: '🇷🇴 Bucharest (GMT+2/+3)' },
  { value: 'Europe/Sofia', label: '🇧🇬 Sofia (GMT+2/+3)' },
  { value: 'Europe/Athens', label: '🇬🇷 Athens (GMT+2/+3)' },
  { value: 'Europe/Istanbul', label: '🇹🇷 Istanbul (GMT+3)' },
  { value: 'Europe/Moscow', label: '🇷🇺 Moscow (GMT+3)' },
  { value: 'Europe/Kiev', label: '🇺🇦 Kiev (GMT+2/+3)' },
  { value: 'America/New_York', label: '🇺🇸 New York (GMT-5/-4)' },
  { value: 'America/Chicago', label: '🇺🇸 Chicago (GMT-6/-5)' },
  { value: 'America/Denver', label: '🇺🇸 Denver (GMT-7/-6)' },
  { value: 'America/Los_Angeles', label: '🇺🇸 Los Angeles (GMT-8/-7)' },
  { value: 'America/Toronto', label: '🇨🇦 Toronto (GMT-5/-4)' },
  { value: 'America/Vancouver', label: '🇨🇦 Vancouver (GMT-8/-7)' },
  { value: 'America/Sao_Paulo', label: '🇧🇷 São Paulo (GMT-3)' },
  { value: 'America/Argentina/Buenos_Aires', label: '🇦🇷 Buenos Aires (GMT-3)' },
  { value: 'America/Mexico_City', label: '🇲🇽 Mexico City (GMT-6/-5)' },
  { value: 'Asia/Tokyo', label: '🇯🇵 Tokyo (GMT+9)' },
  { value: 'Asia/Shanghai', label: '🇨🇳 Shanghai (GMT+8)' },
  { value: 'Asia/Hong_Kong', label: '🇭🇰 Hong Kong (GMT+8)' },
  { value: 'Asia/Singapore', label: '🇸🇬 Singapore (GMT+8)' },
  { value: 'Asia/Seoul', label: '🇰🇷 Seoul (GMT+9)' },
  { value: 'Asia/Bangkok', label: '🇹🇭 Bangkok (GMT+7)' },
  { value: 'Asia/Jakarta', label: '🇮🇩 Jakarta (GMT+7)' },
  { value: 'Asia/Kolkata', label: '🇮🇳 Mumbai (GMT+5:30)' },
  { value: 'Asia/Dubai', label: '🇦🇪 Dubai (GMT+4)' },
  { value: 'Asia/Riyadh', label: '🇸🇦 Riyadh (GMT+3)' },
  { value: 'Asia/Tehran', label: '🇮🇷 Tehran (GMT+3:30/+4:30)' },
  { value: 'Asia/Karachi', label: '🇵🇰 Karachi (GMT+5)' },
  { value: 'Asia/Dhaka', label: '🇧🇩 Dhaka (GMT+6)' },
  { value: 'Australia/Sydney', label: '🇦🇺 Sydney (GMT+10/+11)' },
  { value: 'Australia/Melbourne', label: '🇦🇺 Melbourne (GMT+10/+11)' },
  { value: 'Australia/Perth', label: '🇦🇺 Perth (GMT+8)' },
  { value: 'Pacific/Auckland', label: '🇳🇿 Auckland (GMT+12/+13)' },
];

interface TimezoneSelectorProps {
  value: string;
  onChange: (timezone: string) => void;
}

export function TimezoneSelector({ value, onChange }: TimezoneSelectorProps) {

  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
    >
      {TIMEZONES.map(tz => (
        <option key={tz.value} value={tz.value}>
          {tz.label}
        </option>
      ))}
    </select>
  );
}
