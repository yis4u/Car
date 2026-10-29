import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { MeshoptDecoder } from './vendor/meshopt_decoder.module.js';

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
export class CarStudio {
  constructor(container, { interactive = true, transparent = false } = {}) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: transparent, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0xe7eae5, transparent ? 0 : 1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.camera = new THREE.PerspectiveCamera(34, 1, 0.01, 100);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enabled = interactive;
    this.controls.enableDamping = true;
    this.controls.enablePan = false;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 11;
    this.controls.maxPolarAngle = Math.PI * 0.49;
    this.controls.autoRotateSpeed = 0.7;
    this.controls.target.set(0, 0.65, 0);
    this.scene.add(new THREE.HemisphereLight(0xf6fbff, 0x8c9580, 3));
    const key = new THREE.DirectionalLight(0xffffff, 4.5);
    key.position.set(-3, 7, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = key.shadow.camera.bottom = -5;
    key.shadow.camera.right = key.shadow.camera.top = 5;
    key.shadow.bias = -0.001;
    key.shadow.normalBias = 0.025;
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0xcbe2ff, 2.5);
    fill.position.set(4, 3, -4);
    this.scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffffff, 3);
    rim.position.set(1, 5, -3);
    this.scene.add(rim);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ opacity: 0.16 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.005;
    ground.receiveShadow = true;
    this.scene.add(ground);
    container.append(this.renderer.domElement);
    this.resize = () => {
      const w = container.clientWidth || 1000, h = container.clientHeight || 640;
      this.renderer.setSize(w, h, false);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      if (this.model) this.setView(this.view || 'three');
    };
    this.observer = new ResizeObserver(this.resize);
    this.observer.observe(container);
    this.resize();
    this.setView('three');
    this.active = true;
    this.renderer.setAnimationLoop(() => { if (this.active) { this.controls.update(); this.renderer.render(this.scene, this.camera); } });
  }
  async load(car, base) {
    const ticket = this.ticket = (this.ticket || 0) + 1;
    this.clearModel();
    const url = base ? base + car.file : `https://raw.githubusercontent.com/pedrosoandre/carros/${car.assetCommit}/assets/${car.file}`;
    const gltf = await loader.loadAsync(url);
    if (ticket !== this.ticket) { this.disposeObject(gltf.scene); return false; }
    const root = gltf.scene;
    this.omitted = [];
    root.traverse(o => { if (car.hiddenNodes?.includes(o.name)) this.omitted.push(o); });
    for (const o of this.omitted) o.removeFromParent();
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const max = Math.max(size.x, size.y, size.z);
    if (!Number.isFinite(max) || max <= 0) throw new Error('The model contains no visible geometry.');
    const group = new THREE.Group();
    group.add(root);
    root.scale.multiplyScalar(4.3 / max);
    root.updateMatrixWorld(true);
    const normalized = new THREE.Box3().setFromObject(root);
    const center = normalized.getCenter(new THREE.Vector3());
    root.position.sub(new THREE.Vector3(center.x, normalized.min.y, center.z));
    if (size.x > size.z) group.rotation.y = Math.PI / 2;
    if (car.rotation) group.rotation.y += car.rotation;
    group.traverse(o => {
      if (o.isMesh) {
        o.castShadow = o.receiveShadow = true;
        const materials = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of materials) {
          if (m.metalness > 0.75) m.metalness = 0.6;
          if (m.roughness < 0.15) m.roughness = 0.23;
          if (car.materialColors?.[m.name]) { m.color.set(car.materialColors[m.name]); m.roughness = 0.55; }
        }
      }
    });
    this.model = group;
    this.car = car;
    this.scene.add(group);
    this.setView('three');
    this.renderer.render(this.scene, this.camera);
    return true;
  }
  setView(view) {
    this.view = view;
    const directions = { three: [-1, 0.39, 1.1], front: [0, 0.15, 1], side: [-1, 0.12, 0.002], rear: [0, 0.15, -1] };
    const direction = new THREE.Vector3(...(directions[view] || directions.three)).normalize();
    this.controls.autoRotate = false;
    let distance = 8;
    const target = new THREE.Vector3(0, 0.65, 0);
    if (this.model) {
      this.model.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(this.model);
      box.getCenter(target);
      const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0), direction).normalize();
      const up = new THREE.Vector3().crossVectors(direction, right).normalize();
      const tanV = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
      const tanH = tanV * this.camera.aspect;
      distance = 0;
      for (const x of [box.min.x,box.max.x]) for (const y of [box.min.y,box.max.y]) for (const z of [box.min.z,box.max.z]) {
        const relative = new THREE.Vector3(x,y,z).sub(target);
        const depth = relative.dot(direction);
        distance = Math.max(distance,Math.abs(relative.dot(right))/(tanH*0.86)+depth,Math.abs(relative.dot(up))/(tanV*0.8)+depth);
      }
      distance = Math.max(3,distance);
      this.controls.minDistance = Math.min(2,distance*0.45);
      this.controls.maxDistance = distance*2.5;
    }
    this.camera.position.copy(target).addScaledVector(direction,distance);
    this.controls.target.copy(target);
    this.controls.update();
  }
  setColor(color) {
    let changed = 0;
    this.model?.traverse(o => { if (o.isMesh) for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      if (this.car.paint?.materials.includes(m.name)) { m.color.set(color); changed++; }
    } });
    return changed;
  }
  render() { this.controls.update(); this.renderer.render(this.scene, this.camera); }
  disposeObject(object) {
    const textures = new Set(), materials = new Set(), geometries = new Set();
    object.traverse(o => { if (o.isMesh) { geometries.add(o.geometry); for (const m of Array.isArray(o.material) ? o.material : [o.material]) { materials.add(m); for (const v of Object.values(m)) if (v?.isTexture) textures.add(v); } } });
    for (const t of textures) t.dispose();
    for (const m of materials) m.dispose();
    for (const g of geometries) g.dispose();
  }
  clearModel() { if (this.model) { this.scene.remove(this.model); this.disposeObject(this.model); this.model = null; } for (const o of this.omitted || []) this.disposeObject(o); this.omitted=[]; }
  dispose() { this.ticket = (this.ticket || 0) + 1; this.active = false; this.renderer.setAnimationLoop(null); this.observer.disconnect(); this.controls.dispose(); this.clearModel(); this.disposeObject(this.scene); this.renderer.dispose(); this.renderer.domElement.remove(); }
}
