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
const ANGULAR = 'http://localhost:4200';

type Form = 'reducer' | 'tanstack' | 'rhf';
type AppTarget = { url: string; tab: number | null };

// The React app shows one form at a time via a PTabsBar (tab 0/1/2); Angular
// shows its single form (`tab: null` = nothing to click).
const APPS: Record<'angular' | Form, AppTarget> = {
  angular: { url: ANGULAR, tab: null },
  reducer: { url: REACT, tab: 0 },
  tanstack: { url: REACT, tab: 1 },
  rhf: { url: REACT, tab: 2 },
};

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
type Scenario = { name: string; steps: Step[] };

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
const submit = (wait = 1300): Step => ({ action: 'submit', wait });
const cancel = (): Step => ({ action: 'cancel', wait: 300 });
const EMAIL = 'test@example.com';
const PW = 'Password1';

const SCENARIOS: Scenario[] = [
  { name: 'initial-state', steps: [] },
  { name: 'email-required-on-blur', steps: [blur('E-mail')] },
  { name: 'email-invalid-format', steps: [set('E-mail', 'abc'), blur('E-mail')] },
  { name: 'error-not-shown-before-touch', steps: [set('E-mail', 'abc')] },
  { name: 'valid-email-enables-password', steps: [set('E-mail', EMAIL)] },
  { name: 'password-required', steps: [set('E-mail', EMAIL), blur('Password')] },
  {
    name: 'password-minlength',
    steps: [set('E-mail', EMAIL), set('Password', 'Abc12'), blur('Password')],
  },
  {
    name: 'password-pattern-invalid-char',
    steps: [set('E-mail', EMAIL), set('Password', 'Abcdefg h'), blur('Password')],
  },
  {
    name: 'password-pattern-wins-over-minlength',
    steps: [set('E-mail', EMAIL), set('Password', 'ab cd'), blur('Password')],
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
      set('Password', 'Password12'),
    ],
  },
  {
    name: 'distinctUntilChanged-same-value-no-reset',
    steps: [set('E-mail', EMAIL), set('Password', PW), set('E-mail', EMAIL)],
  },
  { name: 'submit-invalid-marks-touched', steps: [set('E-mail', EMAIL), submit(300)] },
  {
    name: 'submit-shows-loading',
    steps: [set('E-mail', EMAIL), set('Password', PW), set('Confirm password', PW), submit(350)],
  },
  {
    name: 'submit-valid-toast-then-banner',
    steps: [
      set('E-mail', EMAIL),
      set('Password', PW),
      set('Confirm password', PW),
      submit(1300),
      submit(1300),
    ],
  },
  {
    name: 'cancel-resets',
    steps: [set('E-mail', EMAIL), set('Password', PW), set('Confirm password', PW), cancel()],
  },
];

async function runScenario(page: Page, app: AppTarget, scenario: Scenario): Promise<unknown[]> {
  await page.addInitScript({ content: HELPERS });
  await page.goto(app.url, { waitUntil: 'domcontentloaded' });
  await page
    .waitForFunction(() => document.querySelectorAll('p-input-email').length >= 1, null, {
      timeout: 15_000,
    })
    .catch(() => {});
  await page.waitForTimeout(800);
  if (app.tab !== null) {
    await page.evaluate((i) => window.__h.clickTab(i), app.tab);
    await page.waitForTimeout(400);
  }
  const snaps: unknown[] = [await page.evaluate(() => window.__h.snapshot())];
  for (const step of scenario.steps) {
    await page.evaluate((s) => window.__h.act(s), step);
    await page.waitForTimeout(step.wait ?? 200);
    snaps.push(await page.evaluate(() => window.__h.snapshot()));
  }
  return snaps;
}

const FORMS: Form[] = ['reducer', 'tanstack', 'rhf'];

for (const form of FORMS) {
  test.describe(`${form} form matches Angular`, () => {
    for (const scenario of SCENARIOS) {
      test(scenario.name, async ({ browser }) => {
        const context = await browser.newContext();
        const angularPage = await context.newPage();
        const reactPage = await context.newPage();
        const reference = await runScenario(angularPage, APPS.angular, scenario);
        const actual = await runScenario(reactPage, APPS[form], scenario);
        await context.close();
        expect(actual).toEqual(reference);
      });
    }
  });
}
