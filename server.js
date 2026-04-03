import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

app.post('/api/summary', async (req, res) => {
  const { title, author, description } = req.body;

  const prompt = `Write a short bookstore shelftalker in under 260 characters, including spaces, for a bookstore display card. Do not include the title '${title}' or the author '${author}' in the summary. The tone should be natural, specific and appealing, not robotic or overly dramatic. Use only the description below. Do not invent plot details, themes, or characters.
  Title: ${title}
  Author: ${author}
  Description: ${description}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7
      })
    });

    const data = await response.json();
    res.json({ summary: data.choices[0].message.content.trim() });
  } catch (err) {
    res.status(500).json({ error: 'Something went wrong!' });
  }
});

app.listen(port, () => {
  console.log(`🤖 Summary Robot is online at http://localhost:${port}`);
});
