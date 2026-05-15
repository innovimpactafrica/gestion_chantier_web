// dossiers.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
@Component({
  selector: 'app-dossiers',
  templateUrl: './dossiers.component.html',
  standalone: true,
  imports: [CommonModule]
})
export class DossiersComponent implements OnInit {
  dossiers: any[] = [];

  ngOnInit(): void {}
}