import express from 'express';
import cors from 'cors';           // ← new
import OpenAI from 'openai';

const app = express();
app.use(cors());                  // ← allow all origins
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.post('/api/estimate', async (req, res) => {
  console.log('🟢 /api/estimate hit with:', req.body);  // debug
  const data = req.body || {};

  const prompt = `
You’re Geoff Harris from Harris Homes & Co. A client entered:
…
Return strict JSON with keys 'lowEnd', 'highEnd', and 'estimateHtml'.
`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7
    });

    const aiText = completion.choices[0].message.content.trim();
    console.log('🤖 AI replied:', aiText);           // debug

    const payload = JSON.parse(aiText);
    return res.json(payload);
  } catch (err) {
    console.error('❌ Error in /api/estimate:', err);
    return res.status(500).send('AI error or invalid JSON');
  }
});

// health, listen, etc
