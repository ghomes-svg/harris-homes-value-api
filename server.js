// server.js
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';

const app = express();
const port = parseInt(process.env.PORT, 10) || 3000;

if (!process.env.OPENAI_API_KEY) {
  console.error('❌ Missing OPENAI_API_KEY');
  process.exit(1);
}

app.use(cors());
app.use(express.json());

// Log incoming requests
app.use((req, res, next) => {
  console.log(`➡️ ${req.method} ${req.path}`);
  next();
});

app.get('/', (_req, res) => res.send('Harris Home Value API is running'));
app.get('/health', (_req, res) => res.send('OK'));

app.post('/api/estimate', async (req, res) => {
  const { address, fsa, propertyType, bedrooms, bathrooms, squareFootage } = req.body || {};
  const missing = ['address','fsa','propertyType','bedrooms','bathrooms']
    .filter(f => !req.body?.[f]);

  if (missing.length) {
    return res.status(400).json({ error: `Missing fields: ${missing.join(', ')}` });
  }

  // Prompt only asks for lowEnd/highEnd and narrative
  const system = `
You are an expert Greater Toronto Area real estate agent. Respond with STRICT JSON only, no apologies or extra text.
`;
  const user = `
A website visitor is using your home valuation tool and is requesting an instant valuation. They provided:
• Address: ${address}
• Postal area (FSA): ${fsa}
• Type: ${propertyType}
• Beds/Baths: ${bedrooms}/${bathrooms}
• Size: ${squareFootage} ft²

Using official data (last 60 days) using average home price specific to the ${fsa},
return JSON exactly:
{
  "lowEnd": number,
  "highEnd": number,
  "estimateHtml": string
}
The narrative in estimateHtml should explain how you arrived at the range.
`.trim();

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: system.trim() },
        { role: 'user',   content: user }
      ],
      temperature: 0.0,
    });

    // Clean and parse
    let text = completion.choices[0].message.content
      .trim()
      .replace(/^```json\s*/, '')
      .replace(/\s*```$/, '');
    console.log('🤖 AI raw:', text);

    let { lowEnd, highEnd, estimateHtml } = JSON.parse(text);

    // Ensure numeric
    lowEnd  = Number(lowEnd);
    highEnd = Number(highEnd);

    // Compute midpoint & precise savings
    const midpoint = (lowEnd + highEnd) / 2;
    const savings = Math.round(midpoint * (0.05 - 0.0399));  // 1.01% difference

    // Append savings line and CTA
    const savingsHtml = `
      <p><strong>Commission savings:</strong> By choosing our 3.99% Essential Support,
      you’d save approximately <strong>$${savings.toLocaleString()}</strong>
      compared to a 5% commission on a midpoint value of $${Math.round(midpoint).toLocaleString()}.</p>
    `;
    estimateHtml += savingsHtml;

    return res.json({ lowEnd, highEnd, savings, estimateHtml });

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

app.listen(port, () => {
  console.log(`🚀 API listening on port ${port}`);
});
