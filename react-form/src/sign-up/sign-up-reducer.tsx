import {
  PBanner,
  PButton,
  PHeading,
  PInputEmail,
  PInputPassword,
  useToastManager,
} from '@porsche-design-system/components-react';
import { useReducer, useRef, useState, type FormEvent } from 'react';
import type { BannerMessage } from '../shared/banner-types';
import { CustomValidators, validate, type Validator } from './custom-validators';

type Field = 'email' | 'password' | 'confirmPassword';

const EMAIL_VALIDATORS: Validator[] = [CustomValidators.required(), CustomValidators.email()];
const PASSWORD_VALIDATORS: Validator[] = [
  CustomValidators.required(),
  CustomValidators.minLength(8),
  CustomValidators.patternPassword(),
];
const confirmValidators = (password: string): Validator[] => [
  CustomValidators.required(),
  CustomValidators.confirmPassword(password),
];

type FormState = {
  values: Record<Field, string>;
  touched: Record<Field, boolean>;
  enabled: Record<Field, boolean>;
  pristine: Record<Field, boolean>;
};

// On load only e-mail is enabled — password/confirm unlock as their predecessor
// becomes valid (same cascade the Angular form derives via `startWith`).
const initialState: FormState = {
  values: { email: '', password: '', confirmPassword: '' },
  touched: { email: false, password: false, confirmPassword: false },
  enabled: { email: true, password: false, confirmPassword: false },
  pristine: { email: true, password: true, confirmPassword: true },
};

const clone = (state: FormState): FormState => ({
  values: { ...state.values },
  touched: { ...state.touched },
  enabled: { ...state.enabled },
  pristine: { ...state.pristine },
});

const isEmailValid = (state: FormState): boolean =>
  state.enabled.email && !validate(state.values.email, EMAIL_VALIDATORS);

const isPasswordValid = (state: FormState): boolean =>
  state.enabled.password && !validate(state.values.password, PASSWORD_VALIDATORS);

// Mirrors the Angular `password.valueChanges` subscription: enable/disable
// confirm based on password validity, and reset confirm if it was dirty.
function cascadeConfirm(next: FormState): void {
  const passwordValid = isPasswordValid(next);
  if (passwordValid && !next.enabled.confirmPassword) next.enabled.confirmPassword = true;
  else if (!passwordValid && next.enabled.confirmPassword) next.enabled.confirmPassword = false;

  if (!next.pristine.confirmPassword) {
    next.values.confirmPassword = '';
    next.touched.confirmPassword = false;
    next.pristine.confirmPassword = true;
  }
}

// Mirrors the Angular `email.valueChanges` subscription: enable/disable
// password based on e-mail validity, and reset password if it was dirty
// (which in turn cascades to confirm when the password value actually changes).
function cascadePassword(next: FormState): void {
  const emailValid = isEmailValid(next);
  if (emailValid && !next.enabled.password) next.enabled.password = true;
  else if (!emailValid && next.enabled.password) next.enabled.password = false;

  if (!next.pristine.password) {
    const passwordChanged = next.values.password !== '';
    next.values.password = '';
    next.touched.password = false;
    next.pristine.password = true;
    if (passwordChanged) cascadeConfirm(next);
  }
}

type Action =
  | { type: 'change'; field: Field; value: string }
  | { type: 'blur'; field: Field }
  | { type: 'touchAll' }
  | { type: 'reset' };

function reducer(state: FormState, action: Action): FormState {
  switch (action.type) {
    case 'change': {
      // `distinctUntilChanged`: ignore input events that don't change the value,
      // so the cascade only runs on a genuine value change (as in the Angular form).
      if (action.value === state.values[action.field]) return state;

      const next = clone(state);
      next.values[action.field] = action.value;
      next.pristine[action.field] = false;
      if (action.field === 'email') cascadePassword(next);
      else if (action.field === 'password') cascadeConfirm(next);
      return next;
    }
    case 'blur': {
      const next = clone(state);
      next.touched[action.field] = true;
      return next;
    }
    case 'touchAll': {
      const next = clone(state);
      next.touched = { email: true, password: true, confirmPassword: true };
      return next;
    }
    case 'reset':
      return clone(initialState);
  }
}

export function SignUpReducer() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [banner, setBanner] = useState<BannerMessage>({
    open: false,
    heading: '',
    description: '',
    state: 'info',
  });
  const submitCount = useRef(0);
  const { addMessage } = useToastManager();

  const errors: Record<Field, string | null> = {
    email: state.enabled.email ? validate(state.values.email, EMAIL_VALIDATORS) : null,
    password: state.enabled.password ? validate(state.values.password, PASSWORD_VALIDATORS) : null,
    confirmPassword: state.enabled.confirmPassword
      ? validate(state.values.confirmPassword, confirmValidators(state.values.password))
      : null,
  };

  const formValid =
    state.enabled.email &&
    !errors.email &&
    state.enabled.password &&
    !errors.password &&
    state.enabled.confirmPassword &&
    !errors.confirmPassword;

  const stateOf = (field: Field) => (state.touched[field] && errors[field] ? 'error' : 'none');

  const cancel = (): void => dispatch({ type: 'reset' });

  const dismissBanner = (): void => setBanner((current) => ({ ...current, open: false }));

  const fakeSubmit = (): Promise<string> =>
    new Promise((resolve, reject) => {
      setTimeout(() => {
        submitCount.current++;
        if (submitCount.current % 2 === 1) resolve('Fake success');
        else reject(new Error('Fake error'));
      }, 1000);
    });

  const submit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    if (!formValid) {
      dispatch({ type: 'touchAll' });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await fakeSubmit();
      addMessage({ text: result, state: 'success' });
    } catch (error) {
      setBanner({ open: true, heading: 'Error', description: (error as Error).message, state: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <PHeading>Sign up</PHeading>

      <form
        className="flex w-[400px] min-w-[240px] max-w-[90dvw] flex-col gap-8"
        onSubmit={submit}
        noValidate
      >
        <PInputEmail
          name="email"
          label="E-mail"
          required
          value={state.values.email}
          disabled={!state.enabled.email}
          message={errors.email ?? ''}
          state={stateOf('email')}
          onInput={(e) =>
            dispatch({
              type: 'change',
              field: 'email',
              value: (e.target as HTMLInputElement).value,
            })
          }
          onBlur={() => dispatch({ type: 'blur', field: 'email' })}
        />

        <PInputPassword
          name="password"
          label="Password"
          autoComplete="new-password"
          toggle
          required
          value={state.values.password}
          disabled={!state.enabled.password}
          message={errors.password ?? ''}
          state={stateOf('password')}
          onInput={(e) =>
            dispatch({
              type: 'change',
              field: 'password',
              value: (e.target as HTMLInputElement).value,
            })
          }
          onBlur={() => dispatch({ type: 'blur', field: 'password' })}
        />

        <PInputPassword
          name="confirmPassword"
          label="Confirm password"
          autoComplete="new-password"
          toggle
          required
          value={state.values.confirmPassword}
          disabled={!state.enabled.confirmPassword}
          message={errors.confirmPassword ?? ''}
          state={stateOf('confirmPassword')}
          onInput={(e) =>
            dispatch({
              type: 'change',
              field: 'confirmPassword',
              value: (e.target as HTMLInputElement).value,
            })
          }
          onBlur={() => dispatch({ type: 'blur', field: 'confirmPassword' })}
        />

        <div className="flex justify-end gap-4">
          <PButton type="button" variant="secondary" onClick={cancel}>
            Cancel
          </PButton>
          <PButton type="submit" loading={isSubmitting}>
            Submit
          </PButton>
        </div>
      </form>

      <PBanner
        open={banner.open}
        heading={banner.heading}
        headingTag="h3"
        description={banner.description}
        state={banner.state}
        onDismiss={dismissBanner}
      />
    </div>
  );
}
