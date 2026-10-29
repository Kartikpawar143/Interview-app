export type Navigate = (path: string) => void

export function goTo(path: string, navigate?: Navigate) {
  if (navigate) navigate(path)
  else window.location.assign(path)
}
