import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { AccountContextService } from '../../core/account-context.service';
import { ApiService, type FinancialAccountMembership } from '../../core/api.service';
import { I18nService } from '../../core/i18n.service';
import { AccountCreateDialogComponent } from './account-create-dialog.component';

describe('AccountCreateDialogComponent', () => {
  let fixture: ComponentFixture<AccountCreateDialogComponent>;
  let api: jasmine.SpyObj<ApiService>;
  let accountContext: jasmine.SpyObj<AccountContextService>;

  const existingAccount: FinancialAccountMembership = {
    account: {
      id: 'personal-account',
      tenantId: 'tenant-1',
      type: 'personal',
      name: 'Personal',
      currency: 'CLP',
      createdByUserId: 'user-1',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    },
    role: 'owner'
  };
  const createdAccount: FinancialAccountMembership = {
    account: {
      ...existingAccount.account,
      id: 'shared-account',
      type: 'shared',
      name: 'Casa'
    },
    role: 'owner'
  };

  beforeEach(async () => {
    api = jasmine.createSpyObj<ApiService>('ApiService', ['createAccount', 'listAccounts', 'createAccountInvitation']);
    api.createAccount.and.returnValue(throwError(() => new Error('response lost')));
    api.listAccounts.and.returnValue(of([existingAccount, createdAccount]));
    accountContext = jasmine.createSpyObj<AccountContextService>('AccountContextService', ['insertAccount'], {
      accountMemberships: signal([existingAccount])
    });

    await TestBed.configureTestingModule({
      imports: [AccountCreateDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: ApiService, useValue: api },
        { provide: AccountContextService, useValue: accountContext },
        { provide: I18nService, useValue: { t: (key: string) => key } },
        { provide: MatDialogRef, useValue: jasmine.createSpyObj('MatDialogRef', ['close']) }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AccountCreateDialogComponent);
    fixture.detectChanges();
  });

  it('reconciles a shared account that was persisted when the create response fails', () => {
    const component = fixture.componentInstance;
    component.createAccountForm.setValue({ name: 'Casa', currency: 'CLP' });

    component.createAccount();

    expect(component.createdMembership()).toEqual(createdAccount);
    expect(component.accountMessage()).toBe('accounts_create_success');
    expect(accountContext.insertAccount).toHaveBeenCalledOnceWith(createdAccount);
    expect(component.savingAccount()).toBeFalse();
  });
});
