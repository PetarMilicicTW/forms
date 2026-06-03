import { PTabsBar, PToast } from '@porsche-design-system/components-react';
import { useState } from 'react';
import { SignUpReducer } from './sign-up/sign-up-reducer';
import { SignUpRhf } from './sign-up/sign-up-rhf';
import { SignUpTanstack } from './sign-up/sign-up-tanstack';

const VARIANTS = [
  { label: 'useReducer', Form: SignUpReducer },
  { label: 'TanStack Form', Form: SignUpTanstack },
  { label: 'React Hook Form', Form: SignUpRhf },
];

export function App() {
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const ActiveForm = VARIANTS[activeTabIndex].Form;

  return (
    <div className="flex min-h-dvh w-dvw flex-col items-center justify-center gap-10 p-8">
      <PTabsBar
        activeTabIndex={activeTabIndex}
        onUpdate={(e) => setActiveTabIndex(e.detail.activeTabIndex)}
      >
        {VARIANTS.map((variant) => (
          <button key={variant.label} type="button">
            {variant.label}
          </button>
        ))}
      </PTabsBar>

      <ActiveForm />

      <PToast />
    </div>
  );
}
