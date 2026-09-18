import { signal } from '@angular/core';
import { of } from 'rxjs';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { parseSettingsSection, SettingsComponent } from './settings.component';
import { APP_VERSION } from '../generated/app-version';
import {
  ApiService,
  type CurrentUser,
  type FinancialAccountContext,
  type ReportFrequency
} from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { I18nService } from '../core/i18n.service';

describe('SettingsComponent', () => {
  let fixture: ComponentFixture<SettingsComponent>;
  let api: jasmine.SpyObj<ApiService>;

  const user: CurrentUser = {
    id: 'user-1',
    phoneNumber: '+56982439041',
    firstName: 'Test',
    lastName: 'User',
    preferredName: 'Test',
    role: 'consumer',
    countryOfResidence: 'Chile',
    preferredCurrency: 'CLP',
    preferredLanguage: 'es',
    reportPreferences: ['monthly']
  };
  const accountContext: FinancialAccountContext = {
    current: {
      account: {
        id: 'personal-account',
        tenantId: 'tenant-1',
        type: 'personal',
        name: 'Personal',
        currency: 'CLP',
        createdByUserId: user.id,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z'
      },
      role: 'owner'
    },
    accounts: []
  };

  beforeEach(async () => {
    api = jasmine.createSpyObj<ApiService>('ApiService', [
      'me',
      'updateMe',
      'updateReportPreferences',
      'createTelegramRegistrationLink',
      'bankOptions',
      'paymentMethodOptions',
      'accountContext',
      'listAccountMembers'
    ]);
    api.me.and.returnValue(of(user));
    api.updateMe.and.returnValue(of({ ...user, firstName: 'Updated', lastName: 'User', preferredName: 'Updated' }));
    api.updateReportPreferences.and.returnValue(of({ ...user, reportPreferences: ['weekly', 'monthly'] }));
    api.createTelegramRegistrationLink.and.returnValue(of({
      botUrl: 'https://t.me/test_bot',
      phoneNumber: user.phoneNumber
    }));
    api.bankOptions.and.returnValue(of([]));
    api.paymentMethodOptions.and.returnValue(of([]));
    api.accountContext.and.returnValue(of(accountContext));
    api.listAccountMembers.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [SettingsComponent, NoopAnimationsModule],
      providers: [
        { provide: ApiService, useValue: api },
        {
          provide: AuthService,
          useValue: {
            ...jasmine.createSpyObj<AuthService>('AuthService', ['logout']),
            user: signal<CurrentUser | null>(user)
          }
        },
        { provide: Router, useValue: jasmine.createSpyObj<Router>('Router', ['navigate', 'navigateByUrl']) },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({}) } }
        },
        {
          provide: I18nService,
          useValue: {
            t: (key: string) => ({
              settings_version_label: 'Versión',
              settings_version_accessible_label: 'Versión de la aplicación'
            }[key] ?? key),
            applyUserPreference: () => {},
            language: () => 'es'
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SettingsComponent);
    fixture.detectChanges();
  });

  it('loads profile and report preferences', () => {
    const component = fixture.componentInstance;

    expect(component.user()?.phoneNumber).toBe('+56982439041');
    expect(component.profileForm.getRawValue().preferredCurrency).toBe('CLP');
    expect(component.form.getRawValue().monthly).toBeTrue();
  });

  it('saves profile edits', () => {
    const component = fixture.componentInstance;
    component.profileForm.patchValue({ firstName: 'Updated', lastName: 'User', preferredName: 'Updated', preferredCurrency: 'usd' });

    component.saveProfile();

    expect(api.updateMe).toHaveBeenCalledWith(jasmine.objectContaining({
      firstName: 'Updated',
      lastName: 'User',
      preferredName: 'Updated',
      preferredCurrency: 'USD'
    }));
    expect(component.profileMessage()).toBe('settings_profile_saved');
  });

  it('saves selected report preferences', () => {
    const component = fixture.componentInstance;
    component.form.setValue({ daily: false, weekly: true, monthly: true, yearly: false });

    component.save();

    expect(api.updateReportPreferences).toHaveBeenCalledWith(['weekly', 'monthly'] as ReportFrequency[]);
    expect(component.message()).toBe('settings_preferences_saved');
  });

  it('renders the exact localized release version as the final, non-interactive settings metadata', () => {
    const version = fixture.nativeElement.querySelector('[data-testid="app-version"]') as HTMLElement | null;

    expect(version).withContext('the version is discoverable at the end of Settings').not.toBeNull();
    expect(version?.tagName).toBe('FOOTER');
    expect(version?.textContent?.trim()).toBe(`Versión ${APP_VERSION}`);
    expect(version?.getAttribute('aria-label')).toBe(`Versión de la aplicación ${APP_VERSION}`);
    expect(version?.querySelector('button, a, input, select, textarea')).toBeNull();
    expect(version?.getAttribute('tabindex')).toBe('0');
    version?.focus();
    expect(document.activeElement).toBe(version);
    expect(fixture.nativeElement.lastElementChild).toBe(version);
  });

  it('accepts only known sections from a deep link', () => {
    expect(parseSettingsSection('catalogs')).toBe('catalogs');
    expect(parseSettingsSection('delete-all')).toBeNull();
    expect(parseSettingsSection(null)).toBeNull();
  });

  it('keeps a valid deep-linked section in focus without replacing the query parameter', () => {
    const component = fixture.componentInstance;
    const router = TestBed.inject(Router) as jasmine.SpyObj<Router>;

    component.openSettingsSection('catalogs', false);

    expect(component.activeSettingsSection()).toBe('catalogs');
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
