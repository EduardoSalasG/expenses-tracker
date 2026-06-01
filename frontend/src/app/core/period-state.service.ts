import { Injectable, signal } from '@angular/core';

const MONTH_STORAGE_KEY = 'expenses_tracker_selected_month';

@Injectable({ providedIn: 'root' })
export class PeriodStateService {
  readonly selectedMonth = signal<string>(this.resolveInitialMonth());

  setSelectedMonth(month: string) {
    this.selectedMonth.set(month);
    localStorage.setItem(MONTH_STORAGE_KEY, month);
  }

  private resolveInitialMonth() {
    const saved = localStorage.getItem(MONTH_STORAGE_KEY);
    if (saved && /^\d{4}-\d{2}$/.test(saved)) return saved;
    return new Date().toISOString().slice(0, 7);
  }
}

