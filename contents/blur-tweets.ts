import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["https://x.com/*", "https://twitter.com/*"]
}

const SELECTOR = '[data-testid="tweetText"]'
const PROCESSED_ATTR = "data-3lines-processed"
const MAX_LINES = 3
const BLUR_PX = 8

function getLineHeight(el: HTMLElement): number {
  const style = getComputedStyle(el)
  const lh = parseFloat(style.lineHeight)
  if (lh > 0) return lh

  const fallback = parseFloat(style.fontSize) * 1.2 || 20

  const container = el.parentElement
  if (!container) return fallback

  const temp = document.createElement("div")
  temp.style.font = style.font
  temp.style.visibility = "hidden"
  temp.style.position = "absolute"
  temp.textContent = "A"
  try {
    container.appendChild(temp)
    const h = temp.offsetHeight
    return h > 0 ? h : fallback
  } finally {
    temp.remove()
  }
}

function isOverMaxLines(el: HTMLElement, lineHeight: number): boolean {
  const overlay = el.querySelector(".three-lines-overlay") as HTMLElement | null
  if (overlay) overlay.style.display = "none"
  const style = getComputedStyle(el)
  const paddingTop = parseFloat(style.paddingTop) || 0
  const paddingBottom = parseFloat(style.paddingBottom) || 0
  const contentHeight = el.scrollHeight - paddingTop - paddingBottom
  if (overlay) overlay.style.display = ""
  return contentHeight > lineHeight * MAX_LINES
}

function applyBlur(el: HTMLElement, lineHeight: number): void {
  const overlay = el.querySelector(".three-lines-overlay") as HTMLElement | null

  if (!isOverMaxLines(el, lineHeight)) {
    if (overlay) overlay.remove()
    el.style.removeProperty("position")
    return
  }

  const style = getComputedStyle(el)
  const paddingTop = parseFloat(style.paddingTop) || 0
  const top = paddingTop + lineHeight * MAX_LINES

  if (overlay) {
    overlay.style.top = `${top}px`
    return
  }

  el.style.position = "relative"

  const div = document.createElement("div")
  div.className = "three-lines-overlay"
  Object.assign(div.style, {
    position: "absolute",
    top: `${top}px`,
    bottom: "0",
    left: "0",
    right: "0",
    backdropFilter: `blur(${BLUR_PX}px)`,
    pointerEvents: "none"
  })
  el.appendChild(div)
}

const resizeObserver = new ResizeObserver((entries) => {
  for (const entry of entries) {
    try {
      const el = entry.target as HTMLElement
      if (!el.isConnected) {
        resizeObserver.unobserve(el)
        continue
      }
      const lineHeight = getLineHeight(el)
      applyBlur(el, lineHeight)
    } catch (err) {
      console.error("[3-lines] Failed to process resized tweet:", err)
    }
  }
})

function processTweet(el: HTMLElement): void {
  if (el.hasAttribute(PROCESSED_ATTR)) return
  if (!el.isConnected) return

  const lineHeight = getLineHeight(el)
  applyBlur(el, lineHeight)

  el.setAttribute(PROCESSED_ATTR, "")
  resizeObserver.observe(el)
}

function processAllTweets(): void {
  document.querySelectorAll<HTMLElement>(SELECTOR).forEach((el) => {
    try {
      processTweet(el)
    } catch (err) {
      console.error("[3-lines] Failed to process tweet:", err)
    }
  })
}

let pending = false
const mutationObserver = new MutationObserver(() => {
  if (pending) return
  pending = true
  requestAnimationFrame(() => {
    try {
      processAllTweets()
    } finally {
      pending = false
    }
  })
})

processAllTweets()
mutationObserver.observe(document.body, { childList: true, subtree: true })
