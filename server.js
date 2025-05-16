// server.js
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';

const app = express();
const port = parseInt(process.env.PORT, 10) || 3000;

// Fail fast if no API key
if (!process.env.OPENAI_API_KEY) {
  console.error('❌ Missing OPENAI_API_KEY');
  process.exit(1);
}

app.use(cors());
app.use(express.json());

// Log requests
app.use((req, res, next) => {
  console.log(`➡️ ${req.method} ${req.path}`);
  next();
});

app.get('/', (_req, res) => res.status(200).send('Harris Home Value API is running'));
app.get('/health', (_req, res) => res.status(200).send('OK'));

app.post('/api/estimate', async (req, res) => {
  const { address, fsa, propertyType, bedrooms, bathrooms, squareFootage } = req.body || {};
  const missing = ['address','fsa','propertyType','bedrooms','bathrooms']
    .filter(f => !req.body?.[f]);

  if (missing.length) {
    return res.status(400).json({ error: `Missing fields: ${missing.join(', ')}` });
  }

  // Strong system instruction to return only JSON
  const system = `
You are an expert Canadian real estate agent. When asked, you MUST respond with STRICT JSON only.
Never include any apologies, disclaimers, or extra text.
`;
  const user = `
Client wants a quick market valuation. They provided:
• Address: ${address}
• Postal area (FSA): ${fsa}
• Home type: ${propertyType}
• Bedrooms/Bathrooms: ${bedrooms}/${bathrooms}
• Size: ${squareFootage} ft²

Using only up‐to‐date official data (home price index, CREA home value stats, land registry) from the last 60 days,
1. Lookup micro home values for the specific postal area (FSA): ${fsa}
2. Adjust for Home type: ${propertyType} and Size: ${squareFootage} ft² and Bedrooms/Bathrooms: ${bedrooms}/${bathrooms}
2. Return an estimated midpoint market value in CAD.
3. Calculate the delta between a "typical" 5% and "Harris Homes Essential Support" 3.99% commission, and a CTA for the commission savings.
4. Provide a short HTML‐formatted narrative with your findings.

Return JSON in this exact shape:
{
  "lowEnd": number,
  "highEnd": number,
  "savings": number,
  "estimateHtml": string
}
`;

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system.trim() },
        { role: 'user',   content: user.trim() }
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
      // Return a safe fallback
      return res.json({
        lowEnd: null,
        highEnd: null,
        savings: null,
        estimateHtml: '<p>Sorry, we couldn’t get a valuation at this time.</p>'
      });
    }

    return res.json(result);

  } catch (err) {
    console.error('💥 Estimation error:', err);
    return res.json({
      lowEnd: null,
      highEnd: null,
      savings: null,
      estimateHtml: '<p>Sorry, we couldn’t get a valuation at this time.</p>'
    });
  }
});

app.listen(port, () => console.log(`🚀 API listening on port ${port}`));
