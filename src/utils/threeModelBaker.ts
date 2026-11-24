import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { AirDefenseId, BuildingId } from '../data/munitions';
import { buildBuilding3DGroup } from './threeBuildingModels';
import { buildPvo3DAssembly } from './threePvoModels';
import { setTextureMaxAnisotropy } from './threeTextures';

const Y_AXIS = new THREE.Vector3(0, 1, 0);

interface BakerContext {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  envTexture: THREE.Texture;
  isSoftwareGl: boolean;
}

let bakerCtx: BakerContext | null | undefined = undefined;

function detectSoftwareWebGL(): boolean {
  if (typeof document === 'undefined') return true;
  try {
    const probeCanvas = document.createElement('canvas');
    const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) ?? '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function getBakerContext(): BakerContext | null {
  if (bakerCtx !== undefined) return bakerCtx;
  if (typeof document === 'undefined') {
    bakerCtx = null;
    return null;
  }
  try {
    const isSoftwareGl = detectSoftwareWebGL();
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.setPixelRatio(1);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x000000, 0);

    setTextureMaxAnisotropy(isSoftwareGl ? 1 : renderer.capabilities.getMaxAnisotropy());

    const scene = new THREE.Scene();
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;
    pmremGenerator.dispose();

    // 3-point balanced outdoor tactical lighting rig (warm sun from NW, cool hemisphere fill, subtle rim)
    const hemi = new THREE.HemisphereLight(0xbfe0ff, 0x3b352c, 0.95);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfff1dc, 2.35);
    sun.position.set(-7, 12, -5.5);
    sun.castShadow = !isSoftwareGl;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 30;
    const d = 4.2;
    sun.shadow.camera.left = -d;
    sun.shadow.camera.right = d;
    sun.shadow.camera.top = d;
    sun.shadow.camera.bottom = -d;
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.02;
    scene.add(sun);

    const rim = new THREE.DirectionalLight(0x93c5fd, 0.72);
    rim.position.set(6, 5, 7);
    scene.add(rim);

    bakerCtx = { renderer, scene, envTexture, isSoftwareGl };
    return bakerCtx;
  } catch {
    bakerCtx = null;
    return null;
  }
}

function disposeGroup(group: THREE.Object3D) {
  group.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }
    if (mesh.material) {
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of mats) {
        if (!m.userData?.sharedMaterial) {
          m.dispose();
        }
      }
    }
  });
}

function copyRendererToCanvas(renderer: THREE.WebGLRenderer, w: number, h: number): HTMLCanvasElement {
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const ctx = out.getContext('2d')!;
  ctx.drawImage(renderer.domElement, 0, 0, w, h);
  return out;
}

// ============================================================================
// BUILDINGS & AIRFIELD 3D SPRITE BAKER
// ============================================================================

export function bakeBuilding3DCanvas(id: BuildingId | 'airfield'): HTMLCanvasElement | null {
  const ctx3d = getBakerContext();
  if (!ctx3d) return null;

  const W = 400;
  const H = 310;
  ctx3d.renderer.setSize(W, H, false);

  const camera = new THREE.PerspectiveCamera(31, W / H, 0.5, 40);
  camera.position.set(6.75, 5.85, 6.75);
  camera.lookAt(0, 0.62, 0);
  camera.updateProjectionMatrix();

  const model = buildBuilding3DGroup(id);
  // Slight organic angle alignment so isometric diagonals frame cleanly
  model.rotation.y = 0;
  ctx3d.scene.add(model);
  ctx3d.renderer.render(ctx3d.scene, camera);

  const result = copyRendererToCanvas(ctx3d.renderer, W, H);
  ctx3d.scene.remove(model);
  disposeGroup(model);
  return result;
}

// ============================================================================
// PVO 3D MENU SHOWCASE & DIRECTIONAL MAP SPRITE BAKER
// ============================================================================

export function bakePvoMenu3DCanvas(id: AirDefenseId): HTMLCanvasElement | null {
  const ctx3d = getBakerContext();
  if (!ctx3d) return null;

  const W = 380;
  const H = 250;
  ctx3d.renderer.setSize(W, H, false);

  const camera = new THREE.PerspectiveCamera(30, W / H, 0.5, 40);
  camera.position.set(4.5, 3.15, 4.9);
  camera.lookAt(0.05, 0.62, 0);
  camera.updateProjectionMatrix();

  const { chassis, turret, turretAnchor } = buildPvo3DAssembly(id, 8, true);
  turret.position.copy(turretAnchor);
  chassis.add(turret);
  // Rotate slightly so both front cab/wheels & side profile read sharply
  chassis.rotation.y = -0.35;
  ctx3d.scene.add(chassis);
  ctx3d.renderer.render(ctx3d.scene, camera);

  const result = copyRendererToCanvas(ctx3d.renderer, W, H);
  ctx3d.scene.remove(chassis);
  disposeGroup(chassis);
  return result;
}

const DIRECTION_BINS = 16; // Every 22.5 deg -> max 11.25 deg residual rotation
const PVO_MAP_SIZE = 160;
const PVO_ORTHO_HALF = 3.05;
const PVO_CAM_POS = new THREE.Vector3(0, 5.4, 3.6);
const PVO_CAM_LOOK = new THREE.Vector3(0, 0.36, 0);

let sharedMapOrthoCam: THREE.OrthographicCamera | null = null;
function getMapOrthoCam(): THREE.OrthographicCamera {
  if (sharedMapOrthoCam) return sharedMapOrthoCam;
  sharedMapOrthoCam = new THREE.OrthographicCamera(
    -PVO_ORTHO_HALF,
    PVO_ORTHO_HALF,
    PVO_ORTHO_HALF,
    -PVO_ORTHO_HALF,
    0.5,
    30,
  );
  sharedMapOrthoCam.position.copy(PVO_CAM_POS);
  sharedMapOrthoCam.lookAt(PVO_CAM_LOOK);
  sharedMapOrthoCam.updateProjectionMatrix();
  sharedMapOrthoCam.updateMatrixWorld();
  return sharedMapOrthoCam;
}

const pvoChassisCache = new Map<string, HTMLCanvasElement>();
const pvoTurretCache = new Map<string, HTMLCanvasElement>();
const pvoFullCache = new Map<string, HTMLCanvasElement>();
const pvoAssemblyPool = new Map<string, ReturnType<typeof buildPvo3DAssembly>>();

function normalizePvoAmmoKey(id: AirDefenseId, ammo: number): number {
  const rounded = Math.max(0, Math.round(ammo));
  if (id === 'patriot' || id === 's300') return Math.min(4, rounded);
  if (id === 'iris-t') return Math.min(8, rounded);
  return 0;
}

function getPooledPvoAssembly(id: AirDefenseId, ammoKey: number) {
  const key = `${id}_${ammoKey}`;
  let asm = pvoAssemblyPool.get(key);
  if (!asm) {
    asm = buildPvo3DAssembly(id, ammoKey, false);
    pvoAssemblyPool.set(key, asm);
  }
  return asm;
}

export function quantizeAngleBin(angleRad: number): { bin: number; binRad: number; residualRad: number } {
  const twoPi = Math.PI * 2;
  const norm = ((angleRad % twoPi) + twoPi) % twoPi;
  const step = twoPi / DIRECTION_BINS;
  const bin = Math.round(norm / step) % DIRECTION_BINS;
  const binRad = bin * step;
  let residualRad = norm - binRad;
  if (residualRad > Math.PI) residualRad -= twoPi;
  if (residualRad < -Math.PI) residualRad += twoPi;
  return { bin, binRad, residualRad };
}

export interface PvoMap3DLayers {
  fullSprite?: HTMLCanvasElement;
  chassisSprite?: HTMLCanvasElement;
  turretSprite?: HTMLCanvasElement;
  turretOffsetX: number;
  turretOffsetY: number;
  binRad: number;
  turretBinRad: number;
  turretRotates: boolean;
}

const _tmpVec = new THREE.Vector3();
const _zeroVec = new THREE.Vector3(0, 0, 0);

/**
 * Lazily renders and caches 3D tactical views of a PVO unit at 22.5-degree azimuth steps
 * with consistent NW sunlight and exact projected turret pivot coordinates.
 */
export function getPvo3DMapLayers(
  id: AirDefenseId,
  chassisAngleRad: number,
  turretAngleRad: number,
  ammo: number,
  drawWidthPx: number,
): PvoMap3DLayers | null {
  const ctx3d = getBakerContext();
  if (!ctx3d) return null;

  const ammoKey = normalizePvoAmmoKey(id, ammo);
  const asm = getPooledPvoAssembly(id, ammoKey);
  const cBin = quantizeAngleBin(chassisAngleRad);
  const cam = getMapOrthoCam();

  // For single-body units (IRIS-T, S-300), bake combined chassis+launcher in 1 sprite keyed by ammo
  if (!asm.turretRotates) {
    const key = `${id}_${cBin.bin}_${ammoKey}`;
    let full = pvoFullCache.get(key);
    if (!full) {
      ctx3d.renderer.setSize(PVO_MAP_SIZE, PVO_MAP_SIZE, false);
      asm.turret.position.copy(asm.turretAnchor);
      asm.turret.rotation.y = 0;
      asm.chassis.add(asm.turret);
      asm.chassis.rotation.y = -cBin.binRad;
      ctx3d.scene.add(asm.chassis);
      ctx3d.renderer.render(ctx3d.scene, cam);
      full = copyRendererToCanvas(ctx3d.renderer, PVO_MAP_SIZE, PVO_MAP_SIZE);
      ctx3d.scene.remove(asm.chassis);
      asm.chassis.remove(asm.turret);
      pvoFullCache.set(key, full);
    }
    return {
      fullSprite: full,
      turretOffsetX: 0,
      turretOffsetY: 0,
      binRad: cBin.binRad,
      turretBinRad: cBin.binRad,
      turretRotates: false,
    };
  }

  // Separate 3D Chassis + 3D Rotating Turret/Radar (MG Pickup, Gepard, Patriot, Radar)
  const chassisKey = `${id}_ch_${cBin.bin}`;
  let chSprite = pvoChassisCache.get(chassisKey);
  if (!chSprite) {
    ctx3d.renderer.setSize(PVO_MAP_SIZE, PVO_MAP_SIZE, false);
    asm.chassis.remove(asm.turret);
    asm.chassis.rotation.y = -cBin.binRad;
    ctx3d.scene.add(asm.chassis);
    ctx3d.renderer.render(ctx3d.scene, cam);
    chSprite = copyRendererToCanvas(ctx3d.renderer, PVO_MAP_SIZE, PVO_MAP_SIZE);
    ctx3d.scene.remove(asm.chassis);
    pvoChassisCache.set(chassisKey, chSprite);
  }

  const tBin = quantizeAngleBin(turretAngleRad);
  const turretAmmoKey = id === 'patriot' ? ammoKey : 0;
  const turretKey = `${id}_tu_${tBin.bin}_${turretAmmoKey}`;
  let tuSprite = pvoTurretCache.get(turretKey);
  if (!tuSprite) {
    ctx3d.renderer.setSize(PVO_MAP_SIZE, PVO_MAP_SIZE, false);
    asm.chassis.remove(asm.turret);
    asm.turret.position.set(0, 0, 0);
    asm.turret.rotation.y = -tBin.binRad;
    ctx3d.scene.add(asm.turret);
    ctx3d.renderer.render(ctx3d.scene, cam);
    tuSprite = copyRendererToCanvas(ctx3d.renderer, PVO_MAP_SIZE, PVO_MAP_SIZE);
    ctx3d.scene.remove(asm.turret);
    pvoTurretCache.set(turretKey, tuSprite);
  }

  // Compute exact screen-space offset of turretAnchor relative to vehicle origin (0,0,0)
  _tmpVec.copy(asm.turretAnchor).applyAxisAngle(Y_AXIS, -chassisAngleRad);
  _tmpVec.project(cam);
  const pxScale = drawWidthPx / 2;
  const turretOffsetX = _tmpVec.x * pxScale;
  const turretOffsetY = -_tmpVec.y * pxScale;

  // Subtract origin projection Y so offset is purely relative to center of chassis sprite
  _tmpVec.copy(_zeroVec).project(cam);
  const originProjY = -_tmpVec.y * pxScale;

  return {
    chassisSprite: chSprite,
    turretSprite: tuSprite,
    turretOffsetX,
    turretOffsetY: turretOffsetY - originProjY,
    binRad: cBin.binRad,
    turretBinRad: tBin.binRad,
    turretRotates: true,
  };
}
