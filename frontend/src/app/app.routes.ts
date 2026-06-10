import { Routes } from '@angular/router';
import { LoginComponent } from './features/login.component';
import { LandingComponent } from './features/landing.component';
import { ShellComponent } from './features/shell.component';
import { DashboardComponent } from './features/dashboard.component';
import { ExpensesComponent } from './features/expenses.component';
import { IncomesComponent } from './features/incomes.component';
import { BudgetsComponent } from './features/budgets.component';
import { CategoriesComponent } from './features/categories.component';
import { SettingsComponent } from './features/settings.component';
import { TermsComponent } from './features/terms.component';
import { PrivacyComponent } from './features/privacy.component';
import { authGuard, guestGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', component: LandingComponent, canActivate: [guestGuard] },
  { path: 'login', component: LoginComponent, canActivate: [guestGuard] },
  { path: 'terms', component: TermsComponent },
  { path: 'privacy', component: PrivacyComponent },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'expenses', component: ExpensesComponent },
      { path: 'incomes', component: IncomesComponent },
      { path: 'budgets', component: BudgetsComponent },
      { path: 'categories', component: CategoriesComponent },
      { path: 'settings', component: SettingsComponent },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' }
    ]
  },
  { path: '**', redirectTo: '' }
];
