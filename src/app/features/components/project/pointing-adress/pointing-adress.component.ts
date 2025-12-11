import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
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
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.getPropertyIdFromRoute();
  }

  private getPropertyIdFromRoute(): void {
    const idFromUrl = this.route.snapshot.paramMap.get('id');
    if (idFromUrl) {
      this.currentPropertyId = +idFromUrl;
      this.loadAddresses();
    } else {
      console.error("ID de propriété non trouvé dans l'URL.");
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
        error: (error) => {
          console.error('Erreur lors du chargement des adresses:', error);
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
      qrcode: ''
    };
    this.showCreateModal = true;
  }

  openEditModal(address: PointingAddressResponse) {
    this.selectedAddress = address;
    this.editAddress = {
      name: address.name,
      latitude: address.latitude,
      longitude: address.longitude,
      qrcode: ''
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
          console.error('Erreur lors de la création:', error);
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
          console.error('Erreur lors de la modification:', error);
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
          console.error('Erreur lors de la suppression:', error);
          this.isLoading = false;
        }
      });
  }
}