/* paper-motion.js — shared polish for pages on the paper shell.
 *
 * Progressive: every page works with this file missing. It only adds motion
 * and small conveniences, and the CSS that hides things before they reveal
 * is gated on the `html.js` class this file sets, so nothing is ever hidden
 * without the script that shows it again.
 *
 *   nav.scrolled          set once the page has scrolled past the top
 *   [data-reveal]         fades/rises into view once (also [data-row])
 *   [data-reveal-group]   children reveal in sequence, 70ms apart
 *   .code                 gets a Copy button
 *   [data-count]          animates its number when it scrolls into view
 */
;(function () {
  'use strict'
  var root = document.documentElement
  root.classList.add('js')
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // ── Nav: a shadow once the paper has scrolled under it ─────────────────
  var nav = document.querySelector('body > nav')
  if (nav) {
    var scrolledState = null
    function onScroll() {
      var s = (window.scrollY || window.pageYOffset) > 8
      if (s !== scrolledState) { scrolledState = s; nav.classList.toggle('scrolled', s) }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
  }

  // ── Reveal on entry ────────────────────────────────────────────────────
  // body[data-reveal-auto="selector"] opts a page's repeating blocks in
  // without marking each one up. Only blocks below the first screen are
  // hidden, so nothing already visible blinks; siblings stagger slightly.
  var auto = document.body.getAttribute('data-reveal-auto')
  if (auto) {
    var fold = window.innerHeight * 0.9, seen = []
    ;[].slice.call(document.querySelectorAll(auto)).forEach(function (el) {
      if (el.hasAttribute('data-reveal') || el.getBoundingClientRect().top < fold) return
      el.setAttribute('data-reveal', '')
      var parent = el.parentNode, n = 0
      for (var i = 0; i < seen.length; i++) if (seen[i] === parent) n++
      seen.push(parent)
      el.style.transitionDelay = (Math.min(n, 5) * 60) + 'ms'
    })
  }
  var groups = [].slice.call(document.querySelectorAll('[data-reveal-group]'))
  groups.forEach(function (g) {
    var step = parseInt(g.getAttribute('data-reveal-group'), 10) || 70
    ;[].slice.call(g.children).forEach(function (child, i) {
      if (!child.hasAttribute('data-reveal')) child.setAttribute('data-reveal', '')
      child.style.transitionDelay = (i * step) + 'ms'
    })
  })
  var targets = [].slice.call(document.querySelectorAll('[data-reveal], [data-row]'))
  function show(el) { el.classList.add('in') }
  if (reduced || !('IntersectionObserver' in window)) {
    targets.forEach(show)
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return
        show(en.target)
        io.unobserve(en.target)
      })
    }, { threshold: 0, rootMargin: '0px 0px -6% 0px' })
    targets.forEach(function (el) { io.observe(el) })
  }

  // ── Count-up numbers ───────────────────────────────────────────────────
  var counters = [].slice.call(document.querySelectorAll('[data-count]'))
  function countUp(el) {
    var raw = el.textContent.trim()
    var m = raw.match(/([\d][\d,]*(?:\.\d+)?)/)
    if (!m) return
    var target = parseFloat(m[1].replace(/,/g, ''))
    if (!isFinite(target)) return
    var decimals = (m[1].split('.')[1] || '').length
    var prefix = raw.slice(0, m.index), suffix = raw.slice(m.index + m[1].length)
    var start = performance.now(), dur = 1100
    function tick(now) {
      var p = Math.min((now - start) / dur, 1)
      var eased = 1 - Math.pow(1 - p, 3)
      el.textContent = prefix + (target * eased).toFixed(decimals) + suffix
      if (p < 1) requestAnimationFrame(tick)
      else el.textContent = raw
    }
    requestAnimationFrame(tick)
  }
  if (counters.length) {
    if (reduced || !('IntersectionObserver' in window)) { /* leave the real numbers */ }
    else {
      var cio = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) { countUp(en.target); cio.unobserve(en.target) } })
      }, { threshold: 0.6 })
      counters.forEach(function (el) { cio.observe(el) })
    }
  }

  // ── Copy buttons on code blocks ────────────────────────────────────────
  function codeText(block) {
    var clone = block.cloneNode(true)
    ;[].slice.call(clone.querySelectorAll('.copy')).forEach(function (b) { b.parentNode.removeChild(b) })
    // Blocks built from .ln spans hold one line per span with no newline
    // characters between them; rebuild the text line by line in that case.
    var lns = [].slice.call(clone.querySelectorAll('.ln'))
    var text = lns.length ? lns.map(function (l) { return l.textContent }).join('\n') : clone.textContent
    return text
      .split('\n')
      .map(function (l) { return l.replace(/^\s*[$›>]\s/, '') })
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  }
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text)
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea')
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.top = '-1000px'
      document.body.appendChild(ta); ta.select()
      try { document.execCommand('copy'); resolve() } catch (e) { reject(e) }
      document.body.removeChild(ta)
    })
  }
  ;[].slice.call(document.querySelectorAll('.code')).forEach(function (block) {
    if (block.hasAttribute('data-nocopy') || block.querySelector('.copy')) return
    var btn = document.createElement('button')
    btn.type = 'button'; btn.className = 'copy'; btn.textContent = 'Copy'
    btn.setAttribute('aria-label', 'Copy code')
    btn.addEventListener('click', function () {
      copyText(codeText(block)).then(function () {
        btn.textContent = 'Copied'; btn.classList.add('done')
        setTimeout(function () { btn.textContent = 'Copy'; btn.classList.remove('done') }, 1600)
      }, function () { btn.textContent = 'Press ⌘C' })
    })
    block.appendChild(btn)
  })
})()
