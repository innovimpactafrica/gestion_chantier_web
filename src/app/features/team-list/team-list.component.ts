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
  telephone: string;
  present: boolean;
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
  newMember: CreateWorkerRequest = {
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

  // Date picker
  showDatePicker = false;
  selectedDate: Date | null = null;
  currentDate = new Date();
  calendarDays: Array<{day: number, isCurrentMonth: boolean, isToday: boolean, isSelected: boolean, date: Date}> = [];
  currentMonthYear = '';

  currentMonth: number = new Date().getMonth();
  currentYear: number = new Date().getFullYear();

  constructor(
    private utilisateurService: UtilisateurService,
    private authService: AuthService,
    private detailsWorkerService: DetailsWorkerService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.generateCalendar();
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
        console.log('Workers chargés:', response.content);
      },
      error: (error) => {
        console.error('Erreur lors du chargement des workers:', error);
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
      telephone: worker.telephone,
      present: worker.present,
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

  // Méthode pour convertir boolean en Oui/Non
  getPresentText(present: boolean): string {
    return present ? 'Oui' : 'Non';
  }

  // Méthode pour obtenir la classe CSS selon le statut de présence
  getPresentClass(present: boolean): string {
    return present 
      ? 'inline-block px-3 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full'
      : 'inline-block px-3 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full';
  }

  viewMember(member: TeamMember): void {
    this.selectedMember = { ...member };
    this.showViewModal = true;
    this.isLoadingDetails = true;
    this.detailsError = null;
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

  getTaskDistributionTotal(): number {
    if (!this.selectedMember?.taskDistribution) return 0;
    return Object.values(this.selectedMember.taskDistribution).reduce((sum, val) => sum + val, 0);
  }

  calculateStrokeDasharray(percentage: number): string {
    const circumference = 440;
    const value = (percentage / 100) * circumference;
    return `${value} ${circumference}`;
  }

  calculateStrokeDashoffset(startPercentage: number): number {
    const circumference = 440;
    return -(startPercentage / 100) * circumference;
  }

  getTaskOffsets(): { [key: string]: number } {
    if (!this.selectedMember?.taskDistribution) return {};
    
    const offsets: { [key: string]: number } = {
      'Terminées': 0,
      'En Cours': 0,
      'À Faire': 0,
      'En Retard': 0
    };

    offsets['Terminées'] = 0;
    offsets['En Cours'] = -(this.selectedMember.taskDistribution['Terminées'] || 0);
    offsets['À Faire'] = -(
      (this.selectedMember.taskDistribution['Terminées'] || 0) +
      (this.selectedMember.taskDistribution['En Cours'] || 0)
    );
    offsets['En Retard'] = -(
      (this.selectedMember.taskDistribution['Terminées'] || 0) +
      (this.selectedMember.taskDistribution['En Cours'] || 0) +
      (this.selectedMember.taskDistribution['À Faire'] || 0)
    );

    return offsets;
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
    document.body.style.overflow = 'auto';
  }

  onViewBackdropClick(event: Event): void {
    if (event.target === event.currentTarget) this.closeViewModal();
  }

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

 
/**
 * Transforme l'historique de présence depuis l'API
 */
private transformPresenceHistory(presenceData: PresenceHistory): Array<{
  date: string;
  sessions: Array<{ entry: string; exit: string }>;
  totalTime: string;
}> {
  console.log('📊 Transformation de l\'historique de présence:', presenceData);
  
  if (!presenceData.logs || presenceData.logs.length === 0) {
    console.log('⚠️ Aucun log de présence trouvé');
    return [];
  }

  const groupedByDate = new Map<string, Array<{ entry: string; exit: string }>>();

  presenceData.logs.forEach(log => {
    console.log('🔍 Processing log:', log);
    
    const dateStr = this.formatDateFromArray(log.checkInTime);
    const entryTime = this.formatTimeFromArray(log.checkInTime);
    const exitTime =this.formatTimeFromArray(log.checkOutTime);
    
    console.log(`📅 Date: ${dateStr}, Entrée: ${entryTime}, Sortie: ${exitTime}`);

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
    // Calculer le temps total uniquement pour les sessions complètes (avec sortie)
    const totalMinutes = sessions.reduce((total, session) => {
      if (session.exit === 'En cours') return total;
      return total + this.calculateMinutesBetween(session.entry, session.exit);
    }, 0);

    result.push({
      date,
      sessions,
      totalTime: this.formatDuration(totalMinutes)
    });
  });

  // Trier par date décroissante (plus récent d'abord)
  result.sort((a, b) => {
    const dateA = this.parseDateString(a.date);
    const dateB = this.parseDateString(b.date);
    return dateB.getTime() - dateA.getTime();
  });

  console.log('✅ Historique transformé:', result);
  return result;
}

/**
 * Formate une date depuis un tableau de nombres [année, mois, jour, heure?, minute?]
 * Exemple: [2024, 12, 8] → "Dim. 8 déc. 2024"
 */
private formatDateFromArray(timeArray: number[]): string {
  if (!timeArray || timeArray.length < 3) {
    console.error('❌ Tableau de date invalide:', timeArray);
    return 'Date invalide';
  }
  
  const date = new Date(timeArray[0], timeArray[1] - 1, timeArray[2]);
  const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  const months = ['janv', 'févr', 'mars', 'avr', 'mai', 'juin', 
                  'juil', 'août', 'sept', 'oct', 'nov', 'déc'];
  
  const formattedDate = `${days[date.getDay()]}. ${date.getDate()} ${months[date.getMonth()]}. ${date.getFullYear()}`;
  console.log(`📅 Date formatée: ${formattedDate} depuis`, timeArray);
  
  return formattedDate;
}

/**
 * Formate une heure depuis un tableau de nombres [heure, minute, seconde, nanosecondes]
 * Exemple: [10, 38, 3, 935000000] → "10:38"
 */
private formatTimeFromArray(timeArray: number[]): string {
  console.log('🕐 Formatage de l\'heure depuis:', timeArray);
  
  if (!timeArray || timeArray.length < 2) {
    console.error('❌ Tableau d\'heure invalide ou incomplet:', timeArray);
    return '--:--';
  }
  
  // timeArray = [heure, minute, seconde, nanosecondes]
  const hours = timeArray[0].toString().padStart(2, '0');
  const minutes = timeArray[1].toString().padStart(2, '0');
  const formattedTime = `${hours}:${minutes}`;
  
  console.log(`🕐 Heure formatée: ${formattedTime}`);
  return formattedTime;
}

/**
 * Calcule la différence en minutes entre deux heures au format HH:mm
 */
private calculateMinutesBetween(entry: string, exit: string): number {
  console.log(`⏱️ Calcul durée entre ${entry} et ${exit}`);
  
  // Si l'heure de sortie est "En cours" ou invalide, retourner 0
  if (exit === 'En cours' || exit === '--:--' || !exit.includes(':')) {
    console.log('⚠️ Sortie en cours ou invalide, durée = 0');
    return 0;
  }
  
  const [entryH, entryM] = entry.split(':').map(Number);
  const [exitH, exitM] = exit.split(':').map(Number);
  
  // Vérifier que les valeurs sont valides
  if (isNaN(entryH) || isNaN(entryM) || isNaN(exitH) || isNaN(exitM)) {
    console.error('❌ Heures invalides:', { entry, exit });
    return 0;
  }
  
  const entryMinutes = entryH * 60 + entryM;
  const exitMinutes = exitH * 60 + exitM;
  
  const duration = exitMinutes - entryMinutes;
  console.log(`✅ Durée calculée: ${duration} minutes`);
  
  return duration > 0 ? duration : 0;
}

/**
 * Formate une durée en minutes vers le format "Xh XXmin"
 */
private formatDuration(minutes: number): string {
  if (minutes <= 0) {
    return '0h 00min';
  }
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins.toString().padStart(2, '0')}min`;
}

/**
 * Obtient le temps total travaillé (filtré ou complet)
 */
getTotalWorkedTime(): string {
  console.log('📊 Calcul du temps total travaillé');
  
  // Si le selectedMember a déjà le totalWorkedTime de l'API, l'utiliser
  if (this.selectedMember?.totalWorkedTime && !this.selectedDate) {
    console.log('✅ Utilisation du temps total depuis l\'API:', this.selectedMember.totalWorkedTime);
    return this.selectedMember.totalWorkedTime;
  }
  
  // Sinon, calculer depuis l'historique filtré
  if (!this.selectedMember?.presenceHistory) {
    console.log('⚠️ Pas d\'historique de présence');
    return '0h 00min';
  }
  
  const history = this.getFilteredPresenceHistory();
  const totalMinutes = history.reduce((total, day) => {
    return total + day.sessions.reduce((dayTotal, session) => {
      // Ne compter que les sessions terminées
      if (session.exit === 'En cours' || session.exit === '--:--') {
        return dayTotal;
      }
      return dayTotal + this.calculateMinutesBetween(session.entry, session.exit);
    }, 0);
  }, 0);
  
  const result = this.formatDuration(totalMinutes);
  console.log(`✅ Temps total calculé: ${result}`);
  return result;
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
    
    const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
    this.currentMonthYear = `${monthNames[month]} ${year}`;
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startingDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    
    const daysInMonth = lastDay.getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    
    this.calendarDays = [];
    
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
    
    const remainingDays = 35 - this.calendarDays.length;
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

    if (this.currentPropertyId === null) {
      this.submitError = 'ID de propriété non disponible';
      return;
    }
  
    this.isSubmitting = true;
    this.submitError = null;
    this.submitSuccess = null;
  
    const userData: CreateWorkerRequest = {
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
  
    console.log('📤 Création du worker pour propertyId:', this.currentPropertyId);
    console.log('📤 Données du worker:', userData);
  
    this.utilisateurService.createWorker(userData, this.currentPropertyId).subscribe({
      next: (response) => {
        console.log('✅ Worker créé avec succès:', response);
        this.isSubmitting = false;
        this.submitSuccess = 'Membre ajouté avec succès!';
        
        setTimeout(() => {
          this.closeAddMemberModal();
          this.currentPage = 1;
          this.loadTeamMembers();
        }, 1500);
      },
      error: (error) => {
        this.isSubmitting = false;
        console.error('❌ Erreur lors de la création du worker:', error);
        
        if (error.status === 400) {
          this.submitError = 'Données invalides. Vérifiez les informations saisies.';
        } else if (error.status === 409) {
          this.submitError = 'Un utilisateur avec cet email existe déjà.';
        } else if (error.status === 401) {
          this.submitError = 'Session expirée. Veuillez vous reconnecter.';
        } else if (error.status === 403) {
          this.submitError = 'Vous n\'avez pas les permissions nécessaires.';
        } else {
          this.submitError = error.error?.message || 'Erreur lors de l\'ajout du membre. Veuillez réessayer.';
        }
      }
    });
  }

  onBackdropClick(event: Event): void {
    if (event.target === event.currentTarget) this.closeAddMemberModal();
  }
}