import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app.component';
import { AuthService } from './core/auth.service';
import { I18nService } from './core/i18n.service';

describe('AppComponent', () => {
  it('creates the root component', async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([]),
        { provide: I18nService, useValue: { syncDocumentLanguage: () => {}, t: (key: string) => key } },
        { provide: AuthService, useValue: { bootstrapReady: signal(false), bootstrapSession: () => ({ subscribe: () => {} }) } }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(AppComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('shows the app bootstrap loader instead of routed content while session resolution is pending', async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([]),
        { provide: I18nService, useValue: { syncDocumentLanguage: () => {}, t: (key: string) => key } },
        { provide: AuthService, useValue: { bootstrapReady: signal(false), bootstrapSession: () => ({ subscribe: () => {} }) } }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="app-bootstrap-loader"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('router-outlet')).toBeNull();
  });
});
