export function focusPublicMainContent(event: MouseEvent, target: HTMLElement | null) {
  event.preventDefault();
  target?.focus();
}
