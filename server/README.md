# Multiplayer server (12 players a room)

`worker.js` is a Cloudflare Worker with one Durable Object per room (`Room`), using the WebSocket Hibernation API
(an idle room costs nothing). The game connects to `wss://<worker>/room/CODE?name=NAME&pid=DEVICE_ID`.

What the room does:
- up to **12 players**; the 13th is turned away ("room full")
- **saved player IDs**: each device keeps an ID (`rs_pid` in local storage). Leave and come back to the same room and
  you're the same player: same name, your progress (how big you got, what you ate) handed back. Kept until the host's
  game ends, or the room's been empty for 4 hours
- **host**: the first one in. If the host leaves, hosting passes to whoever joined next after them, and everyone's
  told. If the original host comes back they're a normal player; the current host can hand it back (a button in the
  room list)
- **grabs**: whoever grabs a thing owns it (their game runs its physics and tells everyone, 20 times a second); the
  next person to grab it takes over; if two grab at the same moment (within 150ms), the first to reach the room gets it
- answers pings (the FPS / PING display in the pause menu)
- passes everything else on (to everyone, or to one player for messages with `"to"`)

## Deploying (the 12-player server is a separate worker, so the live 6-player one keeps working)

Script name `ronnie-mp12` (the live one is `ronnie-mp`). In the Cloudflare dashboard: Workers & Pages → Create →
Worker → name it `ronnie-mp12` → Deploy → Edit code → paste `worker.js` → Deploy. Then Settings → Bindings → Add →
Durable Object: variable name `ROOMS`, class `Room` (the dashboard adds the SQLite migration for it).

Or with the API (metadata in `meta.json`):

    curl -X PUT "https://api.cloudflare.com/client/v4/accounts/<ACCOUNT_ID>/workers/scripts/ronnie-mp12" \
      -H "Authorization: Bearer <TOKEN>" \
      -F "metadata=@meta.json;type=application/json" \
      -F "worker.js=@worker.js;type=application/javascript+module"

(After the first deploy, drop the `migrations` block from `meta.json` or bump its tag.)

## Testing it locally

`node dohost.mjs ./worker.js 8788` (a stand-in for Durable Objects on top of the `ws` package) runs this exact file;
open the game with `?relay=ws://localhost:8788`.

## Voices (`GET /tts?v=<character>&t=<text>`)

Reads a line out in a character's ElevenLabs voice (used for typed chat, and any line without a pre-made clip).
Needs a Worker secret `ELEVENLABS_KEY` (Cloudflare dashboard → Workers & Pages → the worker → Settings →
Variables and Secrets → Add → Secret) and the character's voice id in `VOICES` at the top of `worker.js`.
Each line is made once and then served from Cloudflare's cache; lines are cut at 160 characters and each person
can ask for 12 a minute.
