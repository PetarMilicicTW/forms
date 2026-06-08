import { zodResolver } from '@hookform/resolvers/zod';
import {
  PBanner,
  PButton,
  PHeading,
  PInputEmail,
  PInputPassword,
  PText,
  useToastManager,
} from '@porsche-design-system/components-react';
import { useRef, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import type { BannerMessage } from '../shared/banner-types';
import { signUpSchema, type SignUpValues } from './sign-up-schema';

export function SignUpRhf() {
  const { addMessage } = useToastManager();
  const [banner, setBanner] = useState<BannerMessage>({
    open: false,
    heading: '',
    description: '',
    state: 'info',
  });
  const submitCount = useRef(0);

  const changeDetectionCycleCount = useRef(0);
  const getChangeDetectionCycleCount = () => {
    ++changeDetectionCycleCount.current;
    // in StrictMode React double renders components in development
    return import.meta.env.DEV
      ? changeDetectionCycleCount.current / 2
      : changeDetectionCycleCount.current;
  };

  const {
    control,
    handleSubmit,
    resetField,
    reset,
    formState: { isSubmitting, dirtyFields },
  } = useForm<SignUpValues>({
    defaultValues: { email: '', password: '', confirmPassword: '' },
    resolver: zodResolver(signUpSchema),
    mode: 'onTouched', // error appears on blur, then updates live — matches Angular
  });

  // The enable/disable cascade needs validity even before a field is touched,
  // so it derives from the live values (RHF's `errors` only populate per `mode`).
  const values = useWatch({ control });
  const parsed = signUpSchema.safeParse({
    email: values.email ?? '',
    password: values.password ?? '',
    confirmPassword: values.confirmPassword ?? '',
  });
  const issues = parsed.success ? [] : parsed.error.issues;
  const hasIssue = (field: keyof SignUpValues) => issues.some((i) => i.path[0] === field);
  const emailValid = !hasIssue('email');
  const passwordValid = emailValid && !hasIssue('password');

  const dismissBanner = (): void => setBanner((current) => ({ ...current, open: false }));

  const fakeSubmit = (): Promise<string> =>
    new Promise((resolve, reject) => {
      setTimeout(() => {
        submitCount.current++;
        if (submitCount.current % 2 === 1) resolve('Fake success');
        else reject(new Error('Fake error'));
      }, 1000);
    });

  const onValid = async (): Promise<void> => {
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
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <PText className="fixed top-4 right-4">
        Change Detection Cycles: {getChangeDetectionCycleCount()}
      </PText>

      <PHeading>Sign up</PHeading>

      <form
        className="flex w-[400px] min-w-[240px] max-w-[90dvw] flex-col gap-8"
        onSubmit={(event) => handleSubmit(onValid)(event)}
        noValidate
      >
        <Controller
          control={control}
          name="email"
          render={({ field, fieldState }) => (
            <PInputEmail
              name={field.name}
              label="E-mail"
              required
              value={field.value}
              message={fieldState.error?.message ?? ''}
              state={fieldState.error ? 'error' : 'none'}
              onInput={(e) => {
                const value = (e.target as HTMLInputElement).value;
                if (value === field.value) return; // distinctUntilChanged
                field.onChange(value);
                // editing e-mail clears a dirty password (and confirm)
                if (dirtyFields.password) {
                  resetField('password');
                  resetField('confirmPassword');
                }
              }}
              onBlur={field.onBlur}
            />
          )}
        />

        <Controller
          control={control}
          name="password"
          render={({ field, fieldState }) => (
            <PInputPassword
              name={field.name}
              label="Password"
              autoComplete="new-password"
              toggle
              required
              disabled={!emailValid}
              value={field.value}
              message={emailValid ? (fieldState.error?.message ?? '') : ''}
              state={emailValid && fieldState.error ? 'error' : 'none'}
              onInput={(e) => {
                const value = (e.target as HTMLInputElement).value;
                if (value === field.value) return;
                field.onChange(value);
                if (dirtyFields.confirmPassword) resetField('confirmPassword');
              }}
              onBlur={field.onBlur}
            />
          )}
        />

        <Controller
          control={control}
          name="confirmPassword"
          render={({ field, fieldState }) => (
            <PInputPassword
              name={field.name}
              label="Confirm password"
              autoComplete="new-password"
              toggle
              required
              disabled={!passwordValid}
              value={field.value}
              message={passwordValid ? (fieldState.error?.message ?? '') : ''}
              state={passwordValid && fieldState.error ? 'error' : 'none'}
              onInput={(e) => {
                const value = (e.target as HTMLInputElement).value;
                if (value === field.value) return;
                field.onChange(value);
              }}
              onBlur={field.onBlur}
            />
          )}
        />

        <div className="flex justify-end gap-4">
          <PButton type="button" variant="secondary" onClick={() => reset()}>
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
