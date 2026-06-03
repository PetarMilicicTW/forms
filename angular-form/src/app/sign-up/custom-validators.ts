import { AbstractControl, ValidatorFn, Validators } from '@angular/forms';

export const CustomValidators = {
  required(): ValidatorFn {
    return (control: AbstractControl) => {
      const errors = Validators.required(control);
      if (errors) errors['message'] = 'This field is required';
      return errors;
    };
  },

  email(): ValidatorFn {
    return (control: AbstractControl) => {
      const errors = Validators.email(control);
      if (errors) errors['message'] = 'Please enter a valid email address';
      return errors;
    };
  },

  minLength(minLength: number): ValidatorFn {
    return (control: AbstractControl) => {
      const errors = Validators.minLength(minLength)(control);
      if (errors) errors['message'] = `Must be at least ${minLength} characters long`;
      return errors;
    };
  },

  patternPassword(): ValidatorFn {
    return (control: AbstractControl) => {
      const letters = 'A-Za-z';
      const numbers = '0-9';
      const specialChars = `!"#$%&/()=?'*+<>@;,:.-_`;
      const special = specialChars.replace('-', '\\-');
      const pattern = new RegExp(
        `^(?=.*[${letters}])(?=.*[${numbers}])(?=.*[${special}])[${letters}${numbers}${special}]+$`,
      );
      const errors = Validators.pattern(pattern)(control);
      if (errors)
        errors['message'] = `Must include letters, numbers and ${specialChars} characters`;
      return errors;
    };
  },

  confirmPassword(passwordControl: AbstractControl): ValidatorFn {
    return (confirmPasswordControl: AbstractControl) => {
      const valueMatches = passwordControl.value === confirmPasswordControl.value;
      return valueMatches ? null : { message: 'Must match password' };
    };
  },
};
