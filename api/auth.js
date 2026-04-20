module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { email, password, action } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    const accessCode = process.env.ACCESS_CODE;

    // ── Phase 1: Access Code Mode ──
    if (!supabaseUrl) {
      if (!accessCode) {
        // No auth configured — allow any login for dev/testing
        return res.status(200).json({
          token: 'dev-token',
          user: { email },
          mode: 'dev'
        });
      }

      // For both login AND signup in access-code mode:
      // The password must equal the access code
      if (password === accessCode) {
        return res.status(200).json({
          token: accessCode,
          user: { email },
          mode: 'access-code'
        });
      }

      return res.status(401).json({
        error: 'Incorrect access code. Contact your administrator for the access code.'
      });
    }

    // ── Phase 2: Supabase Email/Password Auth ──
    const endpoint = action === 'signup'
      ? `${supabaseUrl}/auth/v1/signup`
      : `${supabaseUrl}/auth/v1/token?grant_type=password`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (data.error || data.error_description || data.msg) {
      return res.status(401).json({
        error: data.error_description || data.msg || data.error || 'Authentication failed'
      });
    }

    return res.status(200).json({
      token: data.access_token,
      user: data.user,
      mode: 'supabase'
    });

  } catch (error) {
    console.error('Auth error:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
};
