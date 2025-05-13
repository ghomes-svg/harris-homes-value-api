// server.js
import express from 'express';
import OpenAI from 'openai';

const app = express();
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.post('/api/estimate', async (req, res) => {
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

Return **strict JSON** with keys `lowEnd`, `highEnd`, and `estimateHtml`:
{
  "lowEnd": "$980,000",
  "highEnd": "$1,080,000",
  "estimateHtml": "<p>My estimate for …</p>"
}
`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7
    });

    const aiText = completion.choices[0].message.content.trim();
    const payload = JSON.parse(aiText);

    return res.json(payload);
  } catch (err) {
    console.error(err);
    return res.status(500).send('❌ AI error or invalid JSON');
  }
});

// Health check
app.get('/health', (_req, res) => res.send('OK'));

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 Listening on port ${port}`);
});
