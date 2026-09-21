import { signal } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { ShellComponent } from './shell.component';
import { AccountContextService } from '../core/account-context.service';
import { I18nService } from '../core/i18n.service';

describe('ShellComponent accessibility', () => {
  let fixture: ComponentFixture<ShellComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShellComponent, NoopAnimationsModule, RouterTestingModule],
      providers: [
        {
          provide: AccountContextService,
          useValue: {
            accounts: signal([]), activeAccountId: signal(''), loading: signal(false), load: () => ({ subscribe: () => {} })
          }
        },
        { provide: I18nService, useValue: { t: (key: string) => ({ skip_to_main: 'Saltar al contenido principal', nav_mobile_label: 'Navegación móvil', nav_more: 'Más' }[key] ?? key) } }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(ShellComponent);
    fixture.detectChanges();
  });

  it('moves keyboard focus to the main landmark through the skip link', () => {
    const skipLink = fixture.nativeElement.querySelector('[data-testid="skip-to-main"]') as HTMLAnchorElement | null;
    const main = fixture.nativeElement.querySelector('main#main-content') as HTMLElement | null;

    expect(skipLink?.textContent?.trim()).toBe('Saltar al contenido principal');
    expect(main).not.toBeNull();
    skipLink?.click();
    expect(document.activeElement).toBe(main);
  });

  it('moves focus into More and restores it after Escape', fakeAsync(() => {
    const more = fixture.nativeElement.querySelector('[data-testid="mobile-more-trigger"]') as HTMLButtonElement;
    more.click();
    fixture.detectChanges();
    const firstMenuItem = fixture.nativeElement.querySelector('#shell-mobile-more-menu [role="menuitem"]') as HTMLElement | null;
    const focusFirstMenuItem = spyOn(firstMenuItem as HTMLElement, 'focus').and.callThrough();
    tick();

    expect((fixture.componentInstance as unknown as { firstMoreMenuItem?: { nativeElement: HTMLElement } }).firstMoreMenuItem?.nativeElement)
      .withContext('the dynamic ViewChild resolves after the More menu renders')
      .toBe(firstMenuItem ?? undefined);
    expect(focusFirstMenuItem).toHaveBeenCalled();
    const focusMoreTrigger = spyOn(more, 'focus').and.callThrough();
    fixture.componentInstance.onEscape();
    fixture.detectChanges();
    tick();
    expect(focusMoreTrigger).toHaveBeenCalled();
  }));
});
