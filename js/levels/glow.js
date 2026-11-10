// Cheap, good-looking light: soft additive halos round every bulb (billboards)
// and warm pools of light on floors and table tops (flat decals). Each batch is
// ONE instanced draw call with a tiny shader, so a whole pub full of lamps costs
// almost nothing on the Quest.
import * as THREE from 'three';

const VERT = `
  attribute vec3 iPos; attribute float iSize; attribute vec3 iColor;
  uniform float uFlat;
  varying vec2 vUv; varying vec3 vColor;
  void main() {
    vUv = uv; vColor = iColor;
    vec4 mv;
    if (uFlat > 0.5) { mv = modelViewMatrix * vec4(iPos + vec3(position.x * iSize, 0.0, -position.y * iSize), 1.0); }
    else { mv = modelViewMatrix * vec4(iPos, 1.0); mv.xy += position.xy * iSize; }
    gl_Position = projectionMatrix * mv;
  }`;
const FRAG = `
  uniform float uIntensity; uniform float uPow; uniform float uFlicker;
  varying vec2 vUv; varying vec3 vColor;
  void main() {
    float d = length(vUv - 0.5) * 2.0;
    float a = pow(max(0.0, 1.0 - d), uPow);
    gl_FragColor = vec4(vColor * a * uIntensity * uFlicker, 1.0);
  }`;

export class GlowBatch {
  // flat: lies on surfaces (light pools); otherwise faces the camera (halos)
  constructor(flat = false, intensity = 1, pow = 2.2) {
    this.flat = flat; this.list = []; this.intensity = intensity; this.pow = pow;
  }
  add(x, y, z, size, color) { const c = new THREE.Color(color); this.list.push([x, y, z, size, c.r, c.g, c.b]); }
  build(scene) {
    if (!this.list.length) return null;
    const base = new THREE.PlaneGeometry(1, 1), g = new THREE.InstancedBufferGeometry();
    g.index = base.index; g.setAttribute('position', base.attributes.position); g.setAttribute('uv', base.attributes.uv);
    const n = this.list.length, P = new Float32Array(n * 3), S = new Float32Array(n), C = new Float32Array(n * 3);
    this.list.forEach(([x, y, z, s, r, gg, b], i) => { P.set([x, y, z], i * 3); S[i] = s; C.set([r, gg, b], i * 3); });
    g.setAttribute('iPos', new THREE.InstancedBufferAttribute(P, 3)); g.setAttribute('iSize', new THREE.InstancedBufferAttribute(S, 1)); g.setAttribute('iColor', new THREE.InstancedBufferAttribute(C, 3));
    g.instanceCount = n;
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uFlat: { value: this.flat ? 1 : 0 }, uIntensity: { value: this.intensity }, uPow: { value: this.pow }, uFlicker: { value: 1 } },
    });
    const m = new THREE.Mesh(g, mat); m.frustumCulled = false; m.renderOrder = this.flat ? 1 : 3;
    scene.add(m); this.mesh = m; return m;
  }
}
