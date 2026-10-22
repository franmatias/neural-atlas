import { expect, it } from 'vitest';
import { trapDialogFocus } from '@/shared/ui/dialog-focus';
it('mantiene Tab y Mayús+Tab dentro del diálogo sin interceptar otras teclas', () => {
  const dialog = document.createElement('dialog');
  dialog.innerHTML =
    '<button>Close</button><input /><button disabled>Disabled</button><button>Reset</button>';
  document.body.append(dialog);
  dialog.addEventListener('keydown', trapDialogFocus);
  const first = dialog.querySelector('button')!;
  const last = dialog.querySelectorAll('button')[2]!;
  first.focus();
  const backwards = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, cancelable: true });
  dialog.dispatchEvent(backwards);
  expect(document.activeElement).toBe(last);
  expect(backwards.defaultPrevented).toBe(true);
  dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', cancelable: true }));
  expect(document.activeElement).toBe(first);
  const enter = new KeyboardEvent('keydown', { key: 'Enter', cancelable: true });
  dialog.dispatchEvent(enter);
  expect(enter.defaultPrevented).toBe(false);
  dialog.querySelector('input')!.focus();
  const middle = new KeyboardEvent('keydown', { key: 'Tab', cancelable: true });
  dialog.dispatchEvent(middle);
  expect(middle.defaultPrevented).toBe(false);
  dialog.remove();
});
