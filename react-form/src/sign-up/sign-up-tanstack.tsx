import {
  PBanner,
  PButton,
  PHeading,
  PInputEmail,
  PInputPassword,
  PText,
  useToastManager,
} from '@porsche-design-system/components-react';
import { useForm } from '@tanstack/react-form';
import { useRef, useState } from 'react';
import type { BannerMessage } from '../shared/banner-types';
import { signUpSchema } from './sign-up-schema';

type Field = 'email' | 'password' | 'confirmPassword';

export function SignUpTanstack() {
  const { addMessage } = useToastManager();
  const [banner, setBanner] = useState<BannerMessage>({
    open: false,
    heading: '',
    description: '',
    state: 'info',
  });
  // Errors only surface once a field is blurred, or after a submit attempt.
  // NOTE: gate on `meta.isBlurred`, NOT `meta.isTouched` — TanStack flips
  // `isTouched` on change, which would show errors while typing (Angular only
  // shows them on blur). Verified against the Angular form via differential test.
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitCount = useRef(0);

  const changeDetectionCycleCount = useRef(0);
  const getChangeDetectionCycleCount = () => {
    ++changeDetectionCycleCount.current;
    // in StrictMode React double renders components in development
    return import.meta.env.DEV
      ? changeDetectionCycleCount.current / 2
      : changeDetectionCycleCount.current;
  };

  // No TanStack validators: validation is derived from the current values on
  // every render (like the Angular form), which avoids TanStack's per-event
  // error slots leaving a stale message behind after a value is corrected.
  const form = useForm({
    defaultValues: { email: '', password: '', confirmPassword: '' },
  });

  const dismissBanner = (): void => setBanner((current) => ({ ...current, open: false }));

  const fakeSubmit = (): Promise<string> =>
    new Promise((resolve, reject) => {
      setTimeout(() => {
        submitCount.current++;
        if (submitCount.current % 2 === 1) resolve('Fake success');
        else reject(new Error('Fake error'));
      }, 1000);
    });

  const submit = async (): Promise<void> => {
    if (!signUpSchema.safeParse(form.state.values).success) {
      setSubmitAttempted(true);
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await fakeSubmit();
      addMessage({ text: result, state: 'success' });
    } catch (error) {
      setBanner({
        open: true,
        heading: 'Error',
        description: (error as Error).message,
        state: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const cancel = (): void => {
    form.reset();
    setSubmitAttempted(false);
  };

  return (
    <div className="flex flex-col gap-4">
      <PText className="fixed top-4 right-4">
        Change Detection Cycles: {getChangeDetectionCycleCount()}
      </PText>

      <PHeading>Sign up</PHeading>

      <form
        className="flex w-[400px] min-w-[240px] max-w-[90dvw] flex-col gap-8"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        noValidate
      >
        <form.Subscribe selector={(state) => state.values}>
          {(values) => {
            const parsed = signUpSchema.safeParse(values);
            const issues = parsed.success ? [] : parsed.error.issues;
            const messageOf = (field: Field) =>
              issues.find((issue) => issue.path[0] === field)?.message ?? '';
            const emailValid = !messageOf('email');
            const passwordValid = emailValid && !messageOf('password');

            // enabled state cascades: password unlocks once email is valid,
            // confirm once password is valid.
            const enabled: Record<Field, boolean> = {
              email: true,
              password: emailValid,
              confirmPassword: passwordValid,
            };

            return (
              <>
                <form.Field
                  name="email"
                  // Editing the e-mail clears a dirty password (and confirm),
                  // mirroring the Angular cascade reset on value change.
                  listeners={{
                    onChange: () => {
                      if (form.getFieldMeta('password')?.isDirty) {
                        form.resetField('password');
                        form.resetField('confirmPassword');
                      }
                    },
                  }}
                >
                  {(field) => {
                    const show =
                      enabled.email &&
                      !!messageOf('email') &&
                      (field.state.meta.isBlurred || submitAttempted);
                    return (
                      <PInputEmail
                        name={field.name}
                        label="E-mail"
                        required
                        value={field.state.value}
                        message={show ? messageOf('email') : ''}
                        state={show ? 'error' : 'none'}
                        onInput={(e) => {
                          const value = (e.target as HTMLInputElement).value;
                          if (value !== field.state.value) field.handleChange(value);
                        }}
                        onBlur={field.handleBlur}
                      />
                    );
                  }}
                </form.Field>

                <form.Field
                  name="password"
                  listeners={{
                    onChange: () => {
                      if (form.getFieldMeta('confirmPassword')?.isDirty) {
                        form.resetField('confirmPassword');
                      }
                    },
                  }}
                >
                  {(field) => {
                    const show =
                      enabled.password &&
                      !!messageOf('password') &&
                      (field.state.meta.isBlurred || submitAttempted);
                    return (
                      <PInputPassword
                        name={field.name}
                        label="Password"
                        autoComplete="new-password"
                        toggle
                        required
                        disabled={!enabled.password}
                        value={field.state.value}
                        message={show ? messageOf('password') : ''}
                        state={show ? 'error' : 'none'}
                        onInput={(e) => {
                          const value = (e.target as HTMLInputElement).value;
                          if (value !== field.state.value) field.handleChange(value);
                        }}
                        onBlur={field.handleBlur}
                      />
                    );
                  }}
                </form.Field>

                <form.Field name="confirmPassword">
                  {(field) => {
                    const show =
                      enabled.confirmPassword &&
                      !!messageOf('confirmPassword') &&
                      (field.state.meta.isBlurred || submitAttempted);
                    return (
                      <PInputPassword
                        name={field.name}
                        label="Confirm password"
                        autoComplete="new-password"
                        toggle
                        required
                        disabled={!enabled.confirmPassword}
                        value={field.state.value}
                        message={show ? messageOf('confirmPassword') : ''}
                        state={show ? 'error' : 'none'}
                        onInput={(e) => {
                          const value = (e.target as HTMLInputElement).value;
                          if (value !== field.state.value) field.handleChange(value);
                        }}
                        onBlur={field.handleBlur}
                      />
                    );
                  }}
                </form.Field>
              </>
            );
          }}
        </form.Subscribe>

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
