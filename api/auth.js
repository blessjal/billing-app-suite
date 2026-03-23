module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { email, password, action } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  // Phase 2: Supabase full auth (when configured)
  if (supabaseUrl && supabaseKey) {
    try {
      const endpoint = action === 'signup'
        ? supabaseUrl + '/auth/v1/signup'
        : supabaseUrl + '/auth/v1/token?grant_type=password';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': supabaseKey },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.error || data.error_description) {
        return res.status(401).json({ error: data.error_description || data.msg || data.error || 'Authentication failed' });
      }

      if (action === 'signup' && !data.access_token) {
        return res.status(200).json({
          token: 'pending',
          user: { email },
          message: 'Account created! Check your email to confirm, then sign in.'
        });
      }

      return res.status(200).json({ token: data.access_token, user: data.user });
    } catch (error) {
      return res.status(500).json({ error: 'Auth service error: ' + error.message });
    }
  }

  // Phase 1: Access code mode
  const accessCode = process.env.ACCESS_CODE || '';

  if (!accessCode) {
    return res.status(500).json({
      error: 'App not configured. Ask your administrator to set ACCESS_CODE in Vercel environment variables.'
    });
  }

  if (password === accessCode) {
    return res.status(200).json({
      token: Buffer.from(email + ':' + accessCode).toString('base64'),
      user: { email }
    });
  }

  return res.status(401).json({ error: 'Incorrect password. Please use the access code provided by your administrator.' });
};
