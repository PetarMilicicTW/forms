import { test, expect, type Page } from '@playwright/test';

/**
 * Differential test: the Angular sign-up form is the ground truth. Each of the
 * three React forms (useReducer / TanStack / RHF) is driven through the same
 * scenarios and its rendered state is compared, step by step, to Angular's.
 *
 * Both dev servers are started automatically by `webServer` in playwright.config.ts
 * (react-form :5173, angular-form :4200).
 */

const REACT = 'http://localhost:5173';
const VUE = 'http://localhost:5174';
const ANGULAR = 'http://localhost:4200';

type AppTarget = { url: string; tab: number | null };

// Angular shows its single form (`tab: null`). The React and Vue apps each show
// one form at a time via a PTabsBar — the tab index selects the variant.
const ANGULAR_APP: AppTarget = { url: ANGULAR, tab: null };

// Each entry is compared, scenario by scenario, against the Angular form.
const TARGETS: { name: string; target: AppTarget }[] = [
  { name: 'react-reducer', target: { url: REACT, tab: 0 } },
  { name: 'react-tanstack', target: { url: REACT, tab: 1 } },
  { name: 'react-rhf', target: { url: REACT, tab: 2 } },
  { name: 'vue-reactivity', target: { url: VUE, tab: 0 } },
  { name: 'vue-veevalidate', target: { url: VUE, tab: 1 } },
  { name: 'vue-tanstack', target: { url: VUE, tab: 2 } },
];

// Injected into the page. Captures the state a user actually sees — including
// the rendered validation message from the PDS input shadow DOM (#message),
// which is only populated when state==='error' (not the `message` property).
const HELPERS = `
window.__h = {
  hosts: () => [...document.querySelectorAll('p-input-email,p-input-password')],
  host(label){ return this.hosts().find(h => (h.label||h.getAttribute('label')||'').toLowerCase() === label.toLowerCase()); },
  setValue(label, val){ const h=this.host(label); if(!h||h.disabled) return; h.value=val; h.dispatchEvent(new Event('input',{bubbles:true})); },
  blur(label){ const h=this.host(label); if(!h) return; h.dispatchEvent(new Event('blur',{bubbles:true})); },
  clickTab(i){ const t=[...document.querySelectorAll('p-tabs-bar button')]; if(t[i]) t[i].click(); },
  deepText(node){ node=node||document.body; let t=''; const walk=(n)=>{ if(!n) return; if(n.nodeType===3){t+=n.textContent+' ';return;} if(n.shadowRoot) walk(n.shadowRoot); n.childNodes && n.childNodes.forEach(walk); }; walk(node); return t; },
  field(label){ const h=this.host(label); if(!h) return null; const m=h.shadowRoot && h.shadowRoot.querySelector('#message'); return { value: h.value ?? '', disabled: !!h.disabled, state: h.state ?? 'none', shown: m ? (m.textContent||'').trim() : '' }; },
  snapshot(){
    const banner=document.querySelector('p-banner');
    const submitBtn=[...document.querySelectorAll('p-button')].find(b => (b.textContent||'').trim().toLowerCase()==='submit');
    return {
      email: this.field('E-mail'),
      password: this.field('Password'),
      confirm: this.field('Confirm password'),
      banner: banner ? { open: !!banner.open, heading: banner.heading ?? '', description: banner.description ?? '', state: banner.state ?? '' } : null,
      submitLoading: submitBtn ? !!submitBtn.loading : null,
      toastSuccess: this.deepText(document).includes('Fake success'),
    };
  },
  act(s){
    if (s.action==='set') return this.setValue(s.label, s.value);
    if (s.action==='blur') return this.blur(s.label);
    if (s.action==='submit'){ document.querySelector('form').requestSubmit(); return; }
    if (s.action==='cancel'){ const b=[...document.querySelectorAll('p-button')].find(x=>(x.textContent||'').trim().toLowerCase()==='cancel'); if(b) b.click(); return; }
  },
};`;

type Step =
  | { action: 'set'; label: string; value: string; wait?: number }
  | { action: 'blur'; label: string; wait?: number }
  | { action: 'submit'; wait?: number }
  | { action: 'cancel'; wait?: number };
type Scenario = { name: string; steps: Step[]; ignore?: string[] };

// The `HELPERS` script defines `window.__h` in the page context.
declare global {
  interface Window {
    __h: {
      clickTab(i: number): void;
      act(step: Step): void;
      snapshot(): unknown;
    };
  }
}

const set = (label: string, value: string): Step => ({ action: 'set', label, value });
const blur = (label: string): Step => ({ action: 'blur', label });
// A step with an explicit `wait` is sampled at that fixed time (for intrinsic
// timing — the loading window and the 1s toast/banner). Steps without `wait`
// settle: the runner polls until the rendered snapshot stops changing.
const submit = (wait?: number): Step =>
  wait != null ? { action: 'submit', wait } : { action: 'submit' };
const cancel = (): Step => ({ action: 'cancel' });
const EMAIL = 'test@example.com';
const PW = 'Password1!';

const SCENARIOS: Scenario[] = [
  { name: 'initial-state', steps: [] },
  { name: 'email-required-on-blur', steps: [blur('E-mail')] },
  { name: 'email-invalid-format', steps: [set('E-mail', 'abc'), blur('E-mail')] },
  { name: 'error-not-shown-before-touch', steps: [set('E-mail', 'abc')] },
  { name: 'valid-email-enables-password', steps: [set('E-mail', EMAIL)] },
  { name: 'password-required', steps: [set('E-mail', EMAIL), blur('Password')] },
  {
    name: 'password-minlength',
    steps: [set('E-mail', EMAIL), set('Password', 'Ab1!'), blur('Password')],
  },
  {
    name: 'password-pattern-invalid-char',
    steps: [set('E-mail', EMAIL), set('Password', 'Abcdefg h'), blur('Password')],
  },
  {
    name: 'password-pattern-wins-over-minlength',
    steps: [set('E-mail', EMAIL), set('Password', 'ab cd'), blur('Password')],
  },
  {
    name: 'password-allows-hyphen',
    steps: [set('E-mail', EMAIL), set('Password', 'Pass-word1'), blur('Password')],
  },
  {
    name: 'password-rejects-bracket',
    steps: [set('E-mail', EMAIL), set('Password', 'Pass[word1'), blur('Password')],
  },
  {
    name: 'password-requires-letter',
    steps: [set('E-mail', EMAIL), set('Password', '1234567!'), blur('Password')],
  },
  {
    name: 'password-requires-number',
    steps: [set('E-mail', EMAIL), set('Password', 'Password!'), blur('Password')],
  },
  {
    name: 'password-requires-special',
    steps: [set('E-mail', EMAIL), set('Password', 'Password1'), blur('Password')],
  },
  { name: 'valid-password-enables-confirm', steps: [set('E-mail', EMAIL), set('Password', PW)] },
  {
    name: 'confirm-required',
    steps: [set('E-mail', EMAIL), set('Password', PW), blur('Confirm password')],
  },
  {
    name: 'confirm-mismatch',
    steps: [
      set('E-mail', EMAIL),
      set('Password', PW),
      set('Confirm password', 'Password2'),
      blur('Confirm password'),
    ],
  },
  {
    name: 'confirm-match-clears-error',
    steps: [
      set('E-mail', EMAIL),
      set('Password', PW),
      set('Confirm password', 'Password2'),
      blur('Confirm password'),
      set('Confirm password', PW),
    ],
  },
  {
    name: 'cascade-edit-email-wipes-password+confirm',
    steps: [
      set('E-mail', EMAIL),
      set('Password', PW),
      set('Confirm password', PW),
      set('E-mail', 'other@example.com'),
    ],
  },
  {
    name: 'cascade-invalid-email-disables-downstream',
    steps: [
      set('E-mail', EMAIL),
      set('Password', PW),
      set('Confirm password', PW),
      set('E-mail', 'bad'),
    ],
  },
  {
    name: 'cascade-edit-password-wipes-confirm',
    steps: [
      set('E-mail', EMAIL),
      set('Password', PW),
      set('Confirm password', PW),
      set('Password', 'Password12!'),
    ],
  },
  {
    name: 'distinctUntilChanged-same-value-no-reset',
    steps: [set('E-mail', EMAIL), set('Password', PW), set('E-mail', EMAIL)],
  },
  { name: 'submit-invalid-marks-touched', steps: [set('E-mail', EMAIL), submit()] },
  {
    name: 'submit-shows-loading',
    steps: [set('E-mail', EMAIL), set('Password', PW), set('Confirm password', PW), submit(350)],
  },
  // 1st valid submit (odd) → success toast.
  {
    name: 'submit-valid-success-toast',
    steps: [set('E-mail', EMAIL), set('Password', PW), set('Confirm password', PW), submit(1500)],
  },
  // 2nd valid submit (even) → error banner. `toastSuccess` is ignored here: the
  // first submit's toast auto-dismisses on a timer, so whether it's still
  // visible at this snapshot is non-deterministic across apps.
  {
    name: 'submit-valid-error-banner',
    steps: [
      set('E-mail', EMAIL),
      set('Password', PW),
      set('Confirm password', PW),
      submit(1500),
      submit(1500),
    ],
    ignore: ['toastSuccess'],
  },
  {
    name: 'cancel-resets',
    steps: [set('E-mail', EMAIL), set('Password', PW), set('Confirm password', PW), cancel()],
  },
];

const snapshot = (page: Page) => page.evaluate(() => window.__h.snapshot());

// Poll until the rendered snapshot is stable, then return it. Used for
// synchronous state changes. Two guards make this robust under parallel load:
//   - a minimum elapsed time, so we never return the *pre-change* state before
//     a delayed blur→render has had a chance to occur;
//   - several consecutive equal reads, so a mid-render frame can't look settled.
const INTERVAL = 60;
const MIN_ELAPSED = 360;
const STABLE_READS = 3;
async function settle(page: Page): Promise<unknown> {
  let previous = JSON.stringify(await snapshot(page));
  let stable = 0;
  for (let i = 1; i <= 60; i++) {
    await page.waitForTimeout(INTERVAL);
    const current = JSON.stringify(await snapshot(page));
    stable = current === previous ? stable + 1 : 0;
    previous = current;
    if (stable >= STABLE_READS && i * INTERVAL >= MIN_ELAPSED) return JSON.parse(current);
  }
  return JSON.parse(previous);
}

// Resolve once the active form is genuinely interactive: all three PDS inputs
// upgraded (shadow DOM rendered) and e-mail enabled. Guards against sampling a
// half-rendered page under parallel load (which yielded impossible states like
// a disabled e-mail field).
async function waitReady(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const inputs = [...document.querySelectorAll('p-input-email,p-input-password')] as Array<
        HTMLElement & { label?: string; disabled?: boolean }
      >;
      if (inputs.length < 3) return false;
      const email = inputs.find(
        (h) => (h.label || h.getAttribute('label') || '').toLowerCase() === 'e-mail',
      );
      return !!(email && email.disabled === false && email.shadowRoot?.querySelector('#message'));
    },
    null,
    { timeout: 20_000 },
  );
}

async function runScenario(page: Page, app: AppTarget, scenario: Scenario): Promise<unknown[]> {
  await page.addInitScript({ content: HELPERS });
  await page.goto(app.url, { waitUntil: 'domcontentloaded' });
  await waitReady(page);
  if (app.tab !== null) {
    await page.evaluate((i) => window.__h.clickTab(i), app.tab);
    await waitReady(page);
  }
  const snaps: unknown[] = [await settle(page)];
  for (const step of scenario.steps) {
    await page.evaluate((s) => window.__h.act(s), step);
    // Fixed sample for intrinsic-timing steps (loading window, 1s toast/banner);
    // otherwise wait for the snapshot to settle.
    if (step.wait != null) {
      await page.waitForTimeout(step.wait);
      snaps.push(await snapshot(page));
    } else {
      snaps.push(await settle(page));
    }
  }
  return snaps;
}

// Drop any per-scenario ignored keys (e.g. `toastSuccess`) from every snapshot
// before comparing.
function stripIgnored(snaps: unknown[], ignore: string[] = []): unknown[] {
  if (ignore.length === 0) return snaps;
  return snaps.map((snap) => {
    const copy = { ...(snap as Record<string, unknown>) };
    for (const key of ignore) delete copy[key];
    return copy;
  });
}

for (const { name, target } of TARGETS) {
  test.describe(`${name} matches Angular`, () => {
    for (const scenario of SCENARIOS) {
      test(scenario.name, async ({ browser }) => {
        const context = await browser.newContext();
        const angularPage = await context.newPage();
        const candidatePage = await context.newPage();
        const reference = await runScenario(angularPage, ANGULAR_APP, scenario);
        const actual = await runScenario(candidatePage, target, scenario);
        await context.close();
        expect(stripIgnored(actual, scenario.ignore)).toEqual(
          stripIgnored(reference, scenario.ignore),
        );
      });
    }
  });
}
