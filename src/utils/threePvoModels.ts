import * as THREE from 'three';
import type { AirDefenseId } from '../data/munitions';
import { getPbrTextureSet } from './threeTextures';

export interface Pvo3DAssembly {
  chassis: THREE.Group;
  turret: THREE.Group;
  turretAnchor: THREE.Vector3;
  turretRotates: boolean;
}

function addWheel(
  parent: THREE.Group,
  x: number,
  y: number,
  z: number,
  radius: number,
  width: number,
  tireMat: THREE.Material,
  hubMat: THREE.Material,
) {
  const tire = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, width, 18), tireMat);
  tire.rotation.x = Math.PI / 2;
  tire.position.set(x, y, z);
  tire.castShadow = true;
  parent.add(tire);

  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.52, radius * 0.52, width + 0.03, 12),
    hubMat,
  );
  hub.rotation.x = Math.PI / 2;
  hub.position.set(x, y, z);
  parent.add(hub);
}

function addBox(
  parent: THREE.Group,
  w: number,
  h: number,
  d: number,
  mat: THREE.Material,
  x: number,
  y: number,
  z: number,
) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

interface SharedPvoMaterials {
  natoMat: THREE.MeshStandardMaterial;
  pixelMat: THREE.MeshStandardMaterial;
  hullOlive: THREE.MeshStandardMaterial;
  darkMetal: THREE.MeshStandardMaterial;
  gunSteel: THREE.MeshStandardMaterial;
  tireMat: THREE.MeshStandardMaterial;
  glassMat: THREE.MeshStandardMaterial;
  lightGlow: THREE.MeshStandardMaterial;
  shadowMat: THREE.MeshBasicMaterial;
  radarLightMetal: THREE.MeshStandardMaterial;
  searchBarMat: THREE.MeshStandardMaterial;
  tubeOliveMat: THREE.MeshStandardMaterial;
  capLightMat: THREE.MeshStandardMaterial;
  ringSteelMat: THREE.MeshStandardMaterial;
  radarArrayMat: THREE.MeshStandardMaterial;
  iffYellowMat: THREE.MeshStandardMaterial;
  patriotCanMat: THREE.MeshStandardMaterial;
  patriotBandMat: THREE.MeshStandardMaterial;
  patriotNoseMat: THREE.MeshStandardMaterial;
  openHoleMat: THREE.MeshStandardMaterial;
}

let cachedPvoMats: SharedPvoMaterials | null = null;

function getSharedPvoMaterials(): SharedPvoMaterials {
  if (cachedPvoMats) return cachedPvoMats;
  const tex = getPbrTextureSet();
  const mark = <T extends THREE.Material>(m: T): T => {
    m.userData.sharedMaterial = true;
    return m;
  };
  cachedPvoMats = {
    natoMat: mark(
      new THREE.MeshStandardMaterial({
        map: tex.natoOliveMap,
        roughness: 0.62,
        metalness: 0.22,
      }),
    ),
    pixelMat: mark(
      new THREE.MeshStandardMaterial({
        map: tex.uaPixelCamoMap,
        roughness: 0.68,
        metalness: 0.16,
      }),
    ),
    hullOlive: mark(
      new THREE.MeshStandardMaterial({
        color: 0x4b5940,
        roughness: 0.58,
        metalness: 0.28,
      }),
    ),
    darkMetal: mark(
      new THREE.MeshStandardMaterial({
        color: 0x222830,
        roughness: 0.42,
        metalness: 0.78,
      }),
    ),
    gunSteel: mark(
      new THREE.MeshStandardMaterial({
        color: 0x6c7682,
        roughness: 0.28,
        metalness: 0.88,
      }),
    ),
    tireMat: mark(
      new THREE.MeshStandardMaterial({
        color: 0x16191e,
        roughness: 0.9,
        metalness: 0.05,
      }),
    ),
    glassMat: mark(
      new THREE.MeshStandardMaterial({
        color: 0x1b2e44,
        roughness: 0.14,
        metalness: 0.78,
      }),
    ),
    lightGlow: mark(
      new THREE.MeshStandardMaterial({
        color: 0xfef08a,
        emissive: 0xfde047,
        emissiveIntensity: 0.9,
        roughness: 0.2,
      }),
    ),
    shadowMat: mark(
      new THREE.MeshBasicMaterial({
        map: tex.contactShadowMap,
        transparent: true,
        opacity: 0.65,
        depthWrite: false,
      }),
    ),
    radarLightMetal: mark(
      new THREE.MeshStandardMaterial({
        color: 0xcbd5e1,
        roughness: 0.34,
        metalness: 0.48,
      }),
    ),
    searchBarMat: mark(
      new THREE.MeshStandardMaterial({
        color: 0xdbeafe,
        roughness: 0.3,
        metalness: 0.5,
      }),
    ),
    tubeOliveMat: mark(
      new THREE.MeshStandardMaterial({
        color: 0x5c6b53,
        roughness: 0.47,
        metalness: 0.36,
      }),
    ),
    capLightMat: mark(
      new THREE.MeshStandardMaterial({
        color: 0xcbd5e1,
        roughness: 0.35,
        metalness: 0.4,
      }),
    ),
    ringSteelMat: mark(
      new THREE.MeshStandardMaterial({
        color: 0x8b9882,
        roughness: 0.4,
        metalness: 0.5,
      }),
    ),
    radarArrayMat: mark(
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0369a1,
        emissiveIntensity: 0.35,
        roughness: 0.28,
        metalness: 0.65,
      }),
    ),
    iffYellowMat: mark(
      new THREE.MeshStandardMaterial({
        color: 0xfacc15,
        roughness: 0.4,
      }),
    ),
    patriotCanMat: mark(
      new THREE.MeshStandardMaterial({
        color: 0x627058,
        roughness: 0.48,
        metalness: 0.32,
      }),
    ),
    patriotBandMat: mark(
      new THREE.MeshStandardMaterial({
        color: 0x8d9b82,
        roughness: 0.4,
        metalness: 0.5,
      }),
    ),
    patriotNoseMat: mark(
      new THREE.MeshStandardMaterial({
        color: 0xd6d3c9,
        roughness: 0.55,
      }),
    ),
    openHoleMat: mark(
      new THREE.MeshStandardMaterial({
        color: 0x0b0f14,
        roughness: 0.9,
      }),
    ),
  };
  return cachedPvoMats;
}

export function buildPvo3DAssembly(
  id: AirDefenseId,
  ammo: number,
  isMenuShowcase = false,
): Pvo3DAssembly {
  const mats = getSharedPvoMaterials();
  const {
    natoMat,
    pixelMat,
    hullOlive,
    darkMetal,
    gunSteel,
    tireMat,
    glassMat,
    lightGlow,
  } = mats;

  const chassis = new THREE.Group();
  const turret = new THREE.Group();

  // Soft contact shadow disc under vehicle
  const shadowPlane = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 3.8), mats.shadowMat);
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = 0.01;
  chassis.add(shadowPlane);

  if (id === 'mg-pickup') {
    // 4x4 Tactical Technical Pickup
    for (const wx of [-1.25, 1.15]) {
      for (const wz of [-0.88, 0.88]) {
        addWheel(chassis, wx, 0.36, wz, 0.36, 0.26, tireMat, hullOlive);
      }
    }
    // Lower chassis frame + sculpted hood + cab
    addBox(chassis, 3.65, 0.42, 1.64, pixelMat, 0.05, 0.56, 0);
    // Open recessed rear cargo bed
    addBox(chassis, 1.55, 0.1, 1.48, darkMetal, -0.92, 0.74, 0);
    addBox(chassis, 1.55, 0.26, 0.09, pixelMat, -0.92, 0.86, -0.74);
    addBox(chassis, 1.55, 0.26, 0.09, pixelMat, -0.92, 0.86, 0.74);
    addBox(chassis, 0.09, 0.26, 1.48, pixelMat, -1.68, 0.86, 0);
    // Rollbar behind cab
    addBox(chassis, 0.1, 0.66, 1.44, darkMetal, -0.1, 1.08, 0);
    // Cab roof & angled windshield
    addBox(chassis, 1.05, 0.55, 1.48, pixelMat, 0.45, 1.04, 0);
    addBox(chassis, 0.14, 0.42, 1.34, glassMat, 0.96, 1.02, 0);
    // Hood + front bumper + headlights
    addBox(chassis, 0.92, 0.36, 1.54, hullOlive, 1.36, 0.74, 0);
    addBox(chassis, 0.14, 0.2, 1.68, darkMetal, 1.88, 0.48, 0);
    addBox(chassis, 0.06, 0.12, 0.24, lightGlow, 1.84, 0.7, -0.55);
    addBox(chassis, 0.06, 0.12, 0.24, lightGlow, 1.84, 0.7, 0.55);

    // Turret: Gunner pedestal + DShK 12.7mm HMG + ammo box
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.52, 12), darkMetal);
    ped.position.set(0, 0.26, 0);
    ped.castShadow = true;
    turret.add(ped);

    const cradle = new THREE.Group();
    cradle.position.set(0, 0.56, 0);
    cradle.rotation.z = isMenuShowcase ? 0.16 : 0.22; // Elevated AA firing angle
    addBox(cradle, 0.68, 0.14, 0.16, darkMetal, 0.12, 0, 0);
    addBox(cradle, 0.26, 0.18, 0.22, hullOlive, 0.02, 0.02, 0.2); // Green ammo box
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.042, 1.15, 10), gunSteel);
    barrel.rotation.z = -Math.PI / 2;
    barrel.position.set(0.95, 0.02, 0);
    barrel.castShadow = true;
    cradle.add(barrel);
    // Flash hider cone
    const fh = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.14, 8), darkMetal);
    fh.rotation.z = Math.PI / 2;
    fh.position.set(1.52, 0.02, 0);
    cradle.add(fh);
    turret.add(cradle);

    return {
      chassis,
      turret,
      turretAnchor: new THREE.Vector3(-0.88, 0.78, 0),
      turretRotates: true,
    };
  }

  if (id === 'gepard') {
    // Flakpanzer Gepard Leopard-1 tracked hull
    // Left & right caterpillar tracks + road wheels
    for (const tz of [-1.05, 1.05]) {
      addBox(chassis, 3.65, 0.56, 0.42, tireMat, 0, 0.3, tz);
      for (let wx = -1.45; wx <= 1.45; wx += 0.58) {
        addWheel(chassis, wx, 0.28, tz, 0.24, 0.36, darkMetal, hullOlive);
      }
      // Armored side skirts
      addBox(chassis, 3.72, 0.26, 0.48, natoMat, 0, 0.62, tz);
    }
    // Main armored hull + sloped front glacis + engine deck louvers
    addBox(chassis, 3.45, 0.56, 1.65, natoMat, -0.08, 0.68, 0);
    const glacis = addBox(chassis, 0.9, 0.36, 1.62, natoMat, 1.55, 0.56, 0);
    glacis.rotation.z = -0.35;
    addBox(chassis, 0.95, 0.08, 1.32, darkMetal, -1.15, 0.98, 0);
    addBox(chassis, 0.06, 0.12, 0.22, lightGlow, 1.88, 0.66, -0.58);
    addBox(chassis, 0.06, 0.12, 0.22, lightGlow, 1.88, 0.66, 0.58);

    // Turret: Armored Gepard turret + twin 35mm Oerlikon KDA gun pods + dual radars
    addBox(turret, 1.52, 0.58, 1.32, natoMat, -0.1, 0.3, 0);
    addBox(turret, 0.85, 0.48, 1.05, hullOlive, 0.65, 0.26, 0);
    // Commander hatches
    for (const hz of [-0.32, 0.32]) {
      const h = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.08, 12), darkMetal);
      h.position.set(-0.22, 0.62, hz);
      turret.add(h);
    }
    // Twin 35mm cannon pods & fluted barrels (elevated toward AA targets)
    for (const gz of [-0.82, 0.82]) {
      const pod = new THREE.Group();
      pod.position.set(0.1, 0.36, gz);
      pod.rotation.z = isMenuShowcase ? 0.32 : 0.38;
      addBox(pod, 0.92, 0.38, 0.32, hullOlive, 0, 0, 0);
      const bbl = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.065, 1.85, 12), gunSteel);
      bbl.rotation.z = -Math.PI / 2;
      bbl.position.set(1.28, 0.04, 0);
      bbl.castShadow = true;
      pod.add(bbl);
      // Muzzle velocity radar collar
      addBox(pod, 0.24, 0.14, 0.14, darkMetal, 2.08, 0.04, 0);
      turret.add(pod);
    }
    // Front tracking radar dish
    const trackDish = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), mats.radarLightMetal);
    trackDish.scale.set(0.55, 1, 1);
    trackDish.position.set(1.08, 0.42, 0);
    turret.add(trackDish);

    // Rear folding search radar bar
    addBox(turret, 0.14, 0.45, 0.16, darkMetal, -0.78, 0.72, 0);
    addBox(turret, 0.18, 0.22, 1.15, mats.searchBarMat, -0.78, 0.96, 0);

    return {
      chassis,
      turret,
      turretAnchor: new THREE.Vector3(0.05, 0.96, 0),
      turretRotates: true,
    };
  }

  if (id === 'iris-t') {
    // MAN HX 8x8 Tactical Truck + 8-cell Vertical Launch Rack
    for (const wx of [-1.52, -0.62, 0.45, 1.38]) {
      for (const wz of [-0.95, 0.95]) {
        addWheel(chassis, wx, 0.4, wz, 0.4, 0.3, tireMat, hullOlive);
      }
    }
    // Heavy truck chassis frame & deployed hydraulic outriggers
    addBox(chassis, 3.85, 0.28, 1.65, darkMetal, -0.05, 0.56, 0);
    for (const ox of [-1.05, 0.72]) {
      addBox(chassis, 0.22, 0.14, 2.55, darkMetal, ox, 0.46, 0);
      for (const oz of [-1.28, 1.28]) {
        const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.1, 12), gunSteel);
        pad.position.set(ox, 0.05, oz);
        chassis.add(pad);
      }
    }
    // Armored MAN HX cab
    addBox(chassis, 1.05, 1.08, 1.72, natoMat, 1.32, 1.18, 0);
    addBox(chassis, 0.1, 0.46, 1.54, glassMat, 1.84, 1.32, 0);
    addBox(chassis, 0.06, 0.14, 0.24, lightGlow, 1.86, 0.85, -0.62);
    addBox(chassis, 0.06, 0.14, 0.24, lightGlow, 1.86, 0.85, 0.62);

    // 8-cell IRIS-T SLM VLS Launcher Rack (in turret group so it elevates/slew-displays cleanly)
    const rackTilt = isMenuShowcase ? 1.18 : 1.36; // ~68-78 deg vertical deployment!
    const rack = new THREE.Group();
    rack.rotation.z = Math.PI / 2 - rackTilt; // tilted up from rear hinge
    addBox(rack, 1.95, 0.22, 1.42, darkMetal, 0, 0.1, 0);
    const tubeMat = mats.tubeOliveMat;
    const capMat = mats.capLightMat;
    let idx = 0;
    for (const cx of [-0.66, -0.22, 0.22, 0.66]) {
      for (const cz of [-0.36, 0.36]) {
        const loaded = idx < ammo;
        idx++;
        const cell = new THREE.Mesh(
          new THREE.CylinderGeometry(0.18, 0.18, 1.75, 14),
          loaded ? tubeMat : darkMetal,
        );
        cell.position.set(cx, 0.98, cz);
        cell.castShadow = true;
        rack.add(cell);
        if (loaded) {
          const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.08, 14), capMat);
          cap.position.set(cx, 1.88, cz);
          rack.add(cap);
        }
      }
    }
    turret.add(rack);

    return {
      chassis,
      turret,
      turretAnchor: new THREE.Vector3(-0.75, 0.72, 0),
      turretRotates: false,
    };
  }

  if (id === 's300') {
    // MAZ-543 8x8 Heavy TEL with iconic Split Twin Front Cabs + 4 Ribbed 5P85S Cylinders
    for (const wx of [-1.55, -0.62, 0.55, 1.48]) {
      for (const wz of [-1.02, 1.02]) {
        addWheel(chassis, wx, 0.44, wz, 0.44, 0.32, tireMat, hullOlive);
      }
    }
    addBox(chassis, 4.0, 0.32, 1.78, darkMetal, -0.05, 0.62, 0);
    // Iconic MAZ-543 split twin cabs flanking central engine bay
    for (const cz of [-0.66, 0.66]) {
      addBox(chassis, 1.15, 0.92, 0.62, natoMat, 1.38, 1.14, cz);
      addBox(chassis, 0.08, 0.4, 0.52, glassMat, 1.94, 1.26, cz);
      addBox(chassis, 0.06, 0.12, 0.2, lightGlow, 1.96, 0.84, cz);
    }
    addBox(chassis, 1.1, 0.72, 0.66, darkMetal, 1.34, 1.02, 0);
    // Hydraulic stabilizer jacks at rear
    for (const jz of [-1.18, 1.18]) {
      addBox(chassis, 0.24, 0.68, 0.22, darkMetal, -1.78, 0.38, jz);
    }

    // Elevated 4 towering ribbed S-300 5P85S launch canisters
    const elevGroup = new THREE.Group();
    elevGroup.rotation.z = isMenuShowcase ? 0.52 : 0.2; // Menu shows dramatic 60° incline; Map shows near-vertical 78° combat posture!
    const canisterMat = mats.tubeOliveMat;
    const ringMat = mats.ringSteelMat;

    for (let i = 0; i < 4; i++) {
      const cz = -0.66 + i * 0.44;
      const loaded = i < ammo;
      const tube = new THREE.Mesh(
        new THREE.CylinderGeometry(0.17, 0.17, 2.35, 16),
        loaded ? canisterMat : darkMetal,
      );
      tube.position.set(0, 1.15, cz);
      tube.castShadow = true;
      elevGroup.add(tube);

      // Stiffening bands along each tube
      for (const ry of [0.35, 1.15, 1.95]) {
        const band = new THREE.Mesh(new THREE.CylinderGeometry(0.188, 0.188, 0.11, 16), ringMat);
        band.position.set(0, ry, cz);
        elevGroup.add(band);
      }
      if (loaded) {
        const cap = new THREE.Mesh(new THREE.SphereGeometry(0.168, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), ringMat);
        cap.position.set(0, 2.32, cz);
        elevGroup.add(cap);
      }
    }
    turret.add(elevGroup);

    return {
      chassis,
      turret,
      turretAnchor: new THREE.Vector3(-1.35, 0.78, 0),
      turretRotates: false,
    };
  }

  if (id === 'radar') {
    // 6x6 36D6 / AN/MPQ-65 Mobile Surveillance Radar Complex
    for (const wx of [-1.3, 0.0, 1.25]) {
      for (const wz of [-0.94, 0.94]) {
        addWheel(chassis, wx, 0.38, wz, 0.38, 0.28, tireMat, hullOlive);
      }
    }
    // Outrigger support legs
    for (const ox of [-1.45, 0.68]) {
      for (const oz of [-1.32, 1.32]) {
        addBox(chassis, 0.22, 0.14, 0.85, darkMetal, ox, 0.34, oz * 0.72);
        const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, 0.1, 12), gunSteel);
        pad.position.set(ox, 0.05, oz);
        chassis.add(pad);
      }
    }
    addBox(chassis, 3.65, 0.28, 1.62, darkMetal, -0.05, 0.54, 0);
    // Tractor cab
    addBox(chassis, 0.92, 0.95, 1.56, natoMat, 1.28, 1.1, 0);
    addBox(chassis, 0.08, 0.42, 1.4, glassMat, 1.74, 1.24, 0);
    // Armored electronics shelter cabin
    addBox(chassis, 2.25, 1.05, 1.58, hullOlive, -0.52, 1.15, 0);

    // Rotating 3D radar mast + curved parabolic phased-array reflector + IFF bar
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.34, 0.62, 14), darkMetal);
    ped.position.set(0, 0.31, 0);
    ped.castShadow = true;
    turret.add(ped);

    const dishMat = mats.radarLightMetal;
    const arrayFaceMat = mats.radarArrayMat;
    // Angled radar reflector backing + glowing array face
    const arrayGroup = new THREE.Group();
    arrayGroup.position.set(0, 0.86, 0);
    arrayGroup.rotation.z = -0.22; // tilted slightly upward
    addBox(arrayGroup, 0.16, 0.76, 1.95, dishMat, 0, 0, 0);
    addBox(arrayGroup, 0.06, 0.64, 1.8, arrayFaceMat, 0.1, 0, 0);
    // Feed boom & IFF bar on top
    addBox(arrayGroup, 0.62, 0.06, 0.08, darkMetal, 0.34, -0.08, 0);
    addBox(arrayGroup, 0.1, 0.14, 1.35, mats.iffYellowMat, 0.02, 0.48, 0);
    turret.add(arrayGroup);

    return {
      chassis,
      turret,
      turretAnchor: new THREE.Vector3(-0.35, 1.66, 0),
      turretRotates: true,
    };
  }

  // 'patriot' — Patriot M901 M860 Semi-Trailer Launcher with 4 canted PAC-2/PAC-3 rectangular canisters
  for (const wx of [-1.28, -0.62]) {
    for (const wz of [-0.98, 0.98]) {
      addWheel(chassis, wx, 0.36, wz, 0.36, 0.28, tireMat, hullOlive);
    }
  }
  // 4 heavy steel outrigger beams + circular ground stabilizer pads
  for (const ox of [-1.42, 1.32]) {
    for (const oz of [-1.38, 1.38]) {
      addBox(chassis, 0.22, 0.16, 0.92, darkMetal, ox, 0.38, oz * 0.72);
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.1, 14), gunSteel);
      pad.position.set(ox, 0.05, oz);
      chassis.add(pad);
    }
  }
  // Semi-trailer flatbed + diesel generator box at rear
  addBox(chassis, 3.65, 0.26, 1.72, natoMat, 0, 0.56, 0);
  addBox(chassis, 0.68, 0.65, 1.38, hullOlive, -1.42, 1.0, 0);
  // Turntable ring
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.74, 0.22, 18), darkMetal);
  ring.position.set(0.15, 0.78, 0);
  chassis.add(ring);

  // Turret: Rotating elevation cradle + 4 canted (38 deg) rectangular Patriot M901 canisters!
  const cradle = new THREE.Group();
  cradle.rotation.z = 0.66; // ~38 degree iconic Patriot launch elevation!
  addBox(cradle, 1.45, 0.24, 1.46, darkMetal, 0, 0.12, 0);

  const canMat = mats.patriotCanMat;
  const bandMat = mats.patriotBandMat;
  const noseCapMat = mats.patriotNoseMat;
  const openHoleMat = mats.openHoleMat;

  for (let i = 0; i < 4; i++) {
    const cz = -0.63 + i * 0.42;
    const loaded = i < ammo;
    const can = addBox(cradle, 2.55, 0.4, 0.34, loaded ? canMat : darkMetal, 0.25, 0.46, cz);
    void can;
    // Structural bands
    for (const bx of [-0.55, 0.25, 1.05]) {
      addBox(cradle, 0.12, 0.43, 0.37, bandMat, bx, 0.46, cz);
    }
    // Frangible front blast cover (tan/white when loaded, recessed black tube when empty)
    addBox(cradle, 0.08, 0.32, 0.26, loaded ? noseCapMat : openHoleMat, 1.54, 0.46, cz);
  }
  turret.add(cradle);

  return {
    chassis,
    turret,
    turretAnchor: new THREE.Vector3(0.15, 0.88, 0),
    turretRotates: true,
  };
}
