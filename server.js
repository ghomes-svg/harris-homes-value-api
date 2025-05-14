import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/estimate', async (req, res) => {
  const {
    address, fsa, propertyType, bedrooms, bathrooms,
    kitchen, bathroom, squareFootage
  } = req.body;

  const prompt = `
A client wants an instant market value estimate. They provided:
• Address: ${address}
• FSA (postal): ${fsa}
• Type: ${propertyType}
• Beds/Baths: ${bedrooms}/${bathrooms}
• Kitchen condition: ${kitchen}
• Bathroom condition: ${bathroom}
• Size: ${squareFootage} ft²

Using only reputable, up‐to‐date sources (MLS summaries, CREA, TRREB, CLAR, land‐registry, Realty stats, neighbourhood averages) and sales in the last 60 days:
1. Give a low‐end and high‐end market value in CAD (numbers only).
2. Provide a brief, first‐person narrative that:
   - Quotes ${fsa} average sale price and neighbourhood premium.
   - Explains how you combined those to derive the \$X–\$Y range (with a midpoint).
3. **List your sources** at the end.

Return a JSON with:
{
  "lowEnd": number,
  "highEnd": number,
  "estimateHtml": "<p>…your formatted narrative…</p><ul><li>Dan Plowman Realty</li><li>Zolo</li></ul>"
}
`;

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const resp = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7
    });

    let content = resp.choices[0].message.content.trim()
      .replace(/^```json/, '')
      .replace(/```$/, '');

    const result = JSON.parse(content);
    return res.json(result);

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Estimation failed' });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log('API listening');
});
