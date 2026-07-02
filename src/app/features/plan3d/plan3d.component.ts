import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Plan3dService, Plan3dItem } from '../../../services/plan3d.service';
import { RealestateService } from '../../core/services/realestate.service';
import { AuthService } from '../auth/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { Viewer3dComponent } from '../../shared/components/viewer3d/viewer3d.component';

interface SelectableProperty {
  id: number;
  title: string;
}

@Component({
  selector: 'app-plan3d',
  standalone: true,
  imports: [CommonModule, FormsModule, Viewer3dComponent],
  templateUrl: './plan3d.component.html'
})
export class Plan3dComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // ── Propriétés ──
  properties: SelectableProperty[] = [];
  loadingProperties = false;

  // ── Liste des plans ──
  plans: Plan3dItem[] = [];
  loading = false;
  totalElements = 0;
  totalPages = 0;
  currentPage = 0;
  readonly pageSize = 12;

  // ── Modal upload ──
  showUploadModal = false;
  selectedPropertyId: number | null = null;
  selectedFile: File | null = null;
  selectedFileName = '';
  dragOver = false;
  uploading = false;
  uploadError: string | null = null;
  propertiesLoadError = false;

  // ── Modal visionneur 3D ──
  showViewerModal = false;
  viewerUrl: string | null = null;
  viewerName = '';

  constructor(
    private plan3dService: Plan3dService,
    private realestateService: RealestateService,
    private authService: AuthService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.loadProperties();
    this.loadPlans();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private get userId(): number | undefined {
    return this.authService.currentUser()?.id;
  }

  private loadProperties(): void {
    const userId = this.userId;
    if (!userId) return;
    this.loadingProperties = true;
    this.propertiesLoadError = false;
    this.realestateService.getAllProjectsPaginated(userId, 0, 100)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.properties = (res.content || []).map((p: any) => ({ id: p.id, title: p.title || p.name || `Chantier #${p.id}` }));
          this.loadingProperties = false;
        },
        error: (err) => {
          console.error('[Plan3D] Erreur chargement chantiers:', err);
          this.loadingProperties = false;
          this.propertiesLoadError = true;
        }
      });
  }

  retryLoadProperties(): void {
    this.loadProperties();
  }

  loadPlans(page = 0): void {
    const userId = this.userId;
    if (!userId) return;
    this.loading = true;
    this.plan3dService.getByUser(userId, page, this.pageSize)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.plans = res.content || [];
          this.totalElements = res.totalElements;
          this.totalPages = res.totalPages;
          this.currentPage = res.number;
          this.loading = false;
        },
        error: () => { this.plans = []; this.loading = false; }
      });
  }

  // ── Modal upload ──

  openUploadModal(): void {
    this.selectedPropertyId = null;
    this.selectedFile = null;
    this.selectedFileName = '';
    this.uploadError = null;
    this.showUploadModal = true;
    if (this.properties.length === 0 && !this.loadingProperties) {
      this.loadProperties();
    }
  }

  closeUploadModal(): void {
    this.showUploadModal = false;
  }

  // ── Modal visionneur 3D ──

  openViewer(plan: Plan3dItem): void {
    this.viewerUrl = plan.fileLink;
    this.viewerName = plan.propertyName;
    this.showViewerModal = true;
  }

  closeViewer(): void {
    this.showViewerModal = false;
    this.viewerUrl = null;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.setFile(input.files[0]);
    }
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver = false;
    const file = event.dataTransfer?.files[0];
    if (file) this.setFile(file);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragOver = true;
  }

  onDragLeave(): void {
    this.dragOver = false;
  }

  private setFile(file: File): void {
    if (!file.name.toLowerCase().endsWith('.glb')) {
      this.toast.showError('Seuls les fichiers au format .glb sont acceptés');
      return;
    }
    this.selectedFile = file;
    this.selectedFileName = file.name;
  }

  clearFile(): void {
    this.selectedFile = null;
    this.selectedFileName = '';
  }

  get fileSizeLabel(): string {
    if (!this.selectedFile) return '';
    const bytes = this.selectedFile.size;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  }

  upload(): void {
    if (this.selectedPropertyId === null || this.selectedPropertyId === undefined) {
      this.uploadError = 'Veuillez sélectionner un chantier.';
      return;
    }
    if (!this.selectedFile) {
      this.uploadError = 'Veuillez sélectionner un fichier .glb.';
      return;
    }
    this.uploadError = null;
    this.uploading = true;
    this.plan3dService.upload(this.selectedPropertyId, this.selectedFile)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.uploading = false;
          this.toast.showSuccess('Plan 3D téléversé avec succès');
          this.closeUploadModal();
          this.loadPlans(0);
        },
        error: (err) => {
          this.uploading = false;
          const msg = err?.error?.message
            || err?.error?.error
            || err?.message
            || `Erreur ${err?.status || ''} lors du téléversement`;
          this.uploadError = msg;
          console.error('[Plan3D] Erreur upload:', err);
        }
      });
  }

  // ── Pagination ──

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i);
  }

  goToPage(page: number): void {
    if (page < 0 || page >= this.totalPages) return;
    this.loadPlans(page);
  }

  // ── Helpers ──

  isGlbFile(url: string): boolean {
    return url?.toLowerCase().endsWith('.glb') || url?.toLowerCase().endsWith('.gltf');
  }

  isImageFile(url: string): boolean {
    return /\.(png|jpg|jpeg|webp|svg|gif)(\?.*)?$/i.test(url || '');
  }

  getPropertyName(propertyId: number): string {
    return this.properties.find(p => p.id === propertyId)?.title || `Chantier #${propertyId}`;
  }

  downloadFile(url: string, filename?: string): void {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'plan3d.glb';
    a.target = '_blank';
    a.click();
  }
}
