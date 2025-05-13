// server.js
import express from 'express';
import OpenAI from 'openai';

// Initialize Express
const app = express();

// --- MANUAL CORS MIDDLEWARE ---
app.use((req, res, next) => {
  // 1. Allow your front-end origin (for testing you can use '*')
  res.header('Access-Control-Allow-Origin', 'https://www.harris-homes.ca');
  // 2. Allow these headers in requests
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  // 3. Allow these HTTP methods
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  // 4. Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Parse JSON bodies
app.use(express.json());

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
    // Initialize OpenAI client
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Call ChatGPT
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    });

    const aiText = completion.choices[0].message.content.trim();
    console.log('🤖 AI response:', aiText);

    // Parse and return JSON
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
