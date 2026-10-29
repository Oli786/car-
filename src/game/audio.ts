/** Tiny WebAudio synth: no audio files needed. */
export class SoundFx {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private engineOsc: OscillatorNode | null = null
  private engineGain: GainNode | null = null
  enabled = true

  /** Must be called from a user gesture the first time. */
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume()
      return
    }
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return
    this.ctx = new Ctor()
    this.master = this.ctx.createGain()
    this.master.gain.value = this.enabled ? 0.5 : 0
    this.master.connect(this.ctx.destination)
  }

  setEnabled(on: boolean) {
    this.enabled = on
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(on ? 0.5 : 0, this.ctx.currentTime, 0.02)
  }

  startEngine() {
    if (!this.ctx || !this.master || this.engineOsc) return
    const osc = this.ctx.createOscillator()
    const filter = this.ctx.createBiquadFilter()
    const gain = this.ctx.createGain()
    osc.type = 'sawtooth'
    osc.frequency.value = 60
    filter.type = 'lowpass'
    filter.frequency.value = 420
    gain.gain.value = 0.05
    osc.connect(filter).connect(gain).connect(this.master)
    osc.start()
    this.engineOsc = osc
    this.engineGain = gain
  }

  setEngine(ratio: number) {
    if (!this.ctx || !this.engineOsc) return
    this.engineOsc.frequency.setTargetAtTime(55 + ratio * 120, this.ctx.currentTime, 0.08)
  }

  stopEngine() {
    if (!this.ctx || !this.engineOsc) return
    this.engineGain?.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05)
    const osc = this.engineOsc
    window.setTimeout(() => osc.stop(), 250)
    this.engineOsc = null
    this.engineGain = null
  }

  private blip(freq: number, dur: number, type: OscillatorType, vol: number, slideTo?: number) {
    if (!this.ctx || !this.master) return
    const t = this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, t)
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur)
    gain.gain.setValueAtTime(vol, t)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    osc.connect(gain).connect(this.master)
    osc.start(t)
    osc.stop(t + dur + 0.02)
  }

  coin() {
    this.blip(880, 0.08, 'square', 0.12)
    window.setTimeout(() => this.blip(1320, 0.12, 'square', 0.1), 60)
  }

  shield() {
    this.blip(400, 0.25, 'triangle', 0.2, 900)
  }

  crash() {
    if (!this.ctx || !this.master) return
    const t = this.ctx.currentTime
    const len = Math.floor(this.ctx.sampleRate * 0.35)
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len)
    const src = this.ctx.createBufferSource()
    const gain = this.ctx.createGain()
    src.buffer = buf
    gain.gain.setValueAtTime(0.4, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35)
    src.connect(gain).connect(this.master)
    src.start(t)
    this.blip(120, 0.3, 'sawtooth', 0.2, 40)
  }

  gameOver() {
    this.blip(440, 0.25, 'triangle', 0.2, 220)
    window.setTimeout(() => this.blip(220, 0.5, 'triangle', 0.2, 80), 220)
  }

  tick() {
    this.blip(660, 0.05, 'square', 0.06)
  }
}
