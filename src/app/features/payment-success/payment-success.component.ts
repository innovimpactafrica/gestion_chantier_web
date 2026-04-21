import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-payment-success',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './payment-success.component.html',
  styleUrl: './payment-success.component.css'
})
export class PaymentSuccessComponent implements OnInit, OnDestroy {
  private timeoutId: any;

  constructor(private router: Router) {}

  ngOnInit(): void {
    // Si l'utilisateur n'est pas redirigé par le deep link mobile,
    // on le renvoie vers la page d'accueil ou le portail après 5 secondes.
    this.timeoutId = setTimeout(() => {
      this.router.navigate(['/']); 
    }, 3000);
  }

  ngOnDestroy(): void {
    // Nettoyage au cas où l'utilisateur quitte la page manuellement avant le délai
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
  }
}
