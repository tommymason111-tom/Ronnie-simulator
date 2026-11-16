#!/usr/bin/env python3
"""Make a character's voice lines with ElevenLabs (see js/voices.js).

  python3 tools/voices.py --list                         the voices on the account
  python3 tools/voices.py tommy "Tommy"                  make every line in tools/voice_lines/tommy.json that isn't made yet,
                                                          in the ElevenLabs voice called "Tommy"
  python3 tools/voices.py tommy "Tommy" --only 3          just the first 3 (to listen before doing them all)

The lines file is written by the game (lineHash/cleanLine in voices.js, so the ids always match): [{"h": id, "t": text}].
Clips go to assets/voices/<char>/<id>.mp3 and are listed in assets/voices/manifest.json.
The API key comes from ELEVENLABS_API_KEY (or, in a Claude cloud session, the environment adds it on the way out).
"""
import json, os, ssl, sys, urllib.request, urllib.error

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
API = 'https://api.elevenlabs.io'
KEY = os.environ.get('ELEVENLABS_API_KEY', 'set-by-the-environment')
CA = os.environ.get('SSL_CERT_FILE') or ('/root/.ccr/ca-bundle.crt' if os.path.exists('/root/.ccr/ca-bundle.crt') else None)
SSL = ssl.create_default_context(cafile=CA) if CA else ssl.create_default_context()

def call(path, body=None, accept='application/json'):
    req = urllib.request.Request(API + path, data=json.dumps(body).encode() if body is not None else None, method='POST' if body is not None else 'GET',
                                 headers={'xi-api-key': KEY, 'content-type': 'application/json', 'accept': accept})
    with urllib.request.urlopen(req, context=SSL, timeout=120) as r:
        return r.read()

def voices():
    return json.loads(call('/v2/voices?page_size=100')).get('voices', [])

def main():
    a = sys.argv[1:]
    if not a or a[0] == '--list':
        for v in voices(): print(v['voice_id'], '|', v['name'], '|', v.get('category'))
        return
    char, name = a[0], a[1]; only = int(a[a.index('--only') + 1]) if '--only' in a else None
    match = [v for v in voices() if v['name'].strip().lower() == name.strip().lower()]
    if not match: sys.exit(f'no voice called "{name}" on the account (try --list)')
    vid = match[0]['voice_id']
    lines = json.load(open(os.path.join(ROOT, 'tools/voice_lines', char + '.json')))
    out = os.path.join(ROOT, 'assets/voices', char); os.makedirs(out, exist_ok=True)
    manp = os.path.join(ROOT, 'assets/voices/manifest.json'); man = json.load(open(manp)) if os.path.exists(manp) else {}
    have = set(man.get(char, {}).get('lines', []))
    todo = [l for l in lines if l['h'] not in have or not os.path.exists(os.path.join(out, l['h'] + '.mp3'))]
    if only is not None: todo = todo[:only]
    print(f'{char}: voice {name} ({vid}), {len(todo)} to make, {sum(len(l["t"]) for l in todo)} characters')
    for i, l in enumerate(todo):
        try:
            mp3 = call(f'/v1/text-to-speech/{vid}?output_format=mp3_44100_64', {'text': l['t'], 'model_id': 'eleven_multilingual_v2',
                       'voice_settings': {'stability': 0.45, 'similarity_boost': 0.8, 'style': 0.3, 'use_speaker_boost': True}}, accept='audio/mpeg')
        except urllib.error.HTTPError as e:
            print('  FAILED', l['h'], e.code, e.read()[:200]); break
        open(os.path.join(out, l['h'] + '.mp3'), 'wb').write(mp3); have.add(l['h'])
        print(f'  {i + 1}/{len(todo)} {l["h"]} {len(mp3) // 1024} KB  {l["t"][:60]}')
        man[char] = {'voice': name, 'lines': sorted(have)}; json.dump(man, open(manp, 'w'), indent=1)

if __name__ == '__main__':
    main()
