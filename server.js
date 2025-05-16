// server.js
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';

const app = express();

// Port from environment or 3000
const port = parseInt(process.env.PORT, 10) || 3000;

// Fail fast if no API key
if (!process.env.OPENAI_API_KEY) {
  console.error('❌ Missing OPENAI_API_KEY');
  process.exit(1);
}

// Middleware
app.use(cors());
app.use(express.json());

// Log every request
app.use((req, res, next) => {
  console.log(`➡️ ${req.method} ${req.path}`);
  next();
});

// Root for uptime checks
app.get('/', (_req, res) => {
  res.status(200).send('Harris Home Value API is running');
});

// Health endpoint
app.get('/health', (_req, res) => {
  res.status(200).send('OK');
});

// Estimate endpoint
app.post('/api/estimate', async (req, res) => {
  const { address, fsa, propertyType, bedrooms, bathrooms, squareFootage } = req.body || {};
  const missing = ['address','fsa','propertyType','bedrooms','bathrooms']
    .filter(f => !req.body?.[f]);

  if (missing.length) {
    console.warn('❗ Missing fields:', missing);
    return res.status(400).json({ error: `Missing fields: ${missing.join(', ')}` });
  }

  // Simple prompt to verify functionality
  const prompt = `Return a JSON object with a "value" key estimating the value of ${address} in postal area ${fsa}.`;

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.0,
    });

    let text = completion.choices[0].message.content.trim()
      .replace(/^```json\s*/, '').replace(/\s*```$/, '');

    console.log('🤖 AI raw:', text);
    const result = JSON.parse(text);
    return res.json(result);

  } catch (err) {
    console.error('💥 Estimation error:', err);
    return res.status(500).json({ error: 'Estimation failed' });
  }
});

// Start server
app.listen(port, () => {
  console.log(`🚀 API listening on port ${port}`);
});
