/* Build-time fallback for offline workspaces. Normal installs resolve the Anime.js package. */
type Params = Record<string, unknown>
type Target = string | Element | Element[]
let activeRoot: Element | null = null
const timers = new Set<number>()

function resolveTargets(target: Target): Element[] {
  if (typeof target !== 'string') return Array.isArray(target) ? target : [target]
  return [...(activeRoot ?? document).querySelectorAll(target)]
}

export function animate(target: Target, parameters: Params) {
  const targets = resolveTargets(target)
  const duration = Number(parameters.duration ?? 400)
  const delay = Number(parameters.delay ?? 0)
  const properties = Object.entries(parameters).filter(([key]) => !['duration','delay','ease','onComplete'].includes(key))
  let cancelled = false
  const timer = window.setTimeout(() => {
    timers.delete(timer)
    if (cancelled) return
    targets.forEach((element) => {
      const to: Record<string, string> = {}
      for (const [key, raw] of properties) {
        const value = Array.isArray(raw) ? raw[raw.length - 1] : raw
        to[key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)] = typeof value === 'number' ? String(value) : String(value)
      }
      element.animate(to, { duration, easing: 'ease-out', fill: 'forwards' })
    })
    if (typeof parameters.onComplete === 'function') (parameters.onComplete as () => void)()
  }, delay)
  timers.add(timer)
  return { pause() { window.clearTimeout(timer); timers.delete(timer) }, cancel() { cancelled = true; window.clearTimeout(timer); timers.delete(timer) } }
}

export function createTimeline(parameters: { autoplay?: boolean; onComplete?: () => void } = {}) {
  const entries: { targets?: Target; parameters?: Params; callback?: () => void; at: number }[] = []
  const scheduled = new Set<number>()
  let running = false
  let completionTimer = 0
  const timeline = {
    add(targets: Target, animationParameters: Params, position?: number | string) {
      const previousEnd = entries.reduce((end, entry) => Math.max(end, entry.at + Number(entry.parameters?.duration ?? 400)), 0)
      const at = typeof position === 'number' ? position : position === '<' ? Math.max(0, previousEnd - Number(animationParameters.duration ?? 400)) : previousEnd
      entries.push({ targets, parameters: animationParameters, at })
      if (parameters.autoplay !== false && !running) timeline.play()
      return timeline
    },
    call(callback: () => void, position?: number | string) {
      const previousEnd = entries.reduce((end, entry) => Math.max(end, entry.at + Number(entry.parameters?.duration ?? 400)), 0)
      entries.push({ callback, at: typeof position === 'number' ? position : previousEnd })
      return timeline
    },
    play() {
      if (running) return timeline
      running = true
      for (const entry of entries) {
        const timer = window.setTimeout(() => { scheduled.delete(timer); timers.delete(timer); if (running) { if (entry.callback) entry.callback(); else if (entry.targets && entry.parameters) animate(entry.targets, entry.parameters) } }, entry.at)
        timers.add(timer); scheduled.add(timer)
      }
      const end = entries.reduce((value, entry) => Math.max(value, entry.at + Number(entry.parameters?.duration ?? 400)), 0)
      completionTimer = window.setTimeout(() => { running = false; parameters.onComplete?.() }, end + 20)
      timers.add(completionTimer)
      return timeline
    },
    pause() { running = false; window.clearTimeout(completionTimer); timers.delete(completionTimer); for (const timer of scheduled) { window.clearTimeout(timer); timers.delete(timer) }; scheduled.clear(); return timeline },
    cancel() { return timeline.pause() },
    restart() { timeline.pause(); return timeline.play() },
    reset() { timeline.pause(); return timeline },
  }
  return timeline
}

export function createScope({ root }: { root?: Element | { current: Element | null } } = {}) {
  let rootElement = root && 'current' in root ? root.current : root ?? null
  return {
    add(callback: (scope: { add(name: string, method: (...args: unknown[]) => void): void }) => void) {
      const previousRoot = activeRoot
      activeRoot = rootElement
      callback({ add() {} })
      activeRoot = previousRoot
      return this
    },
    revert() { for (const timer of timers) window.clearTimeout(timer); timers.clear(); rootElement = null },
  }
}

export const stagger = (value: number) => value
export const svg = { createMotionPath: () => ({ translateX: [0, 810], translateY: [0, 135] }) }
