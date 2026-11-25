import type {
  AirDefenseId,
  AirDefenseSpec,
  AltitudeMode,
  BuildingSpec,
  MunitionId,
  MunitionSpec,
} from '../data/munitions';
import type { RussianAircraftId, RussianAircraftSpec } from '../data/airfields';
import {
  drawNavalMissileShipTopDown,
  drawRealisticLauncherChassis,
  drawRealisticPvoTopDown,
  getAircraftSpriteCanvas,
  getBuildingSpriteCanvas,
  getMunitionSpriteCanvas,
} from './realisticSprites';
import { getPvo3DMapLayers } from './threeModelBaker';

export interface ExplosionParticle {
  angle: number;
  speed: number;
  size: number;
  color: string;
  life: number;
}

export interface FireLobe {
  angle: number;
  distFactor: number;
  radiusFactor: number;
  riseSpeed: number;
}

export interface SmokePuff {
  ox: number;
  oy: number;
  vx: number;
  vy: number;
  radius: number;
  shade: number;
  delay: number;
}

export interface ActiveExplosion {
  id: string;
  lat: number;
  lng: number;
  munitionId: MunitionId;
  age: number;
  duration: number;
  power: number;
  particles: ExplosionParticle[];
  fireLobes: FireLobe[];
  smokePuffs: SmokePuff[];
}

export function createExplosionParticles(power: number): {
  particles: ExplosionParticle[];
  fireLobes: FireLobe[];
  smokePuffs: SmokePuff[];
} {
  const count = Math.round(46 * power);
  const particles: ExplosionParticle[] = [];
  const colors = ['#FFFBEB', '#FEF08A', '#FB923C', '#EA580C', '#78350F', '#292524'];
  for (let i = 0; i < count; i++) {
    const isDirtClod = i % 5 === 4;
    particles.push({
      angle: Math.random() * Math.PI * 2,
      speed: (isDirtClod ? 38 + Math.random() * 95 : 65 + Math.random() * 215) * Math.sqrt(power),
      size: isDirtClod ? 2.1 + Math.random() * 2.4 : 1.2 + Math.random() * 2.2,
      color: isDirtClod ? '#2B241E' : colors[i % 4],
      life: (isDirtClod ? 0.45 : 0.6) + Math.random() * 0.9,
    });
  }

  const lobeCount = 9;
  const fireLobes: FireLobe[] = [];
  for (let i = 0; i < lobeCount; i++) {
    fireLobes.push({
      angle: (i / lobeCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.5,
      distFactor: 0.18 + Math.random() * 0.48,
      radiusFactor: 0.44 + Math.random() * 0.36,
      riseSpeed: 7 + Math.random() * 12,
    });
  }

  const smokeCount = Math.round(24 * power);
  const smokePuffs: SmokePuff[] = [];
  for (let i = 0; i < smokeCount; i++) {
    const a = (i / smokeCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.55;
    const dist = (3 + Math.random() * 18) * power;
    smokePuffs.push({
      ox: Math.cos(a) * dist,
      oy: Math.sin(a) * dist,
      vx: Math.cos(a) * (3.5 + Math.random() * 10) + 6.2,
      vy: Math.sin(a) * (3.5 + Math.random() * 10) - 12.5,
      radius: (13 + Math.random() * 21) * power,
      shade: 18 + Math.floor(Math.random() * 26),
      delay: Math.random() * 0.16,
    });
  }

  return { particles, fireLobes, smokePuffs };
}

/**
 * Draws a realistic top-down launcher vehicle / platform on the satellite map,
 * showing loaded vs. depleted tubes/rails and ammo count.
 */
export function drawLauncher(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  spec: MunitionSpec,
  options: {
    selected?: boolean;
    hovered?: boolean;
    isPreview?: boolean;
    previewValid?: boolean;
    aimAngleRad?: number;
    reloadingProgress?: number;
    ammo?: number;
    maxAmmo?: number;
    isNavalShip?: boolean;
    isAi?: boolean;
    timeSec: number;
  },
) {
  const {
    selected = false,
    hovered = false,
    isPreview = false,
    previewValid = true,
    aimAngleRad = -Math.PI / 4,
    reloadingProgress = 1,
    ammo = spec.maxAmmo,
    maxAmmo = spec.maxAmmo,
    isNavalShip = false,
    isAi = false,
    timeSec,
  } = options;

  const isEmpty = !isPreview && ammo <= 0;

  ctx.save();
  ctx.translate(x, y);

  if (isPreview) {
    ctx.globalAlpha = previewValid ? 0.85 : 0.7;
  } else if (isEmpty) {
    ctx.globalAlpha = 0.72;
  }

  // Ground tactical ring
  if (selected) {
    const pulse = 1 + Math.sin(timeSec * 5.5) * 0.08;
    ctx.save();
    ctx.strokeStyle = isEmpty ? '#EF4444' : spec.accentColor;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.arc(0, 0, 26 * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = isEmpty ? 'rgba(239, 68, 68, 0.14)' : `${spec.accentColor}26`;
    ctx.beginPath();
    ctx.arc(0, 0, 23, 0, Math.PI * 2);
    ctx.fill();
  } else if (hovered && !isPreview) {
    ctx.strokeStyle = isAi ? 'rgba(239, 68, 68, 0.85)' : 'rgba(241, 245, 249, 0.75)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, 23, 0, Math.PI * 2);
    ctx.stroke();
  } else if (isAi && !isPreview) {
    ctx.save();
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.45)';
    ctx.lineWidth = 1.25;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  } else if (isPreview) {
    ctx.strokeStyle = previewValid ? '#22C55E' : '#EF4444';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.arc(0, 0, 25, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Vehicle orientation rotated toward aimAngleRad
  ctx.save();
  ctx.rotate(aimAngleRad);

  if (isNavalShip) {
    // Subtle ocean bow wake & stern foam trail around naval frigate
    const wakePulse = 0.85 + Math.sin(timeSec * 3.2) * 0.15;
    ctx.strokeStyle = `rgba(186, 230, 253, ${0.26 * wakePulse})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(23, 0);
    ctx.quadraticCurveTo(4, -10.5, -28, -11.5);
    ctx.moveTo(23, 0);
    ctx.quadraticCurveTo(4, 10.5, -28, 11.5);
    ctx.stroke();

    ctx.fillStyle = 'rgba(224, 242, 254, 0.18)';
    ctx.beginPath();
    ctx.moveTo(-22, -3.5);
    ctx.lineTo(-34 * wakePulse, -6);
    ctx.lineTo(-34 * wakePulse, 6);
    ctx.lineTo(-22, 3.5);
    ctx.closePath();
    ctx.fill();

    drawNavalMissileShipTopDown(ctx, ammo, maxAmmo);
  } else {
    // Soft ground shadow underneath realistic launcher truck / platform
    ctx.fillStyle = 'rgba(0, 0, 0, 0.48)';
    ctx.beginPath();
    ctx.roundRect(-21, -11, 44, 24, 4);
    ctx.fill();

    drawRealisticLauncherChassis(
      ctx,
      spec.id,
      spec.faction,
      ammo,
      reloadingProgress >= 0.99,
    );
  }

  ctx.restore();

  // If invalid preview, draw red X cross
  if (isPreview && !previewValid) {
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-9, -9);
    ctx.lineTo(9, 9);
    ctx.moveTo(9, -9);
    ctx.lineTo(-9, 9);
    ctx.stroke();
  }

  // Sleek red circular ammo count badge on top-right corner (matching real-life tactical UI)
  if (!isPreview) {
    ctx.globalAlpha = 1;
    const bx = 17;
    const by = -14;
    const badgeText = `${ammo}`;
    ctx.font = '700 10px "JetBrains Mono", monospace';
    const r = ammo >= 10 ? 9.5 : 8.2;

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 1;
    ctx.fillStyle = isEmpty ? '#334155' : '#DC2626';
    ctx.beginPath();
    ctx.arc(bx, by, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = isEmpty ? 'rgba(148, 163, 184, 0.65)' : 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.arc(bx, by, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = isEmpty ? '#CBD5E1' : '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(badgeText, bx, by + 0.5);
    ctx.textAlign = 'start';
    ctx.textBaseline = 'alphabetic';

    // Show compact name label only when selected or hovered so map stays clean
    if (selected || hovered) {
      const label = isNavalShip
        ? `Корабль ВМФ · Калибр ${ammo}/${maxAmmo}`
        : `${spec.shortName} · ${ammo}/${maxAmmo}`;
      ctx.font = '600 9.5px "JetBrains Mono", monospace';
      const lw = ctx.measureText(label).width + 10;
      ctx.fillStyle = 'rgba(7, 13, 23, 0.9)';
      ctx.strokeStyle = selected ? spec.accentColor : 'rgba(148, 163, 184, 0.45)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(-lw / 2, 18, lw, 14.5, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#F8FAFC';
      ctx.fillText(label, -lw / 2 + 5, 28.5);
    }
  }

  ctx.restore();
}

/**
 * Draws a realistic top-down flying UAV, missile, glide bomb, or strike aircraft
 * with natural altitude drop shadow and physically proportioned propulsion cues.
 */
export function drawFlyingMunition(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  headingRad: number,
  spec: MunitionSpec,
  progress: number,
  timeSec: number,
  lowAltitude = false,
  radarDetected = false,
  altitudeMode: AltitudeMode = lowAltitude ? 'low' : 'normal',
) {
  const isUltraLow = altitudeMode === 'ultra-low';
  const isAnyLow = lowAltitude || isUltraLow;
  const arcFactor = Math.sin(progress * Math.PI);
  const scale =
    spec.profile === 'ballistic'
      ? 1 + arcFactor * 0.36
      : spec.profile === 'airstrike'
        ? 1.1 + arcFactor * 0.12
        : spec.profile === 'cruise'
          ? 0.98 + arcFactor * 0.08
          : isUltraLow
            ? 0.84
            : isAnyLow
              ? 0.88
              : 0.94 + arcFactor * 0.04;

  const shadowOffset = isUltraLow
    ? 1.5
    : isAnyLow
      ? 2.5
      : spec.profile === 'ballistic'
        ? 11 + arcFactor * 34
        : spec.profile === 'airstrike'
          ? 15 + arcFactor * 16
          : spec.profile === 'cruise'
            ? 8 + arcFactor * 12
            : 5 + arcFactor * 7;

  // 1. Soft altitude ground shadow
  ctx.save();
  ctx.translate(x + shadowOffset * 0.65, y + shadowOffset);
  ctx.rotate(headingRad);
  ctx.scale(scale * 0.88, scale * 0.88);
  ctx.fillStyle = isAnyLow ? 'rgba(0, 0, 0, 0.45)' : 'rgba(0, 0, 0, 0.32)';
  drawMunitionSilhouettePath(ctx, spec.id, true);
  ctx.restore();

  // 2. Propulsion & aerodynamic cues (drawn behind airframe)
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(headingRad);
  ctx.scale(scale, scale);

  if (spec.id === 'shahed-136' || spec.id === 'lyutyi' || spec.id === 'bober') {
    const propX = spec.id === 'lyutyi' ? -6.5 : -13.5;
    const propSpan = spec.id === 'lyutyi' ? 4.8 : 4.2;
    const bladePhase = Math.sin(timeSec * 62);
    // Subtle translucent spinning prop disc
    ctx.strokeStyle = 'rgba(215, 222, 230, 0.32)';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(propX, -propSpan * (0.45 + 0.55 * Math.abs(bladePhase)));
    ctx.lineTo(propX, propSpan * (0.45 + 0.55 * Math.abs(bladePhase)));
    ctx.stroke();
  } else if (spec.id === 'airstrike' || spec.id === 'su57-kab') {
    const flicker = 0.88 + Math.sin(timeSec * 47 + x * 0.1) * 0.12;
    const flameLen = (spec.id === 'su57-kab' ? 11 : 10) * flicker;
    for (const ey of [-2.1, 2.1]) {
      const grad = ctx.createLinearGradient(-13, ey, -13 - flameLen, ey);
      grad.addColorStop(0, 'rgba(255, 245, 220, 0.92)');
      grad.addColorStop(0.45, 'rgba(251, 146, 60, 0.55)');
      grad.addColorStop(1, 'rgba(234, 88, 12, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(-12.8, ey - 1.0);
      ctx.lineTo(-13 - flameLen, ey);
      ctx.lineTo(-12.8, ey + 1.0);
      ctx.closePath();
      ctx.fill();
    }
  } else if (spec.id === 'kab') {
    // Faint wingtip condensation wisps on unpowered glide bomb
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.24)';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(-3.5, -12);
    ctx.lineTo(-13, -12);
    ctx.moveTo(-3.5, 12);
    ctx.lineTo(-13, 12);
    ctx.stroke();
  } else {
    const isBallistic = spec.profile === 'ballistic';
    const flicker = 0.84 + Math.sin(timeSec * 52 + y * 0.1) * 0.16;
    const flameLen = (isBallistic ? 17 : 8.5) * flicker;
    const baseWidth = isBallistic ? 1.85 : 1.15;
    const grad = ctx.createLinearGradient(-12, 0, -12 - flameLen, 0);
    grad.addColorStop(0, 'rgba(255, 250, 235, 0.95)');
    grad.addColorStop(0.32, isBallistic ? 'rgba(253, 224, 71, 0.75)' : 'rgba(251, 146, 60, 0.65)');
    grad.addColorStop(1, 'rgba(234, 88, 12, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-11.5, -baseWidth);
    ctx.lineTo(-12 - flameLen, 0);
    ctx.lineTo(-11.5, baseWidth);
    ctx.closePath();
    ctx.fill();
  }

  const sprite = getMunitionSpriteCanvas(spec.id);
  if (sprite) {
    ctx.drawImage(sprite, -27.5, -18.75, 55, 37.5);
  } else {
    drawMunitionSilhouettePath(ctx, spec.id, false);
  }
  ctx.restore();

  if (isUltraLow) {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = 'rgba(167, 139, 250, 0.72)';
    ctx.lineWidth = 1.15;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(0, 0, 15, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  } else if (lowAltitude && radarDetected) {
    ctx.save();
    ctx.translate(x, y);
    const pulse = 1 + Math.sin(timeSec * 8) * 0.08;
    const br = 17 * pulse;
    const arm = 5;
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.9)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-br, -br + arm); ctx.lineTo(-br, -br); ctx.lineTo(-br + arm, -br);
    ctx.moveTo(br - arm, -br); ctx.lineTo(br, -br); ctx.lineTo(br, -br + arm);
    ctx.moveTo(-br, br - arm); ctx.lineTo(-br, br); ctx.lineTo(-br + arm, br);
    ctx.moveTo(br - arm, br); ctx.lineTo(br, br); ctx.lineTo(br, br - arm);
    ctx.stroke();
    ctx.restore();
  }
}

function drawMunitionSilhouettePath(
  ctx: CanvasRenderingContext2D,
  id: MunitionId,
  shadowOnly: boolean,
) {
  if (id === 'shahed-136' || id === 'shahed-238') {
    const isJet = id === 'shahed-238';
    ctx.beginPath();
    ctx.moveTo(16.5, 0);
    ctx.quadraticCurveTo(11, -2.5, -9, -12.2);
    ctx.lineTo(-13, -10.5);
    ctx.lineTo(-11, -3.2);
    ctx.lineTo(-12.5, -2.4);
    ctx.lineTo(-12.5, 2.4);
    ctx.lineTo(-11, 3.2);
    ctx.lineTo(-13, 10.5);
    ctx.lineTo(-9, 12.2);
    ctx.quadraticCurveTo(11, 2.5, 16.5, 0);
    ctx.closePath();

    if (shadowOnly) {
      ctx.fill();
      return;
    }

    // Authentic matte composite Geran-2 (dark grey-olive) / Geran-3 (radar-absorbing charcoal)
    const wingGrad = ctx.createLinearGradient(0, -12, 0, 12);
    if (isJet) {
      wingGrad.addColorStop(0, '#282D34');
      wingGrad.addColorStop(0.5, '#1D2127');
      wingGrad.addColorStop(1, '#14171B');
    } else {
      wingGrad.addColorStop(0, '#5A6065');
      wingGrad.addColorStop(0.5, '#41464B');
      wingGrad.addColorStop(1, '#2D3135');
    }
    ctx.fillStyle = wingGrad;
    ctx.strokeStyle = 'rgba(15, 20, 26, 0.78)';
    ctx.lineWidth = 0.65;
    ctx.fill();
    ctx.stroke();

    // Subtle wing structural spar shading
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 0.55;
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(-9, -10.8);
    ctx.moveTo(12, 0);
    ctx.lineTo(-9, 10.8);
    ctx.stroke();

    // Central blended fuselage tube
    const bodyGrad = ctx.createLinearGradient(0, -2.1, 0, 2.1);
    bodyGrad.addColorStop(0, isJet ? '#383E46' : '#6E757C');
    bodyGrad.addColorStop(0.5, isJet ? '#242930' : '#4C5258');
    bodyGrad.addColorStop(1, isJet ? '#13161B' : '#2C3035');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.moveTo(17, 0);
    ctx.quadraticCurveTo(10, -2.2, -13, -1.9);
    ctx.lineTo(-13, 1.9);
    ctx.quadraticCurveTo(10, 2.2, 17, 0);
    ctx.closePath();
    ctx.fill();

    // Nose radome / Pitot
    ctx.fillStyle = '#181B20';
    ctx.beginPath();
    ctx.moveTo(17, 0);
    ctx.lineTo(10.5, -1.7);
    ctx.lineTo(10.5, 1.7);
    ctx.closePath();
    ctx.fill();

    if (isJet) {
      ctx.fillStyle = '#101317';
      ctx.fillRect(-7.5, -1.1, 6.5, 2.2);
    }

    // Cropped wingtip vertical endplates
    ctx.fillStyle = isJet ? '#111418' : '#2A2E33';
    ctx.fillRect(-12.6, -12.2, 4.6, 1.4);
    ctx.fillRect(-12.6, 10.8, 4.6, 1.4);
    return;
  }

  if (id === 'lyutyi') {
    if (shadowOnly) {
      ctx.fillRect(-14, -1.6, 28, 3.2);
      ctx.fillRect(-3, -15.5, 4.6, 31);
      return;
    }
    // Twin tail booms + inverted-V tailplane
    ctx.fillStyle = '#6B737B';
    ctx.fillRect(-13.5, -4.4, 11.5, 1.1);
    ctx.fillRect(-13.5, 3.3, 11.5, 1.1);
    ctx.fillStyle = '#525A62';
    ctx.fillRect(-14, -5.1, 2.1, 10.2);

    // High-aspect tapered composite UAV wings
    const wingGrad = ctx.createLinearGradient(0, -15.5, 0, 15.5);
    wingGrad.addColorStop(0, '#96A0AA');
    wingGrad.addColorStop(0.5, '#ABB4BD');
    wingGrad.addColorStop(1, '#7D8690');
    ctx.fillStyle = wingGrad;
    ctx.strokeStyle = 'rgba(20, 26, 32, 0.72)';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(3.5, -1.8);
    ctx.lineTo(-0.5, -15.5);
    ctx.lineTo(-3.8, -15);
    ctx.lineTo(-2.2, -1.8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(3.5, 1.8);
    ctx.lineTo(-0.5, 15.5);
    ctx.lineTo(-3.8, 15);
    ctx.lineTo(-2.2, 1.8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Central aerodynamic pod
    const podGrad = ctx.createLinearGradient(0, -2.2, 0, 2.2);
    podGrad.addColorStop(0, '#B5BEC7');
    podGrad.addColorStop(0.5, '#8A939C');
    podGrad.addColorStop(1, '#586069');
    ctx.fillStyle = podGrad;
    ctx.beginPath();
    ctx.moveTo(15.5, 0);
    ctx.quadraticCurveTo(9, -2.3, -6, -1.9);
    ctx.lineTo(-6, 1.9);
    ctx.quadraticCurveTo(9, 2.3, 15.5, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Anti-glare composite nose cap
    ctx.fillStyle = '#2B3137';
    ctx.beginPath();
    ctx.moveTo(15.5, 0);
    ctx.lineTo(10, -1.5);
    ctx.lineTo(10, 1.5);
    ctx.closePath();
    ctx.fill();
    return;
  }

  if (id === 'bober') {
    if (shadowOnly) {
      ctx.beginPath();
      ctx.moveTo(16, 0);
      ctx.lineTo(7, -6);
      ctx.lineTo(4, -1.8);
      ctx.lineTo(-10.5, -13);
      ctx.lineTo(-12.8, 13);
      ctx.lineTo(4, 1.8);
      ctx.lineTo(7, 6);
      ctx.closePath();
      ctx.fill();
      return;
    }

    // Forward canard surfaces
    ctx.fillStyle = '#8F98A0';
    ctx.strokeStyle = 'rgba(20, 25, 30, 0.7)';
    ctx.lineWidth = 0.55;
    ctx.beginPath();
    ctx.moveTo(11, -1.3);
    ctx.lineTo(7.2, -6.2);
    ctx.lineTo(5.3, -5.6);
    ctx.lineTo(8, -1.3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(11, 1.3);
    ctx.lineTo(7.2, 6.2);
    ctx.lineTo(5.3, 5.6);
    ctx.lineTo(8, 1.3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Swept rear main wings
    ctx.fillStyle = '#7A838B';
    ctx.beginPath();
    ctx.moveTo(-1, -1.6);
    ctx.lineTo(-10.5, -13.2);
    ctx.lineTo(-13.2, -11.8);
    ctx.lineTo(-7, -1.6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-1, 1.6);
    ctx.lineTo(-10.5, 13.2);
    ctx.lineTo(-13.2, 11.8);
    ctx.lineTo(-7, 1.6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Fuselage
    const fusGrad = ctx.createLinearGradient(0, -1.8, 0, 1.8);
    fusGrad.addColorStop(0, '#A7B0B8');
    fusGrad.addColorStop(1, '#586068');
    ctx.fillStyle = fusGrad;
    ctx.beginPath();
    ctx.moveTo(16, 0);
    ctx.quadraticCurveTo(10, -2, -12, -1.7);
    ctx.lineTo(-12, 1.7);
    ctx.quadraticCurveTo(10, 2, 16, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    return;
  }

  if (id === 'iskander' || id === 'sapsan') {
    const isSapsan = id === 'sapsan';
    if (shadowOnly) {
      ctx.beginPath();
      ctx.moveTo(20, 0);
      ctx.lineTo(7, -3.2);
      ctx.lineTo(-14, -3.2);
      ctx.lineTo(-16.5, -6.5);
      ctx.lineTo(-16.5, 6.5);
      ctx.lineTo(-14, 3.2);
      ctx.lineTo(7, 3.2);
      ctx.closePath();
      ctx.fill();
      return;
    }

    // Tail aerodynamic control fins
    ctx.fillStyle = '#2E3338';
    ctx.strokeStyle = 'rgba(15, 20, 25, 0.75)';
    ctx.lineWidth = 0.55;
    ctx.beginPath();
    ctx.moveTo(-10, -2.3);
    ctx.lineTo(-15.5, -6.8);
    ctx.lineTo(-16.6, -4.8);
    ctx.lineTo(-14, -2.3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-10, 2.3);
    ctx.lineTo(-15.5, 6.8);
    ctx.lineTo(-16.6, 4.8);
    ctx.lineTo(-14, 2.3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Cylindrical ballistic missile fuselage in muted tactical olive/slate
    const iskGrad = ctx.createLinearGradient(0, -3.0, 0, 3.0);
    iskGrad.addColorStop(0, isSapsan ? '#758274' : '#6F7B66');
    iskGrad.addColorStop(0.45, isSapsan ? '#505B4F' : '#4C5645');
    iskGrad.addColorStop(1, '#2B3228');
    ctx.fillStyle = iskGrad;
    ctx.beginPath();
    ctx.moveTo(20.5, 0);
    ctx.quadraticCurveTo(13, -3.1, 7, -2.9);
    ctx.lineTo(-14, -2.9);
    ctx.lineTo(-14, 2.9);
    ctx.lineTo(7, 2.9);
    ctx.quadraticCurveTo(13, 3.1, 20.5, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Ogive metallic/ceramic warhead section
    const noseGrad = ctx.createLinearGradient(0, -2.6, 0, 2.6);
    noseGrad.addColorStop(0, '#CBD5E1');
    noseGrad.addColorStop(0.55, '#7A838E');
    noseGrad.addColorStop(1, '#3D444C');
    ctx.fillStyle = noseGrad;
    ctx.beginPath();
    ctx.moveTo(20.5, 0);
    ctx.quadraticCurveTo(14, -2.6, 8.5, -2.7);
    ctx.lineTo(8.5, 2.7);
    ctx.quadraticCurveTo(14, 2.6, 20.5, 0);
    ctx.closePath();
    ctx.fill();

    // Longitudinal cable raceway detail
    ctx.fillStyle = 'rgba(20, 24, 28, 0.45)';
    ctx.fillRect(-11, -0.5, 19, 1);
    return;
  }

  if (id === 'airstrike') {
    if (shadowOnly) {
      ctx.beginPath();
      ctx.moveTo(20, 0);
      ctx.lineTo(6, -3.5);
      ctx.lineTo(-8, -18);
      ctx.lineTo(-13, -16.5);
      ctx.lineTo(-5.5, -3.5);
      ctx.lineTo(-13.5, -3.5);
      ctx.lineTo(-17, -8.5);
      ctx.lineTo(-19, -7);
      ctx.lineTo(-14.5, 0);
      ctx.lineTo(-19, 7);
      ctx.lineTo(-17, 8.5);
      ctx.lineTo(-13.5, 3.5);
      ctx.lineTo(-5.5, 3.5);
      ctx.lineTo(-13, 16.5);
      ctx.lineTo(-8, 18);
      ctx.lineTo(6, 3.5);
      ctx.closePath();
      ctx.fill();
      return;
    }

    // Su-34 tactical strike bomber (VKS eggplant grey-blue top coat)
    const wingGrad = ctx.createLinearGradient(0, -18, 0, 18);
    wingGrad.addColorStop(0, '#545F6B');
    wingGrad.addColorStop(0.5, '#3E4752');
    wingGrad.addColorStop(1, '#2A3139');
    ctx.fillStyle = wingGrad;
    ctx.strokeStyle = 'rgba(15, 20, 26, 0.78)';
    ctx.lineWidth = 0.65;

    // Main swept wings with curved LERX + canards
    ctx.beginPath();
    ctx.moveTo(10, -2.2);
    ctx.lineTo(7, -5.2);
    ctx.lineTo(5, -3.2);
    ctx.lineTo(-8, -18);
    ctx.lineTo(-13, -16.5);
    ctx.lineTo(-5, -3.2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(10, 2.2);
    ctx.lineTo(7, 5.2);
    ctx.lineTo(5, 3.2);
    ctx.lineTo(-8, 18);
    ctx.lineTo(-13, 16.5);
    ctx.lineTo(-5, 3.2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Tailplanes
    ctx.fillStyle = '#333B44';
    ctx.beginPath();
    ctx.moveTo(-10, -2.5);
    ctx.lineTo(-16.5, -8.6);
    ctx.lineTo(-18.5, -7);
    ctx.lineTo(-13.5, -2.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-10, 2.5);
    ctx.lineTo(-16.5, 8.6);
    ctx.lineTo(-18.5, 7);
    ctx.lineTo(-13.5, 2.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Twin-engine broad duckbill fuselage
    const hullGrad = ctx.createLinearGradient(0, -3.8, 0, 3.8);
    hullGrad.addColorStop(0, '#626E7B');
    hullGrad.addColorStop(0.5, '#424B56');
    hullGrad.addColorStop(1, '#262C33');
    ctx.fillStyle = hullGrad;
    ctx.beginPath();
    ctx.moveTo(20.5, 0);
    ctx.quadraticCurveTo(14, -3.4, 7, -3.6);
    ctx.lineTo(-13.5, -3.8);
    ctx.lineTo(-13.5, 3.8);
    ctx.lineTo(7, 3.6);
    ctx.quadraticCurveTo(14, 3.4, 20.5, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Side-by-side dark cockpit glazing + nose dielectric cone
    ctx.fillStyle = '#141920';
    ctx.beginPath();
    ctx.ellipse(10.2, 0, 4.0, 1.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(200, 215, 230, 0.28)';
    ctx.beginPath();
    ctx.ellipse(11, -0.4, 2.1, 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  if (id === 'su57-kab') {
    if (shadowOnly) {
      ctx.beginPath();
      ctx.moveTo(21, 0);
      ctx.lineTo(9, -3.4);
      ctx.lineTo(-6, -18);
      ctx.lineTo(-12, -14);
      ctx.lineTo(-7, -4);
      ctx.lineTo(-14, -4);
      ctx.lineTo(-18, -9.2);
      ctx.lineTo(-19.5, -7.2);
      ctx.lineTo(-14.5, 0);
      ctx.lineTo(-19.5, 7.2);
      ctx.lineTo(-18, 9.2);
      ctx.lineTo(-14, 4);
      ctx.lineTo(-7, 4);
      ctx.lineTo(-12, 14);
      ctx.lineTo(-6, 18);
      ctx.lineTo(9, 3.4);
      ctx.closePath();
      ctx.fill();
      return;
    }

    // Trapezoidal stealth wings + chined LEVCON
    const wingGrad = ctx.createLinearGradient(0, -18, 0, 18);
    wingGrad.addColorStop(0, '#5A6470');
    wingGrad.addColorStop(0.5, '#3E4650');
    wingGrad.addColorStop(1, '#282E36');
    ctx.fillStyle = wingGrad;
    ctx.strokeStyle = 'rgba(15, 20, 26, 0.78)';
    ctx.lineWidth = 0.65;

    ctx.beginPath();
    ctx.moveTo(11, -2.4);
    ctx.lineTo(4.5, -5.4);
    ctx.lineTo(-6, -18);
    ctx.lineTo(-12, -14.2);
    ctx.lineTo(-4.5, -3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(11, 2.4);
    ctx.lineTo(4.5, 5.4);
    ctx.lineTo(-6, 18);
    ctx.lineTo(-12, 14.2);
    ctx.lineTo(-4.5, 3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Subtle splinter camouflage patch
    ctx.fillStyle = 'rgba(148, 163, 184, 0.16)';
    ctx.beginPath();
    ctx.moveTo(2, -5.5);
    ctx.lineTo(-6, -14);
    ctx.lineTo(-8.5, -10.5);
    ctx.lineTo(-2, -3.5);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(2, 5.5);
    ctx.lineTo(-6, 14);
    ctx.lineTo(-8.5, 10.5);
    ctx.lineTo(-2, 3.5);
    ctx.closePath();
    ctx.fill();

    // Canted tailplanes
    ctx.fillStyle = '#333A43';
    ctx.beginPath();
    ctx.moveTo(-10, -2.8);
    ctx.lineTo(-17.5, -9.2);
    ctx.lineTo(-19.5, -7);
    ctx.lineTo(-13.5, -2.8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-10, 2.8);
    ctx.lineTo(-17.5, 9.2);
    ctx.lineTo(-19.5, 7);
    ctx.lineTo(-13.5, 2.8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Blended twin-engine stealth body
    const hullGrad = ctx.createLinearGradient(0, -4, 0, 4);
    hullGrad.addColorStop(0, '#6B7684');
    hullGrad.addColorStop(0.5, '#434B56');
    hullGrad.addColorStop(1, '#262C34');
    ctx.fillStyle = hullGrad;
    ctx.beginPath();
    ctx.moveTo(21, 0);
    ctx.lineTo(9.5, -3.6);
    ctx.lineTo(-14, -4);
    ctx.lineTo(-14, 4);
    ctx.lineTo(9.5, 3.6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Gold-tinted stealth canopy glass
    ctx.fillStyle = '#181E26';
    ctx.beginPath();
    ctx.ellipse(10.5, 0, 4.4, 1.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(218, 192, 130, 0.32)';
    ctx.beginPath();
    ctx.ellipse(11.3, -0.35, 2.3, 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  if (id === 'kab') {
    if (shadowOnly) {
      ctx.fillRect(-10, -2.3, 22, 4.6);
      ctx.beginPath();
      ctx.moveTo(3, -1.8);
      ctx.lineTo(-2, -12.5);
      ctx.lineTo(-4.8, -11.8);
      ctx.lineTo(-1, -1.8);
      ctx.lineTo(-1, 1.8);
      ctx.lineTo(-4.8, 11.8);
      ctx.lineTo(-2, 12.5);
      ctx.lineTo(3, 1.8);
      ctx.closePath();
      ctx.fill();
      return;
    }

    // Steel UMPK folding glide wing kit
    ctx.fillStyle = '#9BA4AE';
    ctx.strokeStyle = 'rgba(20, 26, 32, 0.7)';
    ctx.lineWidth = 0.55;
    ctx.beginPath();
    ctx.moveTo(3.5, -1.8);
    ctx.lineTo(-2.5, -12.5);
    ctx.lineTo(-5.0, -11.6);
    ctx.lineTo(-0.8, -1.8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(3.5, 1.8);
    ctx.lineTo(-2.5, 12.5);
    ctx.lineTo(-5.0, 11.6);
    ctx.lineTo(-0.8, 1.8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Olive-drab FAB-500 bomb casing
    const bombGrad = ctx.createLinearGradient(0, -2.5, 0, 2.5);
    bombGrad.addColorStop(0, '#69725C');
    bombGrad.addColorStop(0.5, '#4A5240');
    bombGrad.addColorStop(1, '#2C3225');
    ctx.fillStyle = bombGrad;
    ctx.beginPath();
    ctx.moveTo(13, 0);
    ctx.quadraticCurveTo(10, -2.6, 5, -2.5);
    ctx.lineTo(-10, -2.3);
    ctx.lineTo(-10, 2.3);
    ctx.lineTo(5, 2.5);
    ctx.quadraticCurveTo(10, 2.6, 13, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    return;
  }

  if (id === 'kinzhal') {
    if (shadowOnly) {
      ctx.beginPath();
      ctx.moveTo(21, 0);
      ctx.lineTo(8, -2.8);
      ctx.lineTo(-14, -2.8);
      ctx.lineTo(-17, -6.2);
      ctx.lineTo(-17, 6.2);
      ctx.lineTo(-14, 2.8);
      ctx.lineTo(8, 2.8);
      ctx.closePath();
      ctx.fill();
      return;
    }

    ctx.fillStyle = '#383E46';
    ctx.strokeStyle = 'rgba(15, 20, 26, 0.72)';
    ctx.lineWidth = 0.55;
    ctx.beginPath();
    ctx.moveTo(-10, -2.0);
    ctx.lineTo(-16, -6.4);
    ctx.lineTo(-17, -4.4);
    ctx.lineTo(-14, -2.0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-10, 2.0);
    ctx.lineTo(-16, 6.4);
    ctx.lineTo(-17, 4.4);
    ctx.lineTo(-14, 2.0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    const kinzGrad = ctx.createLinearGradient(0, -2.6, 0, 2.6);
    kinzGrad.addColorStop(0, '#D4DCE4');
    kinzGrad.addColorStop(0.5, '#9BA4AE');
    kinzGrad.addColorStop(1, '#58606A');
    ctx.fillStyle = kinzGrad;
    ctx.beginPath();
    ctx.moveTo(21.5, 0);
    ctx.quadraticCurveTo(14, -2.6, 8, -2.6);
    ctx.lineTo(-14, -2.6);
    ctx.lineTo(-14, 2.6);
    ctx.lineTo(8, 2.6);
    ctx.quadraticCurveTo(14, 2.6, 21.5, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Dark ablative heatshield cone
    ctx.fillStyle = '#252930';
    ctx.beginPath();
    ctx.moveTo(21.5, 0);
    ctx.lineTo(11, -2.1);
    ctx.lineTo(11, 2.1);
    ctx.closePath();
    ctx.fill();
    return;
  }

  if (id === 'kh22') {
    if (shadowOnly) {
      ctx.fillRect(-14, -2.4, 32, 4.8);
      ctx.beginPath();
      ctx.moveTo(4, -2.2);
      ctx.lineTo(-6, -12.8);
      ctx.lineTo(-9, -11.5);
      ctx.lineTo(-3, -2.2);
      ctx.lineTo(-3, 2.2);
      ctx.lineTo(-9, 11.5);
      ctx.lineTo(-6, 12.8);
      ctx.lineTo(4, 2.2);
      ctx.closePath();
      ctx.fill();
      return;
    }

    ctx.fillStyle = '#9BA4AF';
    ctx.strokeStyle = 'rgba(18, 23, 28, 0.72)';
    ctx.lineWidth = 0.55;
    ctx.beginPath();
    ctx.moveTo(4.5, -2.1);
    ctx.lineTo(-6, -12.6);
    ctx.lineTo(-9, -11.2);
    ctx.lineTo(-2.5, -2.1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(4.5, 2.1);
    ctx.lineTo(-6, 12.6);
    ctx.lineTo(-9, 11.2);
    ctx.lineTo(-2.5, 2.1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    const kh22Grad = ctx.createLinearGradient(0, -2.7, 0, 2.7);
    kh22Grad.addColorStop(0, '#CBD4DD');
    kh22Grad.addColorStop(0.5, '#96A0AA');
    kh22Grad.addColorStop(1, '#58616B');
    ctx.fillStyle = kh22Grad;
    ctx.beginPath();
    ctx.moveTo(19.5, 0);
    ctx.quadraticCurveTo(13, -2.7, 8, -2.7);
    ctx.lineTo(-14, -2.7);
    ctx.lineTo(-14, 2.7);
    ctx.lineTo(8, 2.7);
    ctx.quadraticCurveTo(13, 2.7, 19.5, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Dielectric seeker nose
    ctx.fillStyle = '#2A3038';
    ctx.beginPath();
    ctx.moveTo(19.5, 0);
    ctx.quadraticCurveTo(14, -2.2, 10.5, -2.3);
    ctx.lineTo(10.5, 2.3);
    ctx.quadraticCurveTo(14, 2.2, 19.5, 0);
    ctx.closePath();
    ctx.fill();
    return;
  }

  // Cruise & jet missile-drones: kalibr, banderol, kh101, kh69, neptune, palyanytsya, peklo, flamingo
  const wingSpan =
    id === 'kh101' || id === 'flamingo'
      ? 16.5
      : id === 'palyanytsya' || id === 'banderol'
        ? 11.5
        : 13;
  if (shadowOnly) {
    ctx.fillRect(-13, -2.0, 28, 4.0);
    ctx.beginPath();
    ctx.moveTo(4, -1.8);
    ctx.lineTo(-3, -wingSpan);
    ctx.lineTo(-5.8, -wingSpan);
    ctx.lineTo(-1, -1.8);
    ctx.lineTo(-1, 1.8);
    ctx.lineTo(-5.8, wingSpan);
    ctx.lineTo(-3, wingSpan);
    ctx.lineTo(4, 1.8);
    ctx.closePath();
    ctx.fill();
    return;
  }

  const isStealth = id === 'kh101' || id === 'kh69';
  const isFlamingo = id === 'flamingo';
  const wingColor = isStealth ? '#4C545E' : isFlamingo ? '#666E77' : '#A4AEB8';

  ctx.fillStyle = wingColor;
  ctx.strokeStyle = 'rgba(15, 20, 26, 0.72)';
  ctx.lineWidth = 0.55;
  ctx.beginPath();
  ctx.moveTo(4.5, -1.6);
  ctx.lineTo(-3.5, -wingSpan);
  ctx.lineTo(-6.2, -wingSpan + 1.0);
  ctx.lineTo(-1, -1.6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(4.5, 1.6);
  ctx.lineTo(-3.5, wingSpan);
  ctx.lineTo(-6.2, wingSpan - 1.0);
  ctx.lineTo(-1, 1.6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Tail fins
  ctx.fillStyle = '#3C434B';
  ctx.beginPath();
  ctx.moveTo(-9, -1.5);
  ctx.lineTo(-13.5, -5.4);
  ctx.lineTo(-15, -4.3);
  ctx.lineTo(-12, -1.5);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-9, 1.5);
  ctx.lineTo(-13.5, 5.4);
  ctx.lineTo(-15, 4.3);
  ctx.lineTo(-12, 1.5);
  ctx.closePath();
  ctx.fill();

  const crGrad = ctx.createLinearGradient(0, -2.3, 0, 2.3);
  if (isStealth) {
    crGrad.addColorStop(0, '#5E6772');
    crGrad.addColorStop(0.5, '#3E454E');
    crGrad.addColorStop(1, '#23282E');
  } else if (id === 'neptune') {
    crGrad.addColorStop(0, '#8A969E');
    crGrad.addColorStop(0.5, '#5E6A72');
    crGrad.addColorStop(1, '#343D44');
  } else if (isFlamingo) {
    crGrad.addColorStop(0, '#6E767E');
    crGrad.addColorStop(0.5, '#4A5158');
    crGrad.addColorStop(1, '#2B3036');
  } else {
    crGrad.addColorStop(0, '#D2DAE2');
    crGrad.addColorStop(0.5, '#9BA4AE');
    crGrad.addColorStop(1, '#58606A');
  }
  ctx.fillStyle = crGrad;
  ctx.beginPath();
  ctx.moveTo(17, 0);
  ctx.quadraticCurveTo(13, -2.4, 9.5, -2.3);
  ctx.lineTo(-13, -2.2);
  ctx.lineTo(-13, 2.2);
  ctx.lineTo(9.5, 2.3);
  ctx.quadraticCurveTo(13, 2.4, 17, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  if (isFlamingo) {
    // Dorsal turbojet nacelle on FP-5
    ctx.fillStyle = '#2B3036';
    ctx.fillRect(-10, -1.2, 7.5, 2.4);
  }

  // Realistic dark dielectric or muted primer nosecone (never neon colors)
  ctx.fillStyle = isFlamingo ? '#8A4F60' : id === 'kalibr' ? '#7D3B3B' : '#262B31';
  ctx.beginPath();
  ctx.moveTo(17.2, 0);
  ctx.quadraticCurveTo(13.5, -2.0, 11, -2.0);
  ctx.lineTo(11, 2.0);
  ctx.quadraticCurveTo(13.5, 2.0, 17.2, 0);
  ctx.closePath();
  ctx.fill();
}

/**
 * Draws a realistic falling aerial bomb (FAB-500) toward ground impact.
 */
export function drawFallingBomb(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  headingRad: number,
  progress: number,
) {
  const p = Math.max(0, Math.min(1, progress));
  const altitudePx = (1 - p * p) * 16;
  const scale = 1.05 - p * 0.35;

  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = `rgba(0, 0, 0, ${0.2 + p * 0.32})`;
  ctx.beginPath();
  ctx.arc(0, 0, 3.0 - p * 1.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.translate(0, -altitudePx);
  ctx.rotate(headingRad);
  ctx.scale(scale, scale);

  ctx.fillStyle = '#4B5340';
  ctx.strokeStyle = 'rgba(20, 24, 18, 0.8)';
  ctx.lineWidth = 0.65;
  ctx.beginPath();
  ctx.ellipse(0, 0, 4.6, 1.9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#2E3428';
  ctx.fillRect(-5.2, -2.0, 2.0, 4.0);
  ctx.restore();
}

/**
 * Draws realistic multi-stage detonation:
 * 1. Thermal ground flash illumination
 * 2. Atmospheric Mach pressure wave + dirt blast ring
 * 3. Billowing turbulent smoke column with warm fire underglow
 * 4. Multi-lobe turbulent plasma fireball
 * 5. Ballistic glowing shrapnel streaks
 */
export function drawExplosion(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  explosion: ActiveExplosion,
) {
  const t = Math.min(1, explosion.age / explosion.duration);
  const p = explosion.power;

  ctx.save();
  ctx.translate(x, y);

  // 0. Ground scorch & blast crater ring (persists subtly through smoke dissipation)
  if (t > 0.03) {
    const scorchFade = t > 0.72 ? Math.max(0, (1 - t) / 0.28) : Math.min(1, (t - 0.03) / 0.08);
    const scorchRad = 18 * p;
    const sGrad = ctx.createRadialGradient(0, 0, 1.5, 0, 0, scorchRad);
    sGrad.addColorStop(0, `rgba(12, 10, 9, ${scorchFade * 0.72})`);
    sGrad.addColorStop(0.45, `rgba(28, 22, 18, ${scorchFade * 0.48})`);
    sGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = sGrad;
    ctx.beginPath();
    ctx.arc(0, 0, scorchRad, 0, Math.PI * 2);
    ctx.fill();
  }

  // 1. Blinding initial detonation thermal flash (0..0.16)
  if (t < 0.18) {
    const flashT = t / 0.18;
    const flashAlpha = Math.pow(1 - flashT, 1.45) * 0.85;
    const flashRad = (24 + flashT * 94) * p;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const flashGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, flashRad);
    flashGrad.addColorStop(0, `rgba(255, 255, 248, ${flashAlpha})`);
    flashGrad.addColorStop(0.26, `rgba(254, 226, 175, ${flashAlpha * 0.72})`);
    flashGrad.addColorStop(0.6, `rgba(234, 88, 12, ${flashAlpha * 0.28})`);
    flashGrad.addColorStop(1, 'rgba(234, 88, 12, 0)');
    ctx.fillStyle = flashGrad;
    ctx.beginPath();
    ctx.arc(0, 0, flashRad, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 2. Supersonic atmospheric condensation dome + ground dust ejecta wave
  if (t < 0.34) {
    const waveT = t / 0.34;
    const eased = 1 - Math.pow(1 - waveT, 2.4);
    const waveRadius = (11 + eased * 108) * p;
    const alpha = Math.max(0, 1 - waveT) * 0.88;

    const ringGrad = ctx.createRadialGradient(
      0,
      0,
      Math.max(1, waveRadius - 10),
      0,
      0,
      waveRadius + 3,
    );
    ringGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
    ringGrad.addColorStop(0.55, `rgba(241, 245, 249, ${alpha * 0.62})`);
    ringGrad.addColorStop(0.82, `rgba(226, 232, 240, ${alpha * 0.3})`);
    ringGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = ringGrad;
    ctx.beginPath();
    ctx.arc(0, 0, waveRadius + 3, 0, Math.PI * 2);
    ctx.fill();

    // Kicked-up soil/concrete dust blast collar
    ctx.strokeStyle = `rgba(146, 118, 92, ${alpha * 0.58})`;
    ctx.lineWidth = Math.max(1.2, (1 - waveT) * 4.5);
    ctx.beginPath();
    ctx.arc(0, 0, waveRadius * 0.58, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 3. Heavy soot-black billowing smoke column rising & drifting with wind
  if (t > 0.03) {
    for (const puff of explosion.smokePuffs) {
      const localAge = explosion.age - puff.delay;
      if (localAge <= 0) continue;
      const smokeT = Math.min(1, localAge / (explosion.duration - puff.delay));
      const smokeAlpha =
        Math.sin(Math.min(1, smokeT * 1.45) * Math.PI * 0.5) *
        (1 - Math.pow(smokeT, 1.7)) *
        0.78;
      if (smokeAlpha <= 0.01) continue;

      const px = puff.ox + puff.vx * localAge * 0.88;
      const py = puff.oy + puff.vy * localAge * 0.92;
      const rad = puff.radius * (0.48 + smokeT * 1.25);
      const s = puff.shade;

      // Realistic orange fire-glow illuminating inner underside of dark soot clouds
      const glowWarmth = t < 0.42 ? (1 - t / 0.42) * 0.52 : 0;
      const rCol = Math.min(255, Math.round(s + glowWarmth * 185));
      const gCol = Math.min(255, Math.round(s + glowWarmth * 72));
      const bCol = Math.round(s + 2);

      const grad = ctx.createRadialGradient(px, py, rad * 0.06, px, py, rad);
      grad.addColorStop(0, `rgba(${rCol}, ${gCol}, ${bCol}, ${smokeAlpha})`);
      grad.addColorStop(0.52, `rgba(${s + 10}, ${s + 8}, ${s + 10}, ${smokeAlpha * 0.78})`);
      grad.addColorStop(1, `rgba(${s}, ${s}, ${s}, 0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(px, py, rad, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 4. Turbulent multi-lobe soot-rimmed high-explosive fireball (0..0.44)
  if (t < 0.46) {
    const fireT = t / 0.46;
    const expand = Math.sin(Math.min(1, fireT * 1.55) * Math.PI * 0.5);
    const fireAlpha = Math.max(0, 1 - Math.pow(fireT, 1.28));
    const baseRad = (13 + expand * 29) * p;

    for (const lobe of explosion.fireLobes) {
      const lx = Math.cos(lobe.angle) * baseRad * lobe.distFactor * (0.55 + fireT * 0.62);
      const ly =
        Math.sin(lobe.angle) * baseRad * lobe.distFactor * (0.55 + fireT * 0.62) -
        lobe.riseSpeed * explosion.age;
      const lr = baseRad * lobe.radiusFactor;

      const grad = ctx.createRadialGradient(lx, ly, 0, lx, ly, lr);
      grad.addColorStop(0, `rgba(255, 250, 215, ${fireAlpha * 0.92})`);
      grad.addColorStop(0.32, `rgba(249, 115, 22, ${fireAlpha * 0.86})`);
      grad.addColorStop(0.68, `rgba(185, 28, 28, ${fireAlpha * 0.56})`);
      grad.addColorStop(0.88, `rgba(41, 24, 18, ${fireAlpha * 0.35})`);
      grad.addColorStop(1, 'rgba(20, 16, 14, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(lx, ly, lr, 0, Math.PI * 2);
      ctx.fill();
    }

    // Incandescent core
    const coreRad = baseRad * 0.58;
    const coreGrad = ctx.createRadialGradient(
      0,
      -explosion.age * 5,
      0,
      0,
      -explosion.age * 5,
      coreRad,
    );
    coreGrad.addColorStop(0, `rgba(255, 255, 255, ${fireAlpha})`);
    coreGrad.addColorStop(0.42, `rgba(254, 240, 138, ${fireAlpha * 0.88})`);
    coreGrad.addColorStop(1, 'rgba(234, 88, 12, 0)');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(0, -explosion.age * 5, coreRad, 0, Math.PI * 2);
    ctx.fill();
  }

  // 5. High-velocity shrapnel sparks & ballistic earth/debris trajectories
  for (const part of explosion.particles) {
    if (explosion.age > part.life) continue;
    const pt = explosion.age / part.life;
    const drag = 1 - pt * 0.45;
    const px = Math.cos(part.angle) * part.speed * explosion.age * drag;
    const py = Math.sin(part.angle) * part.speed * explosion.age * drag + pt * pt * 22;

    const prevAge = Math.max(0, explosion.age - 0.036);
    const prevPt = prevAge / part.life;
    const prevDrag = 1 - prevPt * 0.45;
    const tx = Math.cos(part.angle) * part.speed * prevAge * prevDrag;
    const ty = Math.sin(part.angle) * part.speed * prevAge * prevDrag + prevPt * prevPt * 22;

    const alpha = Math.max(0, 1 - pt);
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = part.color;
    ctx.lineWidth = part.size * (1 - pt * 0.35);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(px, py);
    ctx.stroke();
  }

  // 6. Residual crater fire & smoldering embers (0.18..0.88)
  if (t > 0.16 && t < 0.88) {
    const emberAlpha = Math.sin(((t - 0.16) / 0.72) * Math.PI) * 0.62;
    const emberGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 12 * p);
    emberGrad.addColorStop(0, `rgba(253, 186, 116, ${emberAlpha * 0.85})`);
    emberGrad.addColorStop(0.4, `rgba(234, 88, 12, ${emberAlpha * 0.7})`);
    emberGrad.addColorStop(0.75, `rgba(127, 29, 29, ${emberAlpha * 0.4})`);
    emberGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.globalAlpha = 1;
    ctx.fillStyle = emberGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 12 * p, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Draws a top-down ППО (air defense) unit + rotating search radar + radar range circle + ammo counter.
 */
export function drawAirDefenseUnit(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rangePx: number,
  spec: AirDefenseSpec,
  options: {
    ammo?: number;
    maxAmmo?: number;
    hp?: number;
    maxHp?: number;
    cooldownRemainingSec?: number;
    cooldownTotalSec?: number;
    aimAngleRad?: number;
    chassisAngleRad?: number;
    extendedRangePx?: number;
    isPreview?: boolean;
    previewValid?: boolean;
    hovered?: boolean;
    isTargetLocked?: boolean;
    timeSec: number;
  },
) {
  const {
    ammo = spec.maxAmmo,
    maxAmmo = spec.maxAmmo,
    hp = spec.maxHp,
    maxHp = spec.maxHp,
    cooldownRemainingSec = 0,
    cooldownTotalSec = spec.cooldownSec,
    aimAngleRad = -Math.PI / 3,
    chassisAngleRad = aimAngleRad,
    extendedRangePx,
    isPreview = false,
    previewValid = true,
    hovered = false,
    isTargetLocked = false,
    timeSec,
  } = options;

  const isRadar = Boolean(spec.isRadar);
  const hpRatio = Math.max(0, Math.min(1, hp / Math.max(1, maxHp)));
  const isDamaged = !isPreview && hpRatio < 0.995;
  const isEmpty = !isPreview && !isRadar && ammo <= 0;
  const isReloading =
    !isPreview && !isRadar && !isEmpty && cooldownRemainingSec > 0.05 && cooldownTotalSec > 0;
  const cooldownProgress = isReloading
    ? Math.max(0, Math.min(1, 1 - cooldownRemainingSec / cooldownTotalSec))
    : 1;

  ctx.save();
  ctx.translate(x, y);

  // Extended radar-boosted range ring for firing ППО batteries linked to a Radar ПВО
  if (!isEmpty && !isRadar && extendedRangePx && extendedRangePx > rangePx + 2) {
    ctx.save();
    ctx.globalAlpha = hovered ? 0.52 : 0.32;
    ctx.strokeStyle = '#22D3EE';
    ctx.lineWidth = 1.25;
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.arc(0, 0, extendedRangePx, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // Radar coverage zone circle (always subtly visible, brighter on preview/hover)
  if (!isEmpty) {
    const strokeAlpha = isPreview ? (previewValid ? 0.65 : 0.7) : hovered ? 0.55 : isRadar ? 0.38 : 0.28;
    const fillAlpha = isPreview ? 0.08 : hovered ? 0.06 : isRadar ? 0.04 : 0.03;
    ctx.save();
    ctx.fillStyle = isPreview && !previewValid ? 'rgba(239, 68, 68, 0.09)' : `${spec.accentColor}`;
    ctx.globalAlpha = fillAlpha;
    ctx.beginPath();
    ctx.arc(0, 0, rangePx, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = strokeAlpha;
    ctx.strokeStyle = isPreview && !previewValid ? '#EF4444' : spec.accentColor;
    ctx.lineWidth = isPreview || hovered ? 1.5 : isRadar ? 1.3 : 1.1;
    ctx.setLineDash(isRadar ? [8, 5] : [6, 6]);
    ctx.beginPath();
    ctx.arc(0, 0, rangePx, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Rotating radar sweep sector on active units (skip for optical MG pickup)
    if (!isPreview && spec.id !== 'mg-pickup') {
      const sweepAngle = (timeSec * (isRadar ? 1.1 : 1.45)) % (Math.PI * 2);
      ctx.globalAlpha = isRadar ? 0.16 : 0.14;
      ctx.fillStyle = spec.accentColor;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, rangePx, sweepAngle, sweepAngle + (isRadar ? 0.55 : 0.42));
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  if (isPreview) {
    ctx.globalAlpha = previewValid ? 0.88 : 0.7;
  } else if (isEmpty) {
    ctx.globalAlpha = 0.7;
  }

  // Cooldown recharge ring around ППО unit during multi-second reload
  if (isReloading) {
    ctx.save();
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.8)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 17, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 0, 17, -Math.PI / 2, -Math.PI / 2 + cooldownProgress * Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // 3D Three.js Directional Vehicle + Rotating Turret/Radar (or graceful 2D fallback)
  const pvoDrawSize = spec.id === 'mg-pickup' ? 54 : spec.id === 'radar' ? 60 : 62;
  const effectiveChassisRad = spec.id === 'mg-pickup' ? chassisAngleRad : spec.id === 'radar' ? -0.45 : aimAngleRad;
  const effectiveTurretRad = isRadar
    ? (isPreview ? 0.35 : (timeSec * 2.15) % (Math.PI * 2))
    : aimAngleRad;

  const layers3d = getPvo3DMapLayers(
    spec.id,
    effectiveChassisRad,
    effectiveTurretRad,
    ammo,
    pvoDrawSize,
  );

  if (layers3d) {
    if (!layers3d.turretRotates && layers3d.fullSprite) {
      const residual = effectiveChassisRad - layers3d.binRad;
      ctx.save();
      ctx.rotate(residual);
      ctx.drawImage(
        layers3d.fullSprite,
        -pvoDrawSize / 2,
        -pvoDrawSize / 2,
        pvoDrawSize,
        pvoDrawSize,
      );
      ctx.restore();
    } else if (layers3d.chassisSprite && layers3d.turretSprite) {
      const chResidual = effectiveChassisRad - layers3d.binRad;
      ctx.save();
      ctx.rotate(chResidual);
      ctx.drawImage(
        layers3d.chassisSprite,
        -pvoDrawSize / 2,
        -pvoDrawSize / 2,
        pvoDrawSize,
        pvoDrawSize,
      );
      ctx.restore();

      const tuResidual = effectiveTurretRad - layers3d.turretBinRad;
      ctx.save();
      ctx.translate(layers3d.turretOffsetX, layers3d.turretOffsetY);
      ctx.rotate(tuResidual);
      ctx.drawImage(
        layers3d.turretSprite,
        -pvoDrawSize / 2,
        -pvoDrawSize / 2,
        pvoDrawSize,
        pvoDrawSize,
      );
      ctx.restore();
    }
  } else {
    // 2D fallback when WebGL is unavailable
    ctx.save();
    ctx.rotate(spec.id === 'mg-pickup' ? chassisAngleRad : aimAngleRad);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.46)';
    ctx.beginPath();
    ctx.roundRect(
      spec.id === 'mg-pickup' ? -13 : -15,
      spec.id === 'mg-pickup' ? -7.5 : -9,
      spec.id === 'mg-pickup' ? 28 : 32,
      spec.id === 'mg-pickup' ? 16.5 : 20,
      4,
    );
    ctx.fill();
    drawRealisticPvoTopDown(ctx, spec.id, ammo);
    ctx.restore();

    if (spec.id === 'mg-pickup') {
      ctx.save();
      ctx.rotate(chassisAngleRad);
      ctx.translate(-5.8, 0);
      ctx.rotate(aimAngleRad - chassisAngleRad);
      ctx.fillStyle = '#333940';
      ctx.beginPath();
      ctx.arc(0, 0, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#737B84';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(3.2, 0);
      ctx.lineTo(11.5, 0);
      ctx.stroke();
      ctx.restore();
    }
  }

  if (isTargetLocked && !isPreview) {
    const lockPulse = 1 + Math.sin(timeSec * 8) * 0.09;
    ctx.save();
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 3]);
    ctx.beginPath();
    ctx.arc(0, 0, 22 * lockPulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(239, 68, 68, 0.14)';
    ctx.beginPath();
    ctx.arc(0, 0, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Burning smoke & flames if damaged
  if (isDamaged) {
    const severity = 1 - hpRatio;
    for (let i = 0; i < 3; i++) {
      const cycle = (timeSec * (1.2 + i * 0.25) + i * 0.37) % 1;
      const sx = Math.sin(timeSec * 2 + i * 1.9) * 3 + cycle * 4;
      const sy = -4 - cycle * 15;
      const sRad = 2.8 + cycle * (5.5 + severity * 3.5);
      const sAlpha = (1 - cycle) * (0.35 + severity * 0.35);
      ctx.fillStyle = `rgba(38, 42, 48, ${sAlpha})`;
      ctx.beginPath();
      ctx.arc(sx, sy, sRad, 0, Math.PI * 2);
      ctx.fill();
    }
    const flicker = 0.8 + Math.sin(timeSec * 19) * 0.2;
    ctx.fillStyle = `rgba(249, 115, 22, ${0.65 * flicker})`;
    ctx.beginPath();
    ctx.arc(-2, -3, 3.2 * flicker, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(253, 224, 71, ${0.8 * flicker})`;
    ctx.beginPath();
    ctx.arc(-2, -3.5, 1.6 * flicker, 0, Math.PI * 2);
    ctx.fill();
  }

  if (isPreview && !previewValid) {
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-9, -9);
    ctx.lineTo(9, 9);
    ctx.moveTo(9, -9);
    ctx.lineTo(-9, 9);
    ctx.stroke();
  }

  // Compact HP bar above damaged or hovered ППО unit
  if (!isPreview && (isDamaged || hovered || isTargetLocked)) {
    const barW = 30;
    const barH = 3.5;
    const barX = -barW / 2;
    const barY = -23;
    ctx.fillStyle = 'rgba(7, 13, 23, 0.9)';
    ctx.beginPath();
    ctx.roundRect(barX - 1, barY - 1, barW + 2, barH + 2, 2);
    ctx.fill();
    ctx.fillStyle = hpRatio > 0.55 ? '#22C55E' : hpRatio > 0.25 ? '#F59E0B' : '#EF4444';
    ctx.fillRect(barX, barY, Math.max(2, barW * hpRatio), barH);
  }

  // Ammo / Radar counter badge below ППО unit
  if (!isPreview) {
    ctx.globalAlpha = 1;
    const badgeText = isRadar
      ? `${spec.shortName} · ${Math.ceil(hp)}/${maxHp} HP`
      : isReloading
        ? `${spec.shortName} · ${ammo}/${maxAmmo} · КД ${cooldownRemainingSec.toFixed(1)}с`
        : `${spec.shortName} · ${ammo}/${maxAmmo}`;
    ctx.font = '700 10px "JetBrains Mono", monospace';
    const bw = ctx.measureText(badgeText).width + 10;
    const bx = -bw / 2;
    const by = 19;
    ctx.fillStyle = isEmpty
      ? 'rgba(69, 10, 10, 0.92)'
      : isReloading
        ? 'rgba(28, 20, 7, 0.92)'
        : 'rgba(7, 13, 23, 0.9)';
    ctx.strokeStyle = isEmpty
      ? 'rgba(239, 68, 68, 0.75)'
      : isReloading
        ? 'rgba(245, 158, 11, 0.75)'
        : `${spec.accentColor}99`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, 15, 3.5);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = isRadar
      ? '#67E8F9'
      : isEmpty
        ? '#FCA5A5'
        : isReloading
          ? '#FDE68A'
          : '#F8FAFC';
    ctx.fillText(badgeText, bx + 5, by + 11);
  }

  ctx.restore();
}

/**
 * Draws a multi-stage realistic missile launch animation directly from a ППО launcher:
 * - S-300PS: vertical cold-launch gas-generator puff + ejecting missile + mid-air booster ignition
 * - IRIS-T SLM: vertical VLS efflux smoke collar + bright vertical booster flame column
 * - Patriot M901: canted canister forward ignition spear + fierce rear backblast jet & dust ring
 * - Gepard / MG Pickup: muzzle blasts & propellant wisps
 */
export function drawPvoLaunchPlume(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angleRad: number,
  age: number,
  duration: number,
  isGun: boolean,
  isSmallBullet: boolean,
  accentColor: string,
  airDefenseId?: AirDefenseId,
) {
  const t = Math.min(1, age / Math.max(0.05, duration));
  ctx.save();
  ctx.translate(x, y);

  if (isGun) {
    ctx.rotate(angleRad);
    const muzzleX = isSmallBullet ? 15 : 22;
    const offsets = isSmallBullet ? [0] : [-6, 6];
    if (t < 0.48) {
      const fAlpha = 1 - t / 0.48;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const oy of offsets) {
        const rad = (isSmallBullet ? 6.5 : 10.5) * (0.65 + (t / 0.48) * 0.55);
        const grad = ctx.createRadialGradient(muzzleX, oy, 0, muzzleX, oy, rad);
        grad.addColorStop(0, `rgba(255, 255, 244, ${fAlpha})`);
        grad.addColorStop(0.45, `rgba(253, 224, 71, ${fAlpha * 0.85})`);
        grad.addColorStop(1, 'rgba(249, 115, 22, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(muzzleX, oy, rad, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    const puffAlpha = Math.sin(t * Math.PI) * 0.42;
    const puffRad = (isSmallBullet ? 4.5 : 8) + t * 10;
    const sGrad = ctx.createRadialGradient(muzzleX + t * 7, 0, 0.5, muzzleX + t * 7, 0, puffRad);
    sGrad.addColorStop(0, `rgba(226, 232, 240, ${puffAlpha})`);
    sGrad.addColorStop(1, 'rgba(148, 163, 184, 0)');
    ctx.fillStyle = sGrad;
    ctx.beginPath();
    ctx.arc(muzzleX + t * 7, 0, puffRad, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  // SAM Battery Launch Animation
  const isS300 = airDefenseId === 's300';
  const isIris = airDefenseId === 'iris-t';
  const isVerticalVls = isS300 || isIris;

  // 1. Expanding ground pad dust/efflux shock ring (0..0.48)
  if (t < 0.48) {
    const rT = t / 0.48;
    const ringRad = 10 + (1 - Math.pow(1 - rT, 2.2)) * 34;
    const ringAlpha = (1 - rT) * 0.65;
    ctx.strokeStyle = `rgba(203, 213, 225, ${ringAlpha * 0.72})`;
    ctx.lineWidth = Math.max(1.2, (1 - rT) * 5.2);
    ctx.beginPath();
    ctx.ellipse(0, 2, ringRad, ringRad * 0.68, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 2. Lingering multi-lobe pad launch smoke cloud illuminated by rocket motor underglow
  const smokeFade = Math.sin(Math.min(1, t * 1.65) * Math.PI * 0.5) * Math.pow(1 - t, 1.18);
  const glowWarmth = t < 0.38 ? Math.pow(1 - t / 0.38, 1.3) : 0;
  const backDirX = -Math.cos(angleRad);
  const backDirY = -Math.sin(angleRad);

  const puffs = isVerticalVls
    ? [
        { ox: -10 * t, oy: -4 - 14 * t, r: 9 + t * 20 },
        { ox: 11 * t, oy: -2 - 11 * t, r: 8 + t * 18 },
        { ox: 0, oy: 4 - 8 * t, r: 10 + t * 22 },
        { ox: -5 * t, oy: -18 * t, r: 7 + t * 16 },
      ]
    : [
        { ox: backDirX * (6 + t * 24), oy: backDirY * (6 + t * 24), r: 9 + t * 21 },
        { ox: backDirX * (12 + t * 32) - 4, oy: backDirY * (12 + t * 32) - 5, r: 8 + t * 18 },
        { ox: backDirX * (10 + t * 28) + 4, oy: backDirY * (10 + t * 28) + 4, r: 8 + t * 17 },
        { ox: 0, oy: 0, r: 10 + t * 16 },
      ];

  for (const p of puffs) {
    const cg = ctx.createRadialGradient(p.ox, p.oy, 1, p.ox, p.oy, p.r);
    const rC = Math.min(255, Math.round(215 + glowWarmth * 40));
    const gC = Math.min(255, Math.round(220 - glowWarmth * 45));
    const bC = Math.round(228 - glowWarmth * 125);
    cg.addColorStop(0, `rgba(${rC}, ${gC}, ${bC}, ${smokeFade * 0.72})`);
    cg.addColorStop(0.5, `rgba(148, 163, 184, ${smokeFade * 0.45})`);
    cg.addColorStop(1, 'rgba(100, 116, 139, 0)');
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.arc(p.ox, p.oy, p.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // 3. Stage-specific ignition flame, rear backblast & ascending missile emerging directly from launcher!
  if (isS300) {
    // S-300PS Cold-Launch Sequence:
    // Phase A (0..0.24): Gas-generator steam burst + missile climbing vertically out of 5P85S tube
    if (t < 0.28) {
      const cT = t / 0.28;
      const ejectY = -12 - cT * 24;
      // Cold gas burst at tube top
      const steamAlpha = Math.sin(cT * Math.PI) * 0.85;
      const sg = ctx.createRadialGradient(-2, -10, 0, -2, -10, 11 + cT * 10);
      sg.addColorStop(0, `rgba(241, 245, 249, ${steamAlpha})`);
      sg.addColorStop(0.55, `rgba(186, 230, 253, ${steamAlpha * 0.55})`);
      sg.addColorStop(1, 'rgba(148, 163, 184, 0)');
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.arc(-2, -10, 11 + cT * 10, 0, Math.PI * 2);
      ctx.fill();

      // Ejected SAM tube emerging vertically out of canister
      ctx.save();
      ctx.translate(-2, ejectY);
      ctx.fillStyle = '#F1F5F9';
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.lineTo(2.4, -4);
      ctx.lineTo(2.4, 8);
      ctx.lineTo(-2.4, 8);
      ctx.lineTo(-2.4, -4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Phase B (0.14..0.52): Mid-air main solid-rocket motor ignition above battery!
    if (t >= 0.12 && t < 0.52) {
      const mT = (t - 0.12) / 0.4;
      const mAlpha = Math.sin(Math.min(1, mT * 1.4) * Math.PI * 0.5) * (1 - mT);
      const ignY = -28 - mT * 14;

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const fRad = 18 + mT * 18;
      const fg = ctx.createRadialGradient(-2, ignY, 0, -2, ignY, fRad);
      fg.addColorStop(0, `rgba(255, 255, 255, ${mAlpha})`);
      fg.addColorStop(0.32, `rgba(253, 224, 71, ${mAlpha * 0.92})`);
      fg.addColorStop(0.68, `rgba(249, 115, 22, ${mAlpha * 0.55})`);
      fg.addColorStop(1, 'rgba(234, 88, 12, 0)');
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.arc(-2, ignY, fRad, 0, Math.PI * 2);
      ctx.fill();

      // Downward motor flame cone blasting onto the TEL
      const jetG = ctx.createLinearGradient(-2, ignY, -2, -6);
      jetG.addColorStop(0, `rgba(255, 255, 240, ${mAlpha})`);
      jetG.addColorStop(0.55, `rgba(251, 146, 60, ${mAlpha * 0.82})`);
      jetG.addColorStop(1, 'rgba(234, 88, 12, 0)');
      ctx.fillStyle = jetG;
      ctx.beginPath();
      ctx.moveTo(-5, ignY);
      ctx.lineTo(1, ignY);
      ctx.lineTo(5, -6);
      ctx.lineTo(-9, -6);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  } else if (isIris) {
    // IRIS-T SLM Hot Vertical VLS Launch: blazing vertical pillar + climbing missile
    if (t < 0.44) {
      const fT = t / 0.44;
      const fAlpha = 1 - Math.pow(fT, 1.3);
      const climbY = -12 - fT * 36;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const baseGlow = ctx.createRadialGradient(0, -6, 0, 0, -6, 22 + fT * 12);
      baseGlow.addColorStop(0, `rgba(255, 255, 240, ${fAlpha})`);
      baseGlow.addColorStop(0.4, `rgba(251, 191, 36, ${fAlpha * 0.85})`);
      baseGlow.addColorStop(1, 'rgba(234, 88, 12, 0)');
      ctx.fillStyle = baseGlow;
      ctx.beginPath();
      ctx.arc(0, -6, 22 + fT * 12, 0, Math.PI * 2);
      ctx.fill();

      const colG = ctx.createLinearGradient(0, climbY + 8, 0, -4);
      colG.addColorStop(0, `rgba(255, 255, 255, ${fAlpha})`);
      colG.addColorStop(0.5, `rgba(253, 224, 71, ${fAlpha * 0.85})`);
      colG.addColorStop(1, 'rgba(249, 115, 22, 0)');
      ctx.fillStyle = colG;
      ctx.beginPath();
      ctx.moveTo(-3.2, climbY + 8);
      ctx.lineTo(3.2, climbY + 8);
      ctx.lineTo(6.5, -4);
      ctx.lineTo(-6.5, -4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  } else {
    // Patriot M901 Canted Canister Launch: Forward booster flare + heavy rear backblast jet!
    ctx.rotate(angleRad);
    if (t < 0.46) {
      const fT = t / 0.46;
      const fAlpha = 1 - Math.pow(fT, 1.25);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      // Fierce rear backblast flame jet shooting backward (-8..-42px)
      const blastLen = 28 + (1 - fT) * 18;
      const backG = ctx.createLinearGradient(-4, 0, -blastLen, 0);
      backG.addColorStop(0, `rgba(255, 255, 245, ${fAlpha})`);
      backG.addColorStop(0.4, `rgba(253, 224, 71, ${fAlpha * 0.88})`);
      backG.addColorStop(0.8, `rgba(249, 115, 22, ${fAlpha * 0.45})`);
      backG.addColorStop(1, 'rgba(234, 88, 12, 0)');
      ctx.fillStyle = backG;
      ctx.beginPath();
      ctx.moveTo(-4, -3.5);
      ctx.lineTo(-blastLen, -8.5);
      ctx.lineTo(-blastLen * 0.82, 0);
      ctx.lineTo(-blastLen, 8.5);
      ctx.lineTo(-4, 3.5);
      ctx.closePath();
      ctx.fill();

      // Forward ignition spear emerging from canister cap
      const fwdLen = 22 + fT * 20;
      const fwdG = ctx.createLinearGradient(8, 0, fwdLen, 0);
      fwdG.addColorStop(0, `rgba(255, 255, 255, ${fAlpha})`);
      fwdG.addColorStop(0.5, `rgba(253, 224, 71, ${fAlpha * 0.85})`);
      fwdG.addColorStop(1, 'rgba(249, 115, 22, 0)');
      ctx.fillStyle = fwdG;
      ctx.beginPath();
      ctx.moveTo(8, -3.2);
      ctx.lineTo(fwdLen, 0);
      ctx.lineTo(8, 3.2);
      ctx.closePath();
      ctx.fill();

      // Ground thermal glow under launcher
      const baseGlow = ctx.createRadialGradient(4, 0, 0, 4, 0, 20 + fT * 10);
      baseGlow.addColorStop(0, `rgba(255, 247, 214, ${fAlpha * 0.92})`);
      baseGlow.addColorStop(0.55, `${accentColor}55`);
      baseGlow.addColorStop(1, 'rgba(249, 115, 22, 0)');
      ctx.fillStyle = baseGlow;
      ctx.beginPath();
      ctx.arc(4, 0, 20 + fT * 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  ctx.restore();
}

/**
 * Draws a realistic 3D-shaded winged SAM interceptor missile with solid-rocket Mach
 * shock-diamond exhaust plume, or 35mm / HMG glowing tracer bursts.
 */
export function drawSamInterceptor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  headingRad: number,
  isGun: boolean,
  accentColor: string,
  isSmallBullet = false,
  ageSec = 1,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(headingRad);

  if (isGun) {
    if (isSmallBullet) {
      ctx.strokeStyle = 'rgba(254, 240, 138, 0.92)';
      ctx.lineWidth = 1.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-4.5, 0);
      ctx.lineTo(2.8, 0);
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(2.8, 0, 1.05, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    // Twin 35mm glowing tracer rounds (Gepard)
    ctx.strokeStyle = '#FEF08A';
    ctx.lineWidth = 2.1;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-11, -2.2);
    ctx.lineTo(5, -2.2);
    ctx.moveTo(-8, 2.2);
    ctx.lineTo(8, 2.2);
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(5, -2.2, 1.15, 0, Math.PI * 2);
    ctx.arc(8, 2.2, 1.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  // Amplified rocket booster plume during initial launch boost phase (ageSec < 0.7s)
  const boostFactor = ageSec < 0.7 ? 1 + (1 - ageSec / 0.7) * 0.65 : 1;
  const flameLen = 28 * boostFactor;
  const haloRad = 11 * boostFactor;

  // Thruster radial illumination halo
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const haloG = ctx.createRadialGradient(-7, 0, 0, -7, 0, haloRad);
  haloG.addColorStop(0, 'rgba(255, 250, 220, 0.85)');
  haloG.addColorStop(0.45, 'rgba(251, 146, 60, 0.45)');
  haloG.addColorStop(1, 'rgba(234, 88, 12, 0)');
  ctx.fillStyle = haloG;
  ctx.beginPath();
  ctx.arc(-7, 0, haloRad, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Intense white-amber Mach shock-diamond exhaust cone
  const flameGrad = ctx.createLinearGradient(-5.5, 0, -5.5 - flameLen, 0);
  flameGrad.addColorStop(0, '#FFFFFF');
  flameGrad.addColorStop(0.24, '#FEF08A');
  flameGrad.addColorStop(0.58, '#FB923C');
  flameGrad.addColorStop(1, 'rgba(249, 115, 22, 0)');
  ctx.fillStyle = flameGrad;
  ctx.beginPath();
  ctx.moveTo(-5.5, -2.4 * boostFactor);
  ctx.lineTo(-5.5 - flameLen, 0);
  ctx.lineTo(-5.5, 2.4 * boostFactor);
  ctx.closePath();
  ctx.fill();

  // Subtle Mach shock diamond bright nodes inside exhaust
  ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
  for (let d = 1; d <= 2; d++) {
    ctx.beginPath();
    ctx.ellipse(-5.5 - d * 5.2 * boostFactor, 0, 1.8, 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Rear & mid-body SAM stabilizing cruciform fins
  ctx.fillStyle = '#64748B';
  ctx.beginPath();
  ctx.moveTo(-3.2, -1.5);
  ctx.lineTo(-6.4, -4.8);
  ctx.lineTo(-7.2, -4.8);
  ctx.lineTo(-6.4, -1.5);
  ctx.moveTo(-3.2, 1.5);
  ctx.lineTo(-6.4, 4.8);
  ctx.lineTo(-7.2, 4.8);
  ctx.lineTo(-6.4, 1.5);
  ctx.fill();

  // 3D-shaded tactical SAM fuselage cylinder + pointed seeker radome
  const bodyG = ctx.createLinearGradient(0, -1.9, 0, 1.9);
  bodyG.addColorStop(0, '#FFFFFF');
  bodyG.addColorStop(0.55, '#CBD5E1');
  bodyG.addColorStop(1, '#64748B');
  ctx.fillStyle = bodyG;
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.8)';
  ctx.lineWidth = 0.65;
  ctx.beginPath();
  ctx.moveTo(12.5, 0);
  ctx.lineTo(7, -1.75);
  ctx.lineTo(-6.4, -1.75);
  ctx.lineTo(-6.4, 1.75);
  ctx.lineTo(7, 1.75);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Tactical warhead / guidance color ring
  ctx.fillStyle = accentColor;
  ctx.fillRect(3.2, -1.6, 1.8, 3.2);

  ctx.restore();
}

export interface InterceptBurstRenderOptions {
  isMiss?: boolean;
  isSelfDestruct?: boolean;
  confirmed?: boolean;
  pvoShortName?: string;
  targetShortName?: string;
  accentColor?: string;
}

/**
 * Draws realistic mid-air destruction explosion (fireball, proximity blast ring,
 * falling burning debris, and dark smoke cloud) or SAM miss/self-destruct puff.
 */
export function drawAirInterceptBurst(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  age: number,
  duration: number,
  optionsOrMiss: boolean | InterceptBurstRenderOptions = false,
) {
  const opts: InterceptBurstRenderOptions =
    typeof optionsOrMiss === 'boolean' ? { isMiss: optionsOrMiss } : optionsOrMiss;
  const isMiss = Boolean(opts.isMiss);
  const isSelfDestruct = Boolean(opts.isSelfDestruct);
  const t = Math.min(1, age / Math.max(0.05, duration));

  ctx.save();
  ctx.translate(x, y);

  if (isMiss) {
    const puffAlpha = Math.sin(Math.min(1, t * 1.3) * Math.PI * 0.5) * (1 - t) * 0.55;
    const puffRad = 6 + t * 13;
    const pGrad = ctx.createRadialGradient(0, 0, 1, 0, 0, puffRad);
    pGrad.addColorStop(0, `rgba(203, 213, 225, ${puffAlpha})`);
    pGrad.addColorStop(1, 'rgba(148, 163, 184, 0)');
    ctx.fillStyle = pGrad;
    ctx.beginPath();
    ctx.arc(0, 0, puffRad, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  if (isSelfDestruct) {
    const puffAlpha = Math.sin(t * Math.PI) * 0.45;
    const puffRad = 5 + t * 10;
    const pGrad = ctx.createRadialGradient(0, 0, 0.5, 0, 0, puffRad);
    pGrad.addColorStop(0, `rgba(226, 232, 240, ${puffAlpha})`);
    pGrad.addColorStop(1, 'rgba(148, 163, 184, 0)');
    ctx.fillStyle = pGrad;
    ctx.beginPath();
    ctx.arc(0, 0, puffRad, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  // 1. High-altitude blinding white-amber proximity-warhead flash (0..0.22)
  if (t < 0.24) {
    const fT = t / 0.24;
    const rad = 12 + fT * 32;
    const alpha = Math.pow(1 - fT, 1.3);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, rad);
    grad.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
    grad.addColorStop(0.3, `rgba(254, 240, 138, ${alpha * 0.9})`);
    grad.addColorStop(0.65, `rgba(249, 115, 22, ${alpha * 0.5})`);
    grad.addColorStop(1, 'rgba(234, 88, 12, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, rad, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 2. Thin supersonic mid-air blast condensation ring
  if (t < 0.38) {
    const wT = t / 0.38;
    const eased = 1 - Math.pow(1 - wT, 2.3);
    const waveRad = 7 + eased * 44;
    const alpha = (1 - wT) * 0.72;
    const wGrad = ctx.createRadialGradient(0, 0, Math.max(1, waveRad - 6), 0, 0, waveRad + 2);
    wGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
    wGrad.addColorStop(0.6, `rgba(241, 245, 249, ${alpha})`);
    wGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = wGrad;
    ctx.beginPath();
    ctx.arc(0, 0, waveRad + 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // 3. Asymmetric fuel/warhead mid-air smoke cloud (expands and fades realistically)
  const smokeAlpha = Math.sin(Math.min(1, t * 1.5) * Math.PI * 0.5) * (1 - Math.pow(t, 1.4)) * 0.74;
  const smokePuffs = [
    { dx: t * 8, dy: -t * 7, r: 10 + t * 20, s: 28 },
    { dx: -t * 9, dy: -t * 3, r: 8 + t * 17, s: 36 },
    { dx: t * 3, dy: t * 6, r: 9 + t * 16, s: 24 },
  ];
  for (const sm of smokePuffs) {
    const warmth = t < 0.35 ? (1 - t / 0.35) * 0.45 : 0;
    const rCol = Math.min(255, Math.round(sm.s + warmth * 170));
    const gCol = Math.min(255, Math.round(sm.s + warmth * 70));
    const sGrad = ctx.createRadialGradient(sm.dx, sm.dy, 1.5, sm.dx, sm.dy, sm.r);
    sGrad.addColorStop(0, `rgba(${rCol}, ${gCol}, ${sm.s}, ${smokeAlpha})`);
    sGrad.addColorStop(0.55, `rgba(${sm.s + 12}, ${sm.s + 12}, ${sm.s + 14}, ${smokeAlpha * 0.65})`);
    sGrad.addColorStop(1, 'rgba(30, 34, 40, 0)');
    ctx.fillStyle = sGrad;
    ctx.beginPath();
    ctx.arc(sm.dx, sm.dy, sm.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // 4. Turbulent burning fuel/warhead fireball lobes (0..0.44)
  if (t < 0.45) {
    const fT = t / 0.45;
    const fAlpha = Math.max(0, 1 - Math.pow(fT, 1.25));
    const lobes = [
      { ax: 0, ay: 0, r: 13 + fT * 11 },
      { ax: 6 * fT, ay: -5 * fT, r: 10 + fT * 9 },
      { ax: -7 * fT, ay: 4 * fT, r: 9 + fT * 8 },
      { ax: 4 * fT, ay: 6 * fT, r: 8 + fT * 7 },
    ];
    for (const lb of lobes) {
      const fGrad = ctx.createRadialGradient(lb.ax, lb.ay, 0, lb.ax, lb.ay, lb.r);
      fGrad.addColorStop(0, `rgba(255, 250, 220, ${fAlpha * 0.92})`);
      fGrad.addColorStop(0.38, `rgba(249, 115, 22, ${fAlpha * 0.85})`);
      fGrad.addColorStop(0.76, `rgba(153, 27, 27, ${fAlpha * 0.52})`);
      fGrad.addColorStop(1, 'rgba(28, 18, 16, 0)');
      ctx.fillStyle = fGrad;
      ctx.beginPath();
      ctx.arc(lb.ax, lb.ay, lb.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 5. Tumbling burning aircraft/missile wreckage & hot debris arcing downward
  if (t < 0.82) {
    const dT = t / 0.82;
    const sparkAlpha = Math.max(0, 1 - dT);
    const debrisCount = 12;
    for (let i = 0; i < debrisCount; i++) {
      const angle = (i * Math.PI * 2) / debrisCount + (i % 2 === 0 ? 0.22 : -0.19);
      const speed = 22 + (i % 4) * 11;
      const dx = Math.cos(angle) * speed * dT;
      const dy = Math.sin(angle) * speed * dT + dT * dT * 20; // gravity drop
      const prevDt = Math.max(0, dT - 0.09);
      const tx = Math.cos(angle) * speed * prevDt;
      const ty = Math.sin(angle) * speed * prevDt + prevDt * prevDt * 20;

      // Faint trailing smoke behind major debris chunks
      if (i % 3 === 0) {
        ctx.strokeStyle = `rgba(55, 62, 72, ${sparkAlpha * 0.55})`;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(tx * 0.82, ty * 0.82);
        ctx.lineTo(dx, dy);
        ctx.stroke();
      }

      ctx.strokeStyle =
        i % 2 === 0
          ? `rgba(254, 240, 138, ${sparkAlpha})`
          : `rgba(249, 115, 22, ${sparkAlpha * 0.92})`;
      ctx.lineWidth = (i % 3 === 0 ? 2.1 : 1.4) * (1 - dT * 0.45);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(dx, dy);
      ctx.stroke();
    }
  }

  ctx.restore();
}

/**
 * Draws an infrastructure object directly on the satellite map (without a black pad),
 * using the exact same SVG illustration as the sidebar menu, with adjustable scale,
 * animated flames & smoke when hit, live HP bar, and target-lock ring.
 */
export function drawBuilding(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  spec: BuildingSpec,
  options: {
    hp?: number;
    maxHp?: number;
    scale?: number;
    hovered?: boolean;
    isTargetLocked?: boolean;
    isPreview?: boolean;
    previewValid?: boolean;
    isAi?: boolean;
    timeSec: number;
  },
) {
  const {
    hp = spec.maxHp,
    maxHp = spec.maxHp,
    scale = 1,
    hovered = false,
    isTargetLocked = false,
    isPreview = false,
    previewValid = true,
    isAi = false,
    timeSec,
  } = options;

  const s = Math.max(0.45, Math.min(2.2, scale));
  const hpRatio = Math.max(0, Math.min(1, hp / Math.max(1, maxHp)));
  const isBurning = !isPreview && hpRatio < 0.995;

  ctx.save();
  ctx.translate(x, y);

  if (isPreview) {
    ctx.globalAlpha = previewValid ? 0.9 : 0.62;
    ctx.strokeStyle = previewValid ? '#22C55E' : '#EF4444';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.arc(0, 0, 26 * s, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  } else if (isTargetLocked) {
    const pulse = 1 + Math.sin(timeSec * 8) * 0.08;
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 3]);
    ctx.beginPath();
    ctx.arc(0, 0, 28 * s * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(239, 68, 68, 0.14)';
    ctx.beginPath();
    ctx.arc(0, 0, 25 * s, 0, Math.PI * 2);
    ctx.fill();
  } else if (hovered) {
    ctx.strokeStyle = isAi ? '#F87171' : spec.accentColor;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(0, 0, 26 * s, 0, Math.PI * 2);
    ctx.stroke();
  } else if (isAi) {
    ctx.save();
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
    ctx.lineWidth = 1.3;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.arc(0, 0, 25 * s, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Render high-res Three.js 3D building diorama directly on the satellite map
  const imgW = 72 * s;
  const imgH = 55.8 * s;
  const img = getBuildingSpriteCanvas(spec.id);
  if (img) {
    ctx.drawImage(img, -imgW / 2, -imgH / 2, imgW, imgH);
  } else {
    ctx.fillStyle = spec.accentColor;
    ctx.globalAlpha = 0.6;
    ctx.fillRect(-14 * s, -9 * s, 28 * s, 18 * s);
    ctx.globalAlpha = 1;
  }

  // Animated realistic fire & rising smoke when building has been hit (hp < maxHp)
  if (isBurning) {
    const dmg = Math.max(0.28, 1 - hpRatio);
    const fireScale = s * (0.78 + dmg * 0.68);
    const seed = Math.abs(Math.sin(x * 0.13 + y * 0.07)) * 10;

    // 1. Rising dark smoke plumes
    for (let i = 0; i < 4; i++) {
      const cycle = (timeSec * 0.72 + seed + i * 0.25) % 1;
      const sx = ((i - 1.5) * 4.5 + Math.sin(timeSec * 2.2 + i * 1.7) * 3.5) * fireScale + cycle * 6 * s;
      const sy = (-5 - cycle * 30) * fireScale;
      const sRad = (4.5 + cycle * 9.5) * fireScale;
      const sAlpha = Math.sin(cycle * Math.PI) * (0.34 + dmg * 0.26);
      const sGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, sRad);
      sGrad.addColorStop(0, `rgba(28, 30, 36, ${sAlpha})`);
      sGrad.addColorStop(0.55, `rgba(51, 56, 66, ${sAlpha * 0.6})`);
      sGrad.addColorStop(1, 'rgba(30, 32, 38, 0)');
      ctx.fillStyle = sGrad;
      ctx.beginPath();
      ctx.arc(sx, sy, sRad, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Warm base fire illumination
    const glowPulse = 0.85 + 0.15 * Math.sin(timeSec * 14 + seed);
    const glowRad = 18 * fireScale * glowPulse;
    const glow = ctx.createRadialGradient(0, -3 * s, 0, 0, -3 * s, glowRad);
    glow.addColorStop(0, `rgba(251, 146, 60, ${0.48 + dmg * 0.25})`);
    glow.addColorStop(0.5, `rgba(239, 68, 68, ${0.26 + dmg * 0.22})`);
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, -3 * s, glowRad, 0, Math.PI * 2);
    ctx.fill();

    // 3. Multi-tongue flickering flames
    const tongues = [
      { ox: -7.5, oy: 1, h: 14, w: 5.5, speed: 12.5, phase: 0.4 },
      { ox: 0, oy: 2, h: 18, w: 6.8, speed: 14.2, phase: 1.9 },
      { ox: 7.2, oy: 0.5, h: 13.5, w: 5.2, speed: 11.4, phase: 3.1 },
    ];

    for (const fl of tongues) {
      const flick = 0.82 + 0.26 * Math.sin(timeSec * fl.speed + seed + fl.phase);
      const sway = Math.sin(timeSec * (fl.speed * 0.55) + fl.phase) * 2.1 * fireScale;
      const fx = fl.ox * s;
      const fy = fl.oy * s;
      const fh = fl.h * fireScale * flick;
      const fw = fl.w * fireScale;

      // Outer red-orange flame
      ctx.fillStyle = 'rgba(239, 68, 68, 0.88)';
      ctx.beginPath();
      ctx.moveTo(fx - fw, fy);
      ctx.quadraticCurveTo(fx - fw * 0.85, fy - fh * 0.55, fx + sway, fy - fh);
      ctx.quadraticCurveTo(fx + fw * 0.85, fy - fh * 0.55, fx + fw, fy);
      ctx.closePath();
      ctx.fill();

      // Middle bright orange flame
      ctx.fillStyle = 'rgba(251, 146, 60, 0.94)';
      ctx.beginPath();
      ctx.moveTo(fx - fw * 0.65, fy);
      ctx.quadraticCurveTo(fx - fw * 0.5, fy - fh * 0.48, fx + sway * 0.75, fy - fh * 0.76);
      ctx.quadraticCurveTo(fx + fw * 0.5, fy - fh * 0.48, fx + fw * 0.65, fy);
      ctx.closePath();
      ctx.fill();

      // Hot yellow-white core
      ctx.fillStyle = 'rgba(254, 240, 138, 0.96)';
      ctx.beginPath();
      ctx.moveTo(fx - fw * 0.32, fy);
      ctx.quadraticCurveTo(fx - fw * 0.2, fy - fh * 0.3, fx + sway * 0.4, fy - fh * 0.46);
      ctx.quadraticCurveTo(fx + fw * 0.2, fy - fh * 0.3, fx + fw * 0.32, fy);
      ctx.closePath();
      ctx.fill();
    }
  }

  if (isPreview && !previewValid) {
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-9 * s, -9 * s);
    ctx.lineTo(9 * s, 9 * s);
    ctx.moveTo(9 * s, -9 * s);
    ctx.lineTo(-9 * s, 9 * s);
    ctx.stroke();
  }

  // Live HP bar & numeric HP badge below the building
  if (!isPreview) {
    ctx.globalAlpha = 1;
    const hpColor = hpRatio > 0.55 ? '#22C55E' : hpRatio > 0.25 ? '#F59E0B' : '#EF4444';
    const badgeText = `${Math.ceil(hp)}/${maxHp}`;
    ctx.font = '700 9.5px "JetBrains Mono", monospace';
    const textW = ctx.measureText(badgeText).width;
    const bw = Math.max(40, textW + 10);
    const bx = -bw / 2;
    const by = imgH / 2 + 4;

    ctx.fillStyle = 'rgba(7, 13, 23, 0.9)';
    ctx.strokeStyle = isTargetLocked
      ? 'rgba(239, 68, 68, 0.85)'
      : isAi
        ? 'rgba(239, 68, 68, 0.6)'
        : 'rgba(148, 163, 184, 0.42)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, 18, 3.5);
    ctx.fill();
    ctx.stroke();

    // HP bar track + fill inside top of badge
    const barW = bw - 8;
    ctx.fillStyle = 'rgba(30, 41, 59, 0.95)';
    ctx.fillRect(bx + 4, by + 3.5, barW, 3);
    ctx.fillStyle = hpColor;
    ctx.fillRect(bx + 4, by + 3.5, Math.max(2, barW * hpRatio), 3);

    ctx.fillStyle = '#F8FAFC';
    ctx.fillText(badgeText, -textW / 2, by + 15);
  }

  ctx.restore();
}

function drawCarrierAircraftSilhouette(
  ctx: CanvasRenderingContext2D,
  id: RussianAircraftId,
  shadowOnly: boolean,
  armed: boolean,
) {
  if (id === 'tu95') {
    if (shadowOnly) {
      ctx.beginPath();
      ctx.moveTo(23, 0);
      ctx.lineTo(7, -2.3);
      ctx.lineTo(-11, -24);
      ctx.lineTo(-15, -22);
      ctx.lineTo(-4, -2.3);
      ctx.lineTo(-17, -2.3);
      ctx.lineTo(-20, -9);
      ctx.lineTo(-22, -7.5);
      ctx.lineTo(-19, 0);
      ctx.lineTo(-22, 7.5);
      ctx.lineTo(-20, 9);
      ctx.lineTo(-17, 2.3);
      ctx.lineTo(-4, 2.3);
      ctx.lineTo(-15, 22);
      ctx.lineTo(-11, 24);
      ctx.lineTo(7, 2.3);
      ctx.closePath();
      ctx.fill();
      return;
    }

    // Long swept Tu-95MS natural aluminum-grey wings
    const wingGrad = ctx.createLinearGradient(0, -24, 0, 24);
    wingGrad.addColorStop(0, '#8A939E');
    wingGrad.addColorStop(0.5, '#A6AFB8');
    wingGrad.addColorStop(1, '#717A84');
    ctx.fillStyle = wingGrad;
    ctx.strokeStyle = 'rgba(18, 24, 30, 0.72)';
    ctx.lineWidth = 0.65;
    ctx.beginPath();
    ctx.moveTo(7, -2.1);
    ctx.lineTo(-11, -24);
    ctx.lineTo(-15, -22);
    ctx.lineTo(-3, -2.1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(7, 2.1);
    ctx.lineTo(-11, 24);
    ctx.lineTo(-15, 22);
    ctx.lineTo(-3, 2.1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 4 turboprop NK-12 nacelles + subtle counter-rotating prop blur
    for (const [ex, ey] of [
      [1, -9.5],
      [-5, -16.5],
      [1, 9.5],
      [-5, 16.5],
    ]) {
      ctx.fillStyle = '#4B535D';
      ctx.fillRect(ex - 2.5, ey - 1.2, 6.2, 2.4);
      ctx.strokeStyle = 'rgba(215, 222, 230, 0.35)';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(ex + 4.3, ey - 3.3);
      ctx.lineTo(ex + 4.3, ey + 3.3);
      ctx.stroke();
    }

    // Swept horizontal tailplane
    ctx.fillStyle = '#7E8792';
    ctx.beginPath();
    ctx.moveTo(-14, -1.9);
    ctx.lineTo(-20.5, -9);
    ctx.lineTo(-22.5, -7.5);
    ctx.lineTo(-17.5, -1.9);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-14, 1.9);
    ctx.lineTo(-20.5, 9);
    ctx.lineTo(-22.5, 7.5);
    ctx.lineTo(-17.5, 1.9);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Slender tubular fuselage
    const fusGrad = ctx.createLinearGradient(0, -2.4, 0, 2.4);
    fusGrad.addColorStop(0, '#BCC4CD');
    fusGrad.addColorStop(0.5, '#959EA8');
    fusGrad.addColorStop(1, '#5F6872');
    ctx.fillStyle = fusGrad;
    ctx.beginPath();
    ctx.moveTo(23, 0);
    ctx.quadraticCurveTo(18, -2.5, 13, -2.3);
    ctx.lineTo(-19, -2.1);
    ctx.lineTo(-19, 2.1);
    ctx.lineTo(13, 2.3);
    ctx.quadraticCurveTo(18, 2.5, 23, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Dark cockpit glazing
    ctx.fillStyle = '#181E25';
    ctx.fillRect(14, -1.2, 3.4, 2.4);
    return;
  }

  if (id === 'tu160') {
    if (shadowOnly) {
      ctx.beginPath();
      ctx.moveTo(25, 0);
      ctx.lineTo(7, -3);
      ctx.lineTo(-10, -23);
      ctx.lineTo(-15, -20.5);
      ctx.lineTo(-5, -3);
      ctx.lineTo(-17, -3);
      ctx.lineTo(-21, -8.5);
      ctx.lineTo(-22.5, -6.5);
      ctx.lineTo(-19, 0);
      ctx.lineTo(-22.5, 6.5);
      ctx.lineTo(-21, 8.5);
      ctx.lineTo(-17, 3);
      ctx.lineTo(-5, 3);
      ctx.lineTo(-15, 20.5);
      ctx.lineTo(-10, 23);
      ctx.lineTo(7, 3);
      ctx.closePath();
      ctx.fill();
      return;
    }

    // Matte anti-flash white coat of Tu-160 "White Swan"
    const wingGrad = ctx.createLinearGradient(0, -23, 0, 23);
    wingGrad.addColorStop(0, '#CBD3DC');
    wingGrad.addColorStop(0.5, '#E2E8F0');
    wingGrad.addColorStop(1, '#AEB7C2');
    ctx.fillStyle = wingGrad;
    ctx.strokeStyle = 'rgba(20, 26, 34, 0.7)';
    ctx.lineWidth = 0.65;
    ctx.beginPath();
    ctx.moveTo(8, -2.4);
    ctx.lineTo(-10, -23);
    ctx.lineTo(-15, -20.5);
    ctx.lineTo(-4, -2.4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(8, 2.4);
    ctx.lineTo(-10, 23);
    ctx.lineTo(-15, 20.5);
    ctx.lineTo(-4, 2.4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#CBD3DC';
    ctx.beginPath();
    ctx.moveTo(-14, -2.1);
    ctx.lineTo(-21, -8.5);
    ctx.lineTo(-22.5, -6.5);
    ctx.lineTo(-17.5, -2.1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-14, 2.1);
    ctx.lineTo(-21, 8.5);
    ctx.lineTo(-22.5, 6.5);
    ctx.lineTo(-17.5, 2.1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    const fusGrad = ctx.createLinearGradient(0, -2.8, 0, 2.8);
    fusGrad.addColorStop(0, '#ECEFF4');
    fusGrad.addColorStop(0.55, '#D4DCE4');
    fusGrad.addColorStop(1, '#9BA5B0');
    ctx.fillStyle = fusGrad;
    ctx.beginPath();
    ctx.moveTo(25, 0);
    ctx.quadraticCurveTo(18, -2.8, 12, -2.8);
    ctx.lineTo(-19, -2.8);
    ctx.lineTo(-19, 2.8);
    ctx.lineTo(12, 2.8);
    ctx.quadraticCurveTo(18, 2.8, 25, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#181E26';
    ctx.beginPath();
    ctx.ellipse(15, 0, 3.8, 1.2, 0, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  if (id === 'tu22m3') {
    if (shadowOnly) {
      ctx.beginPath();
      ctx.moveTo(22, 0);
      ctx.lineTo(7, -3);
      ctx.lineTo(-9, -20);
      ctx.lineTo(-13.5, -17.5);
      ctx.lineTo(-4.5, -3);
      ctx.lineTo(-15, -3);
      ctx.lineTo(-19, -8.5);
      ctx.lineTo(-20.5, -6.5);
      ctx.lineTo(-17, 0);
      ctx.lineTo(-20.5, 6.5);
      ctx.lineTo(-19, 8.5);
      ctx.lineTo(-15, 3);
      ctx.lineTo(-4.5, 3);
      ctx.lineTo(-13.5, 17.5);
      ctx.lineTo(-9, 20);
      ctx.lineTo(7, 3);
      ctx.closePath();
      ctx.fill();
      return;
    }

    const wingGrad = ctx.createLinearGradient(0, -20, 0, 20);
    wingGrad.addColorStop(0, '#5E6873');
    wingGrad.addColorStop(0.5, '#464F59');
    wingGrad.addColorStop(1, '#2D343C');
    ctx.fillStyle = wingGrad;
    ctx.strokeStyle = 'rgba(15, 20, 26, 0.75)';
    ctx.lineWidth = 0.65;
    ctx.beginPath();
    ctx.moveTo(7, -2.4);
    ctx.lineTo(-9, -20);
    ctx.lineTo(-13.5, -17.5);
    ctx.lineTo(-4, -2.4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(7, 2.4);
    ctx.lineTo(-9, 20);
    ctx.lineTo(-13.5, 17.5);
    ctx.lineTo(-4, 2.4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    if (armed) {
      // Muted grey/slate underwing Kh-22 pylons
      ctx.fillStyle = '#9CA5AF';
      ctx.fillRect(-4, -10.2, 8.2, 1.8);
      ctx.fillRect(-4, 8.4, 8.2, 1.8);
    }

    ctx.fillStyle = '#383F48';
    ctx.beginPath();
    ctx.moveTo(-12, -2.3);
    ctx.lineTo(-18.5, -8.5);
    ctx.lineTo(-20.5, -6.5);
    ctx.lineTo(-15.5, -2.3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-12, 2.3);
    ctx.lineTo(-18.5, 8.5);
    ctx.lineTo(-20.5, 6.5);
    ctx.lineTo(-15.5, 2.3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    const fusGrad = ctx.createLinearGradient(0, -3.2, 0, 3.2);
    fusGrad.addColorStop(0, '#727D89');
    fusGrad.addColorStop(0.5, '#4F5863');
    fusGrad.addColorStop(1, '#2D343C');
    ctx.fillStyle = fusGrad;
    ctx.beginPath();
    ctx.moveTo(22, 0);
    ctx.quadraticCurveTo(15, -3.1, 10, -3.1);
    ctx.lineTo(-16, -3.3);
    ctx.lineTo(-16, 3.3);
    ctx.lineTo(10, 3.1);
    ctx.quadraticCurveTo(15, 3.1, 22, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#181E26';
    ctx.beginPath();
    ctx.ellipse(12.5, 0, 3.6, 1.2, 0, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  if (id === 'mig31k') {
    if (shadowOnly) {
      ctx.beginPath();
      ctx.moveTo(21, 0);
      ctx.lineTo(7, -3);
      ctx.lineTo(-8, -16);
      ctx.lineTo(-13, -14);
      ctx.lineTo(-5, -3);
      ctx.lineTo(-15, -3);
      ctx.lineTo(-18.5, -8);
      ctx.lineTo(-19.5, -6);
      ctx.lineTo(-16, 0);
      ctx.lineTo(-19.5, 6);
      ctx.lineTo(-18.5, 8);
      ctx.lineTo(-15, 3);
      ctx.lineTo(-5, 3);
      ctx.lineTo(-13, 14);
      ctx.lineTo(-8, 16);
      ctx.lineTo(7, 3);
      ctx.closePath();
      ctx.fill();
      return;
    }

    const wingGrad = ctx.createLinearGradient(0, -16, 0, 16);
    wingGrad.addColorStop(0, '#6B747E');
    wingGrad.addColorStop(0.5, '#545D67');
    wingGrad.addColorStop(1, '#394048');
    ctx.fillStyle = wingGrad;
    ctx.strokeStyle = 'rgba(15, 20, 26, 0.75)';
    ctx.lineWidth = 0.65;
    ctx.beginPath();
    ctx.moveTo(7, -2.4);
    ctx.lineTo(-8, -16);
    ctx.lineTo(-13, -14);
    ctx.lineTo(-4, -2.4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(7, 2.4);
    ctx.lineTo(-8, 16);
    ctx.lineTo(-13, 14);
    ctx.lineTo(-4, 2.4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#404850';
    ctx.beginPath();
    ctx.moveTo(-12, -2.4);
    ctx.lineTo(-18, -8);
    ctx.lineTo(-19.5, -6);
    ctx.lineTo(-15, -2.4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-12, 2.4);
    ctx.lineTo(-18, 8);
    ctx.lineTo(-19.5, 6);
    ctx.lineTo(-15, 2.4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    const fusGrad = ctx.createLinearGradient(0, -3, 0, 3);
    fusGrad.addColorStop(0, '#7E8893');
    fusGrad.addColorStop(0.5, '#59626C');
    fusGrad.addColorStop(1, '#363C44');
    ctx.fillStyle = fusGrad;
    ctx.beginPath();
    ctx.moveTo(21, 0);
    ctx.quadraticCurveTo(14, -2.9, 9.5, -2.9);
    ctx.lineTo(-15, -3.2);
    ctx.lineTo(-15, 3.2);
    ctx.lineTo(9.5, 2.9);
    ctx.quadraticCurveTo(14, 2.9, 21, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    if (armed) {
      // Subtle ventral Kinzhal outline shadow cue
      ctx.fillStyle = '#B8C0C8';
      ctx.fillRect(-3.5, -0.9, 10.5, 1.8);
    }

    ctx.fillStyle = '#181E25';
    ctx.beginPath();
    ctx.ellipse(11.5, 0, 3.6, 1.2, 0, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  if (id === 'su24m' || id === 'mig29ua' || id === 'f16am') {
    if (shadowOnly) {
      ctx.beginPath();
      ctx.moveTo(21, 0);
      ctx.lineTo(7, -3);
      ctx.lineTo(-8, -16);
      ctx.lineTo(-13, -14);
      ctx.lineTo(-5, -3);
      ctx.lineTo(-15, -3);
      ctx.lineTo(-18.5, -8);
      ctx.lineTo(-19.5, -6);
      ctx.lineTo(-16, 0);
      ctx.lineTo(-19.5, 6);
      ctx.lineTo(-18.5, 8);
      ctx.lineTo(-15, 3);
      ctx.lineTo(-5, 3);
      ctx.lineTo(-13, 14);
      ctx.lineTo(-8, 16);
      ctx.lineTo(7, 3);
      ctx.closePath();
      ctx.fill();
      return;
    }

    const wingGrad = ctx.createLinearGradient(0, -16, 0, 16);
    wingGrad.addColorStop(0, '#6F7D8C');
    wingGrad.addColorStop(0.5, '#546170');
    wingGrad.addColorStop(1, '#343D48');
    ctx.fillStyle = wingGrad;
    ctx.strokeStyle = 'rgba(15, 20, 26, 0.75)';
    ctx.lineWidth = 0.65;
    ctx.beginPath();
    ctx.moveTo(7, -2.4);
    ctx.lineTo(-8, -16);
    ctx.lineTo(-13, -14);
    ctx.lineTo(-4, -2.4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(7, 2.4);
    ctx.lineTo(-8, 16);
    ctx.lineTo(-13, 14);
    ctx.lineTo(-4, 2.4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#3C4652';
    ctx.beginPath();
    ctx.moveTo(-12, -2.3);
    ctx.lineTo(-18, -8);
    ctx.lineTo(-19.5, -6);
    ctx.lineTo(-15, -2.3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-12, 2.3);
    ctx.lineTo(-18, 8);
    ctx.lineTo(-19.5, 6);
    ctx.lineTo(-15, 2.3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#586675';
    ctx.beginPath();
    ctx.moveTo(21, 0);
    ctx.quadraticCurveTo(14, -2.8, 9.5, -2.8);
    ctx.lineTo(-15, -3.0);
    ctx.lineTo(-15, 3.0);
    ctx.lineTo(9.5, 2.8);
    ctx.quadraticCurveTo(14, 2.8, 21, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#2563EB';
    ctx.fillRect(-13, -1.6, 2.8, 1.6);
    ctx.fillStyle = '#FACC15';
    ctx.fillRect(-13, 0, 2.8, 1.6);

    ctx.fillStyle = '#181E25';
    ctx.beginPath();
    ctx.ellipse(11.5, 0, 3.6, 1.2, 0, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  // su57-x69 uses su57-kab silhouette
  drawMunitionSilhouettePath(ctx, 'su57-kab', shadowOnly);
}

/**
 * Draws a flying strategic/tactical missile-carrying aircraft
 * from a placed airfield with realistic shadow and subtle jet exhaust.
 */
export function drawFlyingCarrierAircraft(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  headingRad: number,
  aircraftSpec: RussianAircraftSpec,
  progress: number,
  armed: boolean,
  timeSec: number,
) {
  const arcFactor = Math.sin(progress * Math.PI);
  const baseScale =
    aircraftSpec.id === 'tu95' || aircraftSpec.id === 'tu160'
      ? 1.15
      : aircraftSpec.id === 'tu22m3' || aircraftSpec.id === 'su24m'
        ? 1.1
        : 1.06;
  const scale = baseScale + arcFactor * 0.12;
  const shadowOffset = 14 + arcFactor * 16;

  // 1. Ground shadow
  ctx.save();
  ctx.translate(x + shadowOffset * 0.65, y + shadowOffset);
  ctx.rotate(headingRad);
  ctx.scale(scale * 0.88, scale * 0.88);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
  drawCarrierAircraftSilhouette(ctx, aircraftSpec.id, true, armed);
  ctx.restore();

  // 2. Aircraft + realistic tight jet plumes
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(headingRad);
  ctx.scale(scale, scale);

  if (aircraftSpec.id !== 'tu95') {
    const flicker = 0.86 + Math.sin(timeSec * 44) * 0.14;
    const flameLen = (aircraftSpec.id === 'mig31k' || aircraftSpec.id === 'tu160' ? 11.5 : 9.5) * flicker;
    const exhaustYs = aircraftSpec.id === 'f16am' ? [0] : [-2.1, 2.1];
    for (const ey of exhaustYs) {
      const grad = ctx.createLinearGradient(-15, ey, -15 - flameLen, ey);
      grad.addColorStop(0, 'rgba(255, 245, 225, 0.92)');
      grad.addColorStop(0.45, 'rgba(251, 146, 60, 0.55)');
      grad.addColorStop(1, 'rgba(234, 88, 12, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(-14.6, ey - 1.0);
      ctx.lineTo(-15 - flameLen, ey);
      ctx.lineTo(-14.6, ey + 1.0);
      ctx.closePath();
      ctx.fill();
    }
  }

  const acSprite = getAircraftSpriteCanvas(aircraftSpec.id);
  if (acSprite) {
    ctx.drawImage(acSprite, -28, -20.5, 56, 41);
  } else {
    drawCarrierAircraftSilhouette(ctx, aircraftSpec.id, false, armed);
  }
  ctx.restore();
}

/**
 * Draws a military airbase / airfield on the satellite map with
 * runway markings, parked aircraft silhouette, rotating tower radar, and active loadout badge.
 */
export function drawAirfield(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  options: {
    name: string;
    faction?: 'RU' | 'UA';
    aircraftId: RussianAircraftId;
    aircraftShortName: string;
    missileShortName: string;
    salvoCount: number;
    accentColor: string;
    selected?: boolean;
    hovered?: boolean;
    hideArmament?: boolean;
    isPreview?: boolean;
    previewValid?: boolean;
    timeSec: number;
  },
) {
  const {
    name,
    faction = 'RU',
    aircraftShortName,
    missileShortName,
    salvoCount,
    accentColor,
    selected = false,
    hovered = false,
    hideArmament = false,
    isPreview = false,
    previewValid = true,
    timeSec,
  } = options;
  const isUa = faction === 'UA';

  ctx.save();
  ctx.translate(x, y);

  if (isPreview) {
    ctx.globalAlpha = previewValid ? 0.88 : 0.68;
  }

  if (selected) {
    const pulse = 1 + Math.sin(timeSec * 5.2) * 0.08;
    ctx.save();
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.arc(0, 0, 30 * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = `${accentColor}22`;
    ctx.beginPath();
    ctx.arc(0, 0, 27, 0, Math.PI * 2);
    ctx.fill();
  } else if (hovered && !isPreview) {
    ctx.strokeStyle = 'rgba(241, 245, 249, 0.78)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(0, 0, 27, 0, Math.PI * 2);
    ctx.stroke();
  } else if (isPreview) {
    ctx.strokeStyle = previewValid ? '#22C55E' : '#EF4444';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.arc(0, 0, 28, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Isometric 3D Military Airbase Diorama (runway, apron, hangars, ATC tower, fuel farm)
  const afImg = getBuildingSpriteCanvas('airfield');
  if (afImg) {
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.58)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;
    ctx.drawImage(afImg, -39, -30, 78, 60);
    ctx.restore();
  }

  // Airfield ATC radar beacon sweep above tower
  if (!isPreview) {
    ctx.save();
    ctx.translate(15, -17);
    ctx.rotate(timeSec * 3.5);
    ctx.strokeStyle = isUa ? '#38BDF8' : '#F97316';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-3.2, 0);
    ctx.lineTo(3.2, 0);
    ctx.stroke();
    ctx.restore();
  }

  if (isPreview && !previewValid) {
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-9, -9);
    ctx.lineTo(9, 9);
    ctx.moveTo(9, -9);
    ctx.lineTo(-9, 9);
    ctx.stroke();
  }

  if (!isPreview) {
    ctx.globalAlpha = 1;
    const prefix = isUa ? 'АЭР ВСУ' : 'АЭР';
    const badgeText = hideArmament
      ? `${prefix} ${name}`
      : `${prefix} ${name} · ${aircraftShortName} (${salvoCount}× ${missileShortName})`;
    ctx.font = '700 10px "JetBrains Mono", monospace';
    const bw = ctx.measureText(badgeText).width + 12;
    const bx = -bw / 2;
    const by = 24;
    ctx.fillStyle = 'rgba(7, 13, 23, 0.92)';
    ctx.strokeStyle = selected
      ? accentColor
      : isUa
        ? 'rgba(56, 189, 248, 0.65)'
        : 'rgba(249, 115, 22, 0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, 16, 3.5);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#F8FAFC';
    ctx.fillText(badgeText, bx + 6, by + 11.5);
  }

  ctx.restore();
}
