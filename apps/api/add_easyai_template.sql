-- EasyAI Market Integration Template
INSERT INTO templates (code, name, is_active, method, url, headers, body, created_at, updated_at)
VALUES (
  'EASYAI_MARKET',
  '🤖 EasyAI Market',
  true,
  'POST',
  'https://api.easyaimarket.com/api/affiliate/leads',
  '{
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NmQwNWEzMDU4ODE2YzI4MDhjMDgwYyIsImlhdCI6MTc1MTk3NTM3NSwiZXhwIjozNTM1NDg2NzUwfQ.x5QmK_CZOorGcBWd42_CwsbqtXJMz3R3mgaJ97a6rfk",
    "Content-Type": "application/json"
  }',
  '{
    "firstName": "${firstName}",
    "lastName": "${lastName}",
    "email": "${email}",
    "phone": "${phone}",
    "country": "${country}",
    "password": "${password}",
    "ip": "${ip}",
    "funnel": "${funnel}",
    "aff": "${aff}"
  }',
  NOW(),
  NOW()
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  url = EXCLUDED.url,
  headers = EXCLUDED.headers,
  body = EXCLUDED.body,
  updated_at = NOW();

