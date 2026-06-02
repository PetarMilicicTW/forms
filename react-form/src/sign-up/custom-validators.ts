// Mirrors the Angular `CustomValidators`. Each validator returns an error
// message when invalid, or `null` when valid. Empty values pass every
// validator except `required` (matching Angular's `isEmptyInputValue` behaviour).

export type Validator = (value: string) => string | null;

const isEmpty = (value: string): boolean => value == null || value.length === 0;

// Same e-mail regular expression Angular's `Validators.email` uses.
const EMAIL_REGEXP =
  /^(?=.{1,254}$)(?=.{1,64}@)[-!#$%&'*+/0-9=?A-Z^_`a-z{|}~]+(?:\.[-!#$%&'*+/0-9=?A-Z^_`a-z{|}~]+)*@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*$/;

export const CustomValidators = {
  required(): Validator {
    return (value) => (isEmpty(value) ? 'This field is required' : null);
  },

  email(): Validator {
    return (value) =>
      isEmpty(value) || EMAIL_REGEXP.test(value) ? null : 'Please enter a valid email address';
  },

  minLength(minLength: number): Validator {
    return (value) =>
      isEmpty(value) || value.length >= minLength
        ? null
        : `Must be at least ${minLength} characters long`;
  },

  patternPassword(): Validator {
    const specialChars = `!"#$%&/()=?'*+<>@;,:.-_`;
    const pattern = new RegExp(`^[A-Za-z\\d${specialChars}]+$`);
    return (value) =>
      isEmpty(value) || pattern.test(value)
        ? null
        : `Must include letters, numbers and ${specialChars} characters`;
  },

  confirmPassword(password: string): Validator {
    return (value) => (password === value ? null : 'Must match password');
  },
};

// Runs validators in order and returns the message of the LAST failing one,
// mirroring how Angular merges validator error objects (later keys overwrite).
export function validate(value: string, validators: Validator[]): string | null {
  let message: string | null = null;
  for (const validator of validators) {
    const result = validator(value);
    if (result) message = result;
  }
  return message;
}
