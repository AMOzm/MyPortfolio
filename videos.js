/* =====================================================================
   Animations page: builds a framed YouTube player + caption card for
   every entry in animations-data.js. No need to edit this file.
   ===================================================================== */
(function () {
  const root = document.getElementById("videos");
  const VIDEOS = window.VIDEOS || [];
  if (!root) return;

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // Accepts watch?v=, youtu.be/, /shorts/, /embed/, /live/ links or a bare 11-character ID
  function youtubeId(input) {
    const s = String(input || "").trim();
    if (/^[\w-]{11}$/.test(s)) return s;
    const m = s.match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/|\/live\/)([\w-]{11})/);
    return m ? m[1] : null;
  }

  VIDEOS.forEach((v, i) => {
    const id = youtubeId(v.youtube);
    const section = document.createElement("section");
    section.className = "stack-section video-section";

    // Click-to-play: show the YouTube thumbnail first; load the real player on click.
    // (YouTube refuses to play inside pages opened as a local file, so there we open YouTube instead.)
    const player = id
      ? `<button class="video-facade" type="button" data-id="${id}" aria-label="Play ${esc(v.title || "video")}">
           <img src="https://i.ytimg.com/vi/${id}/maxresdefault.jpg" alt="" loading="lazy"
                onerror="if(!this.dataset.f){this.dataset.f=1;this.src='https://i.ytimg.com/vi/${id}/hqdefault.jpg';}">
           <span class="video-play" aria-hidden="true"></span>
         </button>`
      : `<div class="video-empty"><span>Paste a YouTube link into <b>animations-data.js</b></span></div>`;

    const showLink = id && v.link !== false;
    section.innerHTML = `
      <div class="video-print">
        <div class="video-frame">${player}</div>
      </div>
      <div class="stack-caption">
        <span class="stack-index">${String(i + 1).padStart(2, "0")}</span>
        <h2>${esc(v.title || "")}</h2>
        ${v.meta ? `<p class="stack-meta">${esc(v.meta)}</p>` : ""}
        ${v.description ? `<p class="stack-desc">${esc(v.description)}</p>` : ""}
        ${showLink ? `<a class="learn-more" href="https://www.youtube.com/watch?v=${id}" target="_blank" rel="noopener">Watch on YouTube <span aria-hidden="true">↗</span></a>` : ""}
      </div>`;
    root.appendChild(section);
  });

  root.addEventListener("click", (e) => {
    const btn = e.target.closest(".video-facade");
    if (!btn) return;
    const id = btn.dataset.id;
    if (location.protocol === "file:") {                   // local preview: play on YouTube
      window.open(`https://www.youtube.com/watch?v=${id}`, "_blank", "noopener");
      return;
    }
    const iframe = document.createElement("iframe");
    iframe.src = `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&playsinline=1`;
    iframe.title = btn.getAttribute("aria-label").replace(/^Play /, "");
    iframe.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    iframe.allowFullscreen = true;
    btn.replaceWith(iframe);
  });

  // Fade each video in as it scrolls into view (same as the project stacks)
  const sections = root.querySelectorAll(".video-section");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-visible"); io.unobserve(e.target); } });
    }, { threshold: 0.2 });
    sections.forEach((s) => io.observe(s));
  } else {
    sections.forEach((s) => s.classList.add("is-visible"));
  }
})();
