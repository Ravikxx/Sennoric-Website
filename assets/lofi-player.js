(() => {
  'use strict'

  const CROSSFADE_SECONDS = 2.5
  const tracks = [
    { title: 'Rainy Porch', src: '/assets/lofi/rainy-porch.m4a', gain: 1 },
    { title: 'Midnight at the Corner Table', src: '/assets/lofi/midnight-corner-table.m4a', gain: 0.996 },
    { title: 'Fading Into Static — Short', src: '/assets/lofi/fading-into-static-short.m4a', gain: 0.918 },
    { title: 'Fading Into Static — Extended', src: '/assets/lofi/fading-into-static-extended.m4a', gain: 0.733 },
    { title: 'Fading Into the Quiet', src: '/assets/lofi/fading-into-the-quiet.m4a', gain: 0.83 },
    { title: 'Morning Brew — Dawn', src: '/assets/lofi/morning-brew-dawn.m4a', gain: 0.835 },
    { title: 'Morning Brew — Steam', src: '/assets/lofi/morning-brew-steam.m4a', gain: 0.848 },
    { title: 'Morning Brew — Sketch', src: '/assets/lofi/morning-brew-sketch.m4a', gain: 0.79 },
  ]

  class LoFiPlayer extends EventTarget {
    constructor() {
      super()
      this.context = null
      this.slots = [this.createSlot(), this.createSlot()]
      this.currentSlot = 0
      this.currentTrack = null
      this.bag = []
      this.volume = Math.max(0, Math.min(1, Number(localStorage.getItem('sennoric_lofi_volume') ?? 0.42)))
      this.playing = false
      this.transitioning = false
      this.transitionTimer = null
      this.operation = 0
    }

    createSlot() {
      const audio = new Audio()
      audio.preload = 'metadata'
      return { audio, source: null, gainNode: null, track: null }
    }

    async ensureContext() {
      if (!this.context) {
        const AudioContext = window.AudioContext || window.webkitAudioContext
        this.context = new AudioContext()
        this.slots.forEach(slot => {
          slot.source = this.context.createMediaElementSource(slot.audio)
          slot.gainNode = this.context.createGain()
          slot.gainNode.gain.value = 0
          slot.source.connect(slot.gainNode).connect(this.context.destination)
        })
      }
      if (this.context.state === 'suspended') await this.context.resume()
    }

    emitChange() {
      this.dispatchEvent(new Event('change'))
    }

    refillBag() {
      this.bag = tracks.map((_, index) => index)
      for (let i = this.bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]]
      }
      if (this.currentTrack && tracks[this.bag[0]] === this.currentTrack && this.bag.length > 1) {
        ;[this.bag[0], this.bag[1]] = [this.bag[1], this.bag[0]]
      }
    }

    takeTrack() {
      if (!this.bag.length) this.refillBag()
      return tracks[this.bag.shift()]
    }

    targetGain(track) {
      return this.volume * (track?.gain ?? 1)
    }

    ramp(slot, value, seconds) {
      const now = this.context.currentTime
      const gain = slot.gainNode.gain
      gain.cancelScheduledValues(now)
      gain.setValueAtTime(gain.value, now)
      gain.linearRampToValueAtTime(value, now + seconds)
    }

    waitUntilPlayable(audio) {
      if (audio.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) return Promise.resolve()
      return new Promise((resolve, reject) => {
        const done = () => { cleanup(); resolve() }
        const failed = () => { cleanup(); reject(new Error('Track could not be loaded')) }
        const cleanup = () => {
          audio.removeEventListener('canplay', done)
          audio.removeEventListener('error', failed)
        }
        audio.addEventListener('canplay', done, { once: true })
        audio.addEventListener('error', failed, { once: true })
      })
    }

    async loadAndPlay(slot, track) {
      slot.audio.pause()
      slot.track = track
      slot.audio.src = track.src
      slot.audio.currentTime = 0
      slot.audio.load()
      await this.waitUntilPlayable(slot.audio)
      slot.gainNode.gain.setValueAtTime(0, this.context.currentTime)
      await slot.audio.play()
    }

    scheduleTransition() {
      clearTimeout(this.transitionTimer)
      if (!this.playing) return
      const audio = this.slots[this.currentSlot].audio
      const remaining = Math.max(0.25, audio.duration - audio.currentTime - CROSSFADE_SECONDS)
      this.transitionTimer = setTimeout(() => void this.next(), remaining * 1000)
    }

    async start() {
      if (this.playing) return
      const operation = ++this.operation
      await this.ensureContext()
      const track = this.takeTrack()
      const slot = this.slots[this.currentSlot]
      try {
        await this.loadAndPlay(slot, track)
      } catch {
        if (operation === this.operation) this.playing = false
        this.emitChange()
        return
      }
      if (operation !== this.operation) { slot.audio.pause(); return }
      this.currentTrack = track
      this.playing = true
      this.ramp(slot, this.targetGain(track), CROSSFADE_SECONDS)
      this.scheduleTransition()
      this.emitChange()
    }

    stop() {
      if (!this.playing && !this.transitioning) return
      const operation = ++this.operation
      this.playing = false
      this.transitioning = false
      clearTimeout(this.transitionTimer)
      if (!this.context) return
      this.slots.forEach(slot => this.ramp(slot, 0, CROSSFADE_SECONDS))
      setTimeout(() => {
        if (operation !== this.operation) return
        this.slots.forEach(slot => slot.audio.pause())
      }, CROSSFADE_SECONDS * 1000 + 80)
      this.emitChange()
    }

    toggle() {
      if (this.playing) this.stop()
      else void this.start()
    }

    async next() {
      if (this.transitioning) return
      if (!this.playing) { await this.start(); return }
      this.transitioning = true
      const operation = ++this.operation
      await this.ensureContext()
      const oldIndex = this.currentSlot
      const nextIndex = oldIndex === 0 ? 1 : 0
      const oldSlot = this.slots[oldIndex]
      const nextSlot = this.slots[nextIndex]
      const track = this.takeTrack()
      try {
        await this.loadAndPlay(nextSlot, track)
      } catch {
        this.transitioning = false
        this.scheduleTransition()
        return
      }
      if (!this.playing || operation !== this.operation) { nextSlot.audio.pause(); return }
      this.ramp(oldSlot, 0, CROSSFADE_SECONDS)
      this.ramp(nextSlot, this.targetGain(track), CROSSFADE_SECONDS)
      this.currentSlot = nextIndex
      this.currentTrack = track
      this.transitioning = false
      this.scheduleTransition()
      setTimeout(() => {
        if (operation === this.operation) oldSlot.audio.pause()
      }, CROSSFADE_SECONDS * 1000 + 80)
      this.emitChange()
    }

    setVolume(value) {
      this.volume = Math.max(0, Math.min(1, value))
      localStorage.setItem('sennoric_lofi_volume', String(this.volume))
      if (this.context && this.playing) this.ramp(this.slots[this.currentSlot], this.targetGain(this.currentTrack), 0.15)
      this.emitChange()
    }
  }

  const player = new LoFiPlayer()

  function updateControls() {
    const toggle = document.getElementById('lofi-toggle')
    const title = document.getElementById('lofi-track-title')
    const volume = document.getElementById('lofi-volume')
    const status = document.getElementById('lofi-status')
    if (!toggle) return
    toggle.classList.toggle('active', player.playing)
    toggle.setAttribute('aria-pressed', String(player.playing))
    toggle.setAttribute('title', player.playing ? 'Turn Lo-Fi off' : 'Turn Lo-Fi on')
    if (title) title.textContent = player.currentTrack?.title || 'Shuffle ready'
    if (status) status.textContent = player.playing ? 'Playing' : 'Off'
    if (volume && document.activeElement !== volume) volume.value = String(Math.round(player.volume * 100))
  }

  function closeMenu() {
    const menu = document.getElementById('lofi-popover')
    const button = document.getElementById('lofi-menu-button')
    if (!menu || !button) return
    menu.hidden = true
    button.setAttribute('aria-expanded', 'false')
  }

  function init() {
    const toggle = document.getElementById('lofi-toggle')
    const menuButton = document.getElementById('lofi-menu-button')
    const menu = document.getElementById('lofi-popover')
    const volume = document.getElementById('lofi-volume')
    const next = document.getElementById('lofi-next')
    if (!toggle || !menuButton || !menu || !volume || !next) return

    toggle.addEventListener('click', () => player.toggle())
    menuButton.addEventListener('click', event => {
      event.stopPropagation()
      menu.hidden = !menu.hidden
      menuButton.setAttribute('aria-expanded', String(!menu.hidden))
    })
    menu.addEventListener('click', event => event.stopPropagation())
    volume.addEventListener('input', () => player.setVolume(Number(volume.value) / 100))
    next.addEventListener('click', () => void player.next())
    document.addEventListener('click', closeMenu)
    document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu() })
    player.addEventListener('change', updateControls)
    updateControls()
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init)
  else init()
})()
