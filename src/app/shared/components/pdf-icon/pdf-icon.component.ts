import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-pdf-icon',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="flex flex-col items-center justify-center bg-red-50 rounded-lg p-4 border border-red-100"
         [style.width.px]="width" 
         [style.height.px]="height">
      <!-- PDF Icon SVG -->
      <svg [style.width.px]="iconSize" 
           [style.height.px]="iconSize" 
           viewBox="0 0 24 24" 
           fill="none" 
           xmlns="http://www.w3.org/2000/svg"
           class="mb-2">
        <!-- Document shape -->
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" 
              fill="#DC2626" 
              opacity="0.9"/>
        <!-- Folded corner -->
        <path d="M14 2v6h6" 
              stroke="#DC2626" 
              stroke-width="2" 
              stroke-linecap="round" 
              stroke-linejoin="round"/>
        <!-- PDF text -->
        <text x="12" 
              y="16" 
              text-anchor="middle" 
              font-size="6" 
              font-weight="bold" 
              fill="white">PDF</text>
      </svg>
      
      <!-- Filename label (optional) -->
      <span *ngIf="showLabel && filename" 
            class="text-xs text-gray-600 truncate max-w-full px-2 text-center"
            [title]="filename">
        {{ filename }}
      </span>
    </div>
  `,
    styles: [`
    :host {
      display: inline-block;
    }
  `]
})
export class PdfIconComponent {
    @Input() width: number = 200;
    @Input() height: number = 150;
    @Input() iconSize: number = 48;
    @Input() filename: string = '';
    @Input() showLabel: boolean = true;
}
