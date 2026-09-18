import { Component, input } from '@angular/core';

@Component({
  selector: 'app-disclosure-panel',
  standalone: true,
  template: `
    <details class="rounded-lg border border-brand-border bg-[var(--surface-raised)] p-3" [open]="open()">
      <summary [id]="triggerId()" class="financial-focus min-h-11 cursor-pointer rounded px-1 py-2 font-medium text-[var(--content-primary)]">{{ label() }}</summary>
      <div class="pt-3"><ng-content /></div>
    </details>
  `
})
export class DisclosurePanelComponent {
  readonly label = input.required<string>();
  readonly open = input(false);
  readonly triggerId = input<string | null>(null);
}
