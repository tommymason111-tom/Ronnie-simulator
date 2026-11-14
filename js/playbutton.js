// A floating PLAY / STOP sign for the little games (darts, table tennis). It always faces you;
// tap it (phone/PC) or touch it (headset) to start or stop a game. Only shown in Free Roam.
import * as THREE from 'three';

export class PlayButton {
  constructor(scene, pos, name) {
    this.name = name; this.on = false; this.cool = 0;
    this.cv = document.createElement('canvas'); this.cv.width = 512; this.cv.height = 160;
    this.tex = new THREE.CanvasTexture(this.cv); this.tex.colorSpace = THREE.SRGBColorSpace;
    this.sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.tex, depthTest: true, transparent: true }));
    this.sprite.scale.set(0.66, 0.2, 1); this.sprite.position.copy(pos); this.sprite.renderOrder = 3;
    scene.add(this.sprite); this.draw();
  }
  get position() { return this.sprite.position; }
  get visible() { return this.sprite.visible; }
  set visible(v) { this.sprite.visible = v; }
  draw() {
    const g = this.cv.getContext('2d'), w = 512, h = 160;
    g.clearRect(0, 0, w, h);
    g.fillStyle = this.on ? '#c62828' : '#2ecc40'; g.strokeStyle = '#ffffff'; g.lineWidth = 10;
    g.beginPath(); g.roundRect(8, 8, w - 16, h - 16, 40); g.fill(); g.stroke();
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '900 64px "Arial Black", Impact, sans-serif';
    g.fillText((this.on ? '■ STOP ' : '▶ PLAY ') + this.name, w / 2, h / 2 + 4);
    this.tex.needsUpdate = true;
  }
  set(on) { this.on = on; this.draw(); }
  // a press: returns true if it counted (a short cooldown stops one touch toggling twice)
  press() { if (this.cool > 0) return false; this.cool = 0.8; return true; }
  tick(dt) { if (this.cool > 0) this.cool -= dt; }
}
