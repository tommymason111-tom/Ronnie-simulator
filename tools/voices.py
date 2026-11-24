#!/usr/bin/env python3
"""Make a character's voice lines with ElevenLabs (see js/voices.js).

  python3 tools/voices.py --list                         the voices on the account
  python3 tools/voices.py tommy "Tommy"                  make every line in tools/voice_lines/tommy.json that isn't made yet,
                                                          in the ElevenLabs voice called "Tommy"
  python3 tools/voices.py tommy "Tommy" --only 3          just the first 3 (to listen before doing them all)
  python3 tools/voices.py tommy "Tommy" --force           make every line again (after changing the voice on ElevenLabs)
  ... --emphasis                                          use ElevenLabs v3 with a delivery tag per line (more acted: the
                                                          best model for these lines; a line's own "tag" in the lines file
                                                          wins, "" for none)
  python3 tools/voices.py narrator nPczCjzI2devNBz1zQrb --emphasis     the voice can be given by its id too

The lines file is written by the game (lineHash/cleanLine in voices.js, so the ids always match): [{"h": id, "t": text, "tag": optional}].
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

def delivery(text):
    """How the line should be said (ElevenLabs v3 reads these tags; it also stresses words in CAPITALS and pauses at '...')."""
    words = [w.strip('.,!?\'"()') for w in text.split()]
    caps = [w for w in words if len(w) >= 2 and w.isupper()]
    if words and len(caps) / len(words) > 0.4: return '[shouting] '
    if '!' in text: return '[excited] '
    if '?' in text: return '[teasing] '
    return '[sarcastic] '

def voices():
    return json.loads(call('/v2/voices?page_size=100')).get('voices', [])

def main():
    a = sys.argv[1:]
    if not a or a[0] == '--list':
        for v in voices(): print(v['voice_id'], '|', v['name'], '|', v.get('category'))
        return
    char, name = a[0], a[1]; only = int(a[a.index('--only') + 1]) if '--only' in a else None
    match = [v for v in voices() if v['name'].strip().lower() == name.strip().lower() or v['voice_id'] == name.strip()]
    if not match: sys.exit(f'no voice called "{name}" on the account (try --list)')
    vid = match[0]['voice_id']
    lines = json.load(open(os.path.join(ROOT, 'tools/voice_lines', char + '.json')))
    out = os.path.join(ROOT, 'assets/voices', char); os.makedirs(out, exist_ok=True)
    manp = os.path.join(ROOT, 'assets/voices/manifest.json'); man = json.load(open(manp)) if os.path.exists(manp) else {}
    have = set() if '--force' in a else set(man.get(char, {}).get('lines', []))      # (--force: make them all again, e.g. after the voice was changed on ElevenLabs)
    todo = [l for l in lines if l['h'] not in have or not os.path.exists(os.path.join(out, l['h'] + '.mp3'))]
    if only is not None: todo = todo[:only]
    if '--force' in a: man.setdefault(char, {})['v'] = man.get(char, {}).get('v', 1) + 1      # (a new version: players' browsers fetch the new clips, not their saved old ones)
    print(f'{char}: voice {name} ({vid}), {len(todo)} to make, {sum(len(l["t"]) for l in todo)} characters')
    for i, l in enumerate(todo):
        try:
            if '--emphasis' in a:      # (ElevenLabs v3 with a delivery tag per line: more acted, stresses CAPITALS)
                tag = (l['tag'] + ' ' if l['tag'] else '') if 'tag' in l else delivery(l['t'])
                body = {'text': tag + l['t'], 'model_id': 'eleven_v3', 'voice_settings': {'stability': 0.5, 'similarity_boost': 0.8}}
            else:                      # (the original: multilingual v2)
                body = {'text': l['t'], 'model_id': 'eleven_multilingual_v2', 'voice_settings': {'stability': 0.45, 'similarity_boost': 0.8, 'style': 0.3, 'use_speaker_boost': True}}
            mp3 = call(f'/v1/text-to-speech/{vid}?output_format=mp3_44100_64', body, accept='audio/mpeg')
        except urllib.error.HTTPError as e:
            print('  FAILED', l['h'], e.code, e.read()[:200]); break
        open(os.path.join(out, l['h'] + '.mp3'), 'wb').write(mp3); have.add(l['h'])
        print(f'  {i + 1}/{len(todo)} {l["h"]} {len(mp3) // 1024} KB  {l.get("tag", "")} {l["t"][:60]}')
        man[char] = {'voice': name, 'v': man.get(char, {}).get('v', 1), 'lines': sorted(have)}; json.dump(man, open(manp, 'w'), indent=1)

if __name__ == '__main__':
    main()
