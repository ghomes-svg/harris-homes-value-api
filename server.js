// server.js
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';

// Initialize Express
const app = express();

// Enable CORS for all origins and methods
app.use(cors());
app.options('*', cors());

// Parse JSON bodies
app.use(express.json());

// Root endpoint (for uptime monitors)
app.get('/', (_req, res) => res.send('Harris Home Value API is running'));

// Health-check endpoint
app.get('/health', (_req, res) => res.send('OK'));

// AI-powered estimate endpoint
app.post('/api/estimate', async (req, res) => {
  console.log('🟢 /api/estimate hit', req.body);

  const data = req.body;
  // Extract city from address (assumes format 'street, city, province, country')
  const city = data.address.split(',')[1]?.trim() || data.address;

  const prompt = `
You’re Geoff Harris from Harris Homes & Co. A client entered:
• Address: ${data.address}
• City: ${city}
• Property Type: ${data.propertyType}
• Bedrooms/Bathrooms: ${data.bedrooms}/${data.bathrooms}
• Kitchen Condition: ${data.kitchenCondition}
• Bathroom Condition: ${data.bathroomCondition}
• Upgrades: ${data.upgrades.join(', ') || 'None'}
• Size: ${data.squareFootage} ft²

Based on **aggregated, reliable sources** (MLS summaries, CREA market reports, provincial land‐registry statistics) for ${city}, and **only** considering sales **within the last 30–60 days**, estimate:
1. A low‐end and high‐end selling price range in CAD.
2. A concise, first‐person paragraph explaining your methodology—referencing average sales trends, price per square foot in the neighbourhood, and adjustments for condition/upgrades.

**Do not** list individual comparable addresses or raw sale prices. Return **strict JSON** with:
- **lowEnd**: (number)
- **highEnd**: (number)
- **estimateHtml**: (string of HTML with your narrative)
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

    // Remove any Markdown fences
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

// Start the server
const port = parseInt(process.env.PORT, 10) || 3000;
app.listen(port, () => console.log(`🚀 Server listening on port ${port}`));
