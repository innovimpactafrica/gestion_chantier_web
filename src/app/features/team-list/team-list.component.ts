import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { UtilisateurService, Worker, WorkersResponse, CreateWorkerRequest } from '../../../services/utilisateur.service';
import { AuthService } from './../../features/auth/services/auth.service';
import { DetailsWorkerService, PerformanceAndTask, PresenceHistory, InfoDashboard, StatusDistribution } from '../../../services/details-worker.service';
import { forkJoin, of } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { catchError } from 'rxjs/operators';

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
  presenceHistory?: Array<{
    date: string;
    sessions: Array<{
      entry: string;
      exit: string;
    }>;
    totalTime: string;
  }>;
  totalWorkedTime?: string;
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

  currentPropertyId: number | null = null;

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
  isLoadingDetails = false;
  detailsError: string | null = null;

  // Date picker - Variables mises à jour
  showDatePicker = false;
  selectedDate: Date | null = null;
  currentDate = new Date();
  currentMonth: number = new Date().getMonth();
  currentYear: number = new Date().getFullYear();

  constructor(
    private utilisateurService: UtilisateurService,
    private authService: AuthService,
    private detailsWorkerService: DetailsWorkerService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.getPropertyIdAndLoadData();
  }

  private getPropertyIdAndLoadData(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.currentPropertyId = +id;
      this.loadTeamMembers();
    } else {
      console.error("ID de propriété non trouvé dans l'URL.");
      this.error = "ID de propriété non trouvé dans l'URL.";
    }
  }

  loadTeamMembers(): void {
    if (this.currentPropertyId === null) {
      this.error = 'ID de propriété non disponible';
      return;
    }

    this.isLoading = true;
    this.error = null;
    const apiPage = this.currentPage - 1;

    this.utilisateurService.getWorkers(apiPage, this.pageSize, this.currentPropertyId).subscribe({
      next: (response: WorkersResponse) => {
        this.teamMembers = this.mapWorkersToTeamMembers(response.content);
        this.totalPages = response.totalPages;
        this.totalElements = response.totalElements;
        this.isLoading = false;
        console.log(response.content);
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

  viewMember(member: TeamMember): void {
    this.selectedMember = { ...member };
    this.showViewModal = true;
    this.isLoadingDetails = true;
    this.detailsError = null;
    this.selectedDate = null; // Réinitialiser la date sélectionnée
    document.body.style.overflow = 'hidden';

    const performance$ = this.detailsWorkerService.getPerformanceAndTask(member.id).pipe(
      catchError(error => {
        console.warn('Erreur lors du chargement des performances:', error);
        return of({
          totalTasks: 0,
          completedTasks: 0,
          performancePercentage: 0
        });
      })
    );

    const presence$ = this.detailsWorkerService.getPresenceHistory(member.id).pipe(
      catchError(error => {
        console.warn('Erreur lors du chargement de l\'historique de présence:', error);
        return of({
          logs: [],
          totalWorkedTime: '0h 00min'
        });
      })
    );

    const dashboard$ = this.detailsWorkerService.getInfoDashboard(member.id).pipe(
      catchError(error => {
        console.warn('Erreur lors du chargement du dashboard:', error);
        return of({
          daysPresent: 0,
          totalWorkedHours: 0
        });
      })
    );

    const repartitions$ = this.detailsWorkerService.getRepartitions(member.id).pipe(
      catchError(error => {
        console.warn('Erreur lors du chargement de la répartition des tâches:', error);
        return of([] as StatusDistribution[]);
      })
    );

    forkJoin({
      performance: performance$,
      presence: presence$,
      dashboard: dashboard$,
      repartitions: repartitions$
    }).subscribe({
      next: (results) => {
        if (this.selectedMember) {
          this.selectedMember.tasksCompleted = results.performance.completedTasks;
          this.selectedMember.performance = Math.round(results.performance.performancePercentage);
          this.selectedMember.daysPresent = results.dashboard.daysPresent;
          this.selectedMember.hoursWorked = Math.round(results.dashboard.totalWorkedHours);
          this.selectedMember.presenceHistory = this.transformPresenceHistory(results.presence);
          this.selectedMember.totalWorkedTime = results.presence.totalWorkedTime;
          this.selectedMember.taskDistribution = this.transformTaskDistribution(results.repartitions);
        }
        this.isLoadingDetails = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des détails:', error);
        this.detailsError = 'Erreur lors du chargement des détails du membre';
        this.isLoadingDetails = false;
      }
    });
  }

  private transformTaskDistribution(distributions: StatusDistribution[]): { [key: string]: number } {
    const taskDistribution: { [key: string]: number } = {
      'À Faire': 0,
      'En Cours': 0,
      'Terminées': 0,
      'En Retard': 0
    };

    if (!distributions || distributions.length === 0) {
      return taskDistribution;
    }

    const statusMap: { [key: string]: string } = {
      'TODO': 'À Faire',
      'A_FAIRE': 'À Faire',
      'IN_PROGRESS': 'En Cours',
      'EN_COURS': 'En Cours',
      'DONE': 'Terminées',
      'TERMINE': 'Terminées',
      'TERMINEE': 'Terminées',
      'LATE': 'En Retard',
      'EN_RETARD': 'En Retard',
      'RETARD': 'En Retard'
    };

    distributions.forEach(dist => {
      const mappedStatus = statusMap[dist.status.toUpperCase()];
      if (mappedStatus) {
        taskDistribution[mappedStatus] = Math.round(dist.percentage * 10) / 10;
      }
    });

    return taskDistribution;
  }

  private transformPresenceHistory(presenceData: PresenceHistory): Array<{
    date: string;
    sessions: Array<{ entry: string; exit: string }>;
    totalTime: string;
  }> {
    if (!presenceData.logs || presenceData.logs.length === 0) {
      return [];
    }

    const groupedByDate = new Map<string, Array<{ entry: string; exit: string }>>();

    presenceData.logs.forEach(log => {
      const dateStr = this.formatDateFromArray(log.checkInTime);
      const entryTime = this.formatTimeFromArray(log.checkInTime);
      const exitTime = this.formatTimeFromArray(log.checkOutTime);

      if (!groupedByDate.has(dateStr)) {
        groupedByDate.set(dateStr, []);
      }

      groupedByDate.get(dateStr)!.push({
        entry: entryTime,
        exit: exitTime
      });
    });

    const result: Array<{
      date: string;
      sessions: Array<{ entry: string; exit: string }>;
      totalTime: string;
    }> = [];

    groupedByDate.forEach((sessions, date) => {
      const totalMinutes = sessions.reduce((total, session) => {
        return total + this.calculateMinutesBetween(session.entry, session.exit);
      }, 0);

      result.push({
        date,
        sessions,
        totalTime: this.formatDuration(totalMinutes)
      });
    });

    result.sort((a, b) => {
      const dateA = this.parseDateString(a.date);
      const dateB = this.parseDateString(b.date);
      return dateB.getTime() - dateA.getTime();
    });

    return result;
  }

  private formatDateFromArray(timeArray: number[]): string {
    if (!timeArray || timeArray.length < 3) return '';
    
    const date = new Date(timeArray[0], timeArray[1] - 1, timeArray[2]);
    const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    const months = ['janv', 'févr', 'mars', 'avr', 'mai', 'juin', 
                    'juil', 'août', 'sept', 'oct', 'nov', 'déc'];
    
    return `${days[date.getDay()]}. ${date.getDate()} ${months[date.getMonth()]}. ${date.getFullYear()}`;
  }

  private formatTimeFromArray(timeArray: number[]): string {
    if (!timeArray || timeArray.length < 5) return '00:00';
    const hours = timeArray[3].toString().padStart(2, '0');
    const minutes = timeArray[4].toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  private calculateMinutesBetween(entry: string, exit: string): number {
    const [entryH, entryM] = entry.split(':').map(Number);
    const [exitH, exitM] = exit.split(':').map(Number);
    
    const entryMinutes = entryH * 60 + entryM;
    const exitMinutes = exitH * 60 + exitM;
    
    return exitMinutes - entryMinutes;
  }

  private formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins.toString().padStart(2, '0')}min`;
  }

  private parseDateString(dateStr: string): Date {
    const parts = dateStr.split(' ');
    const day = parseInt(parts[1]);
    const monthStr = parts[2].replace('.', '');
    const year = parseInt(parts[3]);
    
    const months: {[key: string]: number} = {
      'janv': 0, 'févr': 1, 'mars': 2, 'avr': 3, 'mai': 4, 'juin': 5,
      'juil': 6, 'août': 7, 'sept': 8, 'oct': 9, 'nov': 10, 'déc': 11
    };
    
    return new Date(year, months[monthStr] || 0, day);
  }

  closeViewModal(): void {
    this.showViewModal = false;
    this.selectedMember = null;
    this.detailsError = null;
    this.selectedDate = null;
    this.showDatePicker = false;
    document.body.style.overflow = 'auto';
  }

  onViewBackdropClick(event: Event): void {
    if (event.target === event.currentTarget) this.closeViewModal();
  }

  // ==================== MÉTHODES DU CALENDRIER ====================
  
  get currentMonthYear(): string {
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 
                    'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
    return `${months[this.currentMonth]} ${this.currentYear}`;
  }

  toggleDatePicker(): void {
    this.showDatePicker = !this.showDatePicker;
  }

  previousMonth(): void {
    if (this.currentMonth === 0) {
      this.currentMonth = 11;
      this.currentYear--;
    } else {
      this.currentMonth--;
    }
  }

  nextMonth(): void {
    if (this.currentMonth === 11) {
      this.currentMonth = 0;
      this.currentYear++;
    } else {
      this.currentMonth++;
    }
  }

  getEmptyDays(): number[] {
    const firstDay = new Date(this.currentYear, this.currentMonth, 1).getDay();
    // Ajuster pour que lundi soit le premier jour (0)
    const adjusted = firstDay === 0 ? 6 : firstDay - 1;
    return Array(adjusted).fill(0);
  }

  getCalendarDays(): number[] {
    const daysInMonth = new Date(this.currentYear, this.currentMonth + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }

  getDayClasses(day: number): string {
    const date = new Date(this.currentYear, this.currentMonth, day);
    const today = new Date();
    
    const isSelected = this.selectedDate && 
                      this.selectedDate.getDate() === day &&
                      this.selectedDate.getMonth() === this.currentMonth &&
                      this.selectedDate.getFullYear() === this.currentYear;
    
    const isToday = today.getDate() === day &&
                   today.getMonth() === this.currentMonth &&
                   today.getFullYear() === this.currentYear;

    if (isSelected) {
      return 'bg-orange-500 text-white rounded-full font-semibold';
    }
    if (isToday) {
      return 'border-2 border-orange-500 rounded-full font-semibold text-orange-600';
    }
    return 'hover:bg-gray-100 rounded cursor-pointer';
  }

  selectDate(day: number): void {
    this.selectedDate = new Date(this.currentYear, this.currentMonth, day);
    this.showDatePicker = false;
  }

  // Filtrage de l'historique par date sélectionnée
  getFilteredPresenceHistory(): Array<{
    date: string;
    sessions: Array<{ entry: string; exit: string }>;
    totalTime: string;
  }> {
    if (!this.selectedMember?.presenceHistory) return [];
    
    // Si aucune date n'est sélectionnée, afficher tout l'historique
    if (!this.selectedDate) {
      return this.selectedMember.presenceHistory;
    }

    // Filtrer par la date sélectionnée
    const selectedDateStr = this.formatSelectedDate(this.selectedDate);
    return this.selectedMember.presenceHistory.filter(item => 
      item.date === selectedDateStr
    );
  }

  private formatSelectedDate(date: Date): string {
    const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    const months = ['janv', 'févr', 'mars', 'avr', 'mai', 'juin', 
                    'juil', 'août', 'sept', 'oct', 'nov', 'déc'];
    
    return `${days[date.getDay()]}. ${date.getDate()} ${months[date.getMonth()]}. ${date.getFullYear()}`;
  }

  // Calcul du temps total travaillé (filtré)
  getTotalWorkedTime(): string {
    if (!this.selectedMember?.presenceHistory) return '0h 00min';
    
    const history = this.getFilteredPresenceHistory();
    const totalMinutes = history.reduce((total, day) => {
      return total + day.sessions.reduce((dayTotal, session) => {
        return dayTotal + this.calculateMinutesBetween(session.entry, session.exit);
      }, 0);
    }, 0);
    
    return this.formatDuration(totalMinutes);
  }

  // ==================== MÉTHODES DE PAGINATION ====================
  
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

  // ==================== MÉTHODES POUR L'AJOUT DE MEMBRE ====================
  
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
}