import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { I18nService } from './core/i18n.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet />'
})
export class AppComponent {
  constructor(private readonly i18n: I18nService) {
    this.i18n.setLanguage(this.i18n.language());
  }
}
