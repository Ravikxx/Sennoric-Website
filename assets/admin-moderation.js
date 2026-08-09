(function () {
  'use strict'

  const API = 'https://api.sennoric.com'
  const view = document.body.dataset.view
  const token = localStorage.getItem('sennoric_token')

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[char]))
  }

  function dateTime(value) {
    if (!value) return '—'
    return new Date(Number(value)).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  function messageText(content) {
    if (typeof content === 'string') return content
    try { return JSON.stringify(content, null, 2) } catch { return String(content ?? '') }
  }

  function badge(value, extra = '') {
    return `<span class="badge ${esc(extra || value)}">${esc(value)}</span>`
  }

  async function apiFetch(path, options = {}) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 12000)
    return fetch(`${API}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    }).finally(() => clearTimeout(timeout))
  }

  function showError(message) {
    document.getElementById('loading').hidden = true
    const runView = document.getElementById('run-view')
    const accountView = document.getElementById('account-view')
    if (runView) runView.hidden = true
    if (accountView) accountView.hidden = true
    const error = document.getElementById('page-error')
    error.textContent = message
    error.hidden = false
  }

  function showToast(message, isError = false) {
    const toast = document.getElementById('toast')
    toast.textContent = message
    toast.className = `toast${isError ? ' error' : ''}`
    toast.hidden = false
    clearTimeout(showToast.timer)
    showToast.timer = setTimeout(() => { toast.hidden = true }, 5000)
  }

  function conversationHtml(item) {
    const request = Array.isArray(item.request_messages) ? item.request_messages : []
    const messages = request.map(message => `
      <div class="message ${message.role === 'assistant' ? 'assistant' : ''}">
        <div class="message-role">${esc(message.role || 'unknown')}</div>
        <pre>${esc(messageText(message.content))}</pre>
      </div>`).join('')
    return `${messages}
      <div class="message assistant">
        <div class="message-role">Recorded assistant response</div>
        <pre>${esc(item.response_text || '(empty response)')}</pre>
      </div>`
  }

  function caseHtml(item) {
    const disposition = item.human_review_status || 'pending'
    const isFlagged = item.review_status === 'flagged'
    const accountLabel = item.email || (item.user_id ? `Account ${item.user_id}` : 'No account attached')
    const accountHref = item.user_id
      ? `/admin-moderation-account?user=${encodeURIComponent(item.user_id)}`
      : ''
    const canBan = Boolean(item.user_id) && !item.account_banned && !item.account_protected
    const banLabel = item.account_banned
      ? 'Account banned'
      : item.account_protected
        ? 'Protected admin'
        : 'Ban account'
    const accountLink = accountHref
      ? `<a class="account-link" href="${accountHref}">View all ${Number(item.account_flagged_count || 0)} flagged exchange${Number(item.account_flagged_count || 0) === 1 ? '' : 's'} on this account</a>`
      : '<span class="account-link" style="color:var(--muted)">Anonymous exchange — no account history</span>'
    const actions = isFlagged ? `
      <div class="case-actions">
        ${accountLink}
        <button data-action="dismiss" data-message-id="${Number(item.id)}" ${disposition === 'dismissed' ? 'disabled' : ''}>Dismiss finding</button>
        <button data-action="confirm" data-message-id="${Number(item.id)}" ${!item.user_id || disposition === 'confirmed' ? 'disabled' : ''} title="${item.user_id ? 'Confirm this finding on the account' : 'This exchange is not attached to an account'}">Flag account</button>
        <button data-action="ban" data-message-id="${Number(item.id)}" data-account="${esc(accountLabel)}" ${canBan ? '' : 'disabled'} title="${item.account_protected ? 'Admin allowlist accounts cannot be banned from moderation' : ''}">${banLabel}</button>
      </div>` : ''
    const runLink = item.run_id
      ? `<a href="/admin-moderation?run=${encodeURIComponent(item.run_id)}">Run ${esc(item.run_id)}</a>`
      : 'Historical flag (before run tracking)'

    return `
      <article class="case-card" id="message-${Number(item.id)}">
        <div class="case-head">
          <div>
            <h2 class="case-title">message_log #${Number(item.id)}</h2>
            <p class="case-subtitle">${esc(accountLabel)}</p>
          </div>
          <div class="badges">
            ${badge(item.review_status, item.review_status)}
            ${isFlagged ? badge(disposition, disposition) : ''}
            ${item.account_banned ? badge('banned', 'banned') : ''}
          </div>
        </div>
        <div class="identity-grid">
          <div class="identity-cell"><div class="identity-label">Email</div><div class="identity-value">${esc(item.email || 'Not signed in')}</div></div>
          <div class="identity-cell"><div class="identity-label">User ID</div><div class="identity-value">${esc(item.user_id || 'None')}</div></div>
          <div class="identity-cell"><div class="identity-label">Authentication</div><div class="identity-value">${esc(item.auth_type || 'unknown')}</div></div>
          <div class="identity-cell"><div class="identity-label">IP address</div><div class="identity-value">${esc(item.ip || 'unknown')}</div></div>
          <div class="identity-cell"><div class="identity-label">API key ID</div><div class="identity-value">${esc(item.api_key_id || 'None')}</div></div>
          <div class="identity-cell"><div class="identity-label">Model</div><div class="identity-value">${esc(item.model || 'Not recorded')}</div></div>
          <div class="identity-cell"><div class="identity-label">Exchange time</div><div class="identity-value">${esc(dateTime(item.created_at))}</div></div>
          <div class="identity-cell"><div class="identity-label">Moderation run</div><div class="identity-value">${runLink}</div></div>
        </div>
        <div class="finding ${item.review_status === 'error' ? 'error' : ''}">${esc(item.review_notes || 'No reviewer notes recorded.')}</div>
        <div class="conversation">${conversationHtml(item)}</div>
        ${actions}
      </article>`
  }

  function bindActions(container) {
    container.addEventListener('click', async event => {
      const button = event.target.closest('button[data-action]')
      if (!button) return
      const messageId = Number(button.dataset.messageId)
      const action = button.dataset.action
      if (!Number.isSafeInteger(messageId) || messageId < 1) return
      if (action === 'ban') {
        const account = button.dataset.account || 'this account'
        if (!window.confirm(`Ban ${account}? This immediately blocks the account and creates an appeal link.`)) return
      }

      button.disabled = true
      try {
        const path = action === 'ban'
          ? `/admin/moderation/messages/${messageId}/ban`
          : `/admin/moderation/messages/${messageId}/decision`
        const options = { method: 'POST' }
        if (action !== 'ban') {
          options.body = JSON.stringify({ decision: action === 'dismiss' ? 'dismissed' : 'confirmed' })
        }
        const response = await apiFetch(path, options)
        const data = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(data.error || 'The moderation action failed.')
        showToast(action === 'ban'
          ? 'Account banned and appeal created.'
          : action === 'dismiss'
            ? 'Finding dismissed.'
            : 'Finding confirmed on the account.')
        await loadCurrentView()
      } catch (error) {
        button.disabled = false
        showToast(error.message || 'The moderation action failed.', true)
      }
    })
  }

  async function loadRun() {
    const runId = new URLSearchParams(location.search).get('run')
    if (!runId || runId.length > 100) return showError('This moderation run link is invalid.')
    const response = await apiFetch(`/admin/moderation/runs/${encodeURIComponent(runId)}`)
    const data = await response.json().catch(() => ({}))
    if (!response.ok) return showError(data.error || 'Could not load this moderation run.')

    const run = data.run
    document.title = `Moderation run — Sennoric Admin`
    document.getElementById('run-title').textContent = `Review run ${run.id}`
    document.getElementById('run-subtitle').textContent =
      `${run.trigger === 'manual' ? 'Started manually' : 'Started by the hourly scheduler'}${run.started_by ? ` by ${run.started_by}` : ''}.`
    document.getElementById('run-reviewed').textContent = Number(run.reviewed_count || 0).toLocaleString()
    document.getElementById('run-flagged').textContent = Number(run.flagged_count || 0).toLocaleString()
    document.getElementById('run-errors').textContent = Number(run.error_count || 0).toLocaleString()
    document.getElementById('run-time').textContent = dateTime(run.started_at)
    document.getElementById('run-status').innerHTML = badge(run.status, run.status === 'failed' ? 'error' : run.status)
    const list = document.getElementById('case-list')
    list.innerHTML = data.items?.length
      ? data.items.map(caseHtml).join('')
      : '<div class="empty-state">This run produced no flags or operational errors.</div>'
    document.getElementById('loading').hidden = true
    document.getElementById('run-view').hidden = false
  }

  async function loadAccount() {
    const userId = new URLSearchParams(location.search).get('user')
    if (!userId || userId.length > 100) return showError('This account moderation link is invalid.')
    const response = await apiFetch(`/admin/moderation/accounts/${encodeURIComponent(userId)}`)
    const data = await response.json().catch(() => ({}))
    if (!response.ok) return showError(data.error || 'Could not load this account history.')

    const account = data.account
    document.title = `${account.email} moderation — Sennoric Admin`
    document.getElementById('account-title').textContent = account.email
    document.getElementById('account-subtitle').textContent = `Account ${account.id}`
    document.getElementById('account-total').textContent = Number(account.flagged_count || 0).toLocaleString()
    document.getElementById('account-confirmed').textContent = Number(account.confirmed_count || 0).toLocaleString()
    document.getElementById('account-dismissed').textContent = Number(account.dismissed_count || 0).toLocaleString()
    document.getElementById('account-pending').textContent = Number(account.pending_count || 0).toLocaleString()
    document.getElementById('account-status').innerHTML = account.banned
      ? `${badge('banned', 'banned')} ${esc(account.ban_reason || '')}`
      : badge('active')
    const list = document.getElementById('case-list')
    list.innerHTML = data.items?.length
      ? data.items.map(caseHtml).join('')
      : '<div class="empty-state">No automatically flagged exchanges are attached to this account.</div>'
    document.getElementById('loading').hidden = true
    document.getElementById('account-view').hidden = false
  }

  async function loadCurrentView() {
    if (view === 'run') return loadRun()
    if (view === 'account') return loadAccount()
    showError('Unknown moderation page.')
  }

  async function init() {
    if (!token) {
      sessionStorage.setItem('sennoric_admin_return_to', `${location.pathname}${location.search}`)
      location.replace('/admin')
      return
    }
    try {
      const check = await apiFetch('/admin/check')
      if (!check.ok) {
        showError('This page is restricted to Sennoric administrators.')
        return
      }
      const admin = await check.json()
      document.getElementById('admin-email').textContent = admin.email || ''
      bindActions(document.getElementById('case-list'))
      await loadCurrentView()
    } catch (error) {
      showError(error.name === 'AbortError'
        ? 'The admin API timed out. Try refreshing this page.'
        : 'Could not connect to the admin API.')
    }
  }

  init()
})()
