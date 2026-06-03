<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useForm } from '@tanstack/vue-form';
import {
  PBanner,
  PButton,
  PHeading,
  PInputEmail,
  PInputPassword,
  useToastManager,
} from '@porsche-design-system/components-vue';
import { signUpSchema } from './sign-up-schema';

type Field = 'email' | 'password' | 'confirmPassword';

const { addMessage } = useToastManager();

// No TanStack validators: validation is derived from the live values (avoids
// TanStack's per-event error slots). Errors gate on `isBlurred`, NOT `isTouched`
// — TanStack flips `isTouched` on change, which would show errors while typing.
const form = useForm({
  defaultValues: { email: '', password: '', confirmPassword: '' },
});

const submitAttempted = ref(false);
const isSubmitting = ref(false);
const banner = reactive({ open: false, heading: '', description: '', state: 'info' as const });
let submitCount = 0;

const formValues = form.useStore((state) => state.values);
const issues = computed(() => {
  const result = signUpSchema.safeParse(formValues.value);
  return result.success ? [] : result.error.issues;
});
const messageOf = (field: Field) =>
  issues.value.find((issue) => issue.path[0] === field)?.message ?? '';
const emailValid = computed(() => !messageOf('email'));
const passwordValid = computed(() => emailValid.value && !messageOf('password'));
const enabled = computed<Record<Field, boolean>>(() => ({
  email: true,
  password: emailValid.value,
  confirmPassword: passwordValid.value,
}));

const showError = (field: Field, isBlurred: boolean): boolean =>
  enabled.value[field] && !!messageOf(field) && (isBlurred || submitAttempted.value);

function onChange(field: Field, value: string): void {
  if (value === form.getFieldValue(field)) return; // distinctUntilChanged
  form.setFieldValue(field, value);
  // Editing a field clears any dirty downstream fields, mirroring the Angular cascade.
  if (field === 'email' && form.getFieldMeta('password')?.isDirty) {
    form.resetField('password');
    form.resetField('confirmPassword');
  } else if (field === 'password' && form.getFieldMeta('confirmPassword')?.isDirty) {
    form.resetField('confirmPassword');
  }
}

function submit(): void {
  if (!signUpSchema.safeParse(form.state.values).success) {
    submitAttempted.value = true;
    return;
  }
  isSubmitting.value = true;
  window.setTimeout(() => {
    submitCount++;
    isSubmitting.value = false;
    if (submitCount % 2 === 1) {
      addMessage({ text: 'Fake success', state: 'success' });
    } else {
      Object.assign(banner, {
        open: true,
        heading: 'Error',
        description: 'Fake error',
        state: 'error',
      });
    }
  }, 1000);
}

function cancel(): void {
  form.reset();
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
      <form.Field name="email" v-slot="{ field, state }">
        <PInputEmail
          name="email"
          label="E-mail"
          :required="true"
          :value="state.value"
          :disabled="!enabled.email"
          :message="showError('email', state.meta.isBlurred) ? messageOf('email') : ''"
          :state="showError('email', state.meta.isBlurred) ? 'error' : 'none'"
          @update:value="(v: string) => onChange('email', v)"
          @blur="() => field.handleBlur()"
        />
      </form.Field>

      <form.Field name="password" v-slot="{ field, state }">
        <PInputPassword
          name="password"
          label="Password"
          autoComplete="new-password"
          :toggle="true"
          :required="true"
          :value="state.value"
          :disabled="!enabled.password"
          :message="showError('password', state.meta.isBlurred) ? messageOf('password') : ''"
          :state="showError('password', state.meta.isBlurred) ? 'error' : 'none'"
          @update:value="(v: string) => onChange('password', v)"
          @blur="() => field.handleBlur()"
        />
      </form.Field>

      <form.Field name="confirmPassword" v-slot="{ field, state }">
        <PInputPassword
          name="confirmPassword"
          label="Confirm password"
          autoComplete="new-password"
          :toggle="true"
          :required="true"
          :value="state.value"
          :disabled="!enabled.confirmPassword"
          :message="
            showError('confirmPassword', state.meta.isBlurred) ? messageOf('confirmPassword') : ''
          "
          :state="showError('confirmPassword', state.meta.isBlurred) ? 'error' : 'none'"
          @update:value="(v: string) => onChange('confirmPassword', v)"
          @blur="() => field.handleBlur()"
        />
      </form.Field>

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
