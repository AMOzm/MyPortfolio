/* =====================================================================
   Stack behaviour — shared by every page. No need to edit this file.
   Each page lists its own stacks in a data file (portfolio-data.js, games-data.js).
   ===================================================================== */
(function () {
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  // Measure the top bar so the background image starts right below it
  const bar = document.querySelector(".top-bar");
  if (bar) {
    const setBarHeight = () =>
      document.documentElement.style.setProperty("--bar-h", bar.getBoundingClientRect().height + "px");
    setBarHeight();
    if ("ResizeObserver" in window) new ResizeObserver(setBarHeight).observe(bar);
    else window.addEventListener("resize", setBarHeight);
  }

  // Background grid follows the cursor slightly (smoothly eased)
  (function gridParallax() {
    const MAX_SHIFT = 16; // px the grid can move from center; raise for a stronger effect
    const fine = window.matchMedia("(pointer: fine)").matches;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || still) return;
    const style = document.body.style;
    let tx = 0, ty = 0, x = 0, y = 0, running = false;
    function tick() {
      x += (tx - x) * 0.08;
      y += (ty - y) * 0.08;
      style.setProperty("--grid-x", x.toFixed(2) + "px");
      style.setProperty("--grid-y", y.toFixed(2) + "px");
      if (Math.abs(tx - x) > 0.05 || Math.abs(ty - y) > 0.05) requestAnimationFrame(tick);
      else running = false;
    }
    window.addEventListener("pointermove", (e) => {
      tx = (e.clientX / window.innerWidth - 0.5) * 2 * MAX_SHIFT;
      ty = (e.clientY / window.innerHeight - 0.5) * 2 * MAX_SHIFT;
      if (!running) { running = true; requestAnimationFrame(tick); }
    }, { passive: true });
  })();

  const ROTATIONS = [-3, 2.6, -1.6, 4, -4.4, 2];   // degrees, the "twist" of each card
  const VISIBLE_DEPTH = 4;                          // how many cards show in the pile
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const root = document.getElementById("stacks");
  const PORTFOLIO = window.PORTFOLIO || [];
  if (!root) return;

  const chevron = (dir) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
       <polyline points="${dir === "left" ? "15 18 9 12 15 6" : "9 18 15 12 9 6"}"></polyline>
     </svg>`;

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const fitters = [];
  PORTFOLIO.forEach((data, i) => root.appendChild(createStack(data, i)));
  let fitTick = false;
  window.addEventListener("resize", () => {
    if (fitTick) return;
    fitTick = true;
    requestAnimationFrame(() => { fitTick = false; fitters.forEach((f) => f()); });
  });

  function createStack(data, sIndex) {
    const n = data.images.length;
    const section = document.createElement("section");
    section.className = "stack-section";
    section.innerHTML = `
      <div class="stack-stage">
        <button class="stack-btn prev is-hidden" type="button" aria-label="Previous image" disabled>${chevron("left")}</button>
        <div class="stack" tabindex="0" role="group" aria-roledescription="image stack" aria-label="${esc(data.title)}"></div>
        <button class="stack-btn next" type="button" aria-label="Next image">${chevron("right")}</button>
      </div>
      <div class="stack-caption">
        <span class="stack-index">${String(sIndex + 1).padStart(2, "0")}</span>
        <h2>${esc(data.title)}</h2>
        ${data.meta ? `<p class="stack-meta">${esc(data.meta)}</p>` : ""}
        ${data.description ? `<p class="stack-desc">${esc(data.description)}</p>` : ""}
        ${data.url ? `<a class="learn-more" href="${esc(data.url)}" target="_blank" rel="noopener">Learn More <span aria-hidden="true">↗</span></a>` : ""}
        <span class="stack-counter" aria-live="polite"></span>
      </div>`;

    const stackEl = section.querySelector(".stack");
    const prevBtn = section.querySelector(".prev");
    const nextBtn = section.querySelector(".next");
    const counter = section.querySelector(".stack-counter");

    const cards = data.images.map((src, i) => {
      const card = document.createElement("div");
      card.className = "card";
      card.dataset.rot = ROTATIONS[(i + sIndex * 2) % ROTATIONS.length];

      const inner = document.createElement("div");
      inner.className = "card-inner";
      inner.style.transitionDelay = `${Math.max(0, Math.min(n, VISIBLE_DEPTH) - 1 - i) * 110}ms`; // visible pile rises bottom-first

      const img = new Image();
      img.src = src;
      img.alt = `${data.title} — image ${i + 1} of ${n}`;
      img.draggable = false;
      if (sIndex > 0) img.loading = "lazy";
      card.ratio = 4 / 3;                                    // until the PNG loads
      img.addEventListener("load", () => {
        if (img.naturalWidth && img.naturalHeight) card.ratio = img.naturalWidth / img.naturalHeight;
        fit();
      });

      inner.appendChild(img);
      card.appendChild(inner);
      stackEl.appendChild(card);
      return card;
    });

    // Size every card to its own image's shape (no cropping). The stack is as tall as
    // its tallest picture; each card is centered inside it.
    function fit() {
      const W = stackEl.clientWidth;
      if (!W) return;
      const scale = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--stack-scale")) || 1;
      const Hmax = Math.max(200, Math.min((window.innerHeight - 200) * scale, W * 1.5));
      const cs = getComputedStyle(cards[0].firstChild);
      const frame = (parseFloat(cs.paddingLeft) + parseFloat(cs.borderLeftWidth)) * 2;
      const sizes = cards.map((c) => {
        let w = W, h = (W - frame) / c.ratio + frame;
        if (h > Hmax) { h = Hmax; w = (Hmax - frame) * c.ratio + frame; }
        return [w, h];
      });
      const H = Math.max(...sizes.map((s) => s[1]));
      stackEl.style.height = H + "px";
      cards.forEach((c, i) => {
        const [w, h] = sizes[i];
        c.style.width = w + "px";
        c.style.height = h + "px";
        c.style.left = (W - w) / 2 + "px";
        c.style.top = (H - h) / 2 + "px";
      });
    }
    fitters.push(fit);

    let current = 0;
    let busy = false;

    function slotTransform(card, depth) {
      const rot = parseFloat(card.dataset.rot);
      return `translateY(${depth * 5}px) rotate(${depth === 0 ? rot * 0.45 : rot}deg)`;
    }

    function layout() {
      cards.forEach((card, i) => {
        const depth = (i - current + n) % n;
        card.style.zIndex = n - depth;
        card.style.transform = slotTransform(card, depth);
        card.style.opacity = depth >= VISIBLE_DEPTH ? 0 : 1;
        card.classList.toggle("is-top", depth === 0);
        card.setAttribute("aria-hidden", depth !== 0);
      });
      prevBtn.classList.toggle("is-hidden", current === 0);
      prevBtn.disabled = current === 0;
      counter.textContent = `${current + 1} / ${n}`;
    }

    async function go(dir) {
      if (busy || n < 2) return;
      if (dir < 0 && current === 0) return;
      busy = true;

      // Next: the top card flies out right and tucks under the pile.
      // Previous: the bottom card flies out left and lands on top.
      const card = cards[dir > 0 ? current : (current - 1 + n) % n];
      const rot = parseFloat(card.dataset.rot);
      const away = `translate(${dir > 0 ? 112 : -112}%, -3%) rotate(${rot + dir * 12}deg)`;

      if (reduceMotion || !card.animate) {
        current = (current + dir + n) % n;
        layout();
        busy = false;
        return;
      }

      card.style.transition = "none";
      const out = card.animate(
        [{ transform: card.style.transform, opacity: 1 }, { transform: away, opacity: 1 }],
        { duration: 260, easing: "cubic-bezier(.4,0,1,1)", fill: "forwards" }
      );
      await out.finished;

      current = (current + dir + n) % n;
      layout();

      const back = card.animate(
        [{ transform: away, opacity: 1 }, { transform: card.style.transform, opacity: card.style.opacity }],
        { duration: 420, easing: "cubic-bezier(.2,.8,.2,1)" }
      );
      out.cancel();
      await back.finished;

      card.style.transition = "";
      busy = false;
    }

    if (n < 2) {
      prevBtn.remove();
      nextBtn.remove();
    }

    nextBtn.addEventListener("click", () => go(1));
    prevBtn.addEventListener("click", () => go(-1));

    // Click the top card to advance; swipe left/right on touch screens.
    let startX = null, swiped = false;
    stackEl.addEventListener("pointerdown", (e) => { startX = e.clientX; swiped = false; });
    stackEl.addEventListener("pointerup", (e) => {
      if (startX === null) return;
      const dx = e.clientX - startX;
      startX = null;
      if (Math.abs(dx) > 40) { swiped = true; go(dx < 0 ? 1 : -1); }
    });
    stackEl.addEventListener("click", (e) => {
      if (swiped) return;
      if (e.target.closest(".card.is-top")) go(1);
    });
    stackEl.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
      if (e.key === "ArrowLeft")  { e.preventDefault(); go(-1); }
    });

    layout();
    requestAnimationFrame(fit);
    return section;
  }

  // Scroll preview on the right: a square thumbnail per project (first image, center-cropped)
  // with a small dial line that slides to whichever project you're looking at.
  (function scrollNav() {
    const sections = [...root.querySelectorAll(".stack-section")];
    if (sections.length < 2) return;
    const nav = document.createElement("nav");
    nav.className = "scroll-nav";
    nav.setAttribute("aria-label", "Project shortcuts");
    const track = document.createElement("span");
    track.className = "scroll-nav-track";
    const dial = document.createElement("span");
    dial.className = "scroll-nav-dial";
    nav.append(track, dial);

    const thumbs = PORTFOLIO.map((p, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "scroll-nav-thumb";
      b.title = p.title;
      b.setAttribute("aria-label", `Go to ${p.title}`);
      const im = new Image();
      im.src = p.images[0];
      im.alt = "";
      im.draggable = false;
      b.appendChild(im);
      b.addEventListener("click", () =>
        sections[i].scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" }));
      nav.appendChild(b);
      return b;
    });
    document.body.appendChild(nav);
    document.body.classList.add("has-scroll-nav");

    let active = -1, ticking = false;
    function update() {
      ticking = false;
      const mid = window.innerHeight / 2;
      let best = 0, bestDist = Infinity;
      sections.forEach((s, i) => {
        const r = s.getBoundingClientRect();
        const d = Math.abs((r.top + r.bottom) / 2 - mid);
        if (d < bestDist) { bestDist = d; best = i; }
      });
      const area = root.getBoundingClientRect();
      nav.classList.toggle("is-shown", area.top < window.innerHeight * 0.6 && area.bottom > window.innerHeight * 0.4);
      if (best !== active) {
        active = best;
        thumbs.forEach((t, i) => {
          t.classList.toggle("is-active", i === best);
          if (i === best) t.setAttribute("aria-current", "true"); else t.removeAttribute("aria-current");
        });
      }
      const t = thumbs[active];
      dial.style.transform = `translateY(${t.offsetTop + t.offsetHeight / 2 - 1}px)`;
    }
    const request = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request);
    update();
  })();

  // Fade stacks in from the bottom as they scroll into view
  const sections = document.querySelectorAll(".stack-section");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.25 });
    sections.forEach((s) => io.observe(s));
  } else {
    sections.forEach((s) => s.classList.add("is-visible"));
  }


})();
