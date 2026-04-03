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

  const prompt = `You are a bookseller writing a short shelftalker card for customers browsing in a bookstore. Write 1-3 sentences with a max of 260 characters, including spaces. 
  Rules:
  -Use ONLY the description below
  -Do Not invent anything. Do not make up characters, plot points or genres.
  -Be specific and natural, not generic
  -Avoid stock phrases like "a thrilling tale", "explores themes" or "readers will be captivated" and other cliched phrases.
  -Make it feel like a real human recommendation.
  
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
        temperature: 0.5
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
