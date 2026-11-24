import * as THREE from 'three';

let cachedAnisotropy = 4;

export function setTextureMaxAnisotropy(maxAniso: number) {
  cachedAnisotropy = Math.max(1, Math.min(8, maxAniso));
}

function finalizeColorTex(
  canvas: HTMLCanvasElement,
  repeatX = 1,
  repeatY = 1,
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = cachedAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

function finalizeDataTex(
  canvas: HTMLCanvasElement,
  repeatX = 1,
  repeatY = 1,
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  // Data maps stay in linear space (NoColorSpace)
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = cachedAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!];
}

function seededRand(seedInit: number) {
  let s = seedInit % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export interface PbrTextureSet {
  concreteMap: THREE.CanvasTexture;
  concreteBump: THREE.CanvasTexture;
  asphaltMap: THREE.CanvasTexture;
  runwayMap: THREE.CanvasTexture;
  windowFacadeMap: THREE.CanvasTexture;
  windowFacadeBump: THREE.CanvasTexture;
  corrugatedMap: THREE.CanvasTexture;
  corrugatedBump: THREE.CanvasTexture;
  brickMap: THREE.CanvasTexture;
  brickBump: THREE.CanvasTexture;
  natoOliveMap: THREE.CanvasTexture;
  uaPixelCamoMap: THREE.CanvasTexture;
  hazardMap: THREE.CanvasTexture;
  waterMap: THREE.CanvasTexture;
  waterBump: THREE.CanvasTexture;
  contactShadowMap: THREE.CanvasTexture;
  railTrackMap: THREE.CanvasTexture;
}

let cachedSet: PbrTextureSet | null = null;

export function getPbrTextureSet(): PbrTextureSet {
  if (cachedSet) return cachedSet;

  // 1. Weathered reinforced concrete apron & slabs
  const [concC, concCtx] = makeCanvas(256, 256);
  const [concBumpC, concBumpCtx] = makeCanvas(256, 256);
  {
    const rng = seededRand(101);
    concCtx.fillStyle = '#8b9198';
    concCtx.fillRect(0, 0, 256, 256);
    concBumpCtx.fillStyle = '#808080';
    concBumpCtx.fillRect(0, 0, 256, 256);

    for (let i = 0; i < 2400; i++) {
      const x = rng() * 256;
      const y = rng() * 256;
      const r = 1 + rng() * 3.5;
      const shade = Math.floor(118 + rng() * 48);
      concCtx.fillStyle = `rgba(${shade}, ${shade + 2}, ${shade + 5}, 0.28)`;
      concCtx.fillRect(x, y, r, r);
      const b = Math.floor(105 + rng() * 55);
      concBumpCtx.fillStyle = `rgba(${b}, ${b}, ${b}, 0.35)`;
      concBumpCtx.fillRect(x, y, r, r);
    }

    // Subtle expansion seams
    concCtx.strokeStyle = 'rgba(42, 47, 54, 0.45)';
    concCtx.lineWidth = 1.5;
    concBumpCtx.strokeStyle = '#303030';
    concBumpCtx.lineWidth = 2;
    for (let g = 64; g < 256; g += 64) {
      concCtx.beginPath();
      concCtx.moveTo(g, 0);
      concCtx.lineTo(g, 256);
      concCtx.moveTo(0, g);
      concCtx.lineTo(256, g);
      concCtx.stroke();

      concBumpCtx.beginPath();
      concBumpCtx.moveTo(g, 0);
      concBumpCtx.lineTo(g, 256);
      concBumpCtx.moveTo(0, g);
      concBumpCtx.lineTo(256, g);
      concBumpCtx.stroke();
    }
  }

  // 2. Dark asphalt surface
  const [aspC, aspCtx] = makeCanvas(256, 256);
  {
    const rng = seededRand(202);
    aspCtx.fillStyle = '#2d3238';
    aspCtx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2800; i++) {
      const x = rng() * 256;
      const y = rng() * 256;
      const v = Math.floor(32 + rng() * 36);
      aspCtx.fillStyle = `rgba(${v}, ${v + 2}, ${v + 5}, 0.42)`;
      aspCtx.fillRect(x, y, 1.5, 1.5);
    }
  }

  // 3. Runway asphalt with threshold piano-keys, tire marks & dashed centerline
  const [rwC, rwCtx] = makeCanvas(512, 256);
  {
    const rng = seededRand(303);
    rwCtx.fillStyle = '#272c33';
    rwCtx.fillRect(0, 0, 512, 256);
    for (let i = 0; i < 3600; i++) {
      const v = Math.floor(30 + rng() * 28);
      rwCtx.fillStyle = `rgba(${v}, ${v + 2}, ${v + 5}, 0.4)`;
      rwCtx.fillRect(rng() * 512, rng() * 256, 2, 2);
    }
    // Side boundary lines
    rwCtx.fillStyle = '#d8dee6';
    rwCtx.fillRect(10, 14, 492, 6);
    rwCtx.fillRect(10, 236, 492, 6);
    // Threshold piano keys both ends
    for (const tx of [18, 466]) {
      for (let y = 28; y <= 212; y += 24) {
        rwCtx.fillRect(tx, y, 28, 12);
      }
    }
    // Centerline dashes
    for (let x = 66; x <= 426; x += 40) {
      rwCtx.fillRect(x, 124, 24, 8);
    }
    // Rubber tire touchdown streaks
    rwCtx.fillStyle = 'rgba(12, 15, 20, 0.55)';
    rwCtx.fillRect(60, 102, 95, 10);
    rwCtx.fillRect(60, 144, 95, 10);
    rwCtx.fillRect(357, 102, 95, 10);
    rwCtx.fillRect(357, 144, 95, 10);
  }

  // 4. Multi-story apartment/office facade with glass windows & mullions
  const [winC, winCtx] = makeCanvas(256, 256);
  const [winBumpC, winBumpCtx] = makeCanvas(256, 256);
  {
    const rng = seededRand(404);
    winCtx.fillStyle = '#adb4bc';
    winCtx.fillRect(0, 0, 256, 256);
    winBumpCtx.fillStyle = '#d8d8d8';
    winBumpCtx.fillRect(0, 0, 256, 256);

    // Horizontal slab bands
    for (let row = 0; row < 8; row++) {
      const y = row * 32;
      winCtx.fillStyle = '#9aa2ab';
      winCtx.fillRect(0, y, 256, 5);
      winCtx.fillStyle = '#7b848f';
      winCtx.fillRect(0, y + 29, 256, 3);

      for (let col = 0; col < 8; col++) {
        const x = col * 32 + 5;
        const wy = y + 7;
        const litRoll = rng();
        const grad = winCtx.createLinearGradient(x, wy, x, wy + 19);
        if (litRoll > 0.78) {
          grad.addColorStop(0, '#f8d284');
          grad.addColorStop(1, '#c98a38');
        } else if (litRoll > 0.42) {
          grad.addColorStop(0, '#364d63');
          grad.addColorStop(1, '#1a2736');
        } else {
          grad.addColorStop(0, '#1e2c3a');
          grad.addColorStop(1, '#101822');
        }
        winCtx.fillStyle = grad;
        winCtx.fillRect(x, wy, 22, 19);

        // Mullion frame
        winCtx.fillStyle = '#cfd6de';
        winCtx.fillRect(x + 10.5, wy, 1.5, 19);
        // Sill
        winCtx.fillStyle = '#626b75';
        winCtx.fillRect(x - 1, wy + 19, 24, 2);

        // Recessed window in bump map
        winBumpCtx.fillStyle = '#484848';
        winBumpCtx.fillRect(x, wy, 22, 19);
      }
    }
  }

  // 5. Corrugated industrial steel cladding
  const [corC, corCtx] = makeCanvas(256, 256);
  const [corBumpC, corBumpCtx] = makeCanvas(256, 256);
  {
    const rng = seededRand(505);
    for (let x = 0; x < 256; x += 8) {
      const g = corCtx.createLinearGradient(x, 0, x + 8, 0);
      g.addColorStop(0, '#6c7682');
      g.addColorStop(0.5, '#8f99a5');
      g.addColorStop(1, '#58616c');
      corCtx.fillStyle = g;
      corCtx.fillRect(x, 0, 8, 256);

      const bg = corBumpCtx.createLinearGradient(x, 0, x + 8, 0);
      bg.addColorStop(0, '#505050');
      bg.addColorStop(0.5, '#e0e0e0');
      bg.addColorStop(1, '#505050');
      corBumpCtx.fillStyle = bg;
      corBumpCtx.fillRect(x, 0, 8, 256);
    }
    // Panel seam & weathering
    corCtx.strokeStyle = 'rgba(22, 28, 36, 0.35)';
    corCtx.lineWidth = 1.5;
    for (let y = 64; y < 256; y += 64) {
      corCtx.beginPath();
      corCtx.moveTo(0, y);
      corCtx.lineTo(256, y);
      corCtx.stroke();
    }
    for (let i = 0; i < 600; i++) {
      corCtx.fillStyle = `rgba(38, 32, 26, ${0.06 + rng() * 0.08})`;
      corCtx.fillRect(rng() * 256, rng() * 256, 4 + rng() * 10, 2);
    }
  }

  // 6. Weathered industrial brick masonry
  const [brkC, brkCtx] = makeCanvas(256, 256);
  const [brkBumpC, brkBumpCtx] = makeCanvas(256, 256);
  {
    const rng = seededRand(606);
    brkCtx.fillStyle = '#6f655c';
    brkCtx.fillRect(0, 0, 256, 256);
    brkBumpCtx.fillStyle = '#404040';
    brkBumpCtx.fillRect(0, 0, 256, 256);
    for (let row = 0; row < 16; row++) {
      const y = row * 16;
      const offset = (row % 2) * 16;
      for (let col = -1; col < 9; col++) {
        const x = col * 32 + offset;
        const r = Math.floor(118 + rng() * 44);
        const g = Math.floor(54 + rng() * 24);
        const b = Math.floor(42 + rng() * 18);
        brkCtx.fillStyle = `rgb(${r},${g},${b})`;
        brkCtx.fillRect(x + 1.5, y + 1.5, 29, 13);
        const bv = Math.floor(165 + rng() * 55);
        brkBumpCtx.fillStyle = `rgb(${bv},${bv},${bv})`;
        brkBumpCtx.fillRect(x + 1.5, y + 1.5, 29, 13);
      }
    }
  }

  // 7. NATO / Military Olive Armor with panel seams & grime
  const [olC, olCtx] = makeCanvas(256, 256);
  {
    const rng = seededRand(707);
    olCtx.fillStyle = '#4f5d44';
    olCtx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 1200; i++) {
      const v = rng() > 0.5 ? 'rgba(92, 108, 78, 0.25)' : 'rgba(34, 42, 28, 0.24)';
      olCtx.fillStyle = v;
      olCtx.fillRect(rng() * 256, rng() * 256, 3 + rng() * 8, 3 + rng() * 8);
    }
    olCtx.strokeStyle = 'rgba(18, 22, 16, 0.48)';
    olCtx.lineWidth = 1.5;
    for (let g = 64; g < 256; g += 64) {
      olCtx.strokeRect(g - 64, 0, 64, 128);
      olCtx.strokeRect(g - 64, 128, 64, 128);
    }
    // Corner rivets
    olCtx.fillStyle = 'rgba(155, 168, 140, 0.45)';
    for (let x = 8; x < 256; x += 64) {
      for (let y = 8; y < 256; y += 64) {
        olCtx.fillRect(x, y, 2.5, 2.5);
        olCtx.fillRect(x + 48, y, 2.5, 2.5);
      }
    }
  }

  // 8. Ukrainian ZSU pixel digital olive/tan/charcoal camo
  const [pxC, pxCtx] = makeCanvas(256, 256);
  {
    const rng = seededRand(808);
    pxCtx.fillStyle = '#586449';
    pxCtx.fillRect(0, 0, 256, 256);
    const tones = ['#3f4934', '#707b58', '#303628', '#868964'];
    for (let y = 0; y < 256; y += 8) {
      for (let x = 0; x < 256; x += 8) {
        if (rng() > 0.45) {
          pxCtx.fillStyle = tones[Math.floor(rng() * tones.length)];
          pxCtx.fillRect(x, y, 8 + Math.floor(rng() * 2) * 8, 8);
        }
      }
    }
    pxCtx.strokeStyle = 'rgba(15, 20, 14, 0.35)';
    pxCtx.lineWidth = 1;
    pxCtx.strokeRect(1, 1, 254, 254);
  }

  // 9. Industrial yellow/black hazard stripes
  const [hzC, hzCtx] = makeCanvas(128, 128);
  {
    hzCtx.fillStyle = '#d99b18';
    hzCtx.fillRect(0, 0, 128, 128);
    hzCtx.fillStyle = '#1b1f24';
    for (let i = -128; i < 256; i += 32) {
      hzCtx.beginPath();
      hzCtx.moveTo(i, 0);
      hzCtx.lineTo(i + 16, 0);
      hzCtx.lineTo(i + 144, 128);
      hzCtx.lineTo(i + 128, 128);
      hzCtx.closePath();
      hzCtx.fill();
    }
  }

  // 10. Deep harbor / river water with ripples
  const [wtC, wtCtx] = makeCanvas(256, 256);
  const [wtBumpC, wtBumpCtx] = makeCanvas(256, 256);
  {
    const rng = seededRand(909);
    const wg = wtCtx.createLinearGradient(0, 0, 256, 256);
    wg.addColorStop(0, '#0f2d46');
    wg.addColorStop(1, '#17405c');
    wtCtx.fillStyle = wg;
    wtCtx.fillRect(0, 0, 256, 256);
    wtBumpCtx.fillStyle = '#808080';
    wtBumpCtx.fillRect(0, 0, 256, 256);

    for (let i = 0; i < 240; i++) {
      const x = rng() * 256;
      const y = rng() * 256;
      const w = 14 + rng() * 26;
      wtCtx.strokeStyle = `rgba(148, 210, 240, ${0.08 + rng() * 0.14})`;
      wtCtx.lineWidth = 1.2;
      wtCtx.beginPath();
      wtCtx.moveTo(x, y);
      wtCtx.quadraticCurveTo(x + w * 0.5, y - 2, x + w, y);
      wtCtx.stroke();

      wtBumpCtx.strokeStyle = `rgba(210, 210, 210, ${0.25 + rng() * 0.25})`;
      wtBumpCtx.lineWidth = 1.8;
      wtBumpCtx.beginPath();
      wtBumpCtx.moveTo(x, y);
      wtBumpCtx.lineTo(x + w, y);
      wtBumpCtx.stroke();
    }
  }

  // 11. Soft radial contact shadow
  const [shC, shCtx] = makeCanvas(128, 128);
  {
    const g = shCtx.createRadialGradient(64, 64, 12, 64, 64, 62);
    g.addColorStop(0, 'rgba(3, 6, 12, 0.72)');
    g.addColorStop(0.55, 'rgba(3, 6, 12, 0.42)');
    g.addColorStop(1, 'rgba(3, 6, 12, 0)');
    shCtx.fillStyle = g;
    shCtx.fillRect(0, 0, 128, 128);
  }

  // 12. Ballast + dual steel rail trackbed
  const [rlC, rlCtx] = makeCanvas(256, 128);
  {
    const rng = seededRand(1111);
    rlCtx.fillStyle = '#534c46';
    rlCtx.fillRect(0, 0, 256, 128);
    for (let i = 0; i < 1600; i++) {
      const v = Math.floor(60 + rng() * 52);
      rlCtx.fillStyle = `rgb(${v},${v - 4},${v - 8})`;
      rlCtx.fillRect(rng() * 256, rng() * 128, 2, 2);
    }
    // Wooden ties
    rlCtx.fillStyle = '#2d231c';
    for (let x = 4; x < 256; x += 14) {
      rlCtx.fillRect(x, 18, 6, 92);
    }
    // Steel rails
    rlCtx.fillStyle = '#9aa3ad';
    rlCtx.fillRect(0, 32, 256, 5);
    rlCtx.fillRect(0, 91, 256, 5);
    rlCtx.fillStyle = '#dce4ec';
    rlCtx.fillRect(0, 33, 256, 2);
    rlCtx.fillRect(0, 92, 256, 2);
  }

  const contactShadowMap = new THREE.CanvasTexture(shC);
  contactShadowMap.colorSpace = THREE.SRGBColorSpace;
  contactShadowMap.needsUpdate = true;

  cachedSet = {
    concreteMap: finalizeColorTex(concC, 2, 2),
    concreteBump: finalizeDataTex(concBumpC, 2, 2),
    asphaltMap: finalizeColorTex(aspC, 2, 2),
    runwayMap: finalizeColorTex(rwC, 1, 1),
    windowFacadeMap: finalizeColorTex(winC, 1, 1),
    windowFacadeBump: finalizeDataTex(winBumpC, 1, 1),
    corrugatedMap: finalizeColorTex(corC, 2, 1),
    corrugatedBump: finalizeDataTex(corBumpC, 2, 1),
    brickMap: finalizeColorTex(brkC, 2, 2),
    brickBump: finalizeDataTex(brkBumpC, 2, 2),
    natoOliveMap: finalizeColorTex(olC, 1, 1),
    uaPixelCamoMap: finalizeColorTex(pxC, 1, 1),
    hazardMap: finalizeColorTex(hzC, 2, 1),
    waterMap: finalizeColorTex(wtC, 2, 2),
    waterBump: finalizeDataTex(wtBumpC, 2, 2),
    contactShadowMap,
    railTrackMap: finalizeColorTex(rlC, 3, 1),
  };
  return cachedSet;
}
