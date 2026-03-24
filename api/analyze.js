module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Server not configured — ANTHROPIC_API_KEY missing' });

  // Auth check — supports both Phase 1 (access code) and Phase 2 (Supabase)
  const accessCode = process.env.ACCESS_CODE;
  const supabaseConfigured = !!process.env.SUPABASE_URL;
  const authHeader = req.headers['authorization'] || '';
  const userToken = authHeader.replace('Bearer ', '').trim();

  // Only enforce auth if ACCESS_CODE or Supabase is configured
  if (accessCode && !supabaseConfigured) {
    // Phase 1: token must equal the access code
    if (userToken !== accessCode) {
      return res.status(401).json({ error: 'Invalid access code' });
    }
  } else if (supabaseConfigured) {
    // Phase 2: just require a token to be present
    if (!userToken) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
  }
  // If neither is set, allow through (useful for testing)

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
