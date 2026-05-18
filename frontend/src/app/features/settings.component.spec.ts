import { of } from 'rxjs';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { SettingsComponent } from './settings.component';
import { ApiService, type CurrentUser, type ReportFrequency } from '../core/api.service';
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

  beforeEach(async () => {
    api = jasmine.createSpyObj<ApiService>('ApiService', ['me', 'updateMe', 'updateReportPreferences']);
    api.me.and.returnValue(of(user));
    api.updateMe.and.returnValue(of({ ...user, firstName: 'Updated', lastName: 'User', preferredName: 'Updated' }));
    api.updateReportPreferences.and.returnValue(of({ ...user, reportPreferences: ['weekly', 'monthly'] }));

    await TestBed.configureTestingModule({
      imports: [SettingsComponent, NoopAnimationsModule],
      providers: [
        { provide: ApiService, useValue: api },
        { provide: AuthService, useValue: jasmine.createSpyObj<AuthService>('AuthService', ['logout']) },
        { provide: Router, useValue: jasmine.createSpyObj<Router>('Router', ['navigateByUrl']) },
        { provide: I18nService, useValue: { t: (key: string) => key, applyUserPreference: () => {}, language: () => 'es' } }
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
});
