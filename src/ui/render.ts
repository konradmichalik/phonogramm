export function render(root: HTMLElement, html: string): void {
  root.innerHTML = html
}

export function setStatus(text: string, isError = false): void {
  const el = document.querySelector<HTMLDivElement>('#status')
  if (el) {
    el.textContent = text
    el.classList.toggle('error', isError)
  }
}
