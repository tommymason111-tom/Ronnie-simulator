// cannon-es physics world for the ragdolls (Tommy) and Ronnie's hands.
// Food keeps its own lightweight physics (foods.js); this world is only
// for things that need real joints and contacts.
import * as CANNON from 'cannon-es';
import { ROOM } from './config.js';

// Collision groups. Each character gets its own bit (so different characters
// collide with each other, but a character's own limbs don't jam together).
export const GROUP = { STATIC: 1, RAGDOLL: 2, HAND: 4, CHARS: 0x7ff0, LLEG: 1 << 15, RLEG: 1 << 16 };
let nextChar = 0;
export function characterGroup() { const g = 1 << (4 + (nextChar++ % 11)); return { group: g, mask: GROUP.STATIC | GROUP.HAND | (GROUP.CHARS & ~g) }; }

export function createPhysics(room) {
  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.81, 0) });
  world.broadphase = new CANNON.SAPBroadphase(world);
  world.allowSleep = false;
  world.solver.iterations = 16;
  world.defaultContactMaterial.friction = 0.6;
  world.defaultContactMaterial.restitution = 0.05;
  world.defaultContactMaterial.contactEquationStiffness = 1e7;
  world.defaultContactMaterial.contactEquationRelaxation = 4;

  const addStatic = (shape, x, y, z, quat = null) => {
    const b = new CANNON.Body({ mass: 0, type: CANNON.Body.STATIC, collisionFilterGroup: GROUP.STATIC, collisionFilterMask: GROUP.RAGDOLL | GROUP.CHARS });
    b.addShape(shape);
    b.position.set(x, y, z);
    if (quat) b.quaternion.copy(quat);
    world.addBody(b);
    return b;
  };

  // floor, ceiling and four walls (planes face into the room)
  const B = room.bounds || { x0: -ROOM.w / 2, x1: ROOM.w / 2, z0: -ROOM.d / 2, z1: ROOM.d / 2, y1: ROOM.h };
  const q = (ax, ay, az, ang) => new CANNON.Quaternion().setFromAxisAngle(new CANNON.Vec3(ax, ay, az), ang);
  addStatic(new CANNON.Plane(), 0, 0, 0, q(1, 0, 0, -Math.PI / 2));
  addStatic(new CANNON.Plane(), 0, B.y1, 0, q(1, 0, 0, Math.PI / 2));
  addStatic(new CANNON.Plane(), 0, 0, B.z0, null);
  addStatic(new CANNON.Plane(), 0, 0, B.z1, q(0, 1, 0, Math.PI));
  addStatic(new CANNON.Plane(), B.x0, 0, 0, q(0, 1, 0, Math.PI / 2));
  addStatic(new CANNON.Plane(), B.x1, 0, 0, q(0, 1, 0, -Math.PI / 2));

  // furniture: solid blocks + the surfaces food can sit on
  for (const b of room.blockers) {
    const h = b.y1 ?? 0.5;
    addStatic(new CANNON.Box(new CANNON.Vec3((b.x1 - b.x0) / 2, h / 2, (b.z1 - b.z0) / 2)), (b.x0 + b.x1) / 2, h / 2, (b.z0 + b.z1) / 2);
  }
  for (const c of room.colliders) {
    addStatic(new CANNON.Box(new CANNON.Vec3((c.max.x - c.min.x) / 2, (c.max.y - c.min.y) / 2, (c.max.z - c.min.z) / 2)),
      (c.min.x + c.max.x) / 2, (c.min.y + c.max.y) / 2, (c.min.z + c.max.z) / 2);
  }

  let acc = 0;
  const STEP = 1 / 90;
  return {
    world,
    step(dt) {
      // fixed timestep so the ragdoll behaves the same at 72fps, 90fps or on a phone
      acc += Math.min(dt, 0.05);
      let n = 0;
      while (acc >= STEP && n < 5) { world.step(STEP); acc -= STEP; n++; }
      if (n === 5) acc = 0;
      return n;
    },
    STEP,
  };
}
