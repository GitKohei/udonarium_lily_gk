import 'hammerjs';

import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

if (environment.production) {
  enableProdMode();
  if(window) {
    window.console.log = () => {}; // console.log()を空関数へオーバーライド
  }
}

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));