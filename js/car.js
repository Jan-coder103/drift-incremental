import * as THREE from 'three';

export class Car {
  constructor(scene) {
    this.mass = 1200;
    this.gravity = -9.81;

    this.springConstant = 45000;
    this.dampingConstant = 4500;
    this.restLength = 0.7;

    this.lateralDrag = 1800;
    this.accelerationForce = 18000;
    this.brakeForce = 12000;
    this.maxSteerRate = 2.8;
    this.longitudinalDrag = 30;

    this.halfWidth = 0.85;
    this.halfLength = 2.0;

    this.position = new THREE.Vector3(0, this.restLength, 0);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.yaw = 0;
    this.yawRate = 0;
    this.visualRoll = 0;
    this.visualPitch = 0;
    this.rollRate = 0;
    this.pitchRate = 0;

    this.throttle = 0;
    this.brake = 0;
    this.steerInput = 0;

    this.corners = [
      new THREE.Vector3(-this.halfWidth, 0, this.halfLength),
      new THREE.Vector3(this.halfWidth, 0, this.halfLength),
      new THREE.Vector3(-this.halfWidth, 0, -this.halfLength),
      new THREE.Vector3(this.halfWidth, 0, -this.halfLength),
    ];

    this.group = new THREE.Group();

    const bodyGeometry = new THREE.BoxGeometry(1.8, 0.5, 4.2);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0xaaaaaa,
      flatShading: true,
      roughness: 0.5,
      metalness: 0.3,
    });
    this.bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    this.bodyMesh.position.y = 0.15;
    this.bodyMesh.castShadow = true;
    this.group.add(this.bodyMesh);

    const roofGeometry = new THREE.BoxGeometry(1.6, 0.4, 2.0);
    const roofMaterial = new THREE.MeshStandardMaterial({
      color: 0x999999,
      flatShading: true,
      roughness: 0.5,
      metalness: 0.3,
    });
    this.roofMesh = new THREE.Mesh(roofGeometry, roofMaterial);
    this.roofMesh.position.set(0, 0.6, -0.3);
    this.roofMesh.castShadow = true;
    this.bodyMesh.add(this.roofMesh);

    const wheelGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 8);
    const wheelMaterial = new THREE.MeshStandardMaterial({
      color: 0x222222,
      flatShading: true,
      roughness: 0.9,
      metalness: 0.0,
    });

    this.wheels = [];
    const wheelPositions = [
      new THREE.Vector3(-this.halfWidth, -this.restLength + 0.3, this.halfLength - 0.4),
      new THREE.Vector3(this.halfWidth, -this.restLength + 0.3, this.halfLength - 0.4),
      new THREE.Vector3(-this.halfWidth, -this.restLength + 0.3, -this.halfLength + 0.4),
      new THREE.Vector3(this.halfWidth, -this.restLength + 0.3, -this.halfLength + 0.4),
    ];

    for (let i = 0; i < 4; i++) {
      const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.copy(wheelPositions[i]);
      wheel.castShadow = true;
      this.group.add(wheel);
      this.wheels.push(wheel);
    }

    scene.add(this.group);
  }

  getForward() {
    return new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
  }

  getRight() {
    return new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
  }

  getSpeed() {
    return Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
  }

  getDriftAngle() {
    const forward = this.getForward();
    const flatVel = new THREE.Vector3(this.velocity.x, 0, this.velocity.z);
    const speed = flatVel.length();
    if (speed < 0.5) return 0;
    flatVel.normalize();
    return Math.acos(Math.max(-1, Math.min(1, forward.dot(flatVel))));
  }

  update(dt) {
    dt = Math.min(dt, 0.02);

    const forward = this.getForward();
    const right = this.getRight();

    const roll = this.visualRoll;
    const pitch = this.visualPitch;

    const cornerForces = [];
    let totalSpringForceY = 0;

    for (let i = 0; i < 4; i++) {
      const c = this.corners[i];
      const cornerYOffset = c.x * Math.sin(roll) - c.z * Math.sin(pitch);
      const cornerY = this.position.y + cornerYOffset;
      const cornerVy = this.velocity.y + this.rollRate * c.x - this.pitchRate * c.z;

      const compression = this.restLength - cornerY;
      const springFy = this.springConstant * compression - this.dampingConstant * cornerVy;
      cornerForces.push(springFy);
      totalSpringForceY += springFy;
    }

    const totalForce = new THREE.Vector3(0, 0, 0);
    totalForce.y += this.mass * this.gravity + totalSpringForceY;

    const throttleForce = this.accelerationForce * this.throttle;
    let brakeForceAmt = 0;
    if (this.brake > 0) {
      const fwdSpeed = this.velocity.dot(forward);
      brakeForceAmt = fwdSpeed > 0.5
        ? this.brakeForce * this.brake
        : this.accelerationForce * 0.5 * this.brake;
    }

    if (throttleForce > 0) {
      totalForce.add(forward.clone().multiplyScalar(throttleForce));
    }
    if (brakeForceAmt > 0) {
      totalForce.add(forward.clone().multiplyScalar(-brakeForceAmt));
    }

    const lateralSpeed = this.velocity.dot(right);
    const lateralForceVal = -lateralSpeed * this.lateralDrag;
    totalForce.add(right.clone().multiplyScalar(lateralForceVal));

    const forwardSpeed = this.velocity.dot(forward);
    const longForceVal = -forwardSpeed * this.longitudinalDrag;
    totalForce.add(forward.clone().multiplyScalar(longForceVal));

    const accel = totalForce.clone().divideScalar(this.mass);
    this.velocity.add(accel.multiplyScalar(dt));
    this.position.add(this.velocity.clone().multiplyScalar(dt));

    if (this.position.y < 0.05) {
      this.position.y = 0.05;
      if (this.velocity.y < 0) this.velocity.y = 0;
    }

    const carW = this.halfWidth * 2;
    const carL = this.halfLength * 2;
    const carH = 0.5;
    const I_roll = (1 / 12) * this.mass * (carW * carW + carH * carH);
    const I_pitch = (1 / 12) * this.mass * (carL * carL + carH * carH);

    let rollTorque = 0;
    let pitchTorque = 0;
    for (let i = 0; i < 4; i++) {
      const c = this.corners[i];
      rollTorque += c.x * cornerForces[i];
      pitchTorque += -c.z * cornerForces[i];
    }

    const netForwardForce = throttleForce - brakeForceAmt + longForceVal;
    rollTorque += this.position.y * lateralForceVal;
    pitchTorque += -this.position.y * netForwardForce;

    this.rollRate += (rollTorque / I_roll) * dt;
    this.pitchRate += (pitchTorque / I_pitch) * dt;

    const angDamp = Math.exp(-3.0 * dt);
    this.rollRate *= angDamp;
    this.pitchRate *= angDamp;

    this.visualRoll += this.rollRate * dt;
    this.visualPitch += this.pitchRate * dt;

    this.visualRoll = Math.max(-0.5, Math.min(0.5, this.visualRoll));
    this.visualPitch = Math.max(-0.3, Math.min(0.3, this.visualPitch));

    const speed = this.getSpeed();
    const steerAmount = this.steerInput * this.maxSteerRate * dt;
    if (speed > 1) {
      this.yaw += steerAmount * Math.min(1.0, speed / 10);
    } else {
      this.yaw += steerAmount * 0.3;
    }

    this.group.position.copy(this.position);
    this.group.rotation.set(0, this.yaw, 0);
    this.bodyMesh.rotation.set(this.visualPitch, 0, this.visualRoll);

    this.updateWheelVisuals();
  }

  updateWheelVisuals() {
    const groundY = 0;
    const wheelRadius = 0.3;

    for (let i = 0; i < 4; i++) {
      const corner = this.corners[i];
      const wheel = this.wheels[i];

      const worldCornerY = this.position.y;
      const wheelY = groundY + wheelRadius - this.position.y;
      wheel.position.y = wheelY;

      const rotationSpeed = this.velocity.dot(this.getForward());
      wheel.rotation.x += rotationSpeed * 0.016 / wheelRadius;
    }
  }
}
