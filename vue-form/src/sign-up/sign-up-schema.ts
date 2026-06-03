import { z } from 'zod';

// Same e-mail regular expression and password character set the Angular
// `CustomValidators` used, so validation results stay identical.
const EMAIL_REGEXP =
  /^(?=.{1,254}$)(?=.{1,64}@)[-!#$%&'*+/0-9=?A-Z^_`a-z{|}~]+(?:\.[-!#$%&'*+/0-9=?A-Z^_`a-z{|}~]+)*@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*$/;

const letters = 'A-Za-z';
const numbers = '0-9';
const specialChars = `!"#$%&/()=?'*+<>@;,:.-_`;
const special = specialChars.replace('-', '\\-');
const passwordPattern = new RegExp(
  `^(?=.*[${letters}])(?=.*[${numbers}])(?=.*[${special}])[${letters}${numbers}${special}]+$`,
);

export type SignUpValues = z.infer<typeof signUpSchema>;

// A single `superRefine` mirrors the Angular validator chains: the format/length
// checks are skipped on empty input (so `required` shows first), and where two
// checks fail at once the later message wins — matching Angular's error merge.
export const signUpSchema = z
  .object({
    email: z.string(),
    password: z.string(),
    confirmPassword: z.string(),
  })
  .superRefine((data, ctx) => {
    // email: required → format
    if (data.email.length === 0) {
      ctx.addIssue({ path: ['email'], code: 'custom', message: 'This field is required' });
    } else if (!EMAIL_REGEXP.test(data.email)) {
      ctx.addIssue({
        path: ['email'],
        code: 'custom',
        message: 'Please enter a valid email address',
      });
    }

    // password: required → pattern → min-length (pattern wins over min-length)
    if (data.password.length === 0) {
      ctx.addIssue({ path: ['password'], code: 'custom', message: 'This field is required' });
    } else {
      if (!passwordPattern.test(data.password)) {
        ctx.addIssue({
          path: ['password'],
          code: 'custom',
          message: `Must include letters, numbers and ${specialChars} characters`,
        });
      }
      if (data.password.length < 8) {
        ctx.addIssue({
          path: ['password'],
          code: 'custom',
          message: 'Must be at least 8 characters long',
        });
      }
    }

    // confirmPassword: required + must match (the match message wins when both fail)
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({ path: ['confirmPassword'], code: 'custom', message: 'Must match password' });
    } else if (data.confirmPassword.length === 0) {
      ctx.addIssue({
        path: ['confirmPassword'],
        code: 'custom',
        message: 'This field is required',
      });
    }
  });
