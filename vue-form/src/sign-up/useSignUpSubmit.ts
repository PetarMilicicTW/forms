import { useToastManager } from '@porsche-design-system/components-vue';
import { reactive, ref, toValue, type MaybeRefOrGetter } from 'vue';

// Owns the library-agnostic submit lifecycle shared by all three forms: gate on
// validity, fake an async request, then surface success as a toast and failure
// as a banner. `submitCount` alternates success/error so the demo shows both
// paths. `onInvalid` lets each form flip its own "submit attempted" flag.
export function useSignUpSubmit(isValid: MaybeRefOrGetter<boolean>, onInvalid: () => void) {
  const { addMessage } = useToastManager();
  const isSubmitting = ref(false);
  const banner = reactive({
    open: false,
    heading: '',
    description: '',
    state: 'info' as 'info' | 'error',
  });
  let submitCount = 0;

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
    if (!toValue(isValid)) {
      onInvalid();
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

  function dismissBanner(): void {
    banner.open = false;
  }

  return { isSubmitting, banner, submit, dismissBanner };
}
