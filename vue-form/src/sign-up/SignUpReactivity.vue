<script setup lang="ts">
import {
  PBanner,
  PButton,
  PHeading,
  PInputEmail,
  PInputPassword,
} from '@porsche-design-system/components-vue';
import { reactive, ref } from 'vue';
import { useSignUpValidation, type Field } from './useSignUpValidation';
import { useSignUpSubmit } from './useSignUpSubmit';

let changeDetectionCycleCount = 0;
const getChangeDetectionCycleCount = () => ++changeDetectionCycleCount;

const values = reactive<Record<Field, string>>({ email: '', password: '', confirmPassword: '' });
const dirty = reactive<Record<Field, boolean>>({
  email: false,
  password: false,
  confirmPassword: false,
});
const blurred = reactive<Record<Field, boolean>>({
  email: false,
  password: false,
  confirmPassword: false,
});
const submitAttempted = ref(false);

const { messageOf, enabled, isValid } = useSignUpValidation(() => values);
const { isSubmitting, banner, submit, dismissBanner } = useSignUpSubmit(isValid, () => {
  submitAttempted.value = true;
});

const showError = (field: Field): boolean =>
  enabled.value[field] && !!messageOf(field) && (blurred[field] || submitAttempted.value);
const stateOf = (field: Field) => (showError(field) ? 'error' : 'none');
const messageFor = (field: Field) => (showError(field) ? messageOf(field) : '');

function resetField(field: Field): void {
  values[field] = '';
  dirty[field] = false;
  blurred[field] = false;
}

function onChange(field: Field, value: string): void {
  if (value === values[field]) return; // distinctUntilChanged
  values[field] = value;
  dirty[field] = true;
  // Editing a field clears any dirty downstream fields, mirroring the Angular cascade.
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

function cancel(): void {
  resetField('email');
  resetField('password');
  resetField('confirmPassword');
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
