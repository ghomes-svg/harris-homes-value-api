// server.js
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';

// 1. Create app
const app = express();
app.use(cors());
app.use(express.json());

// 2. Health check
app.get('/health', (_req, res) => res.send('OK'));

// 3. Estimate endpoint
app.post('/api/estimate', async (req, res) => {
  console.log('🟢 /api/estimate hit', req.body);

  const data = req.body || {};
  const prompt = `
You’re Geoff Harris from Harris Homes & Co. A client entered:
• Address: ${data.address}
• Type: ${data.propertyType}
• Beds/Baths: ${data.bedrooms}/${data.bathrooms}
• Kitchen: ${data.kitchenCondition}, Bathroom: ${data.bathroomCondition}
• Upgrades: ${data.upgrades.join(', ') || 'None'}
• Size: ${data.squareFootage} ft²

Using recent sales in Whitby and Durham Region, provide:
1. A low-end estimate and a high-end estimate in CAD.
2. A concise, first-person paragraph explaining how you arrived at that range.

Return strict JSON with keys 'lowEnd', 'highEnd', and 'estimateHtml'.
`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    });

    const aiText = completion.choices[0].message.content.trim();
    console.log('🤖 AI response:', aiText);

    const payload = JSON.parse(aiText);
    return res.json(payload);
  } catch (err) {
    console.error('❌ /api/estimate error', err);
    return res.status(500).send('AI error or invalid JSON');
  }
});

// 4. Listen on the correct port
const port = parseInt(process.env.PORT, 10) || 3000;
app.listen(port, () => {
  console.log(`🚀 Server listening on port ${port}`);
});
