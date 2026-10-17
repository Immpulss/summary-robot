# Summary service repair — review branch only

Do not merge or deploy without user approval. Render currently deploys commits on main automatically.

Changes: validate title/author/description; keep the actual source in the AI request; separate instructions from source data; enforce the 260-character maximum, allowing one shortening attempt; check upstream status; safe error messages and structured logs without descriptions or keys; 25-second total AI timeout; 100kb body limit; explicit Node module type/start/test commands; GET /health. Model remains gpt-4.1-mini.

Run `npm install` then `npm test`. Six HTTP tests pass using a mocked AI service: missing descriptions, source handoff, excessive length, rate limit, malformed response, timeout. No live OpenAI calls or deployments were made.

Remaining: test real output quality and latency on a separately approved backend, phone scanning and PDF output with the frontend branch. Existing broad CORS behavior is unchanged; CORS is not authentication. Abuse protection and model comparison are separate follow-ups.
