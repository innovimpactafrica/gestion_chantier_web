import { Component, OnInit } from '@angular/core';
import { PropertyTypeService } from '../../../../core/services/property-type.service';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { PropertyType } from '../../../../models/property-type';
import { CommonModule } from '@angular/common';
@Component({
  selector: 'app-property-type',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule,FormsModule],
  templateUrl: './property-type.component.html',
  styleUrl: './property-type.component.css'
})
export class PropertyTypeComponent implements OnInit {

  propertyTypes: PropertyType[] = [];

 
  newPropertyType: PropertyType = {
    name:'',
    typeName: '', parent: true,
    id: 0
  }; // Initialisation avec un type par défaut
  typeForm: FormGroup;
nouvelleCategorie: any;
nouvelleType: any;

  constructor(
    private propertyTypeService: PropertyTypeService,
    // private subscription: Subscription = new Subscription()
    private fb: FormBuilder
  ) {
    this.typeForm = this.fb.group({
      typeName: ['', Validators.required],
      parent: [true] // ou false selon ton besoin par défaut
    });
  }    
  ngOnInit(): void {
    this.loadPropertyTypes();
  }


  fetchPropertyTypes(): void {
    this.propertyTypeService.getAll().subscribe((types) => {
      this.propertyTypes = types;
    });
  }

  onSubmit(): void {
    if (this.typeForm.valid) {
      this.propertyTypeService.create(this.typeForm.value).subscribe(() => {
        this.typeForm.reset();
        this.fetchPropertyTypes(); // rafraîchit la liste
      });
    }


  }

   
    loadPropertyTypes(): void {
      this.propertyTypeService.getAll().subscribe(data => this.propertyTypes = data);
    }
  
    addPropertyType(): void {
      if (!this.newPropertyType.typeName.trim()) return;
  
      this.propertyTypeService.create(this.newPropertyType).subscribe(() => {
        this.newPropertyType = { name : '',typeName: '' ,parent: true ,id:0}; // Réinitialise le formulaire
        this.loadPropertyTypes();
        console.log('Type de propriété ajouté avec succès:', this.newPropertyType);
      });
    }
  
    editPropertyType(type: PropertyType): void {
      const newLibelle = prompt('Modifier le libellé', type.typeName);
      if (newLibelle && newLibelle.trim() !== '') {
        const updated = { ...type, libelle: newLibelle.trim() };
        this.propertyTypeService.update(updated).subscribe(() => this.loadPropertyTypes());
      }
    }
  
    deletePropertyType(id: number): void {
      if (confirm('Voulez-vous vraiment supprimer ce type ?')) {
        this.propertyTypeService.delete(id).subscribe(() => this.loadPropertyTypes());
      }
    }
  }

  
  
  
  
  
  
  
  
  
  










 

  

 