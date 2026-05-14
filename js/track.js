import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export const TRACK_DEFS = [
  {
    id: 'track_1',
    name: 'Country Road',
    baseMoneyMultiplier: 1.0,
    costToUnlock: 0,
    trackWidth: 14,
    controlPoints: [
      [0, 0, 0],
      [0, 0, 50],
      [20, 0, 90],
      [40, 0, 100],
      [40, 0, 140],
      [25, 0, 160],
      [10, 0, 150],
      [5, 0, 175],
      [-15, 0, 210],
      [5, 0, 240],
      [15, 0, 270],
      [30, 0, 285],
      [35, 0, 320],
      [25, 0, 350],
      [10, 0, 360],
      [0, 0, 380],
      [0, 0, 430],
    ],
  },
];

export class Track {
  constructor(scene, def) {
    this.id = def.id;
    this.name = def.name;
    this.baseMoneyMultiplier = def.baseMoneyMultiplier || 1.0;
    this.costToUnlock = def.costToUnlock || 0;
    this.trackWidth = def.trackWidth || 14;
    this.bestLapTime = null;
    this.ghostData = null;

    this.curve = new THREE.CatmullRomCurve3(
      def.controlPoints.map(p => new THREE.Vector3(p[0], p[1], p[2])),
      false
    );

    this.sampleCount = 600;
    this.samples = [];
    this.sampleTangents = [];
    this.treeMeshes = [];
    this.meshes = [];

    this._sampleCurve();
    this._buildRoad(scene);
    this._buildGuardrails(scene);
    this._buildStartFinishMarkers(scene);
    this._placeTrees(scene);
  }

  _sampleCurve() {
    for (let i = 0; i <= this.sampleCount; i++) {
      const t = i / this.sampleCount;
      this.samples.push(this.curve.getPointAt(t));
      this.sampleTangents.push(this.curve.getTangentAt(t).normalize());
    }
  }

  _buildRoad(scene) {
    const halfWidth = this.trackWidth / 2;
    const verts = [];
    const indices = [];
    const colors = [];

    const roadColor = new THREE.Color(0x555555);
    const edgeColor = new THREE.Color(0xffffff);

    for (let i = 0; i <= this.sampleCount; i++) {
      const p = this.samples[i];
      const t = this.sampleTangents[i];
      const right = new THREE.Vector3().crossVectors(t, new THREE.Vector3(0, 1, 0)).normalize();

      verts.push(
        p.x - right.x * halfWidth, 0.02, p.z - right.z * halfWidth,
        p.x - right.x * (halfWidth - 0.6), 0.025, p.z - right.z * (halfWidth - 0.6),
        p.x + right.x * (halfWidth - 0.6), 0.025, p.z + right.z * (halfWidth - 0.6),
        p.x + right.x * halfWidth, 0.02, p.z + right.z * halfWidth,
      );

      colors.push(
        edgeColor.r, edgeColor.g, edgeColor.b,
        roadColor.r, roadColor.g, roadColor.b,
        roadColor.r, roadColor.g, roadColor.b,
        edgeColor.r, edgeColor.g, edgeColor.b,
      );
    }

    for (let i = 0; i < this.sampleCount; i++) {
      const b = i * 4;
      indices.push(b, b + 1, b + 4, b + 1, b + 5, b + 4);
      indices.push(b + 1, b + 2, b + 5, b + 2, b + 6, b + 5);
      indices.push(b + 2, b + 3, b + 6, b + 3, b + 7, b + 6);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      flatShading: true,
      roughness: 0.85,
      metalness: 0.05,
    });

    const road = new THREE.Mesh(geo, mat);
    road.receiveShadow = true;
    scene.add(road);
    this.meshes.push(road);

    this._buildCenterLine(scene);
  }

  _buildCenterLine(scene) {
    const lineVerts = [];
    for (let i = 0; i <= this.sampleCount; i += 12) {
      const p = this.samples[i];
      if ((Math.floor(i / 12)) % 2 === 0) {
        const end = Math.min(i + 6, this.sampleCount);
        const pEnd = this.samples[end];
        lineVerts.push(
          new THREE.Vector3(p.x, 0.03, p.z),
          new THREE.Vector3(pEnd.x, 0.03, pEnd.z),
        );
      }
    }

    const lineGeo = new THREE.BufferGeometry().setFromPoints(lineVerts);
    const lineMat = new THREE.LineBasicMaterial({ color: 0xffff44 });
    const line = new THREE.LineSegments(lineGeo, lineMat);
    scene.add(line);
    this.meshes.push(line);
  }

  _buildGuardrails(scene) {
    const halfWidth = this.trackWidth / 2 + 1.5;
    const railHeight = 0.7;

    for (const side of [-1, 1]) {
      const verts = [];
      const indices = [];

      for (let i = 0; i <= this.sampleCount; i++) {
        const p = this.samples[i];
        const t = this.sampleTangents[i];
        const right = new THREE.Vector3().crossVectors(t, new THREE.Vector3(0, 1, 0)).normalize();
        const ox = right.x * side * halfWidth;
        const oz = right.z * side * halfWidth;

        verts.push(p.x + ox, 0, p.z + oz);
        verts.push(p.x + ox, railHeight, p.z + oz);
      }

      for (let i = 0; i < this.sampleCount; i++) {
        const b = i * 2;
        indices.push(b, b + 1, b + 2);
        indices.push(b + 1, b + 3, b + 2);
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
      geo.setIndex(indices);
      geo.computeVertexNormals();

      const mat = new THREE.MeshStandardMaterial({
        color: 0xcc3333,
        flatShading: true,
        roughness: 0.6,
        metalness: 0.2,
        side: THREE.DoubleSide,
      });

      const rail = new THREE.Mesh(geo, mat);
      rail.castShadow = true;
      rail.receiveShadow = true;
      scene.add(rail);
      this.meshes.push(rail);
    }

    this._buildGuardrailPosts(scene);
  }

  _buildGuardrailPosts(scene) {
    const halfWidth = this.trackWidth / 2 + 1.5;
    const postGeo = new THREE.BoxGeometry(0.2, 0.9, 0.2);
    const postMat = new THREE.MeshStandardMaterial({
      color: 0xdddddd,
      flatShading: true,
      roughness: 0.7,
    });

    for (const side of [-1, 1]) {
      for (let i = 0; i <= this.sampleCount; i += 25) {
        const p = this.samples[i];
        const t = this.sampleTangents[i];
        const right = new THREE.Vector3().crossVectors(t, new THREE.Vector3(0, 1, 0)).normalize();
        const ox = right.x * side * halfWidth;
        const oz = right.z * side * halfWidth;

        const post = new THREE.Mesh(postGeo, postMat);
        post.position.set(p.x + ox, 0.45, p.z + oz);
        post.castShadow = true;
        scene.add(post);
        this.meshes.push(post);
      }
    }
  }

  _buildStartFinishMarkers(scene) {
    const startP = this.samples[0];
    const startT = this.sampleTangents[0];
    const startRight = new THREE.Vector3().crossVectors(startT, new THREE.Vector3(0, 1, 0)).normalize();
    const halfWidth = this.trackWidth / 2;

    const poleGeo = new THREE.CylinderGeometry(0.15, 0.15, 3, 6);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true, roughness: 0.5 });
    const pole1 = new THREE.Mesh(poleGeo, poleMat);
    pole1.position.set(startP.x - startRight.x * halfWidth, 1.5, startP.z - startRight.z * halfWidth);
    pole1.castShadow = true;
    scene.add(pole1);
    this.meshes.push(pole1);

    const pole2 = new THREE.Mesh(poleGeo, poleMat);
    pole2.position.set(startP.x + startRight.x * halfWidth, 1.5, startP.z + startRight.z * halfWidth);
    pole2.castShadow = true;
    scene.add(pole2);
    this.meshes.push(pole2);

    const bannerGeo = new THREE.BoxGeometry(this.trackWidth, 0.5, 0.15);
    const bannerMat = new THREE.MeshStandardMaterial({ color: 0x44aa44, flatShading: true, roughness: 0.5 });
    const banner = new THREE.Mesh(bannerGeo, bannerMat);
    banner.position.set(startP.x, 2.8, startP.z);
    banner.lookAt(startP.x + startT.x, 2.8, startP.z + startT.z);
    banner.castShadow = true;
    scene.add(banner);
    this.meshes.push(banner);

    const endP = this.samples[this.sampleCount];
    const endT = this.sampleTangents[this.sampleCount];
    const endRight = new THREE.Vector3().crossVectors(endT, new THREE.Vector3(0, 1, 0)).normalize();

    const endPole1 = new THREE.Mesh(poleGeo, poleMat.clone());
    endPole1.material.color.set(0xff4444);
    endPole1.position.set(endP.x - endRight.x * halfWidth, 1.5, endP.z - endRight.z * halfWidth);
    endPole1.castShadow = true;
    scene.add(endPole1);
    this.meshes.push(endPole1);

    const endPole2 = new THREE.Mesh(poleGeo, poleMat.clone());
    endPole2.material.color.set(0xff4444);
    endPole2.position.set(endP.x + endRight.x * halfWidth, 1.5, endP.z + endRight.z * halfWidth);
    endPole2.castShadow = true;
    scene.add(endPole2);
    this.meshes.push(endPole2);

    const endBanner = new THREE.Mesh(bannerGeo, bannerMat.clone());
    endBanner.material.color.set(0xff4444);
    endBanner.position.set(endP.x, 2.8, endP.z);
    endBanner.lookAt(endP.x + endT.x, 2.8, endP.z + endT.z);
    endBanner.castShadow = true;
    scene.add(endBanner);
    this.meshes.push(endBanner);
  }

  _placeTrees(scene) {
    const loader = new GLTFLoader();
    const treeDistance = this.trackWidth / 2 + 8;

    Promise.all([
      this._loadTree(loader, 'assets/trees/tree-large.glb'),
      this._loadTree(loader, 'assets/trees/tree-small.glb'),
    ]).then((models) => {
      const valid = models.filter(m => m !== null);
      if (valid.length === 0) {
        this._placeProceduralTrees(scene, treeDistance);
        return;
      }
      valid.forEach(m => this._flattenModel(m));
      this._scatterModels(scene, valid, treeDistance);
    });
  }

  _loadTree(loader, url) {
    return new Promise(resolve => {
      loader.load(url, gltf => resolve(gltf.scene), undefined, () => resolve(null));
    });
  }

  _flattenModel(model) {
    model.traverse(child => {
      if (child.isMesh) {
        child.material = new THREE.MeshStandardMaterial({
          color: child.material.color ? child.material.color.clone() : new THREE.Color(0x2d5a1e),
          flatShading: true,
          roughness: 0.85,
        });
        child.castShadow = true;
      }
    });
  }

  _scatterModels(scene, models, baseDist) {
    const seeded = this._seedRandom(this.id);
    for (let i = 0; i < this.sampleCount; i += 6) {
      const p = this.samples[i];
      const t = this.sampleTangents[i];
      const right = new THREE.Vector3().crossVectors(t, new THREE.Vector3(0, 1, 0)).normalize();

      for (const side of [-1, 1]) {
        if (seeded() > 0.65) continue;
        const dist = baseDist + seeded() * 18;
        const jitter = (seeded() - 0.5) * 6;
        const ox = right.x * side * dist + (t.x * jitter);
        const oz = right.z * side * dist + (t.z * jitter);

        const tree = models[Math.floor(seeded() * models.length)].clone();
        const s = 0.7 + seeded() * 1.0;
        tree.scale.set(s, s, s);
        tree.position.set(p.x + ox, 0, p.z + oz);
        tree.rotation.y = seeded() * Math.PI * 2;
        scene.add(tree);
        this.treeMeshes.push(tree);
      }
    }
  }

  _placeProceduralTrees(scene, baseDist) {
    const trunkGeo = new THREE.CylinderGeometry(0.15, 0.25, 2, 6);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b3a1f, flatShading: true, roughness: 0.9 });
    const foliageGeo = new THREE.ConeGeometry(1.5, 3, 6);
    const foliageMat = new THREE.MeshStandardMaterial({ color: 0x2d6b1e, flatShading: true, roughness: 0.8 });

    const seeded = this._seedRandom(this.id);
    for (let i = 0; i < this.sampleCount; i += 6) {
      const p = this.samples[i];
      const t = this.sampleTangents[i];
      const right = new THREE.Vector3().crossVectors(t, new THREE.Vector3(0, 1, 0)).normalize();

      for (const side of [-1, 1]) {
        if (seeded() > 0.65) continue;
        const dist = baseDist + seeded() * 18;
        const jitter = (seeded() - 0.5) * 6;
        const ox = right.x * side * dist + (t.x * jitter);
        const oz = right.z * side * dist + (t.z * jitter);

        const group = new THREE.Group();
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = 1;
        trunk.castShadow = true;
        group.add(trunk);

        const foliage = new THREE.Mesh(foliageGeo, foliageMat);
        foliage.position.y = 3.2;
        foliage.castShadow = true;
        group.add(foliage);

        const s = 0.7 + seeded() * 0.9;
        group.scale.set(s, s, s);
        group.position.set(p.x + ox, 0, p.z + oz);
        group.rotation.y = seeded() * Math.PI * 2;
        scene.add(group);
        this.treeMeshes.push(group);
      }
    }
  }

  _seedRandom(seed) {
    let h = 0;
    for (let i = 0; i < seed.length; i++) {
      h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
    }
    return () => {
      h = (h ^ (h >>> 16)) * 0x45d9f3b;
      h = (h ^ (h >>> 16)) * 0x45d9f3b;
      h = h ^ (h >>> 16);
      return (h >>> 0) / 4294967296;
    };
  }

  getClosestPoint(pos) {
    let minDist = Infinity;
    let closestIdx = 0;

    for (let i = 0; i < this.samples.length; i++) {
      const dx = pos.x - this.samples[i].x;
      const dz = pos.z - this.samples[i].z;
      const d = dx * dx + dz * dz;
      if (d < minDist) {
        minDist = d;
        closestIdx = i;
      }
    }

    const right = new THREE.Vector3()
      .crossVectors(this.sampleTangents[closestIdx], new THREE.Vector3(0, 1, 0))
      .normalize();
    const toCar = new THREE.Vector3(
      pos.x - this.samples[closestIdx].x,
      0,
      pos.z - this.samples[closestIdx].z,
    );
    const lateralDist = Math.abs(toCar.dot(right));

    return { point: this.samples[closestIdx], lateralDist, index: closestIdx };
  }

  isOnTrack(pos) {
    const closest = this.getClosestPoint(pos);
    return closest.lateralDist <= this.trackWidth / 2 + 0.5;
  }

  getStartPosition() {
    const p = this.samples[0];
    const t = this.sampleTangents[0];
    return {
      position: p.clone().setY(this.restLength || 0.7),
      rotation: Math.atan2(t.x, t.z),
    };
  }

  getTrackLength() {
    return this.curve.getLength();
  }

  dispose(scene) {
    for (const m of this.meshes) {
      scene.remove(m);
      if (m.geometry) m.geometry.dispose();
      if (m.material) {
        if (Array.isArray(m.material)) m.material.forEach(mat => mat.dispose());
        else m.material.dispose();
      }
    }
    for (const t of this.treeMeshes) {
      scene.remove(t);
    }
    this.meshes = [];
    this.treeMeshes = [];
  }
}
