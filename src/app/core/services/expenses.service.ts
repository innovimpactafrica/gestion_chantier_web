// src/app/services/expenses.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// Define the Expense interface
export interface Expense {
  id?: number;
  description: string;
  date: number[]; // Assuming date is an array [year, month, day] as per your component
  amount: number;
  budgetId: number;
  proof?: string; // Optional proof field (e.g., URL or path to proof document/image)
}

export interface ExpensesResponse {
  content: Expense[];
  totalPages: number;
}

@Injectable({
  providedIn: 'root'
})
export class ExpensesService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ✅ Récupérer les budgets d'un bien immobilier par propertyId
  getBudgetsByPropertyId(propertyId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/budgets/property/${propertyId}`);
  }

  // Récupérer les dépenses par budgetId avec pagination
  getExpensesByBudgetId(budgetId: number): Observable<ExpensesResponse> {
    return this.http.get<ExpensesResponse>(`${this.apiUrl}/expenses/budget/${budgetId}?page=0&size=10`);
  }

  // ✅ Ajouter une dépense with proof
  addExpense(expenseData: Expense): Observable<Expense> {
    return this.http.post<Expense>(`${this.apiUrl}/expenses`, expenseData);
  }

  // Optional: Update an existing expense (if needed)
  updateExpense(expenseId: number, expenseData: Expense): Observable<Expense> {
    return this.http.put<Expense>(`${this.apiUrl}/expenses/${expenseId}`, expenseData);
  }

  // Optional: Delete an expense (if needed)
  deleteExpense(expenseId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/expenses/${expenseId}`);
  }
}