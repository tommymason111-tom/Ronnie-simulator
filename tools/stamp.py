#!/usr/bin/env python3
"""Stamp the game's version on every script it loads, so a phone can never mix an old cached file with new ones.

Run after bumping GAME_VERSION in js/menu.js:  python3 tools/stamp.py
  - writes version.json (the page checks it on load and reloads itself once if it's out of date)
  - rewrites the import map in index.html so every module under js/ is loaded as  js/x.js?v=<version>
"""
import json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
menu = open(os.path.join(ROOT, 'js/menu.js')).read()
v = re.search(r"GAME_VERSION = '([^']+)'", menu).group(1)

mods = sorted(os.path.relpath(os.path.join(d, f), ROOT).replace(os.sep, '/')
              for d, _, fs in os.walk(os.path.join(ROOT, 'js')) for f in fs if f.endswith('.js'))
imports = {
    'three': 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js',
    'three/addons/': 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/',
    'cannon-es': 'https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js',
}
for m in mods:
    imports['./' + m] = './' + m + '?v=' + v

p = os.path.join(ROOT, 'index.html')
html = open(p).read()
block = '<script type="importmap">\n' + json.dumps({'imports': imports}, indent=2) + '\n  </script>'
html = re.sub(r'<script type="importmap">.*?</script>', lambda _: block, html, count=1, flags=re.S)
html = re.sub(r"window\.GAME_BUILD = '[^']*'", "window.GAME_BUILD = '" + v + "'", html)
html = re.sub(r'src="\./js/menu\.js(\?v=[^"]*)?"', 'src="./js/menu.js?v=' + v + '"', html)
html = re.sub(r'src="\./js/howto\.js(\?v=[^"]*)?"', 'src="./js/howto.js?v=' + v + '"', html)
html = re.sub(r'src="\./js/fasttap\.js(\?v=[^"]*)?"', 'src="./js/fasttap.js?v=' + v + '"', html)
html = re.sub(r'src="\./js/crash\.js(\?v=[^"]*)?"', 'src="./js/crash.js?v=' + v + '"', html)
open(p, 'w').write(html)
open(os.path.join(ROOT, 'version.json'), 'w').write(json.dumps({'v': v}) + '\n')
print('stamped', v, len(mods), 'modules')
