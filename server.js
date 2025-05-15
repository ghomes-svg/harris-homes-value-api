// server.js
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';

const app = express();
const port = parseInt(process.env.PORT, 10) || 3000;

if (!process.env.OPENAI_API_KEY) {
  console.error('Missing OPENAI_API_KEY');
  process.exit(1);
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '10kb' }));

// Root endpoint (for uptime monitors)
app.get('/', (_req, res) => res.status(200).send('Harris Home Value API is running'));

// Health-check endpoint
app.get('/health', (_req, res) => res.status(200).send('OK'));

// Helper: validate required fields
const validateBody = (body) => {
  const required = ['address','fsa','propertyType','bedrooms','bathrooms'];
  return required.filter(field => body[field] == null);
};

// AI-powered estimate endpoint
app.post('/api/estimate', async (req, res) => {
  const missing = validateBody(req.body);
  if (missing.length) {
    return res.status(400).json({ error: `Missing fields: ${missing.join(', ')}` });
  }

  const { address, fsa, propertyType, bedrooms, bathrooms, squareFootage } = req.body;

  // Assemble prompt without backticks inside
  const prompt = `Client Details
   You are a real estate professional, what is the value of address: ${address} 
    
    Return only the JSON object.`;

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    });

    let text = response.choices[0].message.content.trim();
    // Remove fencing
    text = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    const result = JSON.parse(text);
    return res.json(result);
  } catch (err) {
    console.error('Estimation error:', err);
    return res.status(500).json({ error: 'Estimation failed' });
  }
});

app.listen(port, () => console.log(`🚀 API listening on port ${port}`));
