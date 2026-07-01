import { CommonModule } from '@angular/common';
import {
  Component,
  Input,
  Output,
  EventEmitter,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  NgZone,
  ChangeDetectorRef,
} from '@angular/core';

// Three.js est chargé dynamiquement depuis un CDN (voir loadThreeScripts) :
// on évite ainsi d'ajouter les dépendances npm three / GLTFLoader au projet.
declare const THREE: any;

type Viewer3dMode = 'orbit' | 'pan';
type Viewer3dEnv = 'dark' | 'light' | 'studio' | 'sky';

/**
 * Visionneur 3D réutilisable.
 *
 * Usage :
 *   <app-viewer3d [src]="urlDuFichierGlb"></app-viewer3d>
 *   <app-viewer3d [src]="url" [fileName]="'Ma maquette'" (loaded)="onLoaded()"></app-viewer3d>
 *
 * Le lien du fichier .glb/.gltf est passé par l'input `src`. Le composant peut être
 * inséré dans n'importe quel composant parent.
 */
@Component({
  selector: 'app-viewer3d',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './viewer3d.component.html',
  styleUrls: ['./viewer3d.component.scss'],
})
export class Viewer3dComponent implements AfterViewInit, OnChanges, OnDestroy {
  /** Lien vers le fichier 3D (.glb / .gltf) à afficher. */
  @Input() src!: string;
  /** Nom affiché dans la barre supérieure (optionnel — déduit de l'URL sinon). */
  @Input() fileName?: string;

  @Output() loaded = new EventEmitter<void>();
  @Output() error = new EventEmitter<string>();

  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  // ── État UI (lié au template) ───────────────────────────────────────────────
  loaderVisible = true;
  loaderProgress = 0;
  loaderMsg = 'Chargement de Three.js…';

  errorVisible = false;
  errorMsg = 'Vérifiez que le serveur autorise les requêtes CORS.';

  modelReady = false;

  info = { name: '—', mesh: '—', mat: '—', tri: '—', file: '—' };

  currentMode: Viewer3dMode = 'orbit';
  currentEnv: Viewer3dEnv = 'dark';
  wireOn = false;
  gridVisible = true;
  axesVisible = false;

  exp = 1.0;
  amb = 0.6;
  dir = 1.5;

  toastMsg = '';
  toastVisible = false;
  private toastTimer: any = null;

  // ── Objets Three.js (non réactifs) ──────────────────────────────────────────
  private renderer: any;
  private scene: any;
  private camera: any;
  private model: any;
  private gridHelper: any;
  private axesHelper: any;
  private ambLight: any;
  private dirLight: any;
  private fillLight: any;

  private sph = { theta: 0.6, phi: 1.1, radius: 20 };
  private target: any;
  private isDrag = false;
  private isPan = false;
  private prevMouse = { x: 0, y: 0 };
  private lastDist = 0;

  private rafId = 0;
  private readonly origMats = new Map<string, any>();

  // Listeners bornés (pour un removeEventListener propre au destroy).
  private boundResize = () => this.onResize();
  private boundMouseMove = (e: MouseEvent) => this.onMouseMove(e);
  private boundMouseUp = () => (this.isDrag = false);

  // Cache global du chargement des scripts CDN (partagé entre instances).
  private static threeReady?: Promise<void>;

  private readonly THREE_URL =
    'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
  private readonly GLTF_URL =
    'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js';

  private readonly envs: Record<Viewer3dEnv, { bg: number; fog: number; fd: number }> = {
    dark: { bg: 0x0f1117, fog: 0x0f1117, fd: 0.003 },
    light: { bg: 0xdde3ec, fog: 0xdde3ec, fd: 0.002 },
    studio: { bg: 0x1a1f2e, fog: 0x1a1f2e, fd: 0.004 },
    sky: { bg: 0x0d2240, fog: 0x0d2240, fd: 0.002 },
  };

  constructor(private zone: NgZone, private cdr: ChangeDetectorRef) {}

  ngAfterViewInit(): void {
    this.bootstrap();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Rechargement quand le parent change l'URL après l'initialisation.
    if (changes['src'] && !changes['src'].firstChange && this.scene) {
      this.reloadModel();
    }
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.rafId);
    window.removeEventListener('resize', this.boundResize);
    window.removeEventListener('mousemove', this.boundMouseMove);
    window.removeEventListener('mouseup', this.boundMouseUp);
    clearTimeout(this.toastTimer);
    if (this.renderer) {
      this.renderer.dispose?.();
      this.renderer.forceContextLoss?.();
    }
  }

  // ── Bootstrap : charge les scripts puis initialise la scène ──────────────────
  private async bootstrap(): Promise<void> {
    if (!this.src) {
      this.showErr('Aucun lien de fichier 3D fourni.');
      return;
    }
    try {
      this.setLoader(10, 'Chargement de GLTFLoader…');
      await this.loadThreeScripts();
      this.setLoader(30, 'GLTFLoader prêt — initialisation scène…');
      this.zone.runOutsideAngular(() => this.initScene());
      this.setLoader(50, 'Téléchargement du modèle GLB…');
      this.loadModel();
    } catch (e: any) {
      this.showErr(e?.message || 'Impossible de charger le moteur 3D.');
    }
  }

  private loadThreeScripts(): Promise<void> {
    if (Viewer3dComponent.threeReady) return Viewer3dComponent.threeReady;
    Viewer3dComponent.threeReady = this.injectScript(this.THREE_URL).then(() =>
      this.injectScript(this.GLTF_URL)
    );
    return Viewer3dComponent.threeReady;
  }

  private injectScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Ne pas réinjecter un script déjà présent.
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }
      const s = document.createElement('script');
      s.src = src;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Impossible de charger ' + src));
      document.head.appendChild(s);
    });
  }

  // ── SCENE ────────────────────────────────────────────────────────────────────
  private initScene(): void {
    const canvas = this.canvasRef.nativeElement;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      preserveDrawingBuffer: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.width(), this.height());
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.physicallyCorrectLights = true;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f1117);
    this.scene.fog = new THREE.FogExp2(0x0f1117, 0.003);

    this.camera = new THREE.PerspectiveCamera(45, this.width() / this.height(), 0.001, 50000);
    this.camera.position.set(10, 6, 14);
    this.target = new THREE.Vector3();

    // Lights
    this.ambLight = new THREE.AmbientLight(0xffffff, this.amb);
    this.scene.add(this.ambLight);

    this.dirLight = new THREE.DirectionalLight(0xfff5e0, this.dir);
    this.dirLight.position.set(20, 40, 20);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.set(4096, 4096);
    this.dirLight.shadow.camera.far = 2000;
    this.dirLight.shadow.camera.near = 0.1;
    this.dirLight.shadow.normalBias = 0.02;
    this.scene.add(this.dirLight);

    this.fillLight = new THREE.DirectionalLight(0x88aaff, 0.4);
    this.fillLight.position.set(-20, 10, -20);
    this.scene.add(this.fillLight);

    const rimLight = new THREE.DirectionalLight(0x2563eb, 0.2);
    rimLight.position.set(0, 20, -30);
    this.scene.add(rimLight);

    // Grid
    this.gridHelper = new THREE.GridHelper(500, 80, 0xff5c02, 0x1a2232);
    this.gridHelper.material.opacity = 0.25;
    this.gridHelper.material.transparent = true;
    this.scene.add(this.gridHelper);

    window.addEventListener('resize', this.boundResize);
    this.setupControls();
    this.animate();
  }

  // ── LOAD MODEL ─────────────────────────────────────────────────────────────
  private loadModel(): void {
    const loader = new THREE.GLTFLoader();
    loader.load(
      this.src,
      (gltf: any) => this.zone.run(() => this.onModelLoaded(gltf)),
      (xhr: any) => {
        if (xhr.total) {
          const pct = 50 + Math.round((xhr.loaded / xhr.total) * 40);
          const mb = (xhr.loaded / 1048576).toFixed(1);
          this.zone.run(() => this.setLoader(pct, `Téléchargement… ${mb} MB`));
        }
      },
      (err: any) =>
        this.zone.run(() => this.showErr('Erreur GLTFLoader : ' + (err?.message || err)))
    );
  }

  private onModelLoaded(gltf: any): void {
    this.setLoader(90, 'Optimisation de la scène…');

    this.model = gltf.scene;
    let meshCount = 0;
    const matSet = new Set<string>();
    let triCount = 0;

    this.model.traverse((obj: any) => {
      if (obj.isMesh) {
        meshCount++;
        obj.castShadow = true;
        obj.receiveShadow = true;
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach((m: any) => matSet.add(m.uuid));
          else matSet.add(obj.material.uuid);
        }
        if (obj.geometry && obj.geometry.index) triCount += obj.geometry.index.count / 3;
        else if (obj.geometry && obj.geometry.attributes.position)
          triCount += obj.geometry.attributes.position.count / 3;
      }
    });

    // Center & fit
    const box = new THREE.Box3().setFromObject(this.model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);

    this.model.position.sub(center);
    this.model.position.y += size.y / 2;
    this.scene.add(this.model);

    // Fit camera
    this.sph.radius = maxDim * 1.6;
    this.target.set(0, 0, 0);
    this.sph.theta = 0.6;
    this.sph.phi = 1.1;
    this.updateCam();

    // Grid at base
    this.gridHelper.position.y = -size.y / 2;

    // Update info
    const fname =
      this.fileName ||
      this.src
        .split('/')
        .pop()!
        .replace(/^[a-f0-9-]+-/, '')
        .replace(/\.(glb|gltf)$/i, '');
    this.info = {
      name: fname.length > 14 ? fname.slice(0, 14) + '…' : fname,
      mesh: String(meshCount),
      mat: String(matSet.size),
      tri: triCount > 1000 ? (triCount / 1000).toFixed(1) + 'K' : String(Math.round(triCount)),
      file: fname,
    };

    this.setLoader(100, '');
    setTimeout(() => {
      this.loaderVisible = false;
      this.modelReady = true;
      this.toast('Modèle chargé avec textures ✓');
      this.loaded.emit();
      this.cdr.detectChanges();
    }, 300);
  }

  /** Retire le modèle courant et recharge depuis la nouvelle URL. */
  private reloadModel(): void {
    if (this.model) {
      this.scene.remove(this.model);
      this.model = null;
    }
    this.origMats.clear();
    this.wireOn = false;
    this.modelReady = false;
    this.loaderVisible = true;
    this.errorVisible = false;
    this.setLoader(50, 'Téléchargement du modèle GLB…');
    this.loadModel();
  }

  // ── ORBIT CONTROLS ───────────────────────────────────────────────────────────
  private updateCam(): void {
    const sinPhi = Math.sin(this.sph.phi);
    this.camera.position.set(
      this.target.x + this.sph.radius * sinPhi * Math.sin(this.sph.theta),
      this.target.y + this.sph.radius * Math.cos(this.sph.phi),
      this.target.z + this.sph.radius * sinPhi * Math.cos(this.sph.theta)
    );
    this.camera.lookAt(this.target);
  }

  private setupControls(): void {
    const c = this.canvasRef.nativeElement;
    c.addEventListener('mousedown', (e) => {
      this.isDrag = true;
      this.isPan = e.button === 2 || this.currentMode === 'pan';
      this.prevMouse = { x: e.clientX, y: e.clientY };
      e.preventDefault();
    });
    c.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('mousemove', this.boundMouseMove);
    window.addEventListener('mouseup', this.boundMouseUp);
    c.addEventListener(
      'wheel',
      (e) => {
        this.sph.radius = Math.max(0.1, Math.min(50000, this.sph.radius * (1 + e.deltaY * 0.001)));
        this.updateCam();
        e.preventDefault();
      },
      { passive: false }
    );

    // Touch
    c.addEventListener(
      'touchstart',
      (e) => {
        if (e.touches.length === 1) {
          this.isDrag = true;
          this.isPan = false;
          this.prevMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        } else if (e.touches.length === 2) {
          this.isDrag = false;
          const dx = e.touches[0].clientX - e.touches[1].clientX;
          const dy = e.touches[0].clientY - e.touches[1].clientY;
          this.lastDist = Math.sqrt(dx * dx + dy * dy);
        }
        e.preventDefault();
      },
      { passive: false }
    );
    c.addEventListener(
      'touchmove',
      (e) => {
        if (e.touches.length === 1 && this.isDrag) {
          const dx = e.touches[0].clientX - this.prevMouse.x;
          const dy = e.touches[0].clientY - this.prevMouse.y;
          this.prevMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
          this.sph.theta -= dx * 0.005;
          this.sph.phi = Math.max(0.05, Math.min(Math.PI - 0.05, this.sph.phi - dy * 0.005));
          this.updateCam();
        } else if (e.touches.length === 2) {
          const dx = e.touches[0].clientX - e.touches[1].clientX;
          const dy = e.touches[0].clientY - e.touches[1].clientY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          this.sph.radius = Math.max(
            0.1,
            Math.min(50000, this.sph.radius * (1 + (this.lastDist - dist) * 0.004))
          );
          this.lastDist = dist;
          this.updateCam();
        }
        e.preventDefault();
      },
      { passive: false }
    );
    c.addEventListener('touchend', () => (this.isDrag = false));
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.isDrag) return;
    const dx = e.clientX - this.prevMouse.x;
    const dy = e.clientY - this.prevMouse.y;
    this.prevMouse = { x: e.clientX, y: e.clientY };
    if (this.isPan) {
      const spd = this.sph.radius * 0.0008;
      const right = new THREE.Vector3()
        .crossVectors(
          this.camera.getWorldDirection(new THREE.Vector3()),
          new THREE.Vector3(0, 1, 0)
        )
        .normalize();
      this.target.addScaledVector(right, -dx * spd);
      this.target.y += dy * spd;
    } else {
      this.sph.theta -= dx * 0.004;
      this.sph.phi = Math.max(0.05, Math.min(Math.PI - 0.05, this.sph.phi - dy * 0.004));
    }
    this.updateCam();
  }

  // ── UI ACTIONS (appelées depuis le template) ─────────────────────────────────
  setMode(m: Viewer3dMode): void {
    this.currentMode = m;
  }

  toggleWire(): void {
    if (!this.model) return;
    this.wireOn = !this.wireOn;
    this.model.traverse((obj: any) => {
      if (!obj.isMesh) return;
      if (this.wireOn) {
        this.origMats.set(obj.uuid, obj.material);
        obj.material = Array.isArray(obj.material)
          ? obj.material.map(() => new THREE.MeshBasicMaterial({ color: 0x3b82f6, wireframe: true }))
          : new THREE.MeshBasicMaterial({ color: 0x3b82f6, wireframe: true });
      } else {
        const orig = this.origMats.get(obj.uuid);
        if (orig) obj.material = orig;
      }
    });
    this.toast(this.wireOn ? 'Wireframe activé' : 'Wireframe désactivé');
  }

  toggleGrid(): void {
    this.gridVisible = !this.gridVisible;
    this.gridHelper.visible = this.gridVisible;
  }

  toggleAxes(): void {
    if (this.axesHelper) {
      this.scene.remove(this.axesHelper);
      this.axesHelper = null;
      this.axesVisible = false;
    } else {
      this.axesHelper = new THREE.AxesHelper(10);
      this.scene.add(this.axesHelper);
      this.axesVisible = true;
      this.toast('Axes XYZ affichés');
    }
  }

  resetCam(): void {
    if (!this.model) return;
    const box = new THREE.Box3().setFromObject(this.model);
    const size = box.getSize(new THREE.Vector3());
    this.target.set(0, 0, 0);
    this.sph = { theta: 0.6, phi: 1.1, radius: Math.max(size.x, size.y, size.z) * 1.6 };
    this.updateCam();
    this.toast('Vue réinitialisée');
  }

  zoom(f: number): void {
    this.sph.radius = Math.max(0.1, Math.min(50000, this.sph.radius * f));
    this.updateCam();
  }

  setExp(v: string | number): void {
    this.exp = parseFloat(v as string);
    this.renderer.toneMappingExposure = this.exp;
  }
  setAmb(v: string | number): void {
    this.amb = parseFloat(v as string);
    this.ambLight.intensity = this.amb;
  }
  setDir(v: string | number): void {
    this.dir = parseFloat(v as string);
    this.dirLight.intensity = this.dir;
  }

  setEnv(name: Viewer3dEnv): void {
    const e = this.envs[name];
    this.scene.background = new THREE.Color(e.bg);
    this.scene.fog = new THREE.FogExp2(e.fog, e.fd);
    this.currentEnv = name;
  }

  snap(): void {
    this.renderer.render(this.scene, this.camera);
    const a = document.createElement('a');
    a.href = this.canvasRef.nativeElement.toDataURL('image/png');
    a.download = 'btpcloud-3d-' + new Date().getTime() + '.png';
    a.click();
    this.toast('Capture enregistrée');
  }

  reload(): void {
    if (this.scene) this.reloadModel();
    else this.bootstrap();
  }

  // ── RENDER LOOP ────────────────────────────────────────────────────────────
  private animate = (): void => {
    this.rafId = requestAnimationFrame(this.animate);
    this.renderer.render(this.scene, this.camera);
  };

  private onResize(): void {
    this.camera.aspect = this.width() / this.height();
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width(), this.height());
  }

  // ── HELPERS ──────────────────────────────────────────────────────────────────
  private width(): number {
    return this.canvasRef.nativeElement.clientWidth || window.innerWidth;
  }
  private height(): number {
    return this.canvasRef.nativeElement.clientHeight || window.innerHeight;
  }

  private setLoader(progress: number, msg: string): void {
    this.loaderProgress = progress;
    if (msg) this.loaderMsg = msg;
  }

  private showErr(msg: string): void {
    this.loaderVisible = false;
    this.errorVisible = true;
    this.errorMsg = msg;
    this.error.emit(msg);
    this.cdr.detectChanges();
  }

  private toast(msg: string): void {
    this.toastMsg = msg;
    this.toastVisible = true;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toastVisible = false;
      this.cdr.detectChanges();
    }, 3000);
  }
}
