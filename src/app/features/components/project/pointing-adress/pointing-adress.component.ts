import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { LanguageService } from '../../../../core/services/language.service';
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
  projectQrCode: string = ''; // QR code du projet

  // Modals state
  showCreateModal = false;
  showEditModal = false;
  showDeleteModal = false;

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
    public languageService: LanguageService
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
      this.loadProjectQrCode();
      this.loadAddresses();
    } else {
    }
  }

  /**
   * Récupère le QR code du projet
   */
  private loadProjectQrCode(): void {
    this.pointingAddressService.getProjectDetails(this.currentPropertyId)
      .subscribe({
        next: (response) => {
          this.projectQrCode = response.realEstateProperty.qrcode || '';
        },
        error: (error) => {
          this.projectQrCode = '';
        }
      });
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
        error: (error) => {
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

  openCreateModal() {
    this.newAddress = {
      name: '',
      latitude: 0,
      longitude: 0,
      qrcode: this.projectQrCode // Assigner automatiquement le QR code du projet
    };
    this.showCreateModal = true;
  }

  openEditModal(address: PointingAddressResponse) {
    this.selectedAddress = address;
    this.editAddress = {
      name: address.name,
      latitude: address.latitude,
      longitude: address.longitude,
      qrcode: this.projectQrCode // Assigner automatiquement le QR code du projet
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
        error: (error) => {
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
        error: (error) => {
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
        error: (error) => {
          this.isLoading = false;
        }
      });
  }

  // Géolocalisation
  isLocating = false;

  getCurrentPosition(): void {
    if (!navigator.geolocation) {
      alert('La géolocalisation n\'est pas supportée par votre navigateur.');
      return;
    }

    this.isLocating = true;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };

        // Mise à jour pour la création
        if (this.showCreateModal) {
          this.newAddress.latitude = coords.latitude;
          this.newAddress.longitude = coords.longitude;
        }

        // Mise à jour pour l'édition
        if (this.showEditModal) {
          this.editAddress.latitude = coords.latitude;
          this.editAddress.longitude = coords.longitude;
        }

        // Géolocalisation inversée pour obtenir le nom du lieu
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
        alert(msg);
        this.isLocating = false;
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }

  /**
   * Géolocalisation inversée pour obtenir le nom du lieu à partir des coordonnées
   */
  private reverseGeocode(latitude: number, longitude: number): void {
    // Utiliser l'API Nominatim d'OpenStreetMap (gratuite, pas de clé API requise)
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`;

    fetch(url, {
      headers: {
        'User-Agent': 'BTP-Connect-App'
      }
    })
      .then(response => response.json())
      .then(data => {
        if (data && data.display_name) {
          // Extraire un nom de lieu approprié
          let placeName = '';

          if (data.address) {
            // Priorité: quartier, ville, commune
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

          // Mise à jour du nom pour la création
          if (this.showCreateModal && !this.newAddress.name) {
            this.newAddress.name = placeName;
          }

          // Mise à jour du nom pour l'édition
          if (this.showEditModal && !this.editAddress.name) {
            this.editAddress.name = placeName;
          }

        }
      })
      .catch(error => {
        // Ne pas bloquer l'utilisateur si la géolocalisation inversée échoue
      });
  }
}
