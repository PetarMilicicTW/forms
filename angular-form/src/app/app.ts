import { Component } from '@angular/core';
import { PorscheDesignSystemModule } from '@porsche-design-system/components-angular';
import { SignUpComponent } from './sign-up/sign-up';

@Component({
  selector: 'app-root',
  imports: [PorscheDesignSystemModule, SignUpComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
