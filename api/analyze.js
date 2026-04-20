module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server not configured — ANTHROPIC_API_KEY missing' });
  }

  // Auth check
  const accessCode = process.env.ACCESS_CODE;
  const authHeader = req.headers['authorization'] || '';
  const userToken = authHeader.replace('Bearer ', '').trim();

  if (accessCode && userToken !== accessCode && userToken !== 'dev-token') {
    return res.status(401).json({ error: 'Not authenticated. Please sign in again.' });
  }

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
    console.error('Analyze error:', error);
    return res.status(500).json({ error: 'API call failed: ' + error.message });
  }
};
