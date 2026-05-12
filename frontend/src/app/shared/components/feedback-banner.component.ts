import { Component, input } from '@angular/core';

@Component({
  selector: 'app-feedback-banner',
  standalone: true,
  template: `
    @if (message()) {
      <div class="mb-3 rounded px-3 py-2 text-sm" [class]="classes()">
        {{ message() }}
      </div>
    }
  `
})
export class FeedbackBannerComponent {
  readonly message = input<string>('');
  readonly tone = input<'info' | 'success' | 'error'>('info');

  classes() {
    if (this.tone() === 'error') return 'border border-red-200 bg-red-50 text-red-700';
    if (this.tone() === 'success') return 'border border-emerald-200 bg-emerald-50 text-emerald-700';
    return 'border border-slate-200 bg-slate-50 text-slate-700';
  }
}

