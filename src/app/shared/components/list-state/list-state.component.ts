import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-list-state',
  standalone: true,
  template: `
    @if (loading) {
      <div class="list-state" role="status">Chargement...</div>
    } @else if (error) {
      <div class="list-state list-state--error" role="alert">
        <span>{{ error }}</span>
        <button type="button" (click)="retry.emit()">Réessayer</button>
      </div>
    } @else if (empty) {
      <div class="list-state" role="status">
        <strong>{{ emptyTitle }}</strong>
        <span>{{ emptyHint }}</span>
      </div>
    } @else {
      <ng-content></ng-content>
    }
  `,
  styles: [`
    .list-state { display: grid; gap: 8px; place-items: center; padding: 24px 16px; color: #667085; text-align: center; }
    .list-state--error { color: #b42318; }
    button { border: 0; background: transparent; color: inherit; cursor: pointer; text-decoration: underline; }
  `],
})
export class ListStateComponent {
  @Input() loading = false;
  @Input() error: string | null = null;
  @Input() empty = false;
  @Input() emptyTitle = 'Aucun résultat';
  @Input() emptyHint = 'Modifiez vos filtres ou réessayez.';
  @Output() readonly retry = new EventEmitter<void>();
}
