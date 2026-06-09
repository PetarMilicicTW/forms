import { computed, toValue, type MaybeRefOrGetter } from 'vue';
import { signUpSchema, type SignUpValues } from './sign-up-schema';

export type Field = keyof SignUpValues;

// Shared by all three forms: validation is derived from the Zod schema on every
// change, so the schema stays the single source of truth and a corrected field
// clears its error immediately. Accepts a ref/getter/plain source via `toValue`
// so it composes with whatever each form uses to hold its values.
export function useSignUpValidation(values: MaybeRefOrGetter<SignUpValues>) {
  const issues = computed(() => {
    const result = signUpSchema.safeParse(toValue(values));
    return result.success ? [] : result.error.issues;
  });
  const messageOf = (field: Field): string =>
    issues.value.find((issue) => issue.path[0] === field)?.message ?? '';

  const emailValid = computed(() => !messageOf('email'));
  const passwordValid = computed(() => emailValid.value && !messageOf('password'));
  // Cascade: password unlocks once email is valid, confirm once password is valid.
  const enabled = computed<Record<Field, boolean>>(() => ({
    email: true,
    password: emailValid.value,
    confirmPassword: passwordValid.value,
  }));

  const isValid = computed(() => issues.value.length === 0);

  return { messageOf, enabled, isValid };
}
