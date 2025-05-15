// server.js
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';


// Ensure required env vars
if (!process.env.OPENAI_API_KEY) {
  console.error('Missing OPENAI_API_KEY');
  process.exit(1);
}

const app = express();
const port = parseInt(process.env.PORT, 10) || 3000;

// Instantiate OpenAI client once
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Security and performance middleware
app.use(cors());
app.use(express.json({ limit: '10kb' }));

// Root endpoint (uptime checks)
app.get('/', (_req, res) => {
  res.status(200).send('Harris Home Value API is running');
});

// Health-check endpoint
app.get('/health', (_req, res) => res.status(200).send('OK'));

// Helper: validate required fields
const validateBody = (body) => {
  const required = ['address','fsa','propertyType','bedrooms','bathrooms'];
  const missing = required.filter(field => body[field] == null);
  return missing;
};

// AI-powered estimate endpoint
app.post('/api/estimate', async (req, res) => {
  const missing = validateBody(req.body);
  if (missing.length) {
    return res.status(400).json({ error: `Missing fields: ${missing.join(', ')}` });
  }

  const { address, fsa, propertyType, bedrooms, bathrooms, squareFootage } = req.body;

  const prompt = `
Client Details
• Address: ${address}
• Postal (FSA): ${fsa}
• Type: ${propertyType}
• Beds/Baths: ${bedrooms} / ${bathrooms}
${squareFootage ? `• Square Footage: ${squareFootage}

` : ''}
Please deliver a ≤100-word report that includes:
1. **Market-Value Range (CAD)**
   - **Low-High:** "$X – $Y" based on the latest public & MLS comps
   - **Midpoint:** "$Z"
2. **Key Pricing Insight**
   - One sentence on average sales and amenities in ${fsa} (premium/discount if any)
3. **Commission Advantage**
   - Calculate (midpoint × 5%) – (midpoint × 3.99%) to show the exact dollar savings
4. **Call to Action**
   - One short line prompting next steps (e.g. "Let’s book your free detailed review.")
Return strict JSON with keys:
{
  "lowEnd": number,
  "highEnd": number,
  "savings": number,
  "estimateHtml": string
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    });

    let text = response.choices[0].message.content.trim();
    // Strip markdown fences if present
    text = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');

    const result = JSON.parse(text);
    return res.json(result);
  } catch (err) {
    console.error('Estimation error:', err);
    return res.status(500).json({ error: 'Estimation failed' });
  }
});

app.listen(port, () => {
  console.log(`🚀 API listening on port ${port}`);
});
