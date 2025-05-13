import OpenAI from 'openai';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function handler(req, res) {
  const data = req.method === 'POST' ? req.body : {};
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
Return a JSON object like:
{
  "lowEnd": "$980,000",
  "highEnd": "$1,080,000",
  "estimateHtml": "<p>My estimate for 1852 Manning Rd ...</p>"
}
`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7
  });

  let payload;
  try {
    payload = JSON.parse(completion.choices[0].message.content);
  } catch {
    return res.status(500).send('AI response parse error');
  }

  res.json(payload);
}
