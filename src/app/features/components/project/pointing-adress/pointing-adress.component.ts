import * as QRCode from 'qrcode';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { LanguageService } from '../../../../core/services/language.service';
import { ToastService } from '../../../../core/services/toast.service';
import {
  PointingAddressService,
  PointingAddressResponse,
  CreatePointingAddressRequest
} from '../../../../../services/pointing-adress.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  selector: 'app-pointing-adress',
  templateUrl: './pointing-adress.component.html',
  styleUrls: ['./pointing-adress.component.css']
})
export class PointingAddressComponent implements OnInit {
  addresses: PointingAddressResponse[] = [];
  filteredAddresses: PointingAddressResponse[] = [];
  searchTerm: string = '';
  isLoading = false;

  currentPropertyId!: number;
  qrCodeDataUrl: SafeUrl | null = null;
  qrCodeRawDataUrl: string | null = null;
  isGeneratingQr = false;

  // Modals state
  showCreateModal = false;
  showEditModal = false;
  showDeleteModal = false;
  showQrCodeModal = false;

  // Forms data
  selectedAddress: PointingAddressResponse | null = null;

  newAddress: CreatePointingAddressRequest = {
    name: '',
    latitude: 0,
    longitude: 0,
    qrcode: ''
  };

  editAddress: CreatePointingAddressRequest = {
    name: '',
    latitude: 0,
    longitude: 0,
    qrcode: ''
  };

  constructor(
    private pointingAddressService: PointingAddressService,
    private route: ActivatedRoute,
    public languageService: LanguageService,
    private toastService: ToastService,
    private sanitizer: DomSanitizer,
    @Inject(PLATFORM_ID) private platformId: object
  ) { }

  t(key: string): string {
    return this.languageService.translate(key);
  }

  ngOnInit() {
    this.getPropertyIdFromRoute();
  }

  private getPropertyIdFromRoute(): void {
    const idFromUrl = this.route.snapshot.paramMap.get('id');
    if (idFromUrl) {
      this.currentPropertyId = +idFromUrl;
      this.generateProjectQrCode();
      this.loadAddresses();
    }
  }

  private async generateProjectQrCode(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    this.isGeneratingQr = true;
    try {
      const qrValue = `${window.location.origin}/detailprojet/${this.currentPropertyId}`;
      const dataUrl = await QRCode.toDataURL(qrValue, {
        width: 256,
        margin: 2,
        color: { dark: '#000000', light: '#FFFFFF' },
        errorCorrectionLevel: 'M'
      });
      this.qrCodeRawDataUrl = dataUrl;
      this.qrCodeDataUrl = this.sanitizer.bypassSecurityTrustUrl(dataUrl);
    } catch {
      this.qrCodeDataUrl = null;
      this.qrCodeRawDataUrl = null;
    } finally {
      this.isGeneratingQr = false;
    }
  }

  loadAddresses() {
    this.isLoading = true;
    this.pointingAddressService.getAddressByPropertyId(this.currentPropertyId)
      .subscribe({
        next: (addresses) => {
          this.addresses = addresses;
          this.onSearch();
          this.isLoading = false;
        },
        error: (_error) => {
          this.isLoading = false;
        }
      });
  }

  onSearch() {
    if (!this.searchTerm.trim()) {
      this.filteredAddresses = [...this.addresses];
    } else {
      const search = this.searchTerm.toLowerCase();
      this.filteredAddresses = this.addresses.filter(addr =>
        addr.name.toLowerCase().includes(search) ||
        addr.latitude.toString().includes(search) ||
        addr.longitude.toString().includes(search)
      );
    }
  }

  showMobileOnlyNotice(): void {
    this.toastService.showInfo('Cette fonctionnalité est gérée sur l\'application mobile.');
  }

  openQrCodeModal(): void {
    this.showQrCodeModal = true;
  }

  closeQrCodeModal(): void {
    this.showQrCodeModal = false;
  }

  openCreateModal() {
    this.newAddress = {
      name: '',
      latitude: 0,
      longitude: 0,
      qrcode: this.qrCodeRawDataUrl || ''
    };
    this.showCreateModal = true;
  }

  openEditModal(address: PointingAddressResponse) {
    this.selectedAddress = address;
    this.editAddress = {
      name: address.name,
      latitude: address.latitude,
      longitude: address.longitude,
      qrcode: this.qrCodeRawDataUrl || ''
    };
    this.showEditModal = true;
  }

  closeAllModals() {
    this.showCreateModal = false;
    this.showEditModal = false;
    this.showDeleteModal = false;
    this.selectedAddress = null;
  }

  createAddress() {
    if (!this.newAddress.name || this.newAddress.latitude === 0 || this.newAddress.longitude === 0) {
      return;
    }

    this.isLoading = true;
    this.pointingAddressService.saveAddress(this.newAddress)
      .subscribe({
        next: () => {
          this.loadAddresses();
          this.closeAllModals();
        },
        error: (_error) => {
          this.isLoading = false;
        }
      });
  }

  updateAddress() {
    if (!this.selectedAddress || !this.editAddress.name ||
      this.editAddress.latitude === 0 || this.editAddress.longitude === 0) {
      return;
    }

    this.isLoading = true;
    this.pointingAddressService.updateAddress(this.selectedAddress.id, this.editAddress)
      .subscribe({
        next: () => {
          this.loadAddresses();
          this.closeAllModals();
        },
        error: (_error) => {
          this.isLoading = false;
        }
      });
  }

  deleteAddress(address: PointingAddressResponse) {
    this.selectedAddress = address;
    this.showDeleteModal = true;
  }

  confirmDelete() {
    if (!this.selectedAddress) {
      return;
    }

    this.isLoading = true;
    this.pointingAddressService.deleteAddress(this.selectedAddress.id)
      .subscribe({
        next: () => {
          this.loadAddresses();
          this.closeAllModals();
        },
        error: (_error) => {
          this.isLoading = false;
        }
      });
  }

  // Géolocalisation
  isLocating = false;

  getCurrentPosition(): void {
    if (!navigator.geolocation) {
      this.toastService.showWarning('La géolocalisation n\'est pas supportée par votre navigateur.');
      return;
    }

    this.isLocating = true;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };

        if (this.showCreateModal) {
          this.newAddress.latitude = coords.latitude;
          this.newAddress.longitude = coords.longitude;
        }

        if (this.showEditModal) {
          this.editAddress.latitude = coords.latitude;
          this.editAddress.longitude = coords.longitude;
        }

        this.reverseGeocode(coords.latitude, coords.longitude);

        this.isLocating = false;
      },
      (error) => {
        let msg = 'Impossible de récupérer votre position.';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            msg = 'Vous avez refusé l\'accès à la localisation.';
            break;
          case error.POSITION_UNAVAILABLE:
            msg = 'La position est indisponible.';
            break;
          case error.TIMEOUT:
            msg = 'La demande de localisation a expiré.';
            break;
        }
        this.toastService.showError(msg);
        this.isLocating = false;
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }

  private reverseGeocode(latitude: number, longitude: number): void {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`;

    fetch(url, { headers: { 'User-Agent': 'BTP-Connect-App' } })
      .then(response => response.json())
      .then(data => {
        if (data && data.display_name) {
          let placeName = '';

          if (data.address) {
            placeName = data.address.suburb ||
              data.address.neighbourhood ||
              data.address.city ||
              data.address.town ||
              data.address.village ||
              data.address.municipality ||
              data.display_name.split(',')[0];
          } else {
            placeName = data.display_name.split(',')[0];
          }

          if (this.showCreateModal && !this.newAddress.name) {
            this.newAddress.name = placeName;
          }

          if (this.showEditModal && !this.editAddress.name) {
            this.editAddress.name = placeName;
          }
        }
      })
      .catch(() => {});
  }
}
