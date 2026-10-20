export function focusMissingStudyField(container: HTMLElement | null) {
  if (!container) return;
  const fields = [...container.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('[aria-required="true"]')];
  const target = fields.find(field => field.getAttribute('aria-invalid') === 'true') || fields.find(field => !field.value.trim()) || fields[0];
  if (!target) return;
  let details = target.closest('details');
  while (details) { details.open = true; details = details.parentElement?.closest('details'); }
  target.focus({ preventScroll: true });
  target.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
}
