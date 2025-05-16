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
A potential home seller wants a quick market valuation. They provided:
• Address: ${address}
• Postal area (FSA): ${fsa}
• Home type: ${propertyType}
• Bedrooms/Bathrooms: ${bedrooms}/${bathrooms}
• Size: ${squareFootage} ft²

Using only up‐to‐date official data from the last 60 days,
1. Lookup home values for the specific ${address} and drill down on specific postal area (FSA): ${fsa}
2. Using your knowledge of the price differences, adjust for Home type: ${propertyType} and Size: ${squareFootage} ft² and Bedrooms/Bathrooms: ${bedrooms}/${bathrooms}
2. Return an estimated midpoint market value in CAD.
3. Calculate the delta between a "typical" 5% and "Harris Homes Essential Support" 3.99% commission based on the midpoint market value, and include a CTA for the potential commission savings.
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
