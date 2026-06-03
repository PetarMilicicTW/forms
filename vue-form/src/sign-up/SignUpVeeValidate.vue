<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useForm } from 'vee-validate';
import {
  PBanner,
  PButton,
  PHeading,
  PInputEmail,
  PInputPassword,
  useToastManager,
} from '@porsche-design-system/components-vue';
import { signUpSchema, type SignUpValues } from './sign-up-schema';

type Field = keyof SignUpValues;

const { addMessage } = useToastManager();

// VeeValidate owns the form values, submit lifecycle and reset. Validation is
// derived from the Zod schema on every change — VeeValidate's own per-field
// validation/`errors` don't reconcile cleanly with this form's cross-field
// schema + custom cascade, so the schema is the single source of truth.
const { values, setFieldValue, resetForm } = useForm<SignUpValues>({
  validationSchema: signUpSchema,
  initialValues: { email: '', password: '', confirmPassword: '' },
});

const blurred = reactive<Record<Field, boolean>>({
  email: false,
  password: false,
  confirmPassword: false,
});
const dirty = reactive<Record<Field, boolean>>({
  email: false,
  password: false,
  confirmPassword: false,
});
const submitAttempted = ref(false);
const isSubmitting = ref(false);
const banner = reactive({ open: false, heading: '', description: '', state: 'info' as const });
let submitCount = 0;

const issues = computed(() => {
  const result = signUpSchema.safeParse(values);
  return result.success ? [] : result.error.issues;
});
const messageOf = (field: Field): string =>
  issues.value.find((issue) => issue.path[0] === field)?.message ?? '';
const emailValid = computed(() => !messageOf('email'));
const passwordValid = computed(() => emailValid.value && !messageOf('password'));
const enabled = computed<Record<Field, boolean>>(() => ({
  email: true,
  password: emailValid.value,
  confirmPassword: passwordValid.value,
}));

const showError = (field: Field): boolean =>
  enabled.value[field] && !!messageOf(field) && (blurred[field] || submitAttempted.value);
const stateOf = (field: Field) => (showError(field) ? 'error' : 'none');
const messageFor = (field: Field) => (showError(field) ? messageOf(field) : '');

function resetField(field: Field): void {
  setFieldValue(field, '');
  blurred[field] = false;
  dirty[field] = false;
}

function onChange(field: Field, value: string): void {
  if (value === values[field]) return; // distinctUntilChanged
  setFieldValue(field, value);
  dirty[field] = true;
  if (field === 'email' && dirty.password) {
    resetField('password');
    resetField('confirmPassword');
  } else if (field === 'password' && dirty.confirmPassword) {
    resetField('confirmPassword');
  }
}

function onBlur(field: Field): void {
  blurred[field] = true;
}

function fakeSubmit(): Promise<string> {
  return new Promise((resolve, reject) => {
    window.setTimeout(() => {
      submitCount++;
      if (submitCount % 2 === 1) resolve('Fake success');
      else reject(new Error('Fake error'));
    }, 1000);
  });
}

async function submit(): Promise<void> {
  if (!signUpSchema.safeParse(values).success) {
    submitAttempted.value = true;
    return;
  }
  isSubmitting.value = true;
  try {
    const result = await fakeSubmit();
    addMessage({ text: result, state: 'success' });
  } catch (error) {
    Object.assign(banner, {
      open: true,
      heading: 'Error',
      description: (error as Error).message,
      state: 'error',
    });
  } finally {
    isSubmitting.value = false;
  }
}

function cancel(): void {
  resetForm();
  blurred.email = blurred.password = blurred.confirmPassword = false;
  dirty.email = dirty.password = dirty.confirmPassword = false;
  submitAttempted.value = false;
}

function dismissBanner(): void {
  banner.open = false;
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <PHeading>Sign up</PHeading>

    <form
      class="flex w-[400px] min-w-[240px] max-w-[90dvw] flex-col gap-8"
      novalidate
      @submit.prevent="submit"
    >
      <PInputEmail
        name="email"
        label="E-mail"
        :required="true"
        :value="values.email"
        :disabled="!enabled.email"
        :message="messageFor('email')"
        :state="stateOf('email')"
        @update:value="(v: string) => onChange('email', v)"
        @blur="() => onBlur('email')"
      />

      <PInputPassword
        name="password"
        label="Password"
        autoComplete="new-password"
        :toggle="true"
        :required="true"
        :value="values.password"
        :disabled="!enabled.password"
        :message="messageFor('password')"
        :state="stateOf('password')"
        @update:value="(v: string) => onChange('password', v)"
        @blur="() => onBlur('password')"
      />

      <PInputPassword
        name="confirmPassword"
        label="Confirm password"
        autoComplete="new-password"
        :toggle="true"
        :required="true"
        :value="values.confirmPassword"
        :disabled="!enabled.confirmPassword"
        :message="messageFor('confirmPassword')"
        :state="stateOf('confirmPassword')"
        @update:value="(v: string) => onChange('confirmPassword', v)"
        @blur="() => onBlur('confirmPassword')"
      />

      <div class="flex justify-end gap-4">
        <PButton type="button" variant="secondary" @click="cancel">Cancel</PButton>
        <PButton type="submit" :loading="isSubmitting">Submit</PButton>
      </div>
    </form>

    <PBanner
      :open="banner.open"
      :heading="banner.heading"
      heading-tag="h3"
      :description="banner.description"
      :state="banner.state"
      @dismiss="dismissBanner"
    />
  </div>
</template>
