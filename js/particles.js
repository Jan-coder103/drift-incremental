import * as THREE from 'three';

const MAX_PARTICLES = 300;

export class DriftParticles {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
    this.spawnAccum = 0;

    this.particleGeo = new THREE.BufferGeometry();
    this.positions = new Float32Array(MAX_PARTICLES * 3);
    this.sizes = new Float32Array(MAX_PARTICLES);
    this.opacities = new Float32Array(MAX_PARTICLES);

    this.particleGeo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.particleGeo.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));
    this.particleGeo.setAttribute('aOpacity', new THREE.BufferAttribute(this.opacities, 1));

    this.particleMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      uniforms: {},
      vertexShader: `
        attribute float size;
        attribute float aOpacity;
        varying float vOpacity;
        void main() {
          vOpacity = aOpacity;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (200.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying float vOpacity;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          float alpha = smoothstep(0.5, 0.1, d) * vOpacity;
          gl_FragColor = vec4(0.85, 0.82, 0.78, alpha);
        }
      `,
    });

    this.points = new THREE.Points(this.particleGeo, this.particleMat);
    this.points.frustumCulled = false;
    this.scene.add(this.points);
  }

  spawn(pos, vel) {
    if (this.particles.length >= MAX_PARTICLES) return;
    this.particles.push({
      x: pos.x + (Math.random() - 0.5) * 0.6,
      y: pos.y + Math.random() * 0.3,
      z: pos.z + (Math.random() - 0.5) * 0.6,
      vx: vel.x * 0.15 + (Math.random() - 0.5) * 1.5,
      vy: Math.random() * 1.5 + 0.5,
      vz: vel.z * 0.15 + (Math.random() - 0.5) * 1.5,
      life: 0,
      maxLife: 0.8 + Math.random() * 0.6,
      size: 1.5 + Math.random() * 1.5,
    });
  }

  update(dt, car, driftScorer) {
    if (driftScorer.isDrifting) {
      const speed = car.getSpeed();
      const angle = driftScorer.getDriftAngleDegrees();
      const intensity = Math.min(1, (angle / 45) * (speed / 30));

      this.spawnAccum += dt * intensity * 40;
      while (this.spawnAccum >= 1) {
        this.spawnAccum -= 1;
        const forward = car.getForward();
        const right = car.getRight();

        for (let side = -1; side <= 1; side += 2) {
          const rearOffset = forward.clone().multiplyScalar(-car.halfLength);
          const sideOffset = right.clone().multiplyScalar(side * car.halfWidth * 0.8);
          const basePos = car.position.clone().add(rearOffset).add(sideOffset);
          basePos.y = 0.15;
          this.spawn(basePos, car.velocity);
        }
      }
    } else {
      this.spawnAccum = 0;
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.vy -= 1.0 * dt;
      if (p.y < 0.05) {
        p.y = 0.05;
        p.vy = 0;
        p.vx *= 0.95;
        p.vz *= 0.95;
      }
      p.vx *= (1 - 1.5 * dt);
      p.vz *= (1 - 1.5 * dt);
    }

    for (let i = 0; i < MAX_PARTICLES; i++) {
      if (i < this.particles.length) {
        const p = this.particles[i];
        const t = p.life / p.maxLife;
        this.positions[i * 3] = p.x;
        this.positions[i * 3 + 1] = p.y;
        this.positions[i * 3 + 2] = p.z;
        this.sizes[i] = p.size * (1 + t * 2);
        this.opacities[i] = (1 - t) * 0.6;
      } else {
        this.positions[i * 3] = 0;
        this.positions[i * 3 + 1] = -100;
        this.positions[i * 3 + 2] = 0;
        this.sizes[i] = 0;
        this.opacities[i] = 0;
      }
    }

    this.particleGeo.attributes.position.needsUpdate = true;
    this.particleGeo.attributes.size.needsUpdate = true;
    this.particleGeo.attributes.aOpacity.needsUpdate = true;
    this.particleGeo.setDrawRange(0, this.particles.length);
  }
}
