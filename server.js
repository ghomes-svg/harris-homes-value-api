// server.js
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';

const app = express();
app.use(cors());
app.options('*', cors());
app.use(express.json());

app.get('/', (_req, res) => res.send('Harris Home Value API is running'));
app.get('/health', (_req, res) => res.send('OK'));

app.post('/api/estimate', async (req, res) => {
  console.log('🟢 /api/estimate hit', req.body);

  const {
    address, city, province, postalCode, latitude, longitude,
    propertyType, bedrooms, bathrooms,
    kitchenCondition, bathroomCondition, upgrades, squareFootage
  } = req.body;

  // Forward sortation area
  const fsa = postalCode?.slice(0, 3) || '';

  // Build the prompt
  const prompt = `
You’re Geoff Harris from Harris Homes & Co. A client entered:
• Full address: ${address}
• City/Prov: ${city}, ${province}
• FSA (Postal Area): ${fsa}
• Coordinates: ${latitude}, ${longitude}
• Property Type: ${propertyType}
• Bedrooms/Bathrooms: ${bedrooms}/${bathrooms}
• Kitchen Condition: ${kitchenCondition}
• Bathroom Condition: ${bathroomCondition}
• Upgrades: ${upgrades.join(', ') || 'None'}
• Size: ${squareFootage} ft²

Using aggregated official market data (MLS, realtor.ca, housesigma.ca, CLAR, CREA, provincial land-registry) for postal area ${fsa}, and only sales in the last 60 days:
1. Estimate a low-end and high-end selling price range in CAD (numbers only).
2. Provide a concise, first-person narrative explaining your methodology:
   - Reference average $/ft² in the neighbourhood.
   - Note recent market velocity and days-on-market.
   - Adjust for condition and upgrades.
3. Calculate the savings a seller would realize by using Harris Homes’ 3.99% commission instead of a typical 5%, based on the midpoint of your estimated range.

**Do not** list individual addresses or raw comparable sales. Return strict JSON with keys:
- lowEnd (number)
- highEnd (number)
- savings (number)
- estimateHtml (string of HTML summarizing range, narrative, and savings)
`;

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    });

    let aiText = completion.choices[0].message.content.trim();
    console.log('🤖 AI raw response:', aiText);

    // Strip any markdown fences
    aiText = aiText.replace(/^```\w*\n?|```$/g, '').trim();

    let payload;
    try {
      payload = JSON.parse(aiText);
    } catch (parseErr) {
      console.error('❌ JSON parse error:', parseErr);
      return res.status(200).json({ error: 'AI response format error' });
    }

    return res.json(payload);
  } catch (err) {
    console.error('❌ /api/estimate error', err);
    return res.status(200).json({ error: 'AI error or invalid JSON' });
  }
});

const port = parseInt(process.env.PORT, 10) || 3000;
app.listen(port, () => console.log(`🚀 Server listening on port ${port}`));
