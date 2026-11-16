# Multiplayer relay

`worker.js` is the Cloudflare Worker that passes messages between players in the same room
(`wss://ronnie-mp.ronnie-sim.workers.dev/room/CODE`). Each room is one Durable Object (`Room`), using the
WebSocket Hibernation API so idle rooms cost nothing. Up to 6 players per room; the first in is the host.

Deployed with the Cloudflare API (script name `ronnie-mp`, metadata in `meta.json`):

    curl -X PUT "https://api.cloudflare.com/client/v4/accounts/<ACCOUNT_ID>/workers/scripts/ronnie-mp" \
      -H "Authorization: Bearer <TOKEN>" \
      -F "metadata=@meta.json;type=application/json" \
      -F "worker.js=@worker.js;type=application/javascript+module"

(After the first deploy, drop the `migrations` block from `meta.json` or bump its tag.)

## Voices (`GET /tts?v=<character>&t=<text>`)

Reads a line out in a character's ElevenLabs voice (used for typed chat, and any line without a pre-made clip).
Needs a Worker secret `ELEVENLABS_KEY` (Cloudflare dashboard → Workers & Pages → the worker → Settings →
Variables and Secrets → Add → Secret) and the character's voice id in `VOICES` at the top of `worker.js`.
Each line is made once and then served from Cloudflare's cache; lines are cut at 160 characters and each person
can ask for 12 a minute.
