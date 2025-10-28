import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { UtilisateurService, Worker, WorkersResponse, CreateWorkerRequest } from '../../../services/utilisateur.service';
import { AuthService } from './../../features/auth/services/auth.service';

interface TeamMember {
  id: number;
  name: string;
  role: string;
  phone: string;
  address: string;
  email: string;
  avatar: string;
  daysPresent?: number;
  hoursWorked?: number;
  tasksCompleted?: number;
  performance?: number;
  taskDistribution?: { [key: string]: number };
  presenceHistory?: { date: string; entry: string; exit: string }[];
}

@Component({
  selector: 'app-team-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './team-list.component.html',
  styleUrls: ['./team-list.component.css']
})
export class TeamListComponent implements OnInit {
  teamMembers: TeamMember[] = [];
  currentPage = 1;
  totalPages = 1;
  totalElements = 0;
  pageSize = 5;
  isLoading = false;
  error: string | null = null;

  // Variables pour le popup d'ajout
  showAddMemberModal = false;
  newMember: any = {
    nom: '',
    prenom: '',
    email: '',
    password: '',
    telephone: '',
    date: '',
    lieunaissance: '',
    adress: '',
    profil: 'WORKER',
  };
  isSubmitting = false;
  submitError: string | null = null;
  submitSuccess: string | null = null;

  // Variables pour le modal de vue
  showViewModal = false;
  selectedMember: TeamMember | null = null;

  constructor(
    private utilisateurService: UtilisateurService,
    private authService: AuthService
  ) {}

 

  loadTeamMembers(): void {
    this.isLoading = true;
    this.error = null;
    const apiPage = this.currentPage - 1;

    this.utilisateurService.listUsers(apiPage, this.pageSize).subscribe({
      next: (response: WorkersResponse) => {
        this.teamMembers = this.mapWorkersToTeamMembers(response.content);
        this.totalPages = response.totalPages;
        this.totalElements = response.totalElements;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des utilisateurs:', error);
        this.error = 'Erreur lors du chargement des membres de l\'équipe';
        this.isLoading = false;
      }
    });
  }

  private mapWorkersToTeamMembers(workers: Worker[]): TeamMember[] {
    return workers.map(worker => ({
      id: worker.id,
      name: `${worker.prenom} ${worker.nom}`,
      role: this.mapRole(worker.profil),
      phone: worker.telephone,
      address: worker.adress,
      email: worker.email,
      avatar: worker.photo || this.getDefaultAvatar(),
      daysPresent: Math.floor(Math.random() * 20) + 10, // Simulé
      hoursWorked: Math.floor(Math.random() * 150) + 50, // Simulé
      tasksCompleted: Math.floor(Math.random() * 30) + 20, // Simulé
      performance: Math.floor(Math.random() * 20) + 80, // Simulé
      taskDistribution: {
        'À Faire': 15.8,
        'En Cours': 28.9,
        'Terminées': 50,
        'En Retard': 5.3
      },
      presenceHistory: this.generatePresenceHistory() // Simulé
    }));
  }

  private mapRole(profil: string): string {
    const roleMap: { [key: string]: string } = {
      'WORKER': 'Ouvrier',
      'CHEF_CHANTIER': 'Chef de chantier',
      'MAITRE_OEUVRE': 'Maître d\'œuvre',
      'MAITRE_OUVRAGE': 'Maître d\'ouvrage',
      'ARCHITECTE': 'Architecte',
      'INGENIEUR': 'Ingénieur'
    };
    return roleMap[profil] || profil;
  }

  private getDefaultAvatar(): string {
    const defaultAvatars = [
      'assets/images/av1.svg',
      'assets/images/av2.svg',
      'assets/images/av3.png',
      'assets/images/av6.png',
      'assets/images/av9.svg'
    ];
    return defaultAvatars[Math.floor(Math.random() * defaultAvatars.length)];
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.loadTeamMembers();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadTeamMembers();
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadTeamMembers();
    }
  }

  hasNextPage(): boolean {
    return this.currentPage < this.totalPages;
  }

  hasPreviousPage(): boolean {
    return this.currentPage > 1;
  }

  getPaginationText(): string {
    const start = (this.currentPage - 1) * this.pageSize + 1;
    const end = Math.min(this.currentPage * this.pageSize, this.totalElements);
    return `Voir ${start}-${end} sur ${this.totalElements}`;
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxPagesToShow = 5;
    if (this.totalPages <= maxPagesToShow) {
      for (let i = 1; i <= this.totalPages; i++) pages.push(i);
    } else {
      const halfRange = Math.floor(maxPagesToShow / 2);
      let startPage = Math.max(1, this.currentPage - halfRange);
      let endPage = Math.min(this.totalPages, this.currentPage + halfRange);
      if (endPage - startPage < maxPagesToShow - 1) {
        if (startPage === 1) endPage = Math.min(this.totalPages, startPage + maxPagesToShow - 1);
        else startPage = Math.max(1, endPage - maxPagesToShow + 1);
      }
      for (let i = startPage; i <= endPage; i++) pages.push(i);
    }
    return pages;
  }

  refresh(): void {
    this.currentPage = 1;
    this.loadTeamMembers();
  }

  openAddMemberModal(): void {
    this.showAddMemberModal = true;
    this.resetNewMemberForm();
  }

  closeAddMemberModal(): void {
    this.showAddMemberModal = false;
    this.resetNewMemberForm();
  }

  private resetNewMemberForm(): void {
    this.newMember = {
      nom: '',
      prenom: '',
      email: '',
      password: '',
      telephone: '',
      date: '',
      lieunaissance: '',
      adress: '',
      profil: 'WORKER',
    };
    this.submitError = null;
    this.submitSuccess = null;
  }

  private validateForm(): boolean {
    if (!this.newMember.nom.trim()) {
      this.submitError = 'Le nom est requis';
      return false;
    }
    if (!this.newMember.prenom.trim()) {
      this.submitError = 'Le prénom est requis';
      return false;
    }
    if (!this.newMember.email.trim()) {
      this.submitError = 'L\'email est requis';
      return false;
    }
    if (!this.isValidEmail(this.newMember.email)) {
      this.submitError = 'L\'email n\'est pas valide';
      return false;
    }
    if (!this.newMember.password) {
      this.submitError = 'Le mot de passe est requis';
      return false;
    }
    if (this.newMember.password.length < 6) {
      this.submitError = 'Le mot de passe doit contenir au moins 6 caractères';
      return false;
    }
    if (!this.newMember.telephone.trim()) {
      this.submitError = 'Le téléphone est requis';
      return false;
    }
    if (!this.newMember.date) {
      this.submitError = 'La date de naissance est requise';
      return false;
    }
    if (!this.newMember.lieunaissance.trim()) {
      this.submitError = 'Le lieu de naissance est requis';
      return false;
    }
    if (!this.newMember.adress.trim()) {
      this.submitError = 'L\'adresse est requise';
      return false;
    }
    return true;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private formatDateForAPI(dateString: string): string {
    if (!dateString) return '';
    if (dateString.match(/^\d{2}-\d{2}-\d{4}$/)) return dateString;
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateString.split('-');
      return `${day}-${month}-${year}`;
    }
    return dateString;
  }
  calculateDuration(entry: string, exit: string): string {
  const [entryH, entryM] = entry.split(':').map(Number);
  const [exitH, exitM] = exit.split(':').map(Number);
  
  let hours = exitH - entryH;
  let minutes = exitM - entryM;
  
  if (minutes < 0) {
    hours--;
    minutes += 60;
  }
  
  return `${hours}h ${minutes}min`;
}
// Ajoutez ces propriétés après les autres
showDatePicker = false;
selectedDate: Date | null = null;
currentDate = new Date();
calendarDays: Array<{day: number, isCurrentMonth: boolean, isToday: boolean, isSelected: boolean, date: Date}> = [];
currentMonthYear = '';

// Ajoutez ces méthodes

ngOnInit(): void {
  this.loadTeamMembers();
  this.generateCalendar();
}

toggleDatePicker(): void {
  this.showDatePicker = !this.showDatePicker;
  if (this.showDatePicker) {
    this.generateCalendar();
  }
}

generateCalendar(): void {
  const year = this.currentDate.getFullYear();
  const month = this.currentDate.getMonth();
  
  // Format: "Oct 2025"
  const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
  this.currentMonthYear = `${monthNames[month]} ${year}`;
  
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startingDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // Lundi = 0
  
  const daysInMonth = lastDay.getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  
  this.calendarDays = [];
  
  // Jours du mois précédent
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    this.calendarDays.push({
      day,
      isCurrentMonth: false,
      isToday: false,
      isSelected: false,
      date: new Date(year, month - 1, day)
    });
  }
  
  // Jours du mois actuel
  const today = new Date();
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const isToday = date.toDateString() === today.toDateString();
    const isSelected = this.selectedDate ? date.toDateString() === this.selectedDate.toDateString() : false;
    
    this.calendarDays.push({
      day,
      isCurrentMonth: true,
      isToday,
      isSelected,
      date
    });
  }
  
  // Jours du mois suivant pour compléter la grille
  const remainingDays = 35 - this.calendarDays.length; // 5 semaines = 35 jours
  for (let day = 1; day <= remainingDays; day++) {
    this.calendarDays.push({
      day,
      isCurrentMonth: false,
      isToday: false,
      isSelected: false,
      date: new Date(year, month + 1, day)
    });
  }
}

previousMonth(): void {
  this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() - 1, 1);
  this.generateCalendar();
}

nextMonth(): void {
  this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 1);
  this.generateCalendar();
}

selectDate(day: any): void {
  if (!day.isCurrentMonth) return;
  
  this.selectedDate = day.date;
  this.generateCalendar();
  
  // Filtrer l'historique selon la date sélectionnée
  console.log('Date sélectionnée:', this.selectedDate);
  
  // Fermer le date picker après sélection
  setTimeout(() => {
    this.showDatePicker = false;
  }, 200);
}

getDayClasses(day: any): string {
  const classes = [];
  
  if (!day.isCurrentMonth) {
    classes.push('text-gray-300 cursor-not-allowed');
  } else if (day.isToday) {
    classes.push('bg-orange-500 text-white hover:bg-orange-600');
  } else if (day.isSelected) {
    classes.push('bg-orange-100 text-orange-600 hover:bg-orange-200');
  } else {
    classes.push('text-gray-700 hover:bg-gray-100');
  }
  
  return classes.join(' ');
}

  submitAddMember(): void {
    if (!this.validateForm()) return;

    this.isSubmitting = true;
    this.submitError = null;
    this.submitSuccess = null;

    const userData = {
      nom: this.newMember.nom.trim(),
      prenom: this.newMember.prenom.trim(),
      email: this.newMember.email.trim(),
      password: this.newMember.password,
      telephone: this.newMember.telephone.trim(),
      date: this.formatDateForAPI(this.newMember.date),
      lieunaissance: this.newMember.lieunaissance.trim(),
      adress: this.newMember.adress.trim(),
      profil: this.newMember.profil
    };

    this.utilisateurService.createUser(userData).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        this.submitSuccess = 'Membre ajouté avec succès!';
        setTimeout(() => {
          this.closeAddMemberModal();
          this.loadTeamMembers();
        }, 1500);
      },
      error: (error) => {
        this.isSubmitting = false;
        console.error('Erreur lors de la création du membre:', error);
        if (error.status === 400) this.submitError = 'Données invalides. Vérifiez les informations saisies.';
        else if (error.status === 409) this.submitError = 'Un utilisateur avec cet email existe déjà.';
        else this.submitError = 'Erreur lors de l\'ajout du membre. Veuillez réessayer.';
      }
    });
  }

  onBackdropClick(event: Event): void {
    if (event.target === event.currentTarget) this.closeAddMemberModal();
  }

  viewMember(member: TeamMember): void {
    this.selectedMember = { ...member }; // Cloner pour éviter les modifications directes
    this.showViewModal = true;
    document.body.style.overflow = 'hidden';
  }

  closeViewModal(): void {
    this.showViewModal = false;
    this.selectedMember = null;
    document.body.style.overflow = 'auto';
  }

  onViewBackdropClick(event: Event): void {
    if (event.target === event.currentTarget) this.closeViewModal();
  }

  private generatePresenceHistory(): { date: string; entry: string; exit: string }[] {
    const dates = ['Mer. 16 juil. 2025', 'Mar. 15 juil. 2025', 'Lun. 14 juil. 2025'];
    return dates.map(date => ({
      date,
      entry: ['07:55', '08:10', '18:10'][Math.floor(Math.random() * 3)],
      exit: ['17:25', '17:10', '20:10'][Math.floor(Math.random() * 3)]
    }));
  }
}