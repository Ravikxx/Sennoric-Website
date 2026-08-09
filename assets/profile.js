/* Signed-in profile menu. Include on any page with a top <nav>.
 * Shows an avatar in the top-right when localStorage.sennoric_token exists;
 * clicking it opens a dropdown (Chat, API Keys, Settings, Admin, Log out).
 * Settings links to /settings — a real page, not a modal.
 */
(function () {
  'use strict'
  var API = 'https://api.sennoric.com'

  // Safety net for pages that don't also load storage-migrate.js directly:
  // pre-rebrand axion_* keys still hold a signed-in user's real session.
  ;['token', 'email', 'avatar_url', 'chat_model'].forEach(function (key) {
    var oldKey = 'axion_' + key
    var oldValue = localStorage.getItem(oldKey)
    if (oldValue === null) return
    var newKey = 'sennoric_' + key
    if (localStorage.getItem(newKey) === null) localStorage.setItem(newKey, oldValue)
    localStorage.removeItem(oldKey)
  })

  var token = localStorage.getItem('sennoric_token')
  var email = localStorage.getItem('sennoric_email') || ''
  if (!token) return // not signed in — leave the default nav (Get started / Sign in)

  var nav = document.querySelector('nav')
  if (!nav) return

  function el(tag, cls, html) {
    var e = document.createElement(tag)
    if (cls) e.className = cls
    if (html != null) e.innerHTML = html
    return e
  }

  // ── Build avatar + menu ──────────────────────────────────────────────
  var wrap = el('div', 'ax-profile')
  var initial = (email.trim()[0] || 'A').toUpperCase()
  var avatar = el('button', 'ax-avatar', initial)
  avatar.setAttribute('aria-label', 'Account menu')
  wrap.appendChild(avatar)

  function cacheAvatar(url) {
    if (url) localStorage.setItem('sennoric_avatar_url', url)
    else localStorage.removeItem('sennoric_avatar_url')
  }

  function renderAvatar(url) {
    avatar.dataset.avatarUrl = url || ''
    avatar.textContent = initial
    if (!url) return
    var image = document.createElement('img')
    image.alt = ''
    image.decoding = 'async'
    image.src = url
    image.addEventListener('load', function () {
      if (avatar.dataset.avatarUrl === url) avatar.replaceChildren(image)
    })
    image.addEventListener('error', function () {
      if (avatar.dataset.avatarUrl !== url) return
      if (localStorage.getItem('sennoric_avatar_url') === url) cacheAvatar('')
      avatar.textContent = initial
    })
  }

  renderAvatar(localStorage.getItem('sennoric_avatar_url') || '')

  var menu = el('div', 'ax-menu')
  menu.innerHTML =
    '<a class="ax-menu-head" href="/settings" title="Open settings" aria-label="Open account settings"><div class="ax-hi">Signed in as</div><div class="ax-email"></div></a>' +
    '<div class="ax-menu-group-label">Navigate</div>' +
    '<a class="ax-menu-item" href="/chat">Chat</a>' +
    '<a class="ax-menu-item" href="/keys">API Keys</a>' +
    '<div class="ax-menu-group-label">Account</div>' +
    '<a class="ax-menu-item" href="/settings">Settings</a>' +
    '<div class="ax-admin-slot"></div>' +
    '<div class="ax-menu-sep"></div>' +
    '<button class="ax-menu-item danger" data-act="logout">Log out</button>'
  menu.querySelector('.ax-email').textContent = email || 'your account'
  wrap.appendChild(menu)

  // Place in nav-right if present, else push to the right of the nav.
  var navRight = nav.querySelector('.nav-right')
  if (navRight) {
    var getStarted = navRight.querySelector('.nav-btn')
    if (getStarted) getStarted.classList.add('ax-hidden') // already signed in
    navRight.appendChild(wrap)
  } else {
    wrap.style.marginLeft = 'auto'
    nav.appendChild(wrap)
  }

  // ── Toggle menu ──────────────────────────────────────────────────────
  function closeMenu() { menu.classList.remove('open') }
  avatar.addEventListener('click', function (e) {
    e.stopPropagation()
    menu.classList.toggle('open')
  })
  document.addEventListener('click', function (e) {
    if (!wrap.contains(e.target)) closeMenu()
  })
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu() })

  var profileController = new AbortController()
  var profileTimeout = setTimeout(function () { profileController.abort() }, 8000)
  fetch(API + '/dashboard/account', {
    headers: { Authorization: 'Bearer ' + token },
    signal: profileController.signal,
  })
    .then(function (response) { return response.ok ? response.json() : null })
    .then(function (account) {
      if (!account) return
      cacheAvatar(account.avatar_url || '')
      renderAvatar(account.avatar_url || '')
    })
    .catch(function () {})
    .finally(function () { clearTimeout(profileTimeout) })

  // ── Admin link (only if the user is an admin) ────────────────────────
  var adminController = new AbortController()
  var adminTimeout = setTimeout(function () { adminController.abort() }, 8000)
  fetch(API + '/admin/check', {
    headers: { Authorization: 'Bearer ' + token },
    signal: adminController.signal,
  })
    .then(function (r) { return r.json() })
    .then(function (d) {
      if (d && d.admin) {
        var a = el('a', 'ax-menu-item', 'Admin')
        a.href = '/admin'
        menu.querySelector('.ax-admin-slot').appendChild(a)
      }
    })
    .catch(function () {})
    .finally(function () { clearTimeout(adminTimeout) })

  // ── Actions ──────────────────────────────────────────────────────────
  menu.addEventListener('click', function (e) {
    var item = e.target.closest('[data-act]')
    if (!item) return
    if (item.dataset.act === 'logout') {
      localStorage.removeItem('sennoric_token')
      localStorage.removeItem('sennoric_email')
      localStorage.removeItem('sennoric_avatar_url')
      localStorage.removeItem('axion_token')
      localStorage.removeItem('axion_email')
      localStorage.removeItem('axion_avatar_url')
      location.href = '/'
    }
  })
})()
