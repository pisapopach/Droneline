import * as THREE from 'three';
import type { BuildingId } from '../data/munitions';
import { getPbrTextureSet } from './threeTextures';

function addShadowDisc(
  parent: THREE.Group,
  x: number,
  z: number,
  rx: number,
  rz: number,
  opacity = 0.55,
  y = 0.015,
) {
  const tex = getPbrTextureSet().contactShadowMap;
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    opacity,
    depthWrite: false,
  });
  const geo = new THREE.PlaneGeometry(rx * 2, rz * 2);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, y, z);
  mesh.renderOrder = 1;
  parent.add(mesh);
}

function makeBox(
  w: number,
  h: number,
  d: number,
  mat: THREE.Material,
  x: number,
  yCenter: number,
  z: number,
  castShadow = true,
  receiveShadow = true,
): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, yCenter, z);
  m.castShadow = castShadow;
  m.receiveShadow = receiveShadow;
  return m;
}

function addFoundation(
  group: THREE.Group,
  w: number,
  d: number,
  mat: THREE.Material,
  h = 0.16,
) {
  addShadowDisc(group, 0, 0, w * 0.68, d * 0.68, 0.58, 0.005);
  const pad = makeBox(w, h, d, mat, 0, h / 2, 0, false, true);
  group.add(pad);
}

function add3DTree(group: THREE.Group, x: number, z: number, scale = 1, baseY = 0.16) {
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4b3828, roughness: 0.92 });
  const leafMatA = new THREE.MeshStandardMaterial({ color: 0x3b692b, roughness: 0.85 });
  const leafMatB = new THREE.MeshStandardMaterial({ color: 0x52823a, roughness: 0.82 });

  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06 * scale, 0.09 * scale, 0.34 * scale, 7),
    trunkMat,
  );
  trunk.position.set(x, baseY + 0.17 * scale, z);
  trunk.castShadow = true;
  group.add(trunk);

  const c1 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.24 * scale, 1), leafMatA);
  c1.position.set(x, baseY + 0.44 * scale, z);
  c1.castShadow = true;
  group.add(c1);

  const c2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.17 * scale, 1), leafMatB);
  c2.position.set(x - 0.08 * scale, baseY + 0.54 * scale, z + 0.07 * scale);
  c2.castShadow = true;
  group.add(c2);
}

function addTinyCar(group: THREE.Group, x: number, z: number, colorHex: number, rotY = 0, baseY = 0.16) {
  const carG = new THREE.Group();
  carG.position.set(x, baseY, z);
  carG.rotation.y = rotY;
  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: colorHex,
    roughness: 0.35,
    metalness: 0.4,
    clearcoat: 0.65,
  });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x162230, roughness: 0.15, metalness: 0.7 });
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x181a1e, roughness: 0.9 });

  carG.add(makeBox(0.38, 0.11, 0.19, bodyMat, 0, 0.075, 0));
  carG.add(makeBox(0.2, 0.08, 0.16, glassMat, -0.02, 0.16, 0));
  for (const wx of [-0.11, 0.11]) {
    for (const wz of [-0.095, 0.095]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.03, 10), wheelMat);
      w.rotation.x = Math.PI / 2;
      w.position.set(wx, 0.04, wz);
      carG.add(w);
    }
  }
  group.add(carG);
}

export function buildBuilding3DGroup(id: BuildingId | 'airfield'): THREE.Group {
  const tex = getPbrTextureSet();
  const root = new THREE.Group();

  const concreteMat = new THREE.MeshStandardMaterial({
    map: tex.concreteMap,
    bumpMap: tex.concreteBump,
    bumpScale: 0.025,
    roughness: 0.86,
    metalness: 0.05,
  });
  const asphaltMat = new THREE.MeshStandardMaterial({
    map: tex.asphaltMap,
    roughness: 0.9,
    metalness: 0.04,
  });
  const corrugatedMat = new THREE.MeshStandardMaterial({
    map: tex.corrugatedMap,
    bumpMap: tex.corrugatedBump,
    bumpScale: 0.035,
    roughness: 0.48,
    metalness: 0.62,
  });
  const brickMat = new THREE.MeshStandardMaterial({
    map: tex.brickMap,
    bumpMap: tex.brickBump,
    bumpScale: 0.03,
    roughness: 0.88,
    metalness: 0.02,
  });
  const steelDarkMat = new THREE.MeshStandardMaterial({
    color: 0x2c343d,
    roughness: 0.4,
    metalness: 0.82,
  });
  const steelLightMat = new THREE.MeshStandardMaterial({
    color: 0x9aa4af,
    roughness: 0.34,
    metalness: 0.85,
  });
  const roofDarkMat = new THREE.MeshStandardMaterial({
    color: 0x3b424c,
    roughness: 0.85,
    metalness: 0.12,
  });

  if (id === 'residential') {
    const courtyardMat = new THREE.MeshStandardMaterial({ color: 0x5c694b, roughness: 0.92 });
    addFoundation(root, 4.7, 4.5, courtyardMat, 0.14);
    // Paved courtyard road
    root.add(makeBox(4.3, 0.03, 0.72, asphaltMat, 0, 0.155, 0.35, false, true));
    root.add(makeBox(0.68, 0.03, 3.8, asphaltMat, 0.05, 0.155, 0, false, true));

    const facadeTex1 = tex.windowFacadeMap.clone();
    facadeTex1.repeat.set(2, 2.6);
    facadeTex1.needsUpdate = true;
    const facadeMat1 = new THREE.MeshStandardMaterial({
      map: facadeTex1,
      bumpMap: tex.windowFacadeBump,
      bumpScale: 0.025,
      roughness: 0.65,
      metalness: 0.15,
    });
    const warmWallMat = new THREE.MeshStandardMaterial({ color: 0xc8bca8, roughness: 0.85 });
    const terracottaMat = new THREE.MeshStandardMaterial({ color: 0x924b3a, roughness: 0.78 });

    const towers = [
      { x: -1.25, z: -1.05, w: 1.45, h: 2.35, d: 1.15, accent: terracottaMat },
      { x: 1.2, z: -0.95, w: 1.35, h: 1.75, d: 1.25, accent: warmWallMat },
      { x: -1.1, z: 1.28, w: 1.5, h: 1.42, d: 1.05, accent: warmWallMat },
    ];

    for (const t of towers) {
      addShadowDisc(root, t.x, t.z, t.w * 0.75, t.d * 0.75, 0.45, 0.15);
      // Main tower body with window facade on sides
      const bldg = new THREE.Mesh(
        new THREE.BoxGeometry(t.w, t.h, t.d),
        [facadeMat1, facadeMat1, roofDarkMat, concreteMat, facadeMat1, facadeMat1],
      );
      bldg.position.set(t.x, 0.14 + t.h / 2, t.z);
      bldg.castShadow = true;
      bldg.receiveShadow = true;
      root.add(bldg);

      // Roof parapet rim & elevator mechanical penthouse + HVAC units
      root.add(makeBox(t.w + 0.08, 0.09, t.d + 0.08, t.accent, t.x, 0.14 + t.h + 0.04, t.z));
      root.add(makeBox(t.w * 0.36, 0.28, t.d * 0.34, concreteMat, t.x - 0.15, 0.14 + t.h + 0.18, t.z - 0.1));
      root.add(makeBox(0.22, 0.14, 0.22, steelLightMat, t.x + 0.3, 0.14 + t.h + 0.11, t.z + 0.18));

      // Protruding concrete balconies on front face
      const floors = Math.floor(t.h / 0.45);
      for (let f = 1; f < floors; f++) {
        root.add(
          makeBox(
            t.w * 0.55,
            0.07,
            0.16,
            concreteMat,
            t.x,
            0.14 + f * 0.45,
            t.z + t.d / 2 + 0.07,
          ),
        );
      }
    }

    // Courtyard trees & parked cars
    add3DTree(root, 1.35, 1.25, 1.05, 0.14);
    add3DTree(root, 0.8, 1.5, 0.85, 0.14);
    add3DTree(root, -0.2, -1.5, 0.95, 0.14);
    addTinyCar(root, 0.72, 0.35, 0x3b82f6, 0, 0.17);
    addTinyCar(root, 1.35, 0.35, 0xd97706, 0.1, 0.17);
    addTinyCar(root, -0.4, 0.35, 0xe2e8f0, Math.PI, 0.17);
    return root;
  }

  if (id === 'factory') {
    addFoundation(root, 4.9, 4.5, concreteMat, 0.16);
    root.add(makeBox(4.7, 0.03, 0.95, asphaltMat, 0, 0.17, 1.55, false, true));

    // Twin sawtooth industrial assembly halls
    const sawShape = new THREE.Shape();
    sawShape.moveTo(-1.85, 0);
    sawShape.lineTo(1.85, 0);
    sawShape.lineTo(1.85, 1.05);
    sawShape.lineTo(1.2, 1.38);
    sawShape.lineTo(1.2, 1.05);
    sawShape.lineTo(0.2, 1.38);
    sawShape.lineTo(0.2, 1.05);
    sawShape.lineTo(-0.85, 1.38);
    sawShape.lineTo(-0.85, 1.05);
    sawShape.lineTo(-1.85, 1.38);
    sawShape.closePath();

    const hallGeo = new THREE.ExtrudeGeometry(sawShape, {
      depth: 1.55,
      bevelEnabled: true,
      bevelThickness: 0.03,
      bevelSize: 0.03,
      bevelSegments: 2,
    });
    const hall1 = new THREE.Mesh(hallGeo, corrugatedMat);
    hall1.position.set(-0.2, 0.16, -1.65);
    hall1.castShadow = true;
    hall1.receiveShadow = true;
    root.add(hall1);

    const hall2 = new THREE.Mesh(hallGeo, brickMat);
    hall2.scale.set(0.92, 0.86, 0.75);
    hall2.position.set(-0.3, 0.16, 0.15);
    hall2.castShadow = true;
    hall2.receiveShadow = true;
    root.add(hall2);

    // Tall brick/concrete smokestack with red/white aviation stripes
    const stackX = 1.82;
    const stackZ = -1.25;
    const stackBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.28, 2.75, 16),
      brickMat,
    );
    stackBase.position.set(stackX, 0.16 + 1.375, stackZ);
    stackBase.castShadow = true;
    root.add(stackBase);

    const whiteBand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.195, 0.21, 0.25, 16),
      new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.6 }),
    );
    whiteBand.position.set(stackX, 2.38, stackZ);
    root.add(whiteBand);

    const redBand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.185, 0.198, 0.26, 16),
      new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.55 }),
    );
    redBand.position.set(stackX, 2.65, stackZ);
    root.add(redBand);

    // Overhead pipe bridge & external steel silos
    root.add(makeBox(1.8, 0.14, 0.24, steelLightMat, 0.5, 1.32, 0.05));
    for (const sx of [-1.85, -1.35]) {
      const silo = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.45, 16), steelLightMat);
      silo.position.set(sx, 0.16 + 0.725, 1.5);
      silo.castShadow = true;
      root.add(silo);
    }

    // Shipping containers in loading yard
    root.add(makeBox(0.75, 0.3, 0.32, new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.6 }), 0.7, 0.31, 1.55));
    root.add(makeBox(0.75, 0.3, 0.32, new THREE.MeshStandardMaterial({ color: 0xc2410c, roughness: 0.6 }), 1.55, 0.31, 1.55));
    return root;
  }

  if (id === 'gas-station') {
    addFoundation(root, 4.6, 4.2, asphaltMat, 0.14);
    // Concrete forecourt island
    root.add(makeBox(3.5, 0.04, 2.4, concreteMat, -0.25, 0.16, 0.25, false, true));

    // Convenience store / operator kiosk with illuminated glass storefront
    const shopMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.65 });
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x7dd3fc,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.28,
      roughness: 0.12,
      metalness: 0.4,
      clearcoat: 1.0,
    });
    root.add(makeBox(1.85, 0.85, 1.05, shopMat, -0.95, 0.58, -1.25));
    root.add(makeBox(1.55, 0.52, 0.06, glassMat, -0.95, 0.52, -0.71));
    root.add(makeBox(2.05, 0.12, 1.25, new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.4 }), -0.95, 1.05, -1.25));

    // Elevated fuel forecourt canopy on 4 steel columns
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.35, metalness: 0.3 });
    const fasciaMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 0.25,
      roughness: 0.38,
    });
    root.add(makeBox(2.85, 0.14, 1.85, canopyMat, 0.1, 1.48, 0.48));
    root.add(makeBox(2.92, 0.1, 1.92, fasciaMat, 0.1, 1.56, 0.48));

    for (const cx of [-0.95, 1.15]) {
      for (const cz of [-0.22, 1.18]) {
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.075, 1.32, 12), steelLightMat);
        col.position.set(cx, 0.8, cz);
        col.castShadow = true;
        root.add(col);
      }
    }

    // 4 double-sided fuel dispensers on islands
    const pumpBody = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
    const pumpHead = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.45 });
    for (const px of [-0.55, 0.72]) {
      for (const pz of [0.1, 0.85]) {
        root.add(makeBox(0.38, 0.06, 0.22, concreteMat, px, 0.19, pz));
        root.add(makeBox(0.24, 0.42, 0.14, pumpBody, px, 0.43, pz));
        root.add(makeBox(0.26, 0.1, 0.16, pumpHead, px, 0.65, pz));
      }
    }

    // Fuel price totem pylon sign
    root.add(makeBox(0.32, 1.85, 0.14, steelDarkMat, 1.85, 1.06, -1.25));
    root.add(makeBox(0.34, 0.65, 0.16, fasciaMat, 1.85, 1.62, -1.25));

    // Parked vehicles refueling
    addTinyCar(root, -0.55, 0.46, 0xef4444, 0.05, 0.18);
    addTinyCar(root, 0.72, 1.22, 0xe2e8f0, -0.04, 0.18);
    return root;
  }

  if (id === 'oil-depot') {
    const gravelMat = new THREE.MeshStandardMaterial({ color: 0x625d55, roughness: 0.94 });
    addFoundation(root, 4.9, 4.6, gravelMat, 0.15);

    // Concrete bund containment walls
    for (const bz of [-2.15, 2.15]) {
      root.add(makeBox(4.7, 0.24, 0.12, concreteMat, 0, 0.26, bz));
    }
    for (const bx of [-2.3, 2.3]) {
      root.add(makeBox(0.12, 0.24, 4.4, concreteMat, bx, 0.26, 0));
    }

    const tankWhiteMat = new THREE.MeshStandardMaterial({ color: 0xd8dfe6, roughness: 0.36, metalness: 0.55 });
    const hazardBandMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.45, metalness: 0.25 });

    // 3 large cylindrical vertical crude oil storage tanks with geodesic dome caps
    const tanks = [
      { x: -1.12, z: -0.95, r: 0.85, h: 1.25 },
      { x: 1.05, z: -0.95, r: 0.85, h: 1.25 },
      { x: -1.05, z: 1.05, r: 0.78, h: 1.15 },
    ];
    for (const tk of tanks) {
      addShadowDisc(root, tk.x, tk.z, tk.r * 1.25, tk.r * 1.25, 0.45, 0.16);
      const cyl = new THREE.Mesh(new THREE.CylinderGeometry(tk.r, tk.r, tk.h, 28), tankWhiteMat);
      cyl.position.set(tk.x, 0.15 + tk.h / 2, tk.z);
      cyl.castShadow = true;
      cyl.receiveShadow = true;
      root.add(cyl);

      const band = new THREE.Mesh(
        new THREE.CylinderGeometry(tk.r + 0.012, tk.r + 0.012, 0.16, 28),
        hazardBandMat,
      );
      band.position.set(tk.x, 0.15 + tk.h * 0.78, tk.z);
      root.add(band);

      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(tk.r, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.35),
        steelLightMat,
      );
      dome.scale.set(1, 0.45, 1);
      dome.position.set(tk.x, 0.15 + tk.h - 0.18, tk.z);
      dome.castShadow = true;
      root.add(dome);
    }

    // Spherical LPG Horton pressure sphere on steel legs
    const sphereX = 1.2;
    const sphereZ = 1.05;
    const lpgSphere = new THREE.Mesh(new THREE.SphereGeometry(0.54, 24, 18), tankWhiteMat);
    lpgSphere.position.set(sphereX, 0.85, sphereZ);
    lpgSphere.castShadow = true;
    root.add(lpgSphere);
    for (let a = 0; a < 4; a++) {
      const ang = (a * Math.PI) / 2 + Math.PI / 4;
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.75, 8), steelDarkMat);
      leg.position.set(sphereX + Math.cos(ang) * 0.38, 0.52, sphereZ + Math.sin(ang) * 0.38);
      root.add(leg);
    }

    // Overhead steel pipe manifold connecting tanks + pump house
    const pipeCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.1, 0.65, -0.1),
      new THREE.Vector3(0.0, 0.65, -0.1),
      new THREE.Vector3(1.1, 0.65, -0.1),
    ]);
    const pipe = new THREE.Mesh(new THREE.TubeGeometry(pipeCurve, 12, 0.075, 10, false), steelLightMat);
    pipe.castShadow = true;
    root.add(pipe);
    root.add(makeBox(0.75, 0.45, 0.55, corrugatedMat, 0.05, 0.38, 1.35));
    return root;
  }

  if (id === 'power-plant') {
    addFoundation(root, 5.1, 4.7, concreteMat, 0.16);

    // Massive Turbine Hall
    root.add(makeBox(2.45, 1.05, 1.65, corrugatedMat, -0.95, 0.68, 0.85));
    root.add(makeBox(2.55, 0.12, 1.75, roofDarkMat, -0.95, 1.24, 0.85));

    // Twin iconic Hyperbolic Cooling Towers via LatheGeometry
    const hyperPoints: THREE.Vector2[] = [];
    for (let i = 0; i <= 14; i++) {
      const t = i / 14;
      const y = t * 2.15;
      const r = 0.68 - Math.sin(t * Math.PI * 0.82) * 0.24 + t * 0.04;
      hyperPoints.push(new THREE.Vector2(r, y));
    }
    const towerGeo = new THREE.LatheGeometry(hyperPoints, 28);
    const towerMat = new THREE.MeshStandardMaterial({
      map: tex.concreteMap,
      color: 0xd0d6dc,
      roughness: 0.82,
      side: THREE.DoubleSide,
    });
    const darkThroatMat = new THREE.MeshStandardMaterial({ color: 0x161c24, roughness: 0.9 });

    for (const [tx, tz] of [
      [-1.35, -1.05],
      [0.35, -1.15],
    ]) {
      addShadowDisc(root, tx, tz, 0.9, 0.9, 0.5, 0.165);
      const tMesh = new THREE.Mesh(towerGeo, towerMat);
      tMesh.position.set(tx, 0.16, tz);
      tMesh.castShadow = true;
      tMesh.receiveShadow = true;
      root.add(tMesh);

      const throat = new THREE.Mesh(new THREE.CircleGeometry(0.45, 22), darkThroatMat);
      throat.rotation.x = -Math.PI / 2;
      throat.position.set(tx, 2.25, tz);
      root.add(throat);
    }

    // Tall striped flue stack
    const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 2.75, 16), concreteMat);
    stack.position.set(1.75, 1.53, -1.15);
    stack.castShadow = true;
    root.add(stack);
    const stackTip = new THREE.Mesh(
      new THREE.CylinderGeometry(0.145, 0.16, 0.35, 16),
      new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.5 }),
    );
    stackTip.position.set(1.75, 2.72, -1.15);
    root.add(stackTip);

    // Outdoor High-Voltage Switchyard Transformers & Ceramic Bushings + Transmission Pylon
    const trfMat = new THREE.MeshStandardMaterial({ color: 0x4b5563, roughness: 0.48, metalness: 0.65 });
    const coilGlowMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.45,
      roughness: 0.3,
    });
    for (const tx of [0.85, 1.65]) {
      root.add(makeBox(0.56, 0.52, 0.65, trfMat, tx, 0.42, 0.95));
      for (const bx of [-0.15, 0, 0.15]) {
        const bush = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.3, 8), coilGlowMat);
        bush.position.set(tx + bx, 0.82, 0.95);
        root.add(bush);
      }
    }
    return root;
  }

  if (id === 'ammo-depot') {
    const turfMat = new THREE.MeshStandardMaterial({ color: 0x4b593a, roughness: 0.92 });
    addFoundation(root, 4.8, 4.4, turfMat, 0.14);
    root.add(makeBox(4.3, 0.03, 0.68, concreteMat, 0, 0.15, 0.1, false, true));

    // Earth-bermed arched concrete reinforcement bunkers (ExtrudeGeometry)
    const archShape = new THREE.Shape();
    archShape.moveTo(-0.75, 0);
    archShape.absarc(0, 0, 0.75, Math.PI, 0, true);
    archShape.lineTo(0.75, 0);
    archShape.closePath();

    const archGeo = new THREE.ExtrudeGeometry(archShape, {
      depth: 1.55,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.04,
      bevelSegments: 3,
    });

    const bunkerConfigs = [
      { x: -1.15, z: -1.7 },
      { x: 1.05, z: -1.7 },
      { x: -1.15, z: 0.55 },
    ];
    for (const bk of bunkerConfigs) {
      const m = new THREE.Mesh(archGeo, turfMat);
      m.position.set(bk.x, 0.14, bk.z);
      m.castShadow = true;
      m.receiveShadow = true;
      root.add(m);

      // Front reinforced concrete headwall & steel blast doors
      root.add(makeBox(1.56, 0.82, 0.1, concreteMat, bk.x, 0.55, bk.z + 1.56));
      root.add(makeBox(0.78, 0.55, 0.12, steelDarkMat, bk.x, 0.42, bk.z + 1.58));
    }

    // Stacked olive-drab munition crates + perimeter watchtower
    const crateMat = new THREE.MeshStandardMaterial({ map: tex.natoOliveMap, roughness: 0.78 });
    for (let cx = 0.55; cx <= 1.55; cx += 0.48) {
      root.add(makeBox(0.38, 0.25, 0.34, crateMat, cx, 0.27, 1.15));
      root.add(makeBox(0.34, 0.22, 0.3, crateMat, cx + 0.02, 0.49, 1.15));
    }

    // Perimeter watchtower
    root.add(makeBox(0.42, 1.15, 0.42, steelDarkMat, 1.95, 0.72, 1.65));
    root.add(makeBox(0.62, 0.36, 0.62, concreteMat, 1.95, 1.42, 1.65));
    root.add(makeBox(0.72, 0.08, 0.72, roofDarkMat, 1.95, 1.63, 1.65));
    return root;
  }

  if (id === 'port') {
    const waterMat = new THREE.MeshPhysicalMaterial({
      map: tex.waterMap,
      bumpMap: tex.waterBump,
      bumpScale: 0.04,
      roughness: 0.18,
      metalness: 0.15,
      clearcoat: 0.85,
    });
    const hazardMat = new THREE.MeshStandardMaterial({ map: tex.hazardMap, roughness: 0.5 });

    // Harbor basin water (front/right) + Concrete quay apron (back/left)
    addShadowDisc(root, 0, 0, 3.3, 3.1, 0.55, 0.005);
    root.add(makeBox(5.1, 0.12, 4.6, waterMat, 0, 0.06, 0, false, true));
    root.add(makeBox(5.1, 0.32, 2.35, concreteMat, 0, 0.16, -1.12, false, true));

    // Quayside warehouse & TEU containers
    root.add(makeBox(1.8, 0.72, 0.95, corrugatedMat, -1.45, 0.68, -1.6));
    const containerColors = [0xdc2626, 0x2563eb, 0x16a34a, 0xd97706];
    for (let i = 0; i < 4; i++) {
      root.add(
        makeBox(
          0.62,
          0.26,
          0.28,
          new THREE.MeshStandardMaterial({ color: containerColors[i], roughness: 0.55 }),
          0.35 + (i % 2) * 0.7,
          0.45 + Math.floor(i / 2) * 0.26,
          -1.65,
        ),
      );
    }

    // Two Towering Ship-to-Shore Gantry Cranes spanning over water
    for (const gx of [-0.65, 1.15]) {
      for (const lx of [-0.24, 0.24]) {
        for (const lz of [-0.85, -0.15]) {
          root.add(makeBox(0.08, 1.55, 0.08, hazardMat, gx + lx, 1.05, lz));
        }
      }
      // Horizontal crane boom projecting over harbor ship
      root.add(makeBox(0.32, 0.15, 2.55, hazardMat, gx, 1.82, 0.12));
      root.add(makeBox(0.28, 0.18, 0.28, steelDarkMat, gx, 1.72, 0.82));
    }

    // Docked Container Vessel in Harbor Water
    const hullMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.55, metalness: 0.35 });
    const deckMat = new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.65 });
    root.add(makeBox(3.5, 0.38, 0.96, hullMat, 0.15, 0.24, 1.05));
    // Pointed bow
    const bow = new THREE.Mesh(new THREE.ConeGeometry(0.48, 0.85, 4), hullMat);
    bow.rotation.z = -Math.PI / 2;
    bow.rotation.x = Math.PI / 4;
    bow.scale.set(1, 1, 0.42);
    bow.position.set(2.15, 0.24, 1.05);
    root.add(bow);
    root.add(makeBox(3.2, 0.05, 0.86, deckMat, 0.1, 0.44, 1.05));
    // White bridge superstructure aft + funnel
    root.add(makeBox(0.52, 0.65, 0.72, new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.4 }), -1.25, 0.76, 1.05));
    root.add(makeBox(0.24, 0.28, 0.24, new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.5 }), -1.35, 1.18, 1.05));
    // Container stacks on ship deck
    for (let cx = -0.65; cx <= 1.25; cx += 0.62) {
      for (let cz of [0.85, 1.22]) {
        root.add(
          makeBox(
            0.54,
            0.28,
            0.26,
            new THREE.MeshStandardMaterial({
              color: containerColors[Math.abs(Math.round(cx * 3 + cz * 5)) % 4],
              roughness: 0.55,
            }),
            cx,
            0.6,
            cz,
          ),
        );
      }
    }
    return root;
  }

  if (id === 'military-base') {
    const baseDirt = new THREE.MeshStandardMaterial({ color: 0x4f5642, roughness: 0.92 });
    const camoMat = new THREE.MeshStandardMaterial({ map: tex.uaPixelCamoMap, roughness: 0.78 });
    addFoundation(root, 4.9, 4.5, baseDirt, 0.15);
    root.add(makeBox(4.3, 0.03, 3.8, concreteMat, 0, 0.16, 0, false, true));

    // Command HQ & Barracks
    root.add(makeBox(1.85, 0.78, 1.15, camoMat, -1.15, 0.55, -1.1));
    root.add(makeBox(1.92, 0.08, 1.22, roofDarkMat, -1.15, 0.98, -1.1));

    // Armored vehicle motor pool revetment with 2 military trucks
    root.add(makeBox(1.9, 0.05, 1.25, asphaltMat, -1.05, 0.18, 1.05, false, true));
    for (const vz of [0.78, 1.32]) {
      root.add(makeBox(0.82, 0.34, 0.34, camoMat, -1.15, 0.35, vz));
      root.add(makeBox(0.28, 0.32, 0.32, steelDarkMat, -0.6, 0.34, vz));
    }

    // Helipad with crisp painted H marking
    const padX = 1.2;
    const padZ = 0.85;
    const heliPad = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 0.96, 0.05, 24), asphaltMat);
    heliPad.position.set(padX, 0.19, padZ);
    heliPad.receiveShadow = true;
    root.add(heliPad);
    const ringMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.6 });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.68, 0.78, 24), ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(padX, 0.22, padZ);
    root.add(ring);
    root.add(makeBox(0.1, 0.01, 0.56, ringMat, padX - 0.18, 0.22, padZ, false, false));
    root.add(makeBox(0.1, 0.01, 0.56, ringMat, padX + 0.18, 0.22, padZ, false, false));
    root.add(makeBox(0.38, 0.01, 0.1, ringMat, padX, 0.22, padZ, false, false));

    // Radar comms tower
    root.add(makeBox(0.34, 1.45, 0.34, steelLightMat, 1.35, 0.88, -1.15));
    const dish = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 12), new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3 }));
    dish.position.set(1.35, 1.72, -1.15);
    root.add(dish);
    return root;
  }

  if (id === 'metallurgy') {
    const slagPad = new THREE.MeshStandardMaterial({ color: 0x322f2d, roughness: 0.92 });
    addFoundation(root, 5.0, 4.6, slagPad, 0.16);

    // Main rolling-mill heavy hall
    root.add(makeBox(2.65, 1.05, 1.75, corrugatedMat, -0.85, 0.68, 0.95));
    root.add(makeBox(2.2, 0.28, 0.45, steelDarkMat, -0.85, 1.32, 0.95));

    // Giant Blast Furnace Tower (LatheGeometry + external scaffold cage)
    const bfX = 1.15;
    const bfZ = -0.95;
    const bfPts = [
      new THREE.Vector2(0.74, 0),
      new THREE.Vector2(0.74, 0.55),
      new THREE.Vector2(0.56, 1.35),
      new THREE.Vector2(0.45, 2.05),
      new THREE.Vector2(0.58, 2.15),
      new THREE.Vector2(0.32, 2.45),
    ];
    const bfMesh = new THREE.Mesh(new THREE.LatheGeometry(bfPts, 20), steelDarkMat);
    bfMesh.position.set(bfX, 0.16, bfZ);
    bfMesh.castShadow = true;
    root.add(bfMesh);

    // Twin hot-blast Cowper stoves
    for (const sx of [-0.35, 0.22]) {
      const stove = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 1.75, 16), steelLightMat);
      stove.position.set(sx, 1.04, -1.15);
      stove.castShadow = true;
      root.add(stove);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 10), steelLightMat);
      cap.position.set(sx, 1.91, -1.15);
      root.add(cap);
    }

    // Overhead hot gas main duct connecting blast furnace to stoves
    const ductCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(bfX, 2.1, bfZ),
      new THREE.Vector3(0.45, 2.25, -1.05),
      new THREE.Vector3(-0.35, 1.95, -1.15),
    ]);
    root.add(new THREE.Mesh(new THREE.TubeGeometry(ductCurve, 12, 0.1, 10, false), steelDarkMat));

    // Glowing molten slag ladle pit
    const moltenMat = new THREE.MeshStandardMaterial({
      color: 0xf97316,
      emissive: 0xea580c,
      emissiveIntensity: 1.45,
      roughness: 0.35,
    });
    const pit = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.34, 0.25, 16), moltenMat);
    pit.position.set(1.35, 0.28, 1.05);
    root.add(pit);
    return root;
  }

  if (id === 'railway-hub') {
    const ballastMat = new THREE.MeshStandardMaterial({ color: 0x4d4640, roughness: 0.94 });
    addFoundation(root, 5.1, 4.5, ballastMat, 0.15);

    // 4 parallel rail trackbeds
    const railMat = new THREE.MeshStandardMaterial({ map: tex.railTrackMap, roughness: 0.72, metalness: 0.35 });
    for (const rz of [-1.45, -0.55, 0.35, 1.25]) {
      root.add(makeBox(4.9, 0.03, 0.56, railMat, 0, 0.17, rz, false, true));
    }

    // Brick/steel arched Locomotive Repair Depot / Roundhouse
    root.add(makeBox(1.85, 0.88, 1.7, brickMat, -1.35, 0.6, -1.0));
    root.add(makeBox(1.92, 0.14, 1.76, corrugatedMat, -1.35, 1.08, -1.0));

    // Overhead catenary steel gantries spanning tracks
    for (const gx of [-0.15, 1.45]) {
      root.add(makeBox(0.08, 1.15, 0.08, steelLightMat, gx, 0.72, -1.85));
      root.add(makeBox(0.08, 1.15, 0.08, steelLightMat, gx, 0.72, 1.65));
      root.add(makeBox(0.08, 0.08, 3.6, steelLightMat, gx, 1.26, -0.1));
    }

    // Diesel Locomotive + Freight & Fuel Tank Cars on tracks!
    const locoMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.42, metalness: 0.45 });
    const tankCarMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.35, metalness: 0.6 });
    const freightMat = new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.7 });

    // Locomotive on track 3 (z=0.35)
    root.add(makeBox(1.35, 0.42, 0.34, locoMat, 1.1, 0.42, 0.35));
    root.add(makeBox(0.38, 0.16, 0.32, new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 }), 1.58, 0.46, 0.35));
    // Coupled tank cars behind it
    for (const tx of [-0.25, -1.45]) {
      const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.96, 16), tankCarMat);
      tank.rotation.z = Math.PI / 2;
      tank.position.set(tx, 0.42, 0.35);
      tank.castShadow = true;
      root.add(tank);
    }
    // Freight wagons on track 4 (z=1.25)
    for (const fx of [0.95, -0.25, -1.45]) {
      root.add(makeBox(0.98, 0.36, 0.34, freightMat, fx, 0.38, 1.25));
    }
    return root;
  }

  if (id === 'command-center') {
    const gravelMat = new THREE.MeshStandardMaterial({ color: 0x454c46, roughness: 0.9 });
    addFoundation(root, 4.7, 4.4, gravelMat, 0.16);

    // Sloped brutalist reinforced concrete bunker (trapezoid extrusion)
    const bunkerShape = new THREE.Shape();
    bunkerShape.moveTo(-1.85, 0);
    bunkerShape.lineTo(1.85, 0);
    bunkerShape.lineTo(1.42, 0.98);
    bunkerShape.lineTo(-1.42, 0.98);
    bunkerShape.closePath();

    const bunkerGeo = new THREE.ExtrudeGeometry(bunkerShape, {
      depth: 2.35,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.05,
      bevelSegments: 2,
    });
    const bunkerMesh = new THREE.Mesh(bunkerGeo, concreteMat);
    bunkerMesh.position.set(-0.15, 0.16, -1.2);
    bunkerMesh.castShadow = true;
    bunkerMesh.receiveShadow = true;
    root.add(bunkerMesh);

    // Recessed blast doors on front face + security Jersey barriers
    root.add(makeBox(0.95, 0.62, 0.15, steelDarkMat, -0.15, 0.48, 1.18));
    for (const jx of [-1.6, -0.8, 0.8, 1.6]) {
      root.add(makeBox(0.55, 0.22, 0.14, concreteMat, jx, 0.27, 1.72));
    }

    // Rooftop geodesic SATCOM Radome sphere + parabolic dish + lattice comms mast
    const radomeMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.28, metalness: 0.1 });
    const radome = new THREE.Mesh(new THREE.SphereGeometry(0.58, 22, 16), radomeMat);
    radome.position.set(-0.75, 1.52, -0.1);
    radome.castShadow = true;
    root.add(radome);

    // Dish via LatheGeometry
    const dishPts = [
      new THREE.Vector2(0.01, 0),
      new THREE.Vector2(0.22, 0.05),
      new THREE.Vector2(0.38, 0.18),
    ];
    const dish = new THREE.Mesh(new THREE.LatheGeometry(dishPts, 18), steelLightMat);
    dish.position.set(0.65, 1.35, -0.45);
    dish.rotation.x = Math.PI / 4;
    dish.castShadow = true;
    root.add(dish);

    // Tall comms mast with red aviation beacon tip
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.12, 1.65, 8), steelLightMat);
    mast.position.set(0.75, 1.95, 0.45);
    mast.castShadow = true;
    root.add(mast);
    const beacon = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 1.5 }),
    );
    beacon.position.set(0.75, 2.8, 0.45);
    root.add(beacon);

    // Backup diesel generator shed
    root.add(makeBox(0.75, 0.46, 0.55, new THREE.MeshStandardMaterial({ map: tex.natoOliveMap, roughness: 0.7 }), 1.55, 0.39, 0.95));
    return root;
  }

  if (id === 'bridge') {
    const waterMat = new THREE.MeshPhysicalMaterial({
      map: tex.waterMap,
      bumpMap: tex.waterBump,
      bumpScale: 0.04,
      roughness: 0.18,
      metalness: 0.15,
      clearcoat: 0.85,
    });
    const bankMat = new THREE.MeshStandardMaterial({ color: 0x526142, roughness: 0.92 });
    addShadowDisc(root, 0, 0, 3.2, 2.8, 0.5, 0.005);

    // River channel + twin green/concrete riverbanks
    root.add(makeBox(5.1, 0.14, 4.1, waterMat, 0, 0.07, 0, false, true));
    root.add(makeBox(1.0, 0.36, 4.1, bankMat, -2.05, 0.18, 0, false, true));
    root.add(makeBox(1.0, 0.36, 4.1, bankMat, 2.05, 0.18, 0, false, true));

    // Concrete river piers with cutwaters
    for (const px of [-0.95, 0.95]) {
      root.add(makeBox(0.32, 0.72, 1.35, concreteMat, px, 0.36, 0));
    }

    // Multi-lane asphalt bridge roadway deck + concrete parapets + lane stripe
    root.add(makeBox(5.1, 0.18, 1.24, concreteMat, 0, 0.72, 0));
    root.add(makeBox(5.1, 0.04, 0.98, asphaltMat, 0, 0.82, 0, false, true));
    const dashMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.5 });
    for (let dx = -2.1; dx <= 2.1; dx += 0.65) {
      root.add(makeBox(0.32, 0.015, 0.05, dashMat, dx, 0.845, 0, false, false));
    }
    // Guardrails
    root.add(makeBox(5.1, 0.12, 0.07, steelLightMat, 0, 0.88, -0.56));
    root.add(makeBox(5.1, 0.12, 0.07, steelLightMat, 0, 0.88, 0.56));

    // Twin A-frame Cable-Stayed Concrete Pylons + taut steel stay cables
    const cableMat = new THREE.MeshStandardMaterial({ color: 0xdbeafe, roughness: 0.3, metalness: 0.85 });
    for (const px of [-0.95, 0.95]) {
      for (const pz of [-0.56, 0.56]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.95, 0.14), concreteMat);
        leg.position.set(px, 1.65, pz * 0.76);
        leg.rotation.x = pz < 0 ? 0.14 : -0.14;
        leg.castShadow = true;
        root.add(leg);
      }
      root.add(makeBox(0.16, 0.16, 0.7, concreteMat, px, 2.48, 0));

      // Diagonal stay cables down to deck
      for (const side of [-1, 1]) {
        for (let k = 1; k <= 3; k++) {
          const targetX = px + side * (k * 0.45);
          for (const pz of [-0.54, 0.54]) {
            const p0 = new THREE.Vector3(px, 2.42 - k * 0.12, pz * 0.6);
            const p1 = new THREE.Vector3(targetX, 0.86, pz);
            const len = p0.distanceTo(p1);
            const cable = new THREE.Mesh(
              new THREE.CylinderGeometry(0.015, 0.015, len, 6),
              cableMat,
            );
            cable.position.copy(p0).lerp(p1, 0.5);
            cable.quaternion.setFromUnitVectors(
              new THREE.Vector3(0, 1, 0),
              p1.clone().sub(p0).normalize(),
            );
            root.add(cable);
          }
        }
      }
    }
    return root;
  }

  // 'airfield' — Realistic 3D Military Airbase Diorama
  const apronMat = concreteMat;
  const fieldGrassMat = new THREE.MeshStandardMaterial({ color: 0x3b4a33, roughness: 0.92 });
  const runwayMat = new THREE.MeshStandardMaterial({ map: tex.runwayMap, roughness: 0.86 });
  addFoundation(root, 5.2, 4.7, fieldGrassMat, 0.14);

  // Main grooved runway along X axis + parallel taxiway + dispersal apron
  root.add(makeBox(4.95, 0.04, 1.25, runwayMat, 0, 0.16, 1.28, false, true));
  root.add(makeBox(4.4, 0.035, 0.42, asphaltMat, 0, 0.155, 0.18, false, true));
  root.add(makeBox(3.8, 0.04, 1.65, apronMat, -0.35, 0.16, -1.05, false, true));

  // Two Hardened Aircraft Shelters (HAS) arched concrete hangars
  const hasShape = new THREE.Shape();
  hasShape.moveTo(-0.62, 0);
  hasShape.absarc(0, 0, 0.62, Math.PI, 0, true);
  hasShape.lineTo(0.62, 0);
  hasShape.closePath();
  const hasGeo = new THREE.ExtrudeGeometry(hasShape, {
    depth: 1.15,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.03,
    bevelSegments: 2,
  });
  for (const hx of [-1.45, -0.05]) {
    const hMesh = new THREE.Mesh(hasGeo, corrugatedMat);
    hMesh.position.set(hx, 0.16, -1.95);
    hMesh.castShadow = true;
    hMesh.receiveShadow = true;
    root.add(hMesh);
    // Open dark hangar interior bay
    root.add(makeBox(0.9, 0.46, 0.08, steelDarkMat, hx, 0.39, -0.82));
  }

  // Glass-cab ATC Control Tower
  const towerGlass = new THREE.MeshPhysicalMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.35,
    roughness: 0.1,
    metalness: 0.5,
    clearcoat: 1.0,
  });
  root.add(makeBox(0.45, 1.25, 0.45, concreteMat, 1.62, 0.78, -1.25));
  root.add(makeBox(0.68, 0.32, 0.68, towerGlass, 1.62, 1.54, -1.25));
  root.add(makeBox(0.76, 0.08, 0.76, roofDarkMat, 1.62, 1.74, -1.25));

  // Fuel tanks behind tower
  for (const fz of [-0.55, -0.15]) {
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.62, 14), steelLightMat);
    tank.rotation.z = Math.PI / 2;
    tank.position.set(1.75, 0.34, fz);
    tank.castShadow = true;
    root.add(tank);
  }

  // Parked Swept-Wing Jet Fighter on Apron
  const jetMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.38, metalness: 0.68 });
  const jetG = new THREE.Group();
  jetG.position.set(-0.5, 0.24, -0.45);
  jetG.rotation.y = -0.35;
  jetG.add(makeBox(1.05, 0.11, 0.18, jetMat, 0, 0.05, 0));
  const wingGeo = new THREE.BoxGeometry(0.35, 0.03, 0.92);
  const wings = new THREE.Mesh(wingGeo, jetMat);
  wings.position.set(-0.1, 0.04, 0);
  wings.castShadow = true;
  jetG.add(wings);
  root.add(jetG);

  return root;
}
