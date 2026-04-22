import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LayoutService {
  private sidebarOpenSubject = new BehaviorSubject<boolean>(false);
  sidebarOpen$: Observable<boolean> = this.sidebarOpenSubject.asObservable();

  toggleSidebar(): void {
    this.sidebarOpenSubject.next(!this.sidebarOpenSubject.value);
  }

  openSidebar(): void {
    this.sidebarOpenSubject.next(true);
  }

  closeSidebar(): void {
    this.sidebarOpenSubject.next(false);
  }
}
