import { of } from 'rxjs';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { SettingsComponent } from './settings.component';
import { ApiService, type CurrentUser, type ReportFrequency } from '../core/api.service';

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
    reportPreferences: ['monthly']
  };

  beforeEach(async () => {
    api = jasmine.createSpyObj<ApiService>('ApiService', ['me', 'updateMe', 'updateReportPreferences']);
    api.me.and.returnValue(of(user));
    api.updateMe.and.returnValue(of({ ...user, firstName: 'Updated', lastName: 'User', preferredName: 'Updated' }));
    api.updateReportPreferences.and.returnValue(of({ ...user, reportPreferences: ['weekly', 'monthly'] }));

    await TestBed.configureTestingModule({
      imports: [SettingsComponent, NoopAnimationsModule],
      providers: [{ provide: ApiService, useValue: api }]
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
    expect(component.profileMessage()).toBe('Profile saved.');
  });

  it('saves selected report preferences', () => {
    const component = fixture.componentInstance;
    component.form.setValue({ daily: false, weekly: true, monthly: true, yearly: false });

    component.save();

    expect(api.updateReportPreferences).toHaveBeenCalledWith(['weekly', 'monthly'] as ReportFrequency[]);
    expect(component.message()).toBe('Report preferences saved.');
  });
});
