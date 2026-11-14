// TOMMY — Ronnie's best mate, one day older. A physics ragdoll built from his
// own 3D model (assets/tommy.glb) with eyes matched to his photo. Roasts you,
// throws broccoli "just trying to help", and always gets back up.
import * as THREE from 'three';
import { Character } from './character.js';
import { canvasTex, beamTex } from './textures.js';
import { sfx } from './audio.js';
import { TUNING, pickVeg } from './config.js';

const _v = new THREE.Vector3(), _q = new THREE.Quaternion();
const MODEL_URL = './assets/tommy.glb';
const ANNOY_LINES = ['Ronnie. Ronnie. Ronnie. Ronnie. Ronnie. RONNIE.', 'Ron, quick question. Come here. No, closer.', 'Ronnie, your shoelace is undone. Look down. LOOK DOWN.', 'Hey Ron, what\'s that behind you? Don\'t turn round. Do turn round.'];
const TRIP_LINES = ['Have a lie down, Ron! It\'s for your health!', 'TIMBERRRR!', 'Whoops! My foot was just... there.', 'Floor time! The floor\'s got no calories, Ronnie!'];

export class Tommy extends Character {
  constructor(scene, room, physics) {
    super(scene, room, physics, {
      id: 'tommy', name: 'Tommy', color: '#c9a227', globalBanks: true,
      body: { h: 1.68 },
      spawn: [room.tommySpots[0].x, room.tommySpots[0].y, Math.PI / 2],
      chatterEvery: 14,
      banks: {
        grabbed: ['Ronnie, put me down. Ronnie. RONNIE. I am a grown man and I am older than you!'],
        launched: ['WORTH IIIIIIT!'],
      },
    });
    // personal spotlight that follows him everywhere (section 2.2)
    this.spot = new THREE.SpotLight(0xfff0d0, 9, 5, 0.42, 0.7, 1.2);
    this.spot.visible = false;        // (no spotlight on him any more)
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.75, 2.5, 20, 1, true),
      new THREE.MeshBasicMaterial({ map: beamTex(), color: 0xfff2d0, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    cone.position.y = 1.3; this.fx.add(cone);
    const sparkTex = canvasTex(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.2, 'rgba(255,255,255,0.8)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); g.fillStyle = '#fff'; g.fillRect(30, 0, 4, 64); g.fillRect(0, 30, 64, 4); });
    this.sparkle = new THREE.Sprite(new THREE.SpriteMaterial({ map: sparkTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.sparkle.scale.setScalar(0.12); this.sparkle.visible = false; scene.add(this.sparkle);
    this.sparkT = 0;
    this.attackTimer = TUNING.firstAttackDelay;
    this.attacks = true;            // classic broccoli attacks (modes can switch them off)
  }

  async load() {
    try { await this.rag.loadModel(MODEL_URL); this.addEyes(); }
    catch (e) { console.warn('Tommy model failed to load, using blocks', e); this.buildFallback(); }
    this.ready = true;
  }

  // Eyes, modelled on photos of the real Tommy: blue-grey irises, heavy upper
  // lids that cover the top of the iris, lower lids that just meet it, set
  // back in the sockets. The face mesh has small openings cut where the eyes
  // go; behind each sits a rotating eyeball, wrapped by skin-coloured upper
  // and lower lids whose edges form the almond shape. He looks at Ronnie,
  // blinks, and goes droopy-eyed and dizzy when knocked out.
  addEyes() {
    const headBone = this.rag.bones[this.rag.list.findIndex(p => p.name === 'head')];
    const EYE_R = 0.0118, LID_R = 0.0133;
    const ballMat = new THREE.MeshPhongMaterial({ map: eyeTexture(), shininess: 70, specular: 0x555555 });
    const ballGeo = new THREE.SphereGeometry(EYE_R, 40, 24);
    // skin colour matched to the baked texture around his eyes (and the body material's lighting)
    const skin = new THREE.Color().setRGB(188 / 255, 129 / 255, 115 / 255, THREE.SRGBColorSpace).multiplyScalar(0.92);
    const lidMat = new THREE.MeshLambertMaterial({ color: skin.clone().multiply(new THREE.Color(0xe6e6e6)), emissive: skin.clone().multiply(new THREE.Color(0x3a3a3a)) });
    const lashMat = new THREE.MeshLambertMaterial({ color: 0x23170f });
    const socketGeo = new THREE.SphereGeometry(1, 24, 16);
    const socketMat = new THREE.MeshLambertMaterial({ color: skin.clone().multiplyScalar(0.45), side: THREE.BackSide });
    const rimMat = new THREE.MeshLambertMaterial({ color: 0x9c6457 });
    const glintMat = new THREE.MeshBasicMaterial({ color: 0xffffff, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -8 });
    // A lid is a spherical cap around a tilted pole; tilting the pole backwards makes
    // its edge curve down (upper lid) or up (lower lid) toward the corners = almond.
    const cap = (r, theta, mat) => new THREE.Mesh(new THREE.SphereGeometry(r, 36, 14, 0, Math.PI * 2, 0, theta), mat);
    const UP = new THREE.Vector3(0, 1, 0);
    const lid = (upper) => {
      const tilt = upper ? 0.42 : 0.45, edge = upper ? 0.235 : -0.43;          // edge = elevation where it crosses the front
      const theta = tilt + Math.PI / 2 - Math.abs(edge);
      const g = new THREE.Group();
      const inner = new THREE.Group();
      inner.quaternion.setFromUnitVectors(UP, new THREE.Vector3(0, upper ? Math.cos(tilt) : -Math.cos(tilt), -Math.sin(tilt)));
      inner.add(cap(LID_R, theta, lidMat));
      inner.add(cap(LID_R - 0.00007, theta + (upper ? 0.075 : 0.03), upper ? lashMat : rimMat));   // lash line / lower lid rim
      g.add(inner);
      return g;
    };
    this.eyes = [-1, 1].map(side => {
      const eye = new THREE.Group();
      // spacing and size matched to Tommy's photo: about one eye-width between the inner corners
      eye.position.set(side * 0.0268, 0.0075, 0.0808);  // head-bone space: lids flush with the skin, eyeball just behind
      eye.scale.setScalar(1.1);
      eye.rotation.y = side * 0.08;                    // follow the curve of the face a little
      const ball = new THREE.Mesh(ballGeo, ballMat);
      const upper = lid(true), lower = lid(false);
      const socket = new THREE.Mesh(socketGeo, socketMat);   // inside of the socket, so you never see through the head at an angle
      socket.scale.set(0.021, 0.014, 0.03); socket.position.z = -0.0195;   // wide, deep egg behind the skin: catches every sightline through the opening
      const glint = new THREE.Mesh(new THREE.CircleGeometry(0.0007, 10), glintMat);
      glint.position.set(0.0022, 0.0019, EYE_R + 0.0001);
      eye.add(socket, ball, upper, lower, glint);
      headBone.add(eye);
      return { eye, ball, upper, lower, glint, side };
    });
    this.blinkT = 2 + Math.random() * 3;
  }

  updateEyes(dt, target) {
    if (!this.eyes) return;
    this.blinkT -= dt;
    if (this.blinkT < -0.16) this.blinkT = 2.5 + Math.random() * 3.5;
    const blink = this.blinkT < 0 ? Math.sin(Math.min(1, -this.blinkT / 0.16) * Math.PI) : 0;   // 0..1..0
    const ko = this.state === 'ko' || (this.state === 'recover' && this.stateT < 0.5);
    // the eyes are fixed in his head (no separate eye movement): they only blink,
    // and the lids droop when he's knocked out
    for (const e of this.eyes) {
      e.ball.rotation.set(0, 0, 0);
      e.upper.rotation.x = (ko ? 0.35 : 0) + blink * 0.62;
      e.lower.rotation.x = -blink * 0.08;
      e.glint.visible = blink < 0.4;
    }
  }

  // simple block body if the model can't load (keeps the game playable)
  buildFallback() {
    const mat = new THREE.MeshLambertMaterial({ color: 0xe8b896 });
    this.fallback = this.rag.list.map(p => {
      const d = p.def;
      const m = new THREE.Mesh(d.sphere ? new THREE.SphereGeometry(d.sphere, 12, 8) : new THREE.BoxGeometry(d.half[0] * 2, d.half[1] * 2, d.half[2] * 2), mat);
      this.scene.add(m); return m;
    });
  }

  // classic mode: every ~20s he lobs a broccoli at your face
  // ...and every so often he wanders over, winds you up and trips you over instead
  idleTick(dt, ctx) {
    if (!this.attacks) return;
    if (this.tripping) {
      this.tripping -= dt;
      if (this.distToPlayer < 1.0 && this.t - this.tripStart > 2) { this.tripping = 0; this.say(TRIP_LINES[Math.floor(Math.random() * TRIP_LINES.length)], 4); this.onTrip && this.onTrip(this); this.attackTimer = 14; return; }
      if (this.tripping <= 0) { this.tripping = 0; return; }
      _v.set(this.pos.x - ctx.head.x, 0, this.pos.z - ctx.head.z).setLength(0.6);
      this.goTo(ctx.head.x + _v.x, ctx.head.z + _v.z, 1.5, 'idle');
      return;
    }
    this.attackTimer -= dt;
    if (this.attackTimer <= 0) {
      const [a, b] = TUNING.attackInterval;
      this.attackTimer = a + Math.random() * (b - a);
      // on his own (classic) he decides when to trip you; with the squad there, the
      // director gives him his turn in the order like everyone else (startTrip)
      if (!this.directed && (Math.random() < 0.35 || this.distToPlayer <= 1.2)) { this.startTrip(); return; }
      this.startThrow({ item: pickVeg('broccoli'), speed: TUNING.broccoliSpeed, line: 'vegThrow' });
    }
  }

  // Tommy's own attack: the pop-up, then he walks over and trips you
  startTrip() {
    if (this.tripping || this.down) return false;
    this.tripping = 12; this.tripStart = this.t;
    this.onTripAnnounce && this.onTripAnnounce(this);
    this.say(ANNOY_LINES[Math.floor(Math.random() * ANNOY_LINES.length)], 3);
    return true;
  }
  get busyAttacking() { return this.tripping > 0; }

  onSpeechEnd() { if (this.speakPri >= 2 && !this.down && Math.random() < 0.5) this.flashTeeth(); }
  flashTeeth() { sfx('ting', this.headPos(_v), 0.8); }      // (no sparkle on his mouth any more, just the ting)

  afterUpdate(dt, ctx) {
    this.updateEyes(dt, ctx.head);
    if (this.fallback) this.fallback.forEach((m, i) => { const b = this.rag.list[i].body; m.position.copy(b.position); m.quaternion.copy(b.quaternion); });
    const pos = this.pos;
    this.spot.position.set(pos.x, 2.55, pos.z + 0.01);
    this.spot.target.position.set(pos.x, 0, pos.z);
    if (this.sparkT > 0) {
      this.sparkT = 0; this.sparkle.visible = false; this.sparkle.material.rotation += dt * 6;
      const head = this.headPos(_v);
      const q = this.rag.parts.head.body.quaternion; _q.set(q.x, q.y, q.z, q.w);
      this.sparkle.position.set(0, -0.06, 0.12).applyQuaternion(_q).add(head);
    }
  }
}

// Equirectangular eyeball texture: white, blue-grey iris with fibres and a dark
// limbal ring, pupil — centred on the sphere's +Z direction.
function eyeTexture() {
  const W = 512, H = 256, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'), img = g.createImageData(W, H), d = img.data;
  const mix = (a, b, t) => a + (b - a) * t;
  for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
    const phi = (px + 0.5) / W * Math.PI * 2, th = (py + 0.5) / H * Math.PI;
    const x = -Math.cos(phi) * Math.sin(th), y = Math.cos(th), z = Math.sin(phi) * Math.sin(th);
    const a = Math.acos(Math.max(-1, Math.min(1, z))), ang = Math.atan2(y, x);
    let r, gg, b;
    if (a < 0.16) { r = 12; gg = 14; b = 16; }                                    // pupil
    else if (a < 0.47) {                                                           // iris: blue-grey with a hint of green (from Tommy's photo)
      const t = (a - 0.16) / 0.31;
      const fib = 0.85 + 0.15 * Math.sin(ang * 38 + Math.sin(ang * 7) * 3) * Math.sin(ang * 23);
      r = mix(80, 106, t) * fib; gg = mix(100, 130, t) * fib; b = mix(100, 132, t) * fib;
      if (t < 0.18) { r *= 0.8; gg *= 0.85; b *= 0.85; }                            // darker collarette
      if (t > 0.85) { const k = 1 - (t - 0.85) / 0.15 * 0.55; r *= k; gg *= k; b *= k; }   // limbal ring
    } else {                                                                        // white, a little pinker toward the corners
      const t = Math.min(1, (a - 0.47) / 1.1);
      r = mix(226, 214, t); gg = mix(220, 196, t); b = mix(214, 188, t);
    }
    const o = (py * W + px) * 4; d[o] = r; d[o + 1] = gg; d[o + 2] = b; d[o + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

