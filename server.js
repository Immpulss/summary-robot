import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { validateInput, validSummary, messagesFor } from './summary.js';
dotenv.config();

export function createApp({ fetcher = fetch, apiKey = process.env.OPENAI_API_KEY, timeout = 25000 } = {}) {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '100kb' }));
  app.get('/health', (req, res) => res.json({ status: 'ok' }));
  app.post('/api/summary', async (req, res) => {
    const invalid = validateInput(req.body);
    if (invalid) return res.status(400).json({ error: invalid });
    if (!apiKey) return res.status(503).json({ error: 'The summary service is not configured. Please contact the app administrator.' });
    const messages = messagesFor(req.body.description.trim());
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      for (let attempt = 0; attempt < 3; attempt++) {
        const response = await fetcher('https://api.openai.com/v1/chat/completions', {
          method: 'POST', signal: controller.signal,
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({ model: 'gpt-4.1-mini', messages, temperature: 0.3, max_tokens: 180 })
        });
        if (!response.ok) {
          console.error(JSON.stringify({ event: 'summary_upstream_error', status: response.status }));
          return res.status(response.status === 429 ? 429 : 502).json({ error: response.status === 429 ? 'The summary service is busy or has reached its usage limit. Please try again later.' : 'The AI service could not complete this request. Please try again later.' });
        }
        const data = await response.json();
        const summary = data.choices?.[0]?.message?.content;
        if (validSummary(summary)) return res.json({ summary: summary.trim() });
        if (typeof summary !== 'string' || !summary.trim()) break;
        messages.push({ role: 'assistant', content: summary }, { role: 'user', content: `Your previous response was ${summary.trim().length} characters. Rewrite it as ONE complete sentence of at most ${attempt === 0 ? 180 : 140} characters including spaces. Keep only the central premise, omit secondary details, and use only facts supported by the original description. Return only that sentence.` });
      }
      return res.status(502).json({ error: 'A valid summary under 260 characters could not be produced. Please try again.' });
    } catch (error) {
      console.error(JSON.stringify({ event: 'summary_request_failed', type: error.name }));
      return res.status(error.name === 'AbortError' ? 504 : 502).json({ error: error.name === 'AbortError' ? 'The AI service took too long. Please try again.' : 'The summary service could not be reached. Please try again.' });
    } finally { clearTimeout(timer); }
  });
  app.use((error, req, res, next) => res.status(error.type === 'entity.too.large' ? 413 : 400).json({ error: 'The request could not be read. Check the description and try again.' }));
  return app;
}
if (process.env.NODE_ENV !== 'test') {
  const port = process.env.PORT || 3000;
  createApp().listen(port, () => console.log(`Summary service listening on port ${port}`));
}
