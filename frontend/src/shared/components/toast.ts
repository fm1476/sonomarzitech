export function toast(message: string, isError = false): void {
  const container = document.getElementById('toastWrap');
  if (!container) return;
  const element = document.createElement('div');
  element.className = 'toast' + (isError ? ' err' : '');
  element.setAttribute('role', isError ? 'alert' : 'status');
  element.textContent = message;
  container.appendChild(element);
  setTimeout(() => element.remove(), 3200);
}
