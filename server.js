// server.js
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';

const app = express();

// Enable CORS for all routes
app.use(cors());
// Parse JSON bodies
app.use(express.json());

// Root endpoint (for uptime monitors)
app.get('/', (_req, res) => res.status(200).send('Harris Home Value API is running'));

// Health-check endpoint
app.get('/health', (_req, res) => res.status(200).send('OK'));

// AI-powered estimate endpoint
app.post('/api/estimate', async (req, res) => {
  const {
    address, fsa, propertyType, bedrooms, bathrooms,
    kitchen, bathroom, squareFootage
  } = req.body;

  const prompt = `
A potential real estate seller client wants an instant market value estimate. They provided:
• Address: ${address}
• FSA (postal): ${fsa}
• Type: ${propertyType}
• Beds/Baths: ${bedrooms}/${bathrooms}

1. Identify a low‐end and high‐end market value in CAD. 
2. Provide a summary that quotes the average sale price in ${fsa} and any neighbourhood premium, and explains how you combined those to derive the \$X–\$Y range (with a midpoint). 
3. Calculate how much they can save using Harris Homes 3.99% Essential Support commission instead of a typical 5%.

Return strict JSON with keys:
{
  "lowEnd": number,
  "highEnd": number,
  "savings": number,
  "estimateHtml": "<p>…your formatted narrative…</p><ul><li>Source A</li><li>Source B</li></ul>"
}
`;

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const resp = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    });

    let content = resp.choices[0].message.content.trim()
      .replace(/^```json/, '')
      .replace(/```$/, '');

    const result = JSON.parse(content);
    return res.json(result);

  } catch (err) {
    console.error('Estimation error:', err);
    return res.status(500).json({ error: 'Estimation failed' });
  }
});

// Start server on Render’s provided port (or 3000 locally)
const port = parseInt(process.env.PORT, 10) || 3000;
app.listen(port, () => {
  console.log(`🚀 API listening on port ${port}`);
});
