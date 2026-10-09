/** True when a key press belongs to something else: a text field, or any open dialog (sign-in, stats, archive) */
export const keyIsElsewhere = (e: KeyboardEvent) =>
  e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || document.querySelector('[role="dialog"]') !== null
