<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  PorscheDesignSystemProvider,
  PTabsBar,
  PToast,
} from '@porsche-design-system/components-vue';
import SignUpReactivity from './sign-up/SignUpReactivity.vue';
import SignUpVeeValidate from './sign-up/SignUpVeeValidate.vue';
import SignUpTanstack from './sign-up/SignUpTanstack.vue';

const variants = [
  { label: 'Reactivity', component: SignUpReactivity },
  { label: 'VeeValidate', component: SignUpVeeValidate },
  { label: 'TanStack Form', component: SignUpTanstack },
];
const activeTabIndex = ref(0);
const activeComponent = computed(
  () => variants[activeTabIndex.value]?.component ?? SignUpReactivity,
);
</script>

<template>
  <PorscheDesignSystemProvider>
    <div class="flex min-h-dvh w-dvw flex-col items-center justify-center gap-10 p-8">
      <PTabsBar
        :active-tab-index="activeTabIndex"
        @update="(e: { activeTabIndex: number }) => (activeTabIndex = e.activeTabIndex)"
      >
        <button v-for="variant in variants" :key="variant.label" type="button">
          {{ variant.label }}
        </button>
      </PTabsBar>

      <component :is="activeComponent" />

      <PToast />
    </div>
  </PorscheDesignSystemProvider>
</template>
