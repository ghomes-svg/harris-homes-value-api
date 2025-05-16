// server.js
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';

const app = express();
const port = parseInt(process.env.PORT, 10) || 3000;

// Abort if no API key
if (!process.env.OPENAI_API_KEY) {
  console.error('❌ Missing OPENAI_API_KEY');
  process.exit(1);
}

app.use(cors());
app.use(express.json());

// Log each request
app.use((req, res, next) => {
  console.log(`➡️ ${req.method} ${req.path}`);
  next();
});

// Uptime endpoints
app.get('/', (_req, res) => res.status(200).send('Harris Home Value API is running'));
app.get('/health', (_req, res) => res.status(200).send('OK'));

// Main estimate endpoint
app.post('/api/estimate', async (req, res) => {
  const { address, fsa, propertyType, bedrooms, bathrooms, squareFootage } = req.body || {};
  const missing = ['address','fsa','propertyType','bedrooms','bathrooms']
    .filter(f => !req.body?.[f]);

  if (missing.length) {
    return res.status(400).json({ error: `Missing fields: ${missing.join(', ')}` });
  }

  // System + user messages to enforce JSON-only
  const system = `
You are an expert Canadian real estate agent. When asked, you MUST respond with STRICT JSON only.
Never include apologies, disclaimers, or any extra text.
`;

  const user = `
A potential home seller wants a quick market valuation. They provided:
• Address: ${address}
• Postal area (FSA): ${fsa}
• Home type: ${propertyType}
• Bedrooms/Bathrooms: ${bedrooms}/${bathrooms}
• Size: ${squareFootage} ft²

Using only up-to-date official data from the last 60 days,
1. Lookup home values for ${address} in postal area ${fsa}.
2. Adjust for home type "${propertyType}", size ${squareFootage} ft², and ${bedrooms}/${bathrooms}.
3. Return a low-end and high-end market value in CAD.
4. Calculate commission savings difference between 5% and 3.99% on the midpoint.
5. Provide a short HTML-formatted narrative with those findings and a CTA.

Return JSON in exactly this shape:
{
  "lowEnd": number,
  "highEnd": number,
  "savings": number,
  "estimateHtml": string
}
`.trim();

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system.trim() },
        { role: 'user',   content: user }
      ],
      temperature: 0.0,
    });

    let text = completion.choices[0].message.content.trim()
      .replace(/^```json\s*/, '')
      .replace(/\s*```$/, '');

    console.log('🤖 AI raw:', text);

    let result;
    try {
      result = JSON.parse(text);
    } catch (parseErr) {
      console.error('❌ JSON parse error:', parseErr);
      // Fallback JSON
      return res.json({
        lowEnd: null,
        highEnd: null,
        savings: null,
        estimateHtml: '<p>Sorry, we couldn’t generate a valuation right now.</p>'
      });
    }

    return res.json(result);

  } catch (err) {
    console.error('💥 Estimation error:', err);
    return res.json({
      lowEnd: null,
      highEnd: null,
      savings: null,
      estimateHtml: '<p>Sorry, we couldn’t generate a valuation right now.</p>'
    });
  }
});

// Start listening
app.listen(port, () => {
  console.log(`🚀 API listening on port ${port}`);
});
