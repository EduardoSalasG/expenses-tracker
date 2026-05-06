import { Component, input } from '@angular/core';

@Component({
  selector: 'app-page-header',
  standalone: true,
  template: `
    <div class="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        @if (eyebrow()) {
          <p class="text-sm font-medium text-slate-500">{{ eyebrow() }}</p>
        }
        <h1 class="text-2xl font-semibold">{{ title() }}</h1>
      </div>
      <ng-content />
    </div>
  `
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
  readonly eyebrow = input('');
}
