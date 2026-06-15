/* ── 開場動畫（移植自 Splash.vue，以 Web Animations API 取代 anime.js）── */
(function () {
  // 取得開場畫面與呼吸燈動畫元素
  const splash = document.getElementById('splash-container')
  const parts  = document.getElementById('breathingParts')

  // 呼吸燈閃爍動畫（透明度 0.3 ↔ 1，無限循環）
  parts.animate(
    [{ opacity: 0.3 }, { opacity: 1 }, { opacity: 0.3 }],
    { duration: 1000, iterations: Infinity, easing: 'ease-in-out' }
  )

  // 開場期間暫時鎖定滑鼠滾輪，避免提前滑動頁面
  const prevent = e => e.preventDefault()
  window.addEventListener('wheel', prevent, { passive: false })

  // 隨機延遲一段時間後，淡出開場畫面並啟動橫幅進場動畫
  const delay = Math.floor(Math.random() * 300) + 1200
  setTimeout(() => {
    splash.classList.add('fade-out')
    window.removeEventListener('wheel', prevent)
    setTimeout(() => {
      splash.remove()
      document.getElementById('banner').classList.add('loadingComplete')
    }, 500)
  }, delay)
})()

/* ── 聲波動畫類別 SiriWave（完整移植自 Banner.vue）── */
class SiriWave {
  constructor() {
    this.K = 1; this.F = 15; this.speed = 0.1
    this.noise = 30; this.phase = 0
    this.devicePixelRatio = window.devicePixelRatio || 1
    this.width  = this.devicePixelRatio * window.innerWidth
    this.height = this.devicePixelRatio * 100
    this.MAX    = this.height / 2
    this.canvas = document.getElementById('wave')
    this.canvas.width  = this.width
    this.canvas.height = this.height
    this.canvas.style.width  = this.width  / this.devicePixelRatio + 'px'
    this.canvas.style.height = this.height / this.devicePixelRatio + 'px'
    this.ctx = this.canvas.getContext('2d')
    this.run = false; this.animationFrameID = null
  }

  _globalAttenuationFn(x) {
    return Math.pow((this.K * 4) / (this.K * 4 + Math.pow(x, 4)), this.K * 2)
  }

  _drawLine(attenuation, color, width, noise, F) {
    this.ctx.moveTo(0, 0); this.ctx.beginPath()
    this.ctx.strokeStyle = color; this.ctx.lineWidth = width || 1
    F     = F     || this.F
    noise = noise * this.MAX || this.noise
    for (let i = -this.K; i <= this.K; i += 0.01) {
      i = parseFloat(i.toFixed(2))
      const x = this.width * ((i + this.K) / (this.K * 2))
      const y = this.height / 2 +
        noise * Math.pow(Math.sin(i * 10 * attenuation), 1) * Math.sin(F * i - this.phase)
      this.ctx.lineTo(x, y)
    }
    this.ctx.lineTo(this.width, this.height)
    this.ctx.lineTo(0, this.height)
    this.ctx.fillStyle = color; this.ctx.fill()
  }

  _clear() {
    this.ctx.globalCompositeOperation = 'destination-out'
    this.ctx.fillRect(0, 0, this.width, this.height)
    this.ctx.globalCompositeOperation = 'source-over'
  }

  _draw() {
    if (!this.run) return
    this.phase = (this.phase + this.speed) % (Math.PI * 64)
    this._clear()
    const s  = getComputedStyle(document.documentElement)
    const c1 = s.getPropertyValue('--wave-color1').trim()
    const c2 = s.getPropertyValue('--wave-color2').trim()
    this._drawLine(0.5, c1, 1, 0.35, 6)
    this._drawLine(1,   c2, 1, 0.25, 6)
    this.animationFrameID = requestAnimationFrame(this._draw.bind(this))
  }

  start() { this.phase = 0; this.run = true; this._draw() }

  stop() {
    this.run = false; this._clear()
    if (this.animationFrameID !== null) {
      cancelAnimationFrame(this.animationFrameID); this.animationFrameID = null
    }
  }

  setNoise(v) { this.noise = Math.min(v, 1) * this.MAX }
  setSpeed(v) { this.speed = v }
}

/* ── 波浪動畫的初始化與視窗縮放重新初始化 ── */
let currentWave = null

function initWave() {
  if (currentWave) currentWave.stop()
  currentWave = new SiriWave()
  currentWave.setSpeed(0.01)
  currentWave.start()
}

function debounce(fn, wait) {
  let t
  return function () { clearTimeout(t); t = setTimeout(fn, wait) }
}

initWave()
window.addEventListener('resize', debounce(() => {
  if (currentWave) currentWave.stop()
  initWave()
}, 100))

/* ── 歡迎卡片滑鼠視差效果（移植自 Welcome-Box.vue）── */
const welcomeBox = document.getElementById('welcomeBox')
const infoBox    = document.getElementById('infoBox')
const multiple   = 20
let calcY = 0, calcX = 0, angle = 0

// 滑鼠移動時，依滑鼠與卡片中心的相對位置計算傾斜角度與背景漸層方向
function parallax(e) {
  requestAnimationFrame(() => {
    const box = welcomeBox.getBoundingClientRect()
    calcY = (e.clientX - box.x - box.width  / 2) / multiple
    calcX = -(e.clientY - box.y - box.height / 2) / multiple
    angle = Math.floor(getMouseAngle(
      e.clientY - box.y - box.height / 2,
      e.clientX - box.x - box.width  / 2
    ))
    welcomeBox.style.transform = `rotateY(${calcY}deg) rotateX(${calcX}deg)`
    infoBox.style.background =
      `linear-gradient(${angle}deg, var(--infobox-background-initial), var(--infobox-background-final))`
  })
}

// 滑鼠離開卡片範圍時，還原卡片角度與背景漸層
function resetParallax() {
  calcX = calcY = angle = 0
  welcomeBox.style.transform = ''
  infoBox.style.background   = ''
}

// 計算滑鼠相對卡片中心的角度（0 ~ 360 度）
function getMouseAngle(x, y) {
  let a = Math.atan2(y, x) * (180 / Math.PI)
  return a < 0 ? a + 360 : a
}

/* ── 座右銘打字機效果（移植自 Welcome-Box.vue）── */
const mottos      = ['和你的日常，就是奇迹', '何気ない日常で、ほんの少しの奇跡を見つける物語。']
const randomMotto = mottos[Math.floor(Math.random() * mottos.length)]
const mottoEl     = document.getElementById('motto')
let idx = 0

// 逐字輸出座右銘文字，模擬打字機效果
function addChar() {
  if (idx < randomMotto.length) {
    const span = mottoEl.querySelector('.pointer')
    mottoEl.insertBefore(document.createTextNode(randomMotto[idx]), span)
    idx++
    setTimeout(addChar, Math.random() * 150 + 50)
  }
}
addChar()

/* ── 主題切換功能 ── */
// 在淺色／深色主題之間切換，並更新按鈕文字與重新啟動波浪動畫
function toggleTheme() {
  const html   = document.documentElement
  const isDark = html.getAttribute('theme') === 'dark'
  html.setAttribute('theme', isDark ? 'light' : 'dark')
  document.getElementById('themeBtn').textContent = isDark ? '🌙 Dark' : '☀️ Light'
  if (currentWave) { currentWave.stop(); initWave() }
}
