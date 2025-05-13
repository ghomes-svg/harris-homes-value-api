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

  const fsa = postalCode?.slice(0,3) || '';

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

Using aggregated official data (MLS, realtor.ca, housesigma.ca, CLAR reports, CREA reports, land-registry stats) for postal area ${fsa}, and only values in the last 60 days, estimate:
1. Low-end and high-end price range (numbers only, CAD).
1a. Factor in most recent comps, however if needed expand search criteria where appropriate.
2. A very brief service oriented narrative explaining the methodology—highlight average $/ft², recent neighbourhood trends, and condition/upgrades.
3. Approximately the amount they will save selling with Harris Homes

**Do not** list individual addresses or raw comps. Return strict JSON with keys:
- lowEnd (number)
- highEnd (number)
- estimateHtml (HTML string)
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
