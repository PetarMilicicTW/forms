import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { LetDirective } from '@ngrx/component';
import { PorscheDesignSystemModule, ToastManager } from '@porsche-design-system/components-angular';
import { delay, distinctUntilChanged, map, of, startWith, tap } from 'rxjs';
import { SubSink } from 'subsink';
import { BannerMessage } from '../shared/banner-types';
import { CustomValidators } from './custom-validators';

@Component({
  selector: 'app-sign-up',
  imports: [LetDirective, PorscheDesignSystemModule, ReactiveFormsModule],
  templateUrl: './sign-up.html',
  styleUrl: './sign-up.scss',
})
export class SignUpComponent {
  private readonly formBuilder = inject(FormBuilder).nonNullable;
  private readonly toastManager = inject(ToastManager);
  private readonly subSink = new SubSink();
  readonly isSubmitting = signal(false);
  readonly banner = signal<BannerMessage>({
    open: false,
    heading: '',
    description: '',
    state: 'info',
  });
  private submitCount = 0;
  readonly form = this.buildForm();

  ngOnDestroy(): void {
    this.subSink.unsubscribe();
  }

  cancel(): void {
    this.form.reset();
  }

  dismissBanner(): void {
    this.banner.set({ ...this.banner(), open: false });
  }

  submit(): void {
    if (!this.form.valid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.subSink.sink = of(true)
      .pipe(
        delay(1000),
        map(() => {
          this.submitCount++;
          if (this.submitCount % 2 === 1) return 'Fake success';
          else throw new Error('Fake error');
        }),
        tap({
          next: (result) => {
            this.toastManager.addMessage({ text: result, state: 'success' });
          },
          error: (e: Error) => {
            this.banner.set({
              open: true,
              heading: 'Error',
              description: e.message,
              state: 'error',
            });
          },
          finalize: () => {
            this.isSubmitting.set(false);
          },
        }),
      )
      .subscribe();
  }

  private buildForm() {
    const form = this.formBuilder.group({
      email: this.formBuilder.control('', [CustomValidators.required(), CustomValidators.email()]),
      password: this.formBuilder.control('', [
        CustomValidators.required(),
        CustomValidators.minLength(8),
        CustomValidators.patternPassword(),
      ]),
      confirmPassword: this.formBuilder.control('', [CustomValidators.required()]),
    });

    const emailControl = form.controls.email;
    const passwordControl = form.controls.password;
    const confirmPasswordControl = form.controls.confirmPassword;

    confirmPasswordControl.addValidators(CustomValidators.confirmPassword(form.controls.password));

    this.subSink.sink = emailControl.valueChanges
      .pipe(
        startWith(emailControl.value),
        distinctUntilChanged(),
        tap(() => {
          if (emailControl.valid && passwordControl.disabled) passwordControl.enable();
          else if (!emailControl.valid && passwordControl.enabled) passwordControl.disable();

          if (!passwordControl.pristine) passwordControl.reset();
        }),
      )
      .subscribe();

    this.subSink.sink = passwordControl.valueChanges
      .pipe(
        startWith(passwordControl.value),
        distinctUntilChanged(),
        tap(() => {
          if (passwordControl.valid && confirmPasswordControl.disabled) {
            confirmPasswordControl.enable();
          } else if (!passwordControl.valid && confirmPasswordControl.enabled) {
            confirmPasswordControl.disable();
          }

          if (!confirmPasswordControl.pristine) confirmPasswordControl.reset();
        }),
      )
      .subscribe();

    return form;
  }
}
