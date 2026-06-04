import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../auth/services/auth.service';
import { DahsboardService } from '../../../../core/services/dahsboard.service';

@Component({
  selector: 'app-avaragerate-avancement',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './avaragerate-avancement.component.html',
  styleUrls: ['./avaragerate-avancement.component.css']
})
export class AvaragerateAvancementComponent implements OnInit {
  // Valeurs SVG
  circumference: number = 0;
  dashOffset: number = 0;
  progressColor: string = '#FF5C02';
  pointX: number = 0;
  pointY: number = 0;

  progressValue: number = 0;
  isLoading: boolean = true;

  private readonly radius: number = 45;
  private readonly center: number = 50;

  constructor(
    private dahsboardService: DahsboardService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.authService.getCurrentUser().subscribe(user => {
      if (user) {
        this.loadGlobalIndicators(); // Plus besoin de passer l'ID si ton service le récupère
      }
    });
  }

  private loadGlobalIndicators(): void {
    this.dahsboardService.getGlobalIndicators().subscribe({
      next: (data: any) => {
        this.progressValue = data?.averageProgressPercentage ?? 0;
        this.calculateProgress();
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
      }
    });
  }

  private calculateProgress(): void {
    this.circumference = Math.PI * this.radius;
    const progressRatio = this.progressValue / 100;
    this.dashOffset = this.circumference * (1 - progressRatio);
    const angle = (progressRatio * Math.PI) - (Math.PI / 2);
    this.pointX = this.center + this.radius * Math.cos(angle);
    this.pointY = this.center + this.radius * Math.sin(angle);
  }
}
