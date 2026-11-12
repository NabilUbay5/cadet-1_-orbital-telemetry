/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';

/**
 * 8-Bit Pixelated Planet Texture with Dithered Stepped Bands
 */
function generate8BitPlanetTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  // 8-Bit Deep Ocean stepped blocks
  ctx.fillStyle = '#050c18';
  ctx.fillRect(0, 0, 128, 64);

  ctx.fillStyle = '#0a1e38';
  ctx.fillRect(0, 16, 128, 32);

  ctx.fillStyle = '#0f2c52';
  ctx.fillRect(0, 24, 128, 16);

  // 8-Bit Emerald Continents with pixel blocks
  ctx.fillStyle = '#00aa55';
  for (let c = 0; c < 12; c++) {
    const cx = Math.floor(((c * 19) % 128) / 4) * 4;
    const cy = Math.floor((12 + (c * 7) % 40) / 4) * 4;
    const w = 12 + (c % 4) * 8;
    const h = 8 + (c % 3) * 6;
    ctx.fillRect(cx, cy, w, h);

    // Pixel detail highlights
    ctx.fillStyle = '#55ff99';
    ctx.fillRect(cx + 4, cy + 2, 4, 4);
    ctx.fillStyle = '#00aa55';
  }

  // 8-Bit Cyan/White Cloud Strips with checkerboard dithering
  ctx.fillStyle = '#dbfcff';
  for (let y = 10; y < 58; y += 14) {
    for (let x = 0; x < 128; x += 4) {
      if ((x + y) % 8 === 0) {
        ctx.fillRect(x, y, 6, 2);
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * 8-Bit Pixelated Solar Panel Texture
 */
function generate8BitSolarTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  ctx.fillStyle = '#050c1c';
  ctx.fillRect(0, 0, 64, 64);

  // High contrast 8-bit grid
  ctx.strokeStyle = '#00F0FF';
  ctx.lineWidth = 1;
  for (let x = 0; x <= 64; x += 16) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 64);
    ctx.stroke();
  }
  for (let y = 0; y <= 64; y += 16) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(64, y);
    ctx.stroke();
  }

  // Gold busbar
  ctx.fillStyle = '#FFB000';
  ctx.fillRect(31, 0, 2, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * 8-Bit Pixelated Asteroid Texture
 */
function generate8BitAsteroidTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  ctx.fillStyle = '#222630';
  ctx.fillRect(0, 0, 64, 64);

  // Chunky pixel crater blocks
  const colors = ['#151820', '#2d3340', '#3b4354', '#4b556a'];
  for (let x = 0; x < 64; x += 4) {
    for (let y = 0; y < 64; y += 4) {
      const idx = Math.floor(Math.random() * colors.length);
      ctx.fillStyle = colors[idx];
      ctx.fillRect(x, y, 4, 4);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Composite 8-Bit Retro Low-Poly Cadet-1 Craft
 */
export function createCadet1Craft(): {
  group: THREE.Group;
  leftThrusterFlame: THREE.Mesh;
  rightThrusterFlame: THREE.Mesh;
  leftThrusterLight: THREE.PointLight;
  rightThrusterLight: THREE.PointLight;
  rcsGroup: THREE.Group;
} {
  const group = new THREE.Group();
  group.name = 'Cadet1Craft';

  // 8-Bit High-Contrast Flat-Shaded Materials
  const hullMaterial = new THREE.MeshStandardMaterial({
    color: 0x141824,
    roughness: 0.3,
    metalness: 0.7,
    flatShading: true,
  });

  const secondaryHullMaterial = new THREE.MeshStandardMaterial({
    color: 0x222a3d,
    roughness: 0.4,
    metalness: 0.6,
    flatShading: true,
  });

  const neonCyanMaterial = new THREE.MeshStandardMaterial({
    color: 0x00f0ff,
    emissive: 0x00f0ff,
    emissiveIntensity: 1.8,
    roughness: 0.2,
    metalness: 0.8,
    flatShading: true,
  });

  const canopyMaterial = new THREE.MeshStandardMaterial({
    color: 0x00dbe9,
    emissive: 0x006970,
    emissiveIntensity: 0.8,
    roughness: 0.1,
    metalness: 0.2,
    flatShading: true,
    transparent: true,
    opacity: 0.9,
  });

  const thrusterMetalMaterial = new THREE.MeshStandardMaterial({
    color: 0x2a3245,
    roughness: 0.4,
    metalness: 0.8,
    flatShading: true,
  });

  const thrusterFlameMaterial = new THREE.MeshBasicMaterial({
    color: 0x00f0ff,
    wireframe: false,
  });

  // 1. Primary Fuselage (Faceted 8-bit wedge)
  const fuselageGeo = new THREE.ConeGeometry(1.2, 5.2, 5);
  fuselageGeo.rotateX(Math.PI / 2);
  fuselageGeo.scale(1.2, 0.48, 1.0);
  const fuselage = new THREE.Mesh(fuselageGeo, hullMaterial);
  fuselage.position.set(0, 0, 0);
  fuselage.castShadow = true;
  group.add(fuselage);

  // 2. 8-Bit Cockpit Canopy
  const canopyGeo = new THREE.ConeGeometry(0.55, 2.2, 4);
  canopyGeo.rotateX(Math.PI / 2);
  canopyGeo.scale(0.85, 0.35, 1.0);
  const canopy = new THREE.Mesh(canopyGeo, canopyMaterial);
  canopy.position.set(0, 0.35, -0.4);
  group.add(canopy);

  // 3. Port Swept Delta Wing
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 0);
  wingShape.lineTo(-3.4, 1.8);
  wingShape.lineTo(-3.2, 2.4);
  wingShape.lineTo(0, 1.2);
  wingShape.closePath();

  const wingExtrude = new THREE.ExtrudeGeometry(wingShape, {
    depth: 0.12,
    bevelEnabled: false,
  });
  wingExtrude.rotateX(Math.PI / 2);

  const leftWing = new THREE.Mesh(wingExtrude, secondaryHullMaterial);
  leftWing.position.set(-0.8, 0, 0);
  leftWing.castShadow = true;
  group.add(leftWing);

  // 4. Starboard Swept Delta Wing (Mirrored)
  const rightWing = new THREE.Mesh(wingExtrude, secondaryHullMaterial);
  rightWing.scale.set(-1, 1, 1);
  rightWing.position.set(0.8, 0, 0);
  rightWing.castShadow = true;
  group.add(rightWing);

  // 5. Port Winglet Stabilizer Fin
  const finGeo = new THREE.BoxGeometry(0.08, 0.9, 0.9);
  const leftFin = new THREE.Mesh(finGeo, secondaryHullMaterial);
  leftFin.position.set(-4.1, 0.45, 1.8);
  leftFin.rotation.z = -0.2;
  group.add(leftFin);

  // 6. Starboard Winglet Stabilizer Fin
  const rightFin = new THREE.Mesh(finGeo, secondaryHullMaterial);
  rightFin.position.set(4.1, 0.45, 1.8);
  rightFin.rotation.z = 0.2;
  group.add(rightFin);

  // 7. Port Ion Thruster Nacelle
  const nacelleGeo = new THREE.CylinderGeometry(0.38, 0.44, 2.4, 6);
  nacelleGeo.rotateX(Math.PI / 2);
  const leftNacelle = new THREE.Mesh(nacelleGeo, thrusterMetalMaterial);
  leftNacelle.position.set(-1.1, -0.05, 1.4);
  leftNacelle.castShadow = true;
  group.add(leftNacelle);

  // 8. Starboard Ion Thruster Nacelle
  const rightNacelle = new THREE.Mesh(nacelleGeo, thrusterMetalMaterial);
  rightNacelle.position.set(1.1, -0.05, 1.4);
  rightNacelle.castShadow = true;
  group.add(rightNacelle);

  // 9. Thruster Exhaust Nozzles
  const nozzleGeo = new THREE.CylinderGeometry(0.28, 0.36, 0.3, 6);
  nozzleGeo.rotateX(Math.PI / 2);
  const leftNozzle = new THREE.Mesh(nozzleGeo, neonCyanMaterial);
  leftNozzle.position.set(-1.1, -0.05, 2.6);
  group.add(leftNozzle);

  const rightNozzle = new THREE.Mesh(nozzleGeo, neonCyanMaterial);
  rightNozzle.position.set(1.1, -0.05, 2.6);
  group.add(rightNozzle);

  // 10. Stepped 8-Bit Thruster Flame Cones
  const flameGeo = new THREE.ConeGeometry(0.32, 2.2, 5);
  flameGeo.rotateX(-Math.PI / 2);
  const leftThrusterFlame = new THREE.Mesh(flameGeo, thrusterFlameMaterial);
  leftThrusterFlame.position.set(-1.1, -0.05, 3.8);
  leftThrusterFlame.scale.set(1, 1, 0.2);
  group.add(leftThrusterFlame);

  const rightThrusterFlame = new THREE.Mesh(flameGeo, thrusterFlameMaterial);
  rightThrusterFlame.position.set(1.1, -0.05, 3.8);
  rightThrusterFlame.scale.set(1, 1, 0.2);
  group.add(rightThrusterFlame);

  // Dynamic Thruster Lights
  const leftThrusterLight = new THREE.PointLight(0x00f0ff, 1.6, 10);
  leftThrusterLight.position.set(-1.1, -0.05, 3.2);
  group.add(leftThrusterLight);

  const rightThrusterLight = new THREE.PointLight(0x00f0ff, 1.6, 10);
  rightThrusterLight.position.set(1.1, -0.05, 3.2);
  group.add(rightThrusterLight);

  // 11. Forward Avionics Nose Sensor Probe
  const probeGeo = new THREE.CylinderGeometry(0.04, 0.08, 1.4, 4);
  probeGeo.rotateX(Math.PI / 2);
  const noseProbe = new THREE.Mesh(probeGeo, neonCyanMaterial);
  noseProbe.position.set(0, 0, -2.9);
  group.add(noseProbe);

  // 12. Navigation Beacons (Port Red, Starboard Green)
  const redBeacon = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.16, 0.16),
    new THREE.MeshBasicMaterial({ color: 0xff3344 })
  );
  redBeacon.position.set(-4.2, 0.8, 1.8);
  group.add(redBeacon);

  const greenBeacon = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.16, 0.16),
    new THREE.MeshBasicMaterial({ color: 0x00ff66 })
  );
  greenBeacon.position.set(4.2, 0.8, 1.8);
  group.add(greenBeacon);

  // Forward Nose Headlight
  const noseLight = new THREE.SpotLight(0xdbfcff, 3.2, 80, Math.PI / 6, 0.4, 1.0);
  noseLight.position.set(0, 0.1, -2.6);
  noseLight.target.position.set(0, 0, -50);
  group.add(noseLight);
  group.add(noseLight.target);

  const rcsGroup = new THREE.Group();
  group.add(rcsGroup);

  return {
    group,
    leftThrusterFlame,
    rightThrusterFlame,
    leftThrusterLight,
    rightThrusterLight,
    rcsGroup,
  };
}

/**
 * 8-Bit Space Station Alpha with Rotating Habitation Ring
 */
export function createSpaceStationAlpha(): {
  group: THREE.Group;
  rotatingRing: THREE.Group;
  dockingZonePosition: THREE.Vector3;
  dockingTargetBox: THREE.Box3;
} {
  const group = new THREE.Group();
  group.name = 'SpaceStationAlpha';
  group.position.set(0, 40, -420);

  const metalMat = new THREE.MeshStandardMaterial({
    color: 0x222a3c,
    roughness: 0.35,
    metalness: 0.7,
    flatShading: true,
  });

  const darkMat = new THREE.MeshStandardMaterial({
    color: 0x0d111a,
    roughness: 0.5,
    metalness: 0.5,
    flatShading: true,
  });

  const cyanEmissiveMat = new THREE.MeshStandardMaterial({
    color: 0x00f0ff,
    emissive: 0x00f0ff,
    emissiveIntensity: 2.0,
    flatShading: true,
  });

  const greenEmissiveMat = new THREE.MeshStandardMaterial({
    color: 0x00ff66,
    emissive: 0x00ff66,
    emissiveIntensity: 2.0,
    flatShading: true,
  });

  // Central Core Hex Cylinder
  const coreGeo = new THREE.CylinderGeometry(14, 14, 110, 8);
  coreGeo.rotateX(Math.PI / 2);
  const core = new THREE.Mesh(coreGeo, metalMat);
  group.add(core);

  // Docking Bay Corridor
  const bayHangarGeo = new THREE.CylinderGeometry(8.5, 9.5, 36, 8, 1, true);
  bayHangarGeo.rotateX(Math.PI / 2);
  const bayHangar = new THREE.Mesh(bayHangarGeo, darkMat);
  bayHangar.position.set(0, 0, 45);
  group.add(bayHangar);

  // Docking Guide Rings
  for (let z = 32; z <= 60; z += 9) {
    const ringGeo = new THREE.TorusGeometry(8.8, 0.45, 4, 16);
    const ringMesh = new THREE.Mesh(ringGeo, z === 32 ? greenEmissiveMat : cyanEmissiveMat);
    ringMesh.position.set(0, 0, z);
    group.add(ringMesh);
  }

  // Rotating Habitation Ring
  const rotatingRing = new THREE.Group();
  group.add(rotatingRing);

  const torusGeo = new THREE.TorusGeometry(65, 3.2, 6, 20);
  const habitatTorus = new THREE.Mesh(torusGeo, metalMat);
  rotatingRing.add(habitatTorus);

  // 4 Connecting Spokes
  const spokeGeo = new THREE.CylinderGeometry(1.4, 1.4, 65, 4);
  for (let i = 0; i < 4; i++) {
    const spoke = new THREE.Mesh(spokeGeo, metalMat);
    spoke.rotation.z = (i * Math.PI) / 2;
    rotatingRing.add(spoke);
  }

  // Pixel Solar Panels
  const solarTexture = generate8BitSolarTexture();
  const solarMat = new THREE.MeshStandardMaterial({
    map: solarTexture,
    metalness: 0.8,
    roughness: 0.2,
    flatShading: true,
  });

  const solarGeo = new THREE.BoxGeometry(22, 1.2, 8);
  for (let s = 0; s < 8; s++) {
    const angle = (s / 8) * Math.PI * 2;
    const solarPanel = new THREE.Mesh(solarGeo, solarMat);
    solarPanel.position.set(Math.cos(angle) * 74, Math.sin(angle) * 74, 0);
    solarPanel.rotation.z = angle + Math.PI / 2;
    rotatingRing.add(solarPanel);
  }

  // Communications Dish Array
  const dishGeo = new THREE.SphereGeometry(6, 8, 6, 0, Math.PI * 2, 0, Math.PI / 3);
  const dish = new THREE.Mesh(dishGeo, metalMat);
  dish.position.set(0, 22, -45);
  dish.rotation.x = Math.PI / 4;
  group.add(dish);

  // Docking target position
  const dockingZonePosition = new THREE.Vector3(0, 40, -370);
  const dockingTargetBox = new THREE.Box3(
    new THREE.Vector3(-6, 34, -385),
    new THREE.Vector3(6, 46, -360)
  );

  return {
    group,
    rotatingRing,
    dockingZonePosition,
    dockingTargetBox,
  };
}

/**
 * 8-Bit Holographic Vector Waypoint Gate
 */
export function createWaypointRing(_index: number, position: THREE.Vector3): {
  group: THREE.Group;
  passed: boolean;
  radius: number;
} {
  const group = new THREE.Group();
  group.position.copy(position);

  // Hexagonal retro vector ring
  const ringGeo = new THREE.TorusGeometry(6.2, 0.4, 4, 6);
  const ringMat = new THREE.MeshStandardMaterial({
    color: 0x00f0ff,
    emissive: 0x00f0ff,
    emissiveIntensity: 2.4,
    transparent: true,
    opacity: 0.9,
    flatShading: true,
  });
  const ringMesh = new THREE.Mesh(ringGeo, ringMat);
  group.add(ringMesh);

  // Retro Chevron directional arrows
  for (let c = 0; c < 3; c++) {
    const chevronGeo = new THREE.ConeGeometry(0.9, 1.4, 4);
    chevronGeo.rotateX(Math.PI / 2);
    const chevron = new THREE.Mesh(chevronGeo, ringMat);
    chevron.position.set(0, 0, -1.8 + c * 1.8);
    group.add(chevron);
  }

  const light = new THREE.PointLight(0x00f0ff, 2.0, 20);
  group.add(light);

  return {
    group,
    passed: false,
    radius: 6.8,
  };
}

/**
 * 8-Bit Telemetry Research Data Pod (Rotating Octahedron)
 */
// REVIEW: Potential unused method - verify dynamic references
export function createTelemetryPod(position: THREE.Vector3): {
  group: THREE.Group;
  core: THREE.Mesh;
  halo: THREE.Mesh;
  collected: boolean;
} {
  const group = new THREE.Group();
  group.position.copy(position);

  // Glowing 8-bit Octahedron
  const coreGeo = new THREE.OctahedronGeometry(1.5, 0);
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0x00f0ff,
    emissive: 0x00f0ff,
    emissiveIntensity: 2.6,
    metalness: 0.8,
    roughness: 0.2,
    flatShading: true,
  });
  const core = new THREE.Mesh(coreGeo, coreMat);
  group.add(core);

  // Square Retro Wireframe Gimbal
  const haloGeo = new THREE.TorusGeometry(2.4, 0.14, 4, 8);
  const haloMat = new THREE.MeshBasicMaterial({
    color: 0xffb000,
    wireframe: true,
  });
  const halo = new THREE.Mesh(haloGeo, haloMat);
  group.add(halo);

  const light = new THREE.PointLight(0x00f0ff, 2.0, 16);
  group.add(light);

  return {
    group,
    core,
    halo,
    collected: false,
  };
}

/**
 * 8-Bit Oxygen Canister
 */
export function createOxygenCanister(position: THREE.Vector3): {
  group: THREE.Group;
  mesh: THREE.Mesh;
  collected: boolean;
} {
  const group = new THREE.Group();
  group.position.copy(position);

  const canGeo = new THREE.CylinderGeometry(0.7, 0.7, 2.4, 6);
  const canMat = new THREE.MeshStandardMaterial({
    color: 0x00ff66,
    emissive: 0x00ff66,
    emissiveIntensity: 2.2,
    metalness: 0.7,
    roughness: 0.3,
    flatShading: true,
  });
  const mesh = new THREE.Mesh(canGeo, canMat);
  group.add(mesh);

  const light = new THREE.PointLight(0x00ff66, 1.8, 14);
  group.add(light);

  return {
    group,
    mesh,
    collected: false,
  };
}

/**
 * 8-Bit Low-Poly Asteroid Hazard
 */
export function createAsteroidDebris(position: THREE.Vector3, scale: number = 4.0): {
  mesh: THREE.Mesh;
  rotationSpeed: THREE.Vector3;
  radius: number;
} {
  const geo = new THREE.IcosahedronGeometry(scale, 0); // Level 0 icosahedron for chunky 8-bit facets
  geo.computeVertexNormals();

  const texture = generate8BitAsteroidTexture();
  const mat = new THREE.MeshStandardMaterial({
    map: texture,
    color: 0x444b58,
    roughness: 0.85,
    metalness: 0.2,
    flatShading: true,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(position);
  mesh.castShadow = true;

  const rotationSpeed = new THREE.Vector3(
    (Math.random() - 0.5) * 0.4,
    (Math.random() - 0.5) * 0.4,
    (Math.random() - 0.5) * 0.4
  );

  return {
    mesh,
    rotationSpeed,
    radius: scale * 1.1,
  };
}

/**
 * 8-Bit Celestial Environment & Starfield
 */
export function createCelestialEnvironment(): {
  stars: THREE.Points;
  planet: THREE.Mesh;
} {
  // 1. 8-Bit Starfield with square pixel particles
  const starCount = 2400;
  const starGeo = new THREE.BufferGeometry();
  const starPositions = new Float32Array(starCount * 3);
  const starColors = new Float32Array(starCount * 3);

  for (let i = 0; i < starCount; i++) {
    const i3 = i * 3;
    const radius = 900 + Math.random() * 800;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 2 - 1);

    starPositions[i3] = radius * Math.sin(phi) * Math.cos(theta);
    starPositions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    starPositions[i3 + 2] = radius * Math.cos(phi);

    // 8-Bit Arcade Color Palette (Cyan, Gold, White, Magenta)
    const tint = Math.random();
    if (tint > 0.75) {
      // Arcade Cyan (#00F0FF)
      starColors[i3] = 0.0;
      starColors[i3 + 1] = 0.94;
      starColors[i3 + 2] = 1.0;
    } else if (tint > 0.55) {
      // Arcade Gold (#FFB000)
      starColors[i3] = 1.0;
      starColors[i3 + 1] = 0.69;
      starColors[i3 + 2] = 0.0;
    } else if (tint > 0.4) {
      // Neon Magenta (#FF0077)
      starColors[i3] = 1.0;
      starColors[i3 + 1] = 0.0;
      starColors[i3 + 2] = 0.47;
    } else {
      // Crisp White
      starColors[i3] = 1.0;
      starColors[i3 + 1] = 1.0;
      starColors[i3 + 2] = 1.0;
    }
  }

  starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

  const starMat = new THREE.PointsMaterial({
    size: 3.0,
    vertexColors: true,
    transparent: true,
    opacity: 0.95,
  });
  const stars = new THREE.Points(starGeo, starMat);

  // 2. 8-Bit Low-Poly Horizon Planet
  const planetGeo = new THREE.SphereGeometry(650, 24, 16);
  const planetTexture = generate8BitPlanetTexture();
  const planetMat = new THREE.MeshStandardMaterial({
    map: planetTexture,
    roughness: 0.8,
    metalness: 0.1,
    flatShading: true,
  });
  const planet = new THREE.Mesh(planetGeo, planetMat);
  planet.position.set(200, -820, -550);
  planet.rotation.y = 0.6;
  planet.rotation.x = 0.2;

  return {
    stars,
    planet,
  };
}

/**
 * 8-Bit Glowing Energy Cube (Stage 2 Collectible)
 */
export function createEnergyCube(position: THREE.Vector3): {
  group: THREE.Group;
  cube: THREE.Mesh;
  wire: THREE.LineSegments;
  collected: boolean;
} {
  const group = new THREE.Group();
  group.position.copy(position);

  // Solid Neon Core
  const boxGeo = new THREE.BoxGeometry(2.4, 2.4, 2.4);
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0x00f0ff,
    emissive: 0x00f0ff,
    emissiveIntensity: 2.5,
    metalness: 0.8,
    roughness: 0.2,
    flatShading: true,
  });
  const cube = new THREE.Mesh(boxGeo, coreMat);
  group.add(cube);

  // 8-Bit Gold Wireframe Outline
  const edgesGeo = new THREE.EdgesGeometry(boxGeo);
  const wireMat = new THREE.LineBasicMaterial({
    color: 0xffb000,
    linewidth: 2,
  });
  const wire = new THREE.LineSegments(edgesGeo, wireMat);
  group.add(wire);

  const light = new THREE.PointLight(0x00f0ff, 2.2, 18);
  group.add(light);

  return {
    group,
    cube,
    wire,
    collected: false,
  };
}

/**
 * 8-Bit Deep Space Satellite Relay (Stage 3 Alignment Target)
 */
export function createSatelliteRelay(position: THREE.Vector3): {
  group: THREE.Group;
  dish: THREE.Mesh;
  alignmentTarget: THREE.Mesh;
} {
  const group = new THREE.Group();
  group.position.copy(position);

  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xffb000,
    metalness: 0.8,
    roughness: 0.2,
    flatShading: true,
  });

  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x182236,
    metalness: 0.6,
    roughness: 0.4,
    flatShading: true,
  });

  // Central Avionics Bus
  const busGeo = new THREE.BoxGeometry(3.5, 3.5, 5);
  const bus = new THREE.Mesh(busGeo, bodyMat);
  group.add(bus);

  // Twin Solar Wings
  const solarGeo = new THREE.BoxGeometry(14, 0.4, 3.2);
  const leftSolar = new THREE.Mesh(solarGeo, goldMat);
  leftSolar.position.set(-10, 0, 0);
  group.add(leftSolar);

  const rightSolar = new THREE.Mesh(solarGeo, goldMat);
  rightSolar.position.set(10, 0, 0);
  group.add(rightSolar);

  // Parabolic Telemetry Dish Antenna (facing towards player +Z)
  const dishGeo = new THREE.ConeGeometry(3.2, 1.8, 8, 1, true);
  dishGeo.rotateX(-Math.PI / 2);
  const dishMat = new THREE.MeshStandardMaterial({
    color: 0x00f0ff,
    emissive: 0x006970,
    emissiveIntensity: 0.8,
    metalness: 0.9,
    roughness: 0.2,
    flatShading: true,
  });
  const dish = new THREE.Mesh(dishGeo, dishMat);
  dish.position.set(0, 0, 3.5);
  group.add(dish);

  // Holographic Alignment Target Ring
  const targetGeo = new THREE.TorusGeometry(5.5, 0.2, 4, 16);
  const targetMat = new THREE.MeshBasicMaterial({
    color: 0x00ff66,
    wireframe: true,
  });
  const alignmentTarget = new THREE.Mesh(targetGeo, targetMat);
  alignmentTarget.position.set(0, 0, 7.0);
  group.add(alignmentTarget);

  // Flashing signal beacon
  const beaconLight = new THREE.PointLight(0x00ff66, 2.5, 30);
  beaconLight.position.set(0, 0, 4);
  group.add(beaconLight);

  return {
    group,
    dish,
    alignmentTarget,
  };
}
