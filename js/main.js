import * as THREE from 'three';
import { Car } from './car.js';
import { Track, TRACK_DEFS } from './track.js';
import { DriftScorer } from './drift.js';
import { RunTracker } from './runner.js';
import { UpgradeSystem } from './upgrades.js';
import { PassiveIncome } from './passive.js';
import GUI from 'lil-gui';

const $speed = document.getElementById('hud-speed');
const $timeValue = document.getElementById('hud-time-value');
const $best = document.getElementById('hud-best');
const $progress = document.getElementById('hud-progress');
const $drift = document.getElementById('hud-drift');
const $driftPoints = document.getElementById('hud-drift-points');
const $driftCombo = document.getElementById('hud-drift-combo');
const $driftAngle = document.getElementById('hud-drift-angle');
const $driftBank = document.getElementById('hud-drift-bank');
const $driftLost = document.getElementById('hud-drift-lost');
const $totalDriftValue = document.getElementById('hud-total-drift-value');
const $endScreen = document.getElementById('end-screen');
const $endTime = document.getElementById('end-time');
const $endDrift = document.getElementById('end-drift');
const $endXp = document.getElementById('end-xp');
const $endMoney = document.getElementById('end-money');
const $endBest = document.getElementById('end-best');
const $restartBtn = document.getElementById('end-restart-btn');
const $moneyVal = document.getElementById('hud-money-val');
const $xpVal = document.getElementById('hud-xp-val');
const $levelVal = document.getElementById('hud-level-val');
const $shopBtn = document.getElementById('shop-btn');
const $shopOverlay = document.getElementById('shop-overlay');
const $shopMoney = document.getElementById('shop-money');
const $shopCarUpgrades = document.getElementById('shop-car-upgrades');
const $shopTrackUpgrades = document.getElementById('shop-track-upgrades');
const $shopDrivers = document.getElementById('shop-drivers');
const $shopCloseBtn = document.getElementById('shop-close-btn');
const $passiveHud = document.getElementById('hud-passive');
const $passiveRate = document.getElementById('hud-passive-rate');
const $passiveAccumulated = document.getElementById('hud-passive-accumulated');
const $passiveCollect = document.getElementById('hud-passive-collect');

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 120, 400);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);

const ambientLight = new THREE.AmbientLight(0x404040, 1.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 2.0);
directionalLight.position.set(50, 80, 30);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 500;
directionalLight.shadow.camera.left = -100;
directionalLight.shadow.camera.right = 100;
directionalLight.shadow.camera.top = 100;
directionalLight.shadow.camera.bottom = -100;
scene.add(directionalLight);

const groundGeometry = new THREE.PlaneGeometry(600, 600);
const groundMaterial = new THREE.MeshStandardMaterial({
  color: 0x4a8c3f,
  flatShading: true,
  roughness: 0.9,
  metalness: 0.0,
});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const currentTrack = new Track(scene, TRACK_DEFS[0]);
const car = new Car(scene);
const driftScorer = new DriftScorer();
const runTracker = new RunTracker(currentTrack);
const upgrades = new UpgradeSystem();
const passive = new PassiveIncome();

const allTrackIds = TRACK_DEFS.map(d => d.id);

if (passive.getBestLapTime(currentTrack.id) !== null) {
  runTracker.bestRunTime = passive.getBestLapTime(currentTrack.id);
  currentTrack.bestLapTime = passive.getBestLapTime(currentTrack.id);
}

let shopOpen = false;
let lastEndXp = 0;
let lastEndMoney = 0;

function resetRun() {
  const start = currentTrack.getStartPosition();
  car.position.copy(start.position);
  car.yaw = start.rotation;
  car.velocity.set(0, 0, 0);
  lastSafePos.copy(start.position);
  lastSafeYaw = car.yaw;
  driftScorer.reset();
  runTracker.reset();
  collectPassive();
  $endScreen.classList.remove('show');
}

function collectPassive() {
  const amount = passive.collect();
  if (amount > 0) {
    upgrades.money += amount;
    upgrades.save();
  }
}

let lastSafePos = car.position.clone();
let lastSafeYaw = car.yaw;
let hitWall = false;

resetRun();

const keys = {};
window.addEventListener('keydown', (e) => {
  if (e.code === 'Tab') {
    e.preventDefault();
    toggleShop();
    return;
  }
  keys[e.code] = true;
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });

$restartBtn.addEventListener('click', resetRun);
$shopBtn.addEventListener('click', toggleShop);
$shopCloseBtn.addEventListener('click', toggleShop);
$passiveCollect.addEventListener('click', collectPassive);

const cameraOffset = new THREE.Vector3(0, 6, -14);
const cameraLookOffset = new THREE.Vector3(0, 1, 0);
const cameraSmooth = 5.0;

const clock = new THREE.Clock();

const gui = new GUI({ title: 'Debug - Car Physics' });
const physicsFolder = gui.addFolder('Springs');
physicsFolder.add(car, 'springConstant', 10000, 100000).step(1000).name('Spring K');
physicsFolder.add(car, 'dampingConstant', 500, 15000).step(100).name('Damping');
physicsFolder.add(car, 'restLength', 0.3, 2.0).step(0.05).name('Rest Length');
physicsFolder.open();

const tractionFolder = gui.addFolder('Traction');
tractionFolder.add(car, 'lateralDrag', 500, 20000).step(100).name('Lateral Drag');
tractionFolder.open();

const driveFolder = gui.addFolder('Drive');
driveFolder.add(car, 'accelerationForce', 2000, 30000).step(500).name('Accel Force');
driveFolder.add(car, 'brakeForce', 2000, 30000).step(500).name('Brake Force');
driveFolder.add(car, 'maxSteerRate', 0.5, 6.0).step(0.1).name('Steer Rate');
driveFolder.add(car, 'longitudinalDrag', 5, 100).step(1).name('Long. Drag');
driveFolder.open();

const gravityFolder = gui.addFolder('Gravity');
gravityFolder.add(car, 'gravity', -20, 0).step(0.5).name('Gravity');
gravityFolder.open();

function toggleShop() {
  shopOpen = !shopOpen;
  if (shopOpen) {
    renderShop();
    $shopOverlay.classList.add('show');
  } else {
    $shopOverlay.classList.remove('show');
  }
}

function formatTime(t) {
  const mins = Math.floor(t / 60);
  const secs = Math.floor(t % 60);
  const ms = Math.floor((t % 1) * 1000);
  return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
}

function renderShop() {
  $shopMoney.textContent = `$${upgrades.money.toLocaleString()}`;

  $shopCarUpgrades.innerHTML = '';
  const carKeys = Object.keys(upgrades.carUpgrades);
  for (const key of carKeys) {
    const def = upgrades.getCarUpgradeDef(key);
    const level = upgrades.carUpgrades[key] || 0;
    const cost = upgrades.getCarUpgradeCost(key);
    const maxed = level >= def.maxLevel;
    const canAfford = cost !== null && upgrades.money >= cost;

    const item = document.createElement('div');
    item.className = 'shop-item';
    item.innerHTML = `
      <div class="shop-item-info">
        <div class="shop-item-name">${def.name}</div>
        <div class="shop-item-desc">${def.description}</div>
        <div class="shop-item-level">Level ${level}/${def.maxLevel} &bull; x${(1.0 + level * def.perLevel).toFixed(1)}</div>
      </div>
      <button class="shop-buy-btn ${maxed ? 'maxed' : ''}" ${maxed || !canAfford ? 'disabled' : ''} data-type="car" data-key="${key}">
        ${maxed ? 'MAX' : `$${cost.toLocaleString()}`}
      </button>
    `;
    $shopCarUpgrades.appendChild(item);
  }

  $shopTrackUpgrades.innerHTML = '';
  const trackId = currentTrack.id;
  const trackKeys = ['earningMultiplier'];
  for (const key of trackKeys) {
    const def = upgrades.getTrackUpgradeDef(key);
    const level = (upgrades.trackUpgrades[trackId] && upgrades.trackUpgrades[trackId][key]) || 0;
    const cost = upgrades.getTrackUpgradeCost(trackId, key);
    const maxed = level >= def.maxLevel;
    const canAfford = cost !== null && upgrades.money >= cost;

    const item = document.createElement('div');
    item.className = 'shop-item';
    item.innerHTML = `
      <div class="shop-item-info">
        <div class="shop-item-name">${def.name}</div>
        <div class="shop-item-desc">${currentTrack.name}</div>
        <div class="shop-item-level">Level ${level}/${def.maxLevel} &bull; x${(1.0 + level * def.perLevel).toFixed(2)}</div>
      </div>
      <button class="shop-buy-btn ${maxed ? 'maxed' : ''}" ${maxed || !canAfford ? 'disabled' : ''} data-type="track" data-key="${key}" data-track="${trackId}">
        ${maxed ? 'MAX' : `$${cost.toLocaleString()}`}
      </button>
    `;
    $shopTrackUpgrades.appendChild(item);
  }

  $shopOverlay.querySelectorAll('.shop-buy-btn:not(.maxed)').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.type;
      const key = btn.dataset.key;
      let success = false;
      if (type === 'car') {
        success = upgrades.buyCarUpgrade(key);
      } else if (type === 'track') {
        success = upgrades.buyTrackUpgrade(btn.dataset.track, key);
      }
      if (success) renderShop();
    });
  });

  $shopDrivers.innerHTML = '';
  for (const def of TRACK_DEFS) {
    const hasDriver = passive.hasDriver(def.id);
    const cost = passive.getDriverCost(def.id);
    const canAfford = upgrades.money >= cost;
    const bestTime = passive.getBestLapTime(def.id);
    const earningRate = passive.getEarningRate(def.id, upgrades.getTrackMultiplier(def.id));

    const item = document.createElement('div');
    item.className = 'shop-item';
    if (hasDriver) {
      item.innerHTML = `
        <div class="shop-item-info">
          <div class="shop-item-name">${def.name} Driver</div>
          <div class="shop-item-desc">Earning $${(earningRate * 60).toFixed(1)}/min</div>
          <div class="shop-item-level">${bestTime ? 'Best: ' + formatTime(bestTime) : 'No best lap yet'}</div>
        </div>
        <button class="shop-buy-btn maxed" disabled>Active</button>
      `;
    } else {
      item.innerHTML = `
        <div class="shop-item-info">
          <div class="shop-item-name">${def.name} Driver</div>
          <div class="shop-item-desc">Auto-earns money using your ghost</div>
        </div>
        <button class="shop-buy-btn ${!canAfford ? '' : ''}" ${!canAfford ? 'disabled' : ''} data-type="driver" data-track="${def.id}">
          $${cost.toLocaleString()}
        </button>
      `;
    }
    $shopDrivers.appendChild(item);
  }

  $shopOverlay.querySelectorAll('.shop-buy-btn[data-type="driver"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const trackId = btn.dataset.track;
      const cost = passive.getDriverCost(trackId);
      if (upgrades.money >= cost) {
        upgrades.money -= cost;
        upgrades.save();
        passive.buyDriver(trackId);
        renderShop();
      }
    });
  });
}

function updateInput() {
  if (runTracker.isFinished || shopOpen) return;

  car.throttle = (keys['KeyW'] || keys['ArrowUp']) ? 1 : 0;
  car.brake = (keys['KeyS'] || keys['ArrowDown']) ? 1 : 0;

  let steer = 0;
  if (keys['KeyA'] || keys['ArrowLeft']) steer += 1;
  if (keys['KeyD'] || keys['ArrowRight']) steer -= 1;
  car.steerInput = steer;

  if (keys['KeyR']) {
    resetRun();
  }
}

function updateCamera(dt) {
  const rotatedOffset = cameraOffset.clone().applyAxisAngle(
    new THREE.Vector3(0, 1, 0),
    car.yaw
  );
  const targetPos = car.position.clone().add(rotatedOffset);
  camera.position.lerp(targetPos, Math.min(1, dt * cameraSmooth));

  const lookTarget = car.position.clone().add(
    cameraLookOffset.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), car.yaw)
  );
  camera.lookAt(lookTarget);

  directionalLight.position.set(car.position.x + 50, 80, car.position.z + 30);
  directionalLight.target.position.copy(car.position);
  directionalLight.target.updateMatrixWorld();
}

function updateCollision() {
  hitWall = false;
  if (currentTrack.isOnTrack(car.position)) {
    lastSafePos.copy(car.position);
    lastSafeYaw = car.yaw;
  } else {
    hitWall = true;
    car.position.copy(lastSafePos);
    car.yaw = lastSafeYaw;
    car.velocity.multiplyScalar(0.25);
  }
}

function updateHUD() {
  const speed = Math.round(car.getSpeed() * 3.6);
  $speed.innerHTML = `${speed}<span>km/h</span>`;

  $timeValue.textContent = runTracker.isRunning
    ? runTracker.getFormattedTime()
    : '0:00.000';

  $best.textContent = `Best: ${runTracker.getFormattedBestTime()}`;

  const pct = Math.round(runTracker.trackProgress * 100);
  $progress.textContent = `${pct}%`;

  if (driftScorer.isDrifting) {
    $drift.classList.add('active');
    $driftPoints.textContent = driftScorer.getDisplayPoints().toLocaleString();
    $driftCombo.textContent = `x${driftScorer.comboMultiplier.toFixed(1)}`;
    $driftAngle.innerHTML = `${driftScorer.getDriftAngleDegrees()}&deg;`;
  } else {
    $drift.classList.remove('active');
  }

  if (driftScorer.recentlyBanked) {
    $driftBank.textContent = `+${driftScorer.bankDisplayPoints.toLocaleString()}`;
    $driftBank.classList.add('show');
    setTimeout(() => $driftBank.classList.remove('show'), 1200);
  }

  if (driftScorer.driftLost) {
    $driftLost.textContent = `${driftScorer.driftLostPoints.toLocaleString()} LOST`;
    $driftLost.classList.add('show');
    setTimeout(() => $driftLost.classList.remove('show'), 1200);
  }

  $totalDriftValue.textContent = driftScorer.getTotalPoints().toLocaleString();

  $moneyVal.textContent = `$${upgrades.money.toLocaleString()}`;
  $xpVal.textContent = `${upgrades.xp}/${100 + (upgrades.level - 1) * 75}`;
  $levelVal.textContent = upgrades.level;

  const totalRate = passive.getTotalEarningRate(allTrackIds, (id) => upgrades.getTrackMultiplier(id));
  const hasAnyDriver = allTrackIds.some(id => passive.hasDriver(id));
  if (hasAnyDriver) {
    $passiveHud.classList.add('active');
    $passiveRate.textContent = `$${(totalRate * 60).toFixed(1)}/min`;
    const acc = passive.accumulatedMoney;
    $passiveAccumulated.textContent = `$${Math.floor(acc).toLocaleString()}`;
    $passiveCollect.style.display = acc >= 1 ? 'inline-block' : 'none';
  } else {
    $passiveHud.classList.remove('active');
  }
}

function showEndScreen() {
  const rawXp = runTracker.xpEarned;
  const rawMoney = runTracker.moneyEarned;
  const xpMult = upgrades.getXpMultiplier();
  const moneyMult = upgrades.getMoneyMultiplier();
  const trackMult = upgrades.getTrackMultiplier(currentTrack.id);

  lastEndXp = Math.floor(rawXp * xpMult);
  lastEndMoney = Math.floor(rawMoney * moneyMult * trackMult);

  upgrades.addRewards(lastEndXp, lastEndMoney);

  passive.setBestLapTime(currentTrack.id, runTracker.bestRunTime);

  $endTime.textContent = runTracker.getFormattedTime();
  $endDrift.textContent = runTracker.totalDriftAtEnd.toLocaleString();
  $endXp.textContent = `+${lastEndXp.toLocaleString()}`;
  $endMoney.textContent = `$${lastEndMoney.toLocaleString()}`;
  $endBest.textContent = runTracker.getFormattedBestTime();
  $endScreen.classList.add('show');
}

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();

  updateInput();
  car.update(delta);
  updateCollision();

  passive.update(delta, allTrackIds, (id) => upgrades.getTrackMultiplier(id));

  if (!runTracker.isFinished) {
    driftScorer.update(car, delta, hitWall);
    runTracker.update(car, delta, driftScorer.getTotalPoints());

    if (runTracker.runFinishedThisFrame) {
      showEndScreen();
    }
  }

  updateCamera(delta);
  updateHUD();

  renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
