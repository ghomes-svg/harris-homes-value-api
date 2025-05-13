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

Using the latest MLS and public sales data specifically for ${city}—down to the neighbourhood or block level—identify the three most comparable properties sold in the past 30 days. Adjust for differences in home size, condition, and upgrades. Then provide:
1. A low-end and high-end estimate in CAD based on those hyper-local comparables.
2. A concise, first-person narrative explaining your analysis, including which exact addresses you selected and how you adjusted values.

Return strict JSON with numeric values for lowEnd and highEnd, and an HTML-formatted estimateHtml containing your narrative.
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

    // Strip Markdown code fences if present
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
