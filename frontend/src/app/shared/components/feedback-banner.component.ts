import { Component, input } from '@angular/core';

@Component({
  selector: 'app-feedback-banner',
  standalone: true,
  template: `
    @if (message()) {
      <div
        class="mb-3 rounded px-3 py-2 text-sm"
        [class]="classes()"
        [attr.role]="tone() === 'error' ? 'alert' : 'status'"
        [attr.aria-live]="tone() === 'error' ? 'assertive' : 'polite'"
      >
        {{ message() }}
      </div>
    }
  `
})
export class FeedbackBannerComponent {
  readonly message = input<string>('');
  readonly tone = input<'info' | 'success' | 'error'>('info');

  classes() {
    if (this.tone() === 'error') return 'border bg-[var(--semantic-danger-bg)] text-[var(--semantic-danger-text)] border-[var(--semantic-danger-border)]';
    if (this.tone() === 'success') return 'border bg-[var(--semantic-success-bg)] text-[var(--semantic-success-text)] border-[var(--semantic-success-border)]';
    return 'border border-brand-border bg-brand-bg text-brand-ink';
  }
}
