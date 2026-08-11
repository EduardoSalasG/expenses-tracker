import { Component, computed, inject } from '@angular/core';
import { AccountContextService } from '../../core/account-context.service';
import { I18nService } from '../../core/i18n.service';

@Component({
  selector: 'app-account-context-banner',
  standalone: true,
  template: `
    @if (accountLabel()) {
      <div class="mb-4 rounded-lg border border-brand-border bg-brand-surface px-4 py-3 text-sm text-brand-muted">
        {{ t('accounts_current_account') }}:
        <span class="font-medium text-brand-ink">{{ accountLabel() }}</span>
      </div>
    }
  `
})
export class AccountContextBannerComponent {
  private readonly i18n = inject(I18nService);
  readonly accountService = inject(AccountContextService);
  readonly t = (key: string) => this.i18n.t(key);
  readonly accountLabel = computed(() => {
    const account = this.accountService.currentAccount();
    if (!account) return '';
    const typeLabel = this.t(account.type === 'personal' ? 'accounts_type_personal' : 'accounts_type_shared');
    return `${account.name} · ${typeLabel}`;
  });
}
