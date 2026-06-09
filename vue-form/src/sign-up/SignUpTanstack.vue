<script setup lang="ts">
import {
  PBanner,
  PButton,
  PHeading,
  PInputEmail,
  PInputPassword,
} from '@porsche-design-system/components-vue';
import { useForm } from '@tanstack/vue-form';
import { ref } from 'vue';
import { useSignUpValidation, type Field } from './useSignUpValidation';
import { useSignUpSubmit } from './useSignUpSubmit';

let changeDetectionCycleCount = 0;
const getChangeDetectionCycleCount = () => ++changeDetectionCycleCount;

// No TanStack validators: validation is derived from the live values (avoids
// TanStack's per-event error slots). Errors gate on `isBlurred`, NOT `isTouched`
// — TanStack flips `isTouched` on change, which would show errors while typing.
const form = useForm({
  defaultValues: { email: '', password: '', confirmPassword: '' },
});

const submitAttempted = ref(false);

const formValues = form.useStore((state) => state.values);
const { messageOf, enabled, isValid } = useSignUpValidation(() => formValues.value);
const { isSubmitting, banner, submit, dismissBanner } = useSignUpSubmit(isValid, () => {
  submitAttempted.value = true;
});

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

function cancel(): void {
  form.reset();
  submitAttempted.value = false;
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <!--
      Must be a plain element, not a <PText> (or any component) slot. Vue's
      fine-grained reactivity only re-runs a child component's slot when that
      child itself re-renders; since PText's props never change, its slot is
      treated as stable and the counter would stay frozen at 1. React/Angular
      differ here: they re-render children by default, so the equivalent slot
      re-evaluates every cycle. A native element is patched on every re-render
      of this component, so the function runs once per cycle as intended.
    -->
    <div class="fixed top-4 right-4">
      Change Detection Cycles: {{ getChangeDetectionCycleCount() }}
    </div>

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
