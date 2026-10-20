'use client'

import { useEffect, useRef } from 'react'

const TURNSTILE_SCRIPT =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

/**
 * Explicit Turnstile rendering keeps the widget inside the feedback form and
 * lets us reset it after a failed submission without reloading the page.
 */
export default function TurnstileWidget({
  siteKey,
  onVerify,
  onExpire,
  onError
}) {
  const containerRef = useRef(null)
  const callbacksRef = useRef({ onVerify, onExpire, onError })

  callbacksRef.current = { onVerify, onExpire, onError }

  useEffect(() => {
    if (!siteKey || !containerRef.current) return

    const container = containerRef.current
    container.querySelectorAll('.cf-turnstile').forEach(element =>
      element.remove()
    )
    window.__ftTurnstileVerify = token =>
      callbacksRef.current.onVerify?.(token)
    window.__ftTurnstileExpire = () => callbacksRef.current.onExpire?.()
    window.__ftTurnstileError = () => callbacksRef.current.onError?.()

    const widget = document.createElement('div')
    widget.className = 'cf-turnstile'
    widget.dataset.sitekey = siteKey
    widget.dataset.action = 'feedback'
    widget.dataset.theme = 'auto'
    widget.dataset.callback = '__ftTurnstileVerify'
    widget.dataset.expiredCallback = '__ftTurnstileExpire'
    widget.dataset.errorCallback = '__ftTurnstileError'
    let script = document.querySelector('script[data-ft-turnstile]')
    if (!script) {
      script = document.createElement('script')
      script.src = TURNSTILE_SCRIPT
      script.dataset.ftTurnstile = 'true'
      script.async = true
      script.defer = true
      document.head.appendChild(script)
    }

    const render = () => window.turnstile?.render?.(widget)
    if (window.turnstile?.render) render()
    else script.addEventListener('load', render, { once: true })
    container.appendChild(widget)

    return () => {
      window.turnstile?.remove?.(widget)
      delete window.__ftTurnstileVerify
      delete window.__ftTurnstileExpire
      delete window.__ftTurnstileError
    }
  }, [siteKey])

  return (
    <div
      ref={containerRef}
      className='feedback-turnstile-widget'
      data-testid='ft-turnstile-widget'
    />
  )
}
