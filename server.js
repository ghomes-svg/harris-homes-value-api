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
app.get('/', (_req, res) => {
  res.send('Harris Home Value API is running');
});

// Health-check endpoint
app.get('/health', (_req, res) => {
  res.send('OK');
});

// AI-powered estimate endpoint
app.post('/api/estimate', async (req, res) => {
  console.log('🟢 /api/estimate hit', req.body);

  const data = req.body;
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
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    });

    const aiText = completion.choices[0].message.content.trim();
    console.log('🤖 AI response:', aiText);

    let payload;
    try {
      payload = JSON.parse(aiText);
    } catch(parseErr) {
      console.error('❌ JSON parse error:', parseErr);
      // Return error JSON so client can handle
      return res.status(200).json({ error: 'AI response format error' });
    }

    return res.json(payload);

  } catch (err) {
    console.error('❌ /api/estimate error', err);
    // Return JSON error
    return res.status(200).json({ error: 'AI error or invalid JSON' });
  }
});
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    });

    const aiText = completion.choices[0].message.content.trim();
    console.log('🤖 AI response:', aiText);

    const payload = JSON.parse(aiText);
    res.json(payload);

  } catch (err) {
    console.error('❌ /api/estimate error', err);
    res.status(500).send('AI error or invalid JSON');
  }
});

// Start the server
const port = parseInt(process.env.PORT, 10) || 3000;
app.listen(port, () => {
  console.log(`🚀 Server listening on port ${port}`);
});
