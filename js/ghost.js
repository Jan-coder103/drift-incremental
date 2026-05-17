import * as THREE from 'three';

export class GhostCar {
  constructor(scene) {
    this.scene = scene;
    this.group = null;
    this.ghostData = null;
    this.playbackTime = 0;
    this.active = false;
    this.hasData = false;
    this._built = false;
  }

  _build() {
    this.group = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xff8844,
      flatShading: true,
      roughness: 0.5,
      metalness: 0.3,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });

    const bodyGeo = new THREE.BoxGeometry(1.8, 0.5, 4.2);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.15;
    body.renderOrder = 999;
    this.group.add(body);

    const roofGeo = new THREE.BoxGeometry(1.6, 0.4, 2.0);
    const roofMat = bodyMat.clone();
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(0, 0.6, -0.3);
    roof.renderOrder = 999;
    body.add(roof);

    const wheelGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 8);
    const wheelMat = new THREE.MeshStandardMaterial({
      color: 0x442200,
      flatShading: true,
      roughness: 0.9,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });

    const wheelPositions = [
      [-0.85, -0.4, 1.6],
      [0.85, -0.4, 1.6],
      [-0.85, -0.4, -1.6],
      [0.85, -0.4, -1.6],
    ];

    for (const [x, y, z] of wheelPositions) {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, y, z);
      wheel.renderOrder = 999;
      this.group.add(wheel);
    }

    this.group.visible = false;
    this.scene.add(this.group);
    this._built = true;
  }

  setData(ghostData) {
    this.ghostData = ghostData;
    this.hasData = ghostData && ghostData.length > 0;
    this.active = false;
    this.playbackTime = 0;
    if (!this._built) this._build();
    this.group.visible = false;
  }

  startPlayback() {
    if (!this.hasData) return;
    this.playbackTime = 0;
    this.active = true;
    this.group.visible = false;
  }

  stop() {
    this.active = false;
    this.playbackTime = 0;
    if (this.group) this.group.visible = false;
  }

  update(dt) {
    if (!this.active || !this.ghostData || this.ghostData.length === 0) return;

    this.playbackTime += dt;

    const data = this.ghostData;

    if (this.playbackTime >= data[data.length - 1].time) {
      this.group.visible = false;
      this.active = false;
      return;
    }

    let a = 0;
    let b = 1;
    for (let i = 0; i < data.length - 1; i++) {
      if (data[i].time <= this.playbackTime && data[i + 1].time > this.playbackTime) {
        a = i;
        b = i + 1;
        break;
      }
    }

    const tA = data[a];
    const tB = data[b];
    const alpha = (this.playbackTime - tA.time) / (tB.time - tA.time);

    const pAx = tA.position.x ?? tA.position[0];
    const pAy = tA.position.y ?? tA.position[1];
    const pAz = tA.position.z ?? tA.position[2];
    const pBx = tB.position.x ?? tB.position[0];
    const pBy = tB.position.y ?? tB.position[1];
    const pBz = tB.position.z ?? tB.position[2];

    this.group.position.set(
      pAx + (pBx - pAx) * alpha,
      pAy + (pBy - pAy) * alpha,
      pAz + (pBz - pAz) * alpha,
    );

    const yawA = tA.rotation;
    let yawB = tB.rotation;
    let yawDiff = yawB - yawA;
    if (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
    if (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
    this.group.rotation.set(0, yawA + yawDiff * alpha, 0);

    this.group.visible = true;
  }
}
