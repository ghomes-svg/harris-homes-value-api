// server.js
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';

const app = express();
const port = parseInt(process.env.PORT, 10) || 3000;

// Ensure we have a key
if (!process.env.OPENAI_API_KEY) {
  console.error('❌ Missing OPENAI_API_KEY');
  process.exit(1);
}

app.use(cors());
app.use(express.json());

// Log incoming requests
app.use((req, res, next) => {
  console.log(`➡️ ${req.method} ${req.path} — body:`, req.body);
  next();
});

app.get('/', (_req, res) => res.status(200).send('Harris Home Value API is running'));
app.get('/health', (_req, res) => res.status(200).send('OK'));

app.post('/api/estimate', async (req, res) => {
  const { address, fsa } = req.body || {};
  const missing = ['address','fsa'].filter(f => !req.body?.[f]);
  if (missing.length) {
    return res.status(400).json({ error: `Missing fields: ${missing.join(', ')}` });
  }

  const prompt = `Return a JSON object with a single "value" key estimating in CAD the current market value of ${address} (postal area ${fsa}).`;

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.0,
    });

    let text = completion.choices[0].message.content.trim()
      .replace(/^```json\s*/, '').replace(/\s*```$/, '');

    console.log('🤖 AI raw response:', text);
    const { value } = JSON.parse(text);

    // Build an HTML snippet for the front end
    const formatted = Number(value).toLocaleString('en-CA');
    const estimateHtml = `<p>Your home is estimated at <strong>$${formatted}</strong> based on current market data.</p>`;

    return res.json({ value, estimateHtml });

  } catch (err) {
    console.error('💥 Estimation error:', err);
    return res.status(500).json({ error: 'Estimation failed' });
  }
});

app.listen(port, () => {
  console.log(`🚀 API listening on port ${port}`);
});
