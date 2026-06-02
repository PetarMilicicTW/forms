import { PToast } from '@porsche-design-system/components-react';
import { SignUp } from './sign-up/sign-up';

export function App() {
  return (
    <div className="flex h-dvh w-dvw items-center justify-center">
      <SignUp />
      <PToast />
    </div>
  );
}
