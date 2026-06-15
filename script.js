// 取得網站互動會用到的 DOM 元素。
const themeToggle = document.querySelector(".theme-toggle");
const themeIcon = document.querySelector(".theme-icon img");
const topButton = document.querySelector(".top-button");
const sections = document.querySelectorAll("main section[id]");
const navLinks = document.querySelectorAll(".nav > a, .nav-dropdown-trigger");
const revealItems = document.querySelectorAll(".reveal");
const yearSections = document.querySelectorAll(".year-section");
const yearLinks = document.querySelectorAll(".year-timeline a");
const carouselButtons = document.querySelectorAll("[data-carousel]");
const internalTransitionKey = "page-arrival-transition";

// 讀取並清除頁面切換旗標，讓 CSS 可以判斷是否播放到達頁面的開窗簾動畫。
if (sessionStorage.getItem(internalTransitionKey) === "true") {
  sessionStorage.removeItem(internalTransitionKey);
}

const setThemeIcon = (isDark) => {
  themeIcon.src = isDark ? "assets/sun.svg" : "assets/moon.svg";
  themeIcon.alt = isDark ? "Switch to light mode" : "Switch to dark mode";
};

// 讀取上次儲存的主題，讓重新整理後仍維持 light / dark mode。
const savedTheme = localStorage.getItem("intro-theme");

if (savedTheme === "dark") {
  document.body.classList.add("dark");
  setThemeIcon(true);
} else {
  setThemeIcon(false);
}

// 切換 light / dark mode，並把偏好儲存到 localStorage。
themeToggle.addEventListener("click", () => {
  const isDark = document.body.classList.toggle("dark");
  setThemeIcon(isDark);
  localStorage.setItem("intro-theme", isDark ? "dark" : "light");
});

// 點擊回到頂端按鈕後，平滑捲回頁面最上方。
topButton.addEventListener("click", () => {
  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
});

// 頁面往下捲動一段距離後，才顯示回到頂端按鈕。
const updateTopButton = () => {
  topButton.classList.toggle("visible", window.scrollY > 500);
};

// 依照目前捲動位置，更新頁內導覽連結的 active 狀態。
const updateActiveLink = () => {
  let currentId = "";

  sections.forEach((section) => {
    const sectionTop = section.offsetTop - 140;

    if (window.scrollY >= sectionTop) {
      currentId = section.id;
    }
  });

  navLinks.forEach((link) => {
    const href = link.getAttribute("href");

    if (href.startsWith("#")) {
      link.classList.toggle("active", href === `#${currentId}`);
    }
  });
};

// 每次捲動時，同步更新回到頂端按鈕與導覽列狀態。
window.addEventListener("scroll", () => {
  updateTopButton();
  updateActiveLink();
});

updateTopButton();
updateActiveLink();

// Scroll Animation：元素進入視窗後加上 is-visible，觸發淡入上滑效果。
const revealObserver = new IntersectionObserver(
  (entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  },
  {
    threshold: 0.18,
    rootMargin: "0px 0px -80px 0px",
  }
);

revealItems.forEach((item) => {
  revealObserver.observe(item);
});

// 標題打字機效果：逐字輸出文字，並在結尾保留閃爍游標。
const typewriterTitles = document.querySelectorAll("[data-typewriter]");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const typeTitle = (el) => {
  const text = el.textContent.trim();
  el.textContent = "";

  const cursor = document.createElement("span");
  cursor.className = "typewriter-cursor";
  el.append(cursor);

  let i = 0;
  const addChar = () => {
    if (i < text.length) {
      cursor.before(text[i]);
      i += 1;
      setTimeout(addChar, Math.random() * 120 + 60);
    }
  };

  addChar();
};

if (typewriterTitles.length > 0 && !reduceMotion) {
  // 不等開場窗簾動畫，頁面一載入就立即開始打字。
  typewriterTitles.forEach((el) => {
    typeTitle(el);
  });
}

// 各頁面橫幅底部的聲波動畫（移植自 ba-banner.js 的 SiriWave）。
// 每個畫布依照「下一個區塊」的背景色，套用對應的顏色 CSS 變數，避免波浪顏色與接續區塊不一致。
const waveTargets = [
  { canvas: document.getElementById("countdownWave"), color1: "--wave-color1", color2: "--wave-color2" },
  { canvas: document.getElementById("aboutWave"), color1: "--wave-color1", color2: "--wave-color2" },
].filter((target) => target.canvas);

if (waveTargets.length > 0 && !reduceMotion) {
  class SiriWave {
    constructor(canvas, color1Var, color2Var) {
      this.range = 1;
      this.frequency = 6;
      this.speed = 0.01;
      this.phase = 0;
      this.color1Var = color1Var;
      this.color2Var = color2Var;

      const ratio = window.devicePixelRatio || 1;
      this.width = ratio * window.innerWidth;
      this.height = ratio * 130;

      this.canvas = canvas;
      this.canvas.width = this.width;
      this.canvas.height = this.height;
      this.canvas.style.width = `${this.width / ratio}px`;
      this.canvas.style.height = `${this.height / ratio}px`;
      this.ctx = this.canvas.getContext("2d");
      this.running = false;
      this.frameId = null;
    }

    drawLine(attenuation, color, noise) {
      const ctx = this.ctx;
      const amplitude = noise * (this.height / 2);

      ctx.beginPath();

      // 用固定步數參數化，確保 x 從 0 精確走到 width，
      // 避免浮點累加讓最右側落不到邊緣、產生右邊三角形破口。
      const steps = 200;
      for (let s = 0; s <= steps; s++) {
        const i = -this.range + (s / steps) * (this.range * 2);
        const x = (this.width * s) / steps;
        const y =
          this.height / 2 +
          amplitude * Math.sin(i * 10 * attenuation) * Math.sin(this.frequency * i - this.phase);

        ctx.lineTo(x, y);
      }

      ctx.lineTo(this.width, this.height);
      ctx.lineTo(0, this.height);
      ctx.fillStyle = color;
      ctx.fill();
    }

    draw() {
      if (!this.running) {
        return;
      }

      this.phase = (this.phase + this.speed) % (Math.PI * 64);
      this.ctx.clearRect(0, 0, this.width, this.height);

      const style = getComputedStyle(document.body);
      this.drawLine(0.5, style.getPropertyValue(this.color1Var).trim(), 0.35);
      this.drawLine(1, style.getPropertyValue(this.color2Var).trim(), 0.25);

      this.frameId = requestAnimationFrame(() => this.draw());
    }

    start() {
      this.phase = 0;
      this.running = true;
      this.draw();
    }

    stop() {
      this.running = false;

      if (this.frameId !== null) {
        cancelAnimationFrame(this.frameId);
        this.frameId = null;
      }
    }
  }

  let waves = [];

  const initWaves = () => {
    waves.forEach((wave) => wave.stop());
    waves = waveTargets.map(({ canvas, color1, color2 }) => {
      const wave = new SiriWave(canvas, color1, color2);
      wave.start();
      return wave;
    });
  };

  initWaves();
  window.addEventListener("resize", initWaves);

  // 切換主題後重新啟動聲波動畫，讓波浪顏色套用新主題的 CSS 變數。
  themeToggle.addEventListener("click", initWaves);
}

// 關於我頁面：歡迎卡片的滑鼠視差效果（移植自 ba-banner.js 的 Welcome-Box 視差）。
const aboutWelcomeBox = document.getElementById("aboutWelcomeBox");
const aboutInfoBox = document.getElementById("aboutInfoBox");

if (aboutWelcomeBox && aboutInfoBox && !reduceMotion) {
  const tiltDivisor = 20;

  const getMouseAngle = (x, y) => {
    const angle = Math.atan2(y, x) * (180 / Math.PI);
    return angle < 0 ? angle + 360 : angle;
  };

  aboutWelcomeBox.addEventListener("mousemove", (event) => {
    requestAnimationFrame(() => {
      const box = aboutWelcomeBox.getBoundingClientRect();
      const offsetX = event.clientX - box.x - box.width / 2;
      const offsetY = event.clientY - box.y - box.height / 2;
      const angle = Math.floor(getMouseAngle(offsetY, offsetX));

      aboutWelcomeBox.style.transform = `rotateY(${offsetX / tiltDivisor}deg) rotateX(${-offsetY / tiltDivisor}deg)`;
      aboutInfoBox.style.background = `linear-gradient(${angle}deg, var(--info-box-bg-start), var(--info-box-bg-end))`;
    });
  });

  aboutWelcomeBox.addEventListener("mouseleave", () => {
    aboutWelcomeBox.style.transform = "";
    aboutInfoBox.style.background = "";
  });
}

// 作品集頁：依照年份區塊與視窗中心的距離，控制淡入淡出與刻度高亮。
const updateActiveYear = () => {
  let currentYear = "";
  let closestDistance = Number.POSITIVE_INFINITY;
  const viewportCenter = window.innerHeight / 2;

  // 記錄每個年份與視窗中央的接近程度（0～1），稍後傳給時間軸刻度。
  const proximityByYear = {};

  yearSections.forEach((section) => {
    const rect = section.getBoundingClientRect();
    const sectionCenter = rect.top + rect.height / 2;
    const distance = Math.abs(sectionCenter - viewportCenter);
    const fadeRange = window.innerHeight * 0.62;
    const opacity = Math.max(0.16, 1 - distance / fadeRange);
    const proximity = Math.max(0, 1 - distance / fadeRange);

    section.style.setProperty("--year-opacity", opacity.toFixed(3));
    proximityByYear[section.dataset.year] = proximity;

    if (distance < closestDistance) {
      closestDistance = distance;
      currentYear = section.dataset.year;
    }
  });

  yearLinks.forEach((link) => {
    const targetYear = link.getAttribute("href").slice(1);
    const tick = proximityByYear[targetYear] ?? 0;
    link.style.setProperty("--tick", tick.toFixed(3));
    link.classList.toggle("active", targetYear === currentYear);
  });
};

// 作品集頁：左右箭頭用來水平切換該年份的作品卡片。
carouselButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const row = button.closest(".portfolio-row");
    const track = row.querySelector(".portfolio-track");
    const direction = button.dataset.carousel === "next" ? 1 : -1;

    track.scrollBy({
      left: track.clientWidth * 0.85 * direction,
      behavior: "smooth",
    });
  });
});

// 只有作品集頁存在年份區塊時，才啟用年份淡入淡出與刻度高亮。
if (yearSections.length > 0) {
  window.addEventListener("scroll", updateActiveYear, { passive: true });
  window.addEventListener("resize", updateActiveYear);
  updateActiveYear();
}

// 頁面轉場：站內頁面連結會先播放關窗簾動畫，再切換到新頁面。
const isInternalPageLink = (link) => {
  const href = link.getAttribute("href");

  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("http")) {
    return false;
  }

  if (link.target === "_blank" || link.hasAttribute("download")) {
    return false;
  }

  const url = new URL(href, window.location.href);
  const currentPath = window.location.pathname.split("/").pop() || "index.html";
  const targetPath = url.pathname.split("/").pop() || "index.html";

  return url.origin === window.location.origin && targetPath !== currentPath;
};

const createPageTransition = () => {
  const transition = document.createElement("div");
  transition.className = "start-animation is-page-transition";
  transition.setAttribute("aria-hidden", "true");
  transition.innerHTML = `
    <div class="container">
      <div class="curtain">
        <div class="curtain__left"></div>
        <div class="curtain__right"></div>
      </div>
    </div>
  `;

  document.body.append(transition);
};

const navigateWithTransition = (url) => {
  sessionStorage.setItem(internalTransitionKey, "true");
  window.location.href = url;
};

document.querySelectorAll("a[href]").forEach((link) => {
  link.addEventListener("click", (event) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return;
    }

    if (!isInternalPageLink(link)) {
      return;
    }

    event.preventDefault();
    createPageTransition();

    window.setTimeout(() => {
      navigateWithTransition(link.href);
    }, 1050);
  });
});

(function () {
  const target = new Date('2026-08-08T00:00:00+08:00');

  function update() {
    const now  = new Date();
    let diff   = Math.max(0, target - now);

    const days  = Math.floor(diff / 86400000);          diff %= 86400000;
    const hours = Math.floor(diff /  3600000);          diff %=  3600000;
    const mins  = Math.floor(diff /    60000);          diff %=    60000;
    const secs  = Math.floor(diff /     1000);

    const pad = n => String(n).padStart(2, '0');
    const el = id => document.getElementById(id);
    if (el('cd-days'))  el('cd-days').textContent  = String(days).padStart(3, '0');
    if (el('cd-hours')) el('cd-hours').textContent = pad(hours);
    if (el('cd-mins'))  el('cd-mins').textContent  = pad(mins);
    if (el('cd-secs'))  el('cd-secs').textContent  = pad(secs);
  }

  update();
  setInterval(update, 1000);
})();

// 排序演算法長條動畫：在 SORT 區的卡片中循環播放各種排序。
// 作法移植自 sort/ 資料夾的 React 版本——錄製每一步的「pose」快照
//（誰在比較、誰在交換、哪些已排序），再依序套用，交給 CSS transition 補間。
// 每個 [data-sort-anim] 容器用 data-algo 指定演算法（bubble / selection / insertion）。
(function () {
  const N = 10; // 長條數量
  const STEP_MS = 130; // 每一步間隔
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ── 各排序演算法：錄製 pose 快照 ──────────────────────────────
  // 每個演算法接收 (order, values, snap, sorted)；order[slot] = 原始 id。
  const ALGOS = {
    bubble(order, values, snap, sorted) {
      const n = values.length;
      for (let pass = 0; pass < n - 1; pass++) {
        let swapped = false;
        for (let i = 0; i < n - 1 - pass; i++) {
          snap({ comparing: [order[i], order[i + 1]] });
          if (values[order[i]] > values[order[i + 1]]) {
            const a = order[i];
            const b = order[i + 1];
            [order[i], order[i + 1]] = [order[i + 1], order[i]];
            snap({ swapping: [a, b] });
            swapped = true;
          }
        }
        sorted.add(order[n - 1 - pass]);
        snap();
        if (!swapped) {
          for (let k = 0; k < n - pass; k++) sorted.add(order[k]);
          break;
        }
      }
    },

    selection(order, values, snap, sorted) {
      const n = values.length;
      for (let i = 0; i < n - 1; i++) {
        let minIdx = i;
        snap({ comparing: [order[minIdx]] });
        for (let j = i + 1; j < n; j++) {
          snap({ comparing: [order[minIdx], order[j]] });
          if (values[order[j]] < values[order[minIdx]]) minIdx = j;
        }
        if (minIdx !== i) {
          const a = order[i];
          const b = order[minIdx];
          [order[i], order[minIdx]] = [order[minIdx], order[i]];
          snap({ swapping: [a, b] });
        }
        sorted.add(order[i]);
        snap();
      }
      sorted.add(order[n - 1]);
    },

    insertion(order, values, snap, sorted) {
      const n = values.length;
      sorted.add(order[0]);
      for (let i = 1; i < n; i++) {
        let j = i;
        snap({ comparing: [order[j]] });
        while (j > 0 && values[order[j - 1]] > values[order[j]]) {
          snap({ comparing: [order[j - 1], order[j]] });
          const a = order[j - 1];
          const b = order[j];
          [order[j - 1], order[j]] = [order[j], order[j - 1]];
          snap({ swapping: [a, b] });
          j--;
        }
        for (let k = 0; k <= i; k++) sorted.add(order[k]);
        snap();
      }
    },
  };

  // 產生 N 個不重複的隨機值
  function genValues() {
    const used = new Set();
    const vals = [];
    while (vals.length < N) {
      const v = 1 + Math.floor(Math.random() * 100);
      if (!used.has(v)) {
        used.add(v);
        vals.push(v);
      }
    }
    return vals;
  }

  // 用指定演算法錄製每一個 pose（快照），渲染時會在快照之間補間。
  function buildPoses(values, algoKey) {
    const order = values.map((_, i) => i); // order[slot] = 原始 id
    const sorted = new Set();
    const poses = [];
    const snap = (meta = {}) =>
      poses.push({
        order: order.slice(),
        comparing: meta.comparing || null,
        swapping: meta.swapping || null,
        sorted: Array.from(sorted),
      });

    snap();
    (ALGOS[algoKey] || ALGOS.bubble)(order, values, snap, sorted);
    for (let i = 0; i < values.length; i++) sorted.add(order[i]);
    snap(); // 全部完成
    return poses;
  }

  // ── 單一動畫實例 ─────────────────────────────────────────────
  function initInstance(root) {
    const barsWrap = root.querySelector(".sort-anim__bars");
    const algoKey = root.getAttribute("data-algo") || "bubble";
    const card = root.closest(".portfolio-card");
    const replayBtn = card && card.querySelector("[data-sort-replay]");
    let bars = [];
    let poses = [];
    let idx = 0;
    let timer = null;

    function setup() {
      const values = genValues();
      poses = buildPoses(values, algoKey);
      const maxVal = Math.max.apply(null, values);
      const slotW = 100 / N;

      barsWrap.innerHTML = "";
      bars = values.map((v) => {
        const bar = document.createElement("div");
        bar.className = "sort-anim__bar";
        bar.style.height = Math.max(10, (v / maxVal) * 100) + "%";
        bar.style.width = slotW * 0.6 + "%";
        barsWrap.appendChild(bar);
        return bar;
      });
    }

    // 套用某一個 pose：更新每根長條的位置與狀態色
    function applyPose(pose) {
      const slotW = 100 / N;
      pose.order.forEach((id, slot) => {
        const bar = bars[id];
        bar.style.left = (slot + 0.5) * slotW + "%";
        const comparing = pose.comparing && pose.comparing.indexOf(id) !== -1;
        const swapping = pose.swapping && pose.swapping.indexOf(id) !== -1;
        const isSorted = pose.sorted.indexOf(id) !== -1;
        bar.classList.toggle("is-comparing", !!comparing);
        bar.classList.toggle("is-swapping", !!swapping);
        bar.classList.toggle("is-sorted", isSorted && !comparing && !swapping);
      });
    }

    // 完成反饋：長條依最終位置由左到右依序躍起閃光
    function finale() {
      if (reduceMotion) return;
      const order = poses[poses.length - 1].order;
      order.forEach((id, slot) => {
        const bar = bars[id];
        bar.style.animationDelay = slot * 45 + "ms";
        bar.classList.remove("is-finale");
        void bar.offsetWidth; // 重置動畫，讓重播時能再次觸發
        bar.classList.add("is-finale");
      });
    }

    function play() {
      applyPose(poses[idx]);
      idx += 1;
      if (idx >= poses.length) {
        timer = setTimeout(finale, STEP_MS); // 播完一次後做完成反饋
        return;
      }
      timer = setTimeout(play, STEP_MS);
    }

    // 重新洗牌並從頭播放（按鈕也用這個）
    function restart() {
      clearTimeout(timer);
      setup();
      idx = 0;
      if (reduceMotion) {
        applyPose(poses[poses.length - 1]); // 尊重「減少動態」：直接顯示完成狀態
      } else {
        play();
      }
    }

    if (replayBtn) replayBtn.addEventListener("click", restart);
    restart();
  }

  document.querySelectorAll("[data-sort-anim]").forEach(initInstance);
})();

// 作品集頁：用本機 lottie-web 播放 [data-lottie] 容器指定的 Lottie JSON 動畫。
// 取代原本的 <dotlottie-wc> 網頁元件，改為不依賴外部 CDN 的播放方式。
if (typeof lottie !== "undefined") {
  document.querySelectorAll("[data-lottie]").forEach((el) => {
    const anim = lottie.loadAnimation({
      container: el,
      renderer: "svg",
      loop: true,
      autoplay: !reduceMotion, // 尊重「減少動態」偏好：不自動播放，僅顯示第一幀
      path: el.dataset.lottie,
    });

    // 減少動態時停在第一幀，避免畫面靜止卻空白。
    if (reduceMotion) {
      anim.addEventListener("DOMLoaded", () => anim.goToAndStop(0, true));
    }
  });
}

// about 頁頭像：滑鼠移入時旋轉一圈（CSS 控制起步快、收尾減速）。
(function () {
  const avatar = document.querySelector(".about-avatar");
  if (!avatar || reduceMotion) return;
  avatar.addEventListener("mouseenter", () => {
    if (avatar.classList.contains("is-spinning")) return; // 轉動中就不重複觸發
    avatar.classList.add("is-spinning");
  });
  avatar.addEventListener("animationend", () => {
    avatar.classList.remove("is-spinning");
  });
})();

// about 頁背景音樂：進站後自動循環播放；被瀏覽器擋下時改在第一次互動時播放。
// 右下角按鈕可隨時開關，狀態會記在 localStorage。
(function () {
  const bgm = document.getElementById("bgm");
  if (!bgm) return; // 只有 about 頁有 <audio id="bgm">
  const toggle = document.querySelector("[data-bgm-toggle]");

  const TARGET_VOLUME = 0.1;

  // 兩首背景音樂：淺色模式用第一首，夜間模式用第二首。
  const tracks = {
    light: "bgm/BGM 夕暮れ、路地裏の白猫.mp3",
    dark: "bgm/ひとりぼっちの宇宙紀行.wav",
  };
  const currentTrackKey = () => (document.body.classList.contains("dark") ? "dark" : "light");

  // 進站時依目前主題挑選正確曲目（HTML 預設為淺色那首，夜間模式才需換曲）。
  let activeKey = currentTrackKey();
  if (activeKey !== "light") {
    bgm.src = tracks[activeKey];
  }
  bgm.volume = TARGET_VOLUME;

  // 音量淡入/淡出：以固定間隔逐步逼近目標音量，結束後執行 done。
  let fadeTimer = null;
  const clearFade = () => {
    if (fadeTimer) {
      clearInterval(fadeTimer);
      fadeTimer = null;
    }
  };
  const fadeTo = (target, done) => {
    clearFade();
    const step = 0.01;
    fadeTimer = setInterval(() => {
      const diff = target - bgm.volume;
      if (Math.abs(diff) <= step) {
        bgm.volume = target;
        clearFade();
        if (done) done();
      } else {
        bgm.volume = Math.min(1, Math.max(0, bgm.volume + Math.sign(diff) * step));
      }
    }, 40);
  };

  // 切換曲目：正在播放時先淡出 → 換曲 → 淡入；沒播放時直接換曲。
  const switchTrack = (key) => {
    if (key === activeKey) {
      return;
    }
    activeKey = key;

    if (bgm.paused) {
      bgm.src = tracks[key];
      bgm.load();
      bgm.volume = TARGET_VOLUME;
      return;
    }

    fadeTo(0, () => {
      bgm.src = tracks[key];
      bgm.load();
      bgm.volume = 0;
      bgm
        .play()
        .then(() => fadeTo(TARGET_VOLUME))
        .catch(() => {
          bgm.volume = TARGET_VOLUME;
        });
    });
  };

  // 切換深色/淺色模式時，連動切換對應曲目（themeToggle 的主題切換會先執行）。
  if (themeToggle) {
    themeToggle.addEventListener("click", () => switchTrack(currentTrackKey()));
  }

  // 反映播放/暫停狀態到按鈕圖示
  const syncIcon = () => {
    if (toggle) toggle.classList.toggle("is-muted", bgm.paused);
  };
  bgm.addEventListener("play", syncIcon);
  bgm.addEventListener("pause", syncIcon);

  // 使用者上次若手動關掉，就不自動播放
  const wantMusic = localStorage.getItem("bgm-enabled") !== "false";

  function startPlayback() {
    if (!wantMusic) {
      syncIcon();
      return;
    }
    bgm.play().catch(() => {
      // 自動播放被瀏覽器擋下：等第一次使用者互動（任何動作）再補播一次。
      const events = ["pointerdown", "keydown", "click", "touchstart", "wheel", "scroll"];
      const resume = () => {
        // 使用者期間可能已手動關閉，仍要尊重其選擇。
        if (localStorage.getItem("bgm-enabled") !== "false") {
          bgm.play().catch(() => {});
        }
        events.forEach((type) => window.removeEventListener(type, resume));
      };
      events.forEach((type) => window.addEventListener(type, resume, { passive: true }));
    });
  }

  if (toggle) {
    toggle.addEventListener("click", () => {
      if (bgm.paused) {
        localStorage.setItem("bgm-enabled", "true");
        bgm.play().catch(() => {});
      } else {
        localStorage.setItem("bgm-enabled", "false");
        bgm.pause();
      }
    });
  }

  syncIcon();
  startPlayback();
})();
