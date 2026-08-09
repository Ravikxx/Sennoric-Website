(function () {
  'use strict'

  var API = 'https://api.sennoric.com'
  var STORAGE_KEY = 'sennoric_avatar_url'
  var activeToken = null
  var accountPromise = null

  function initial(email) {
    return (String(email || '').trim().charAt(0) || 'A').toUpperCase()
  }

  function cachedAvatar() {
    return localStorage.getItem(STORAGE_KEY) || ''
  }

  function cacheAvatar(url) {
    if (url) localStorage.setItem(STORAGE_KEY, url)
    else localStorage.removeItem(STORAGE_KEY)
  }

  function renderAvatar(container, email, url) {
    if (!container) return
    container.dataset.avatarUrl = url || ''
    container.classList.remove('has-image')
    container.textContent = initial(email)
    if (!url) return

    var image = document.createElement('img')
    image.alt = ''
    image.decoding = 'async'
    image.src = url
    image.addEventListener('load', function () {
      if (container.dataset.avatarUrl !== url) return
      container.replaceChildren(image)
      container.classList.add('has-image')
    })
    image.addEventListener('error', function () {
      if (container.dataset.avatarUrl !== url) return
      if (cachedAvatar() === url) cacheAvatar('')
      container.classList.remove('has-image')
      container.textContent = initial(email)
    })
  }

  function fetchAccount(token, refresh) {
    if (!token) return Promise.reject(new Error('Not authenticated'))
    if (!refresh && accountPromise && activeToken === token) return accountPromise

    activeToken = token
    var controller = new AbortController()
    var timeout = setTimeout(function () { controller.abort() }, 8000)
    accountPromise = fetch(API + '/dashboard/account', {
      headers: { Authorization: 'Bearer ' + token },
      signal: controller.signal,
    }).then(function (response) {
      if (!response.ok) {
        var error = new Error('Could not load account')
        error.status = response.status
        throw error
      }
      return response.json()
    }).then(function (account) {
      cacheAvatar(account.avatar_url || '')
      return account
    }).finally(function () {
      clearTimeout(timeout)
    })
    return accountPromise
  }

  function clear() {
    activeToken = null
    accountPromise = null
    cacheAvatar('')
  }

  window.SennoricAccountProfile = Object.freeze({
    cachedAvatar: cachedAvatar,
    cacheAvatar: cacheAvatar,
    clear: clear,
    fetchAccount: fetchAccount,
    renderAvatar: renderAvatar,
  })
})()
