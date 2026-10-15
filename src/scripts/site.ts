// Small progressive enhancements. Every page works without this script:
// the menu links, the full project list and the email link are all plain HTML.

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Phone menu: the grid button opens and closes the nav links.
function initMenu() {
  const pill = document.querySelector<HTMLElement>('.pill');
  const toggle = pill?.querySelector<HTMLButtonElement>('.pill__toggle');
  if (!pill || !toggle) return;
  const setOpen = (open: boolean) => {
    pill.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
  };
  toggle.addEventListener('click', () => setOpen(!pill.classList.contains('is-open')));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && pill.classList.contains('is-open')) {
      setOpen(false);
      toggle.focus();
    }
  });
  document.addEventListener('click', (event) => {
    if (!pill.contains(event.target as Node)) setOpen(false);
  });
}

// Fade content in as it scrolls into view.
function initReveal() {
  const items = document.querySelectorAll<HTMLElement>('[data-reveal], [data-reveal-lines]');
  if (reducedMotion || !('IntersectionObserver' in window)) {
    items.forEach((item) => item.classList.add('is-in'));
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-in');
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -8% 0px' },
  );
  items.forEach((item) => observer.observe(item));
}

// Home: the arrow under the hero fades out over the first third of a screen
// of scrolling. Without the script it simply stays.
function initScrollCue() {
  const cue = document.querySelector<HTMLElement>('[data-scroll-cue]');
  if (!cue) return;
  let queued = false;
  const update = () => {
    queued = false;
    cue.style.opacity = String(Math.max(0, 1 - window.scrollY / (window.innerHeight / 3)));
  };
  update();
  window.addEventListener('scroll', () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(update);
  }, { passive: true });
}

// Home: the row of selected projects. Besides scrolling, it drags sideways
// with a mouse (Louisa, 2026-10-12; touch already swipes, so only the mouse
// is handled), and round arrows move it two projects at a time, one on phones,
// where one card shows (Louisa, 2026-10-12). Each arrow shows only when there
// is more that way. On release a drag glides on at the speed it was let go
// and slows to rest wherever that carries it, not on a card (Louisa: "gliding
// is better", "make the glide free"). A drag never opens the card it started
// on.
function initCarousel() {
  const row = document.querySelector<HTMLElement>('.work-scroll');
  if (!row) return;
  const prev = document.querySelector<HTMLButtonElement>('[data-scroll-prev]');
  const next = document.querySelector<HTMLButtonElement>('[data-scroll-next]');
  const padding = parseFloat(getComputedStyle(row).scrollPaddingLeft) || 0;
  // From the tablet width up, more than two cards show, so an arrow moves two.
  const wide = window.matchMedia('(min-width: 48rem)');
  // How long a glide takes to lose most of its speed, in milliseconds.
  const glide = 325;
  let pointer: number | null = null;
  let startX = 0;
  let startLeft = 0;
  let dragging = false;
  let suppressClick = false;
  let frame = 0;
  // Recent positions while dragging, to measure the speed at release.
  let samples: { t: number; left: number }[] = [];
  // The card an arrow is moving to, so quick presses keep counting from it.
  let aim: number | null = null;

  // Where the row rests with each card at its start; the last cards, which
  // cannot reach the start, rest at the very end.
  const starts = () => {
    const max = row.scrollWidth - row.clientWidth;
    const left = row.getBoundingClientRect().left;
    return [...row.children].map((card) =>
      Math.min(max, Math.max(0, card.getBoundingClientRect().left - left + row.scrollLeft - padding)),
    );
  };
  const stop = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    row.classList.remove('is-gliding');
  };

  const release = () => {
    const now = row.scrollLeft;
    // Speed at release, in pixels per millisecond, over the last tenth of a second.
    const recent = samples.filter((s) => performance.now() - s.t < 100);
    const first = recent[0];
    const last = recent[recent.length - 1];
    const speed = first && last && last.t > first.t ? (last.left - first.left) / (last.t - first.t) : 0;
    if (reducedMotion || Math.abs(speed) < 0.05) return;
    // The speed falls by the same share every moment, so the row carries on
    // from the hand and eases to rest a little further on, or at either end.
    const max = row.scrollWidth - row.clientWidth;
    row.classList.add('is-gliding');
    const from = performance.now();
    const step = (time: number) => {
      const decay = Math.exp(-(time - from) / glide);
      const left = Math.min(max, Math.max(0, now + speed * glide * (1 - decay)));
      row.scrollLeft = left;
      if (Math.abs(speed * decay) < 0.01 || left <= 0 || left >= max) {
        stop();
        return;
      }
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
  };

  // Each arrow shows only when there is more that way. If the one in use
  // fades out, focus moves to the other, so the keyboard is never lost.
  const updateArrows = () => {
    if (!prev || !next) return;
    const max = row.scrollWidth - row.clientWidth;
    if (aim !== null && Math.abs(row.scrollLeft - starts()[aim]) < 1) aim = null;
    prev.classList.toggle('is-off', row.scrollLeft <= 1);
    next.classList.toggle('is-off', row.scrollLeft >= max - 1);
    for (const [button, other] of [[prev, next], [next, prev]]) {
      if (document.activeElement === button && button.classList.contains('is-off')) {
        (other.classList.contains('is-off') ? row : other).focus();
      }
    }
  };
  // The row can rest between cards, so a press counts from the card at or
  // behind it in the direction of travel and lands on a card's start.
  const move = (by: number) => {
    stop();
    const points = starts();
    const now = row.scrollLeft;
    const from = aim ?? (by > 0
      ? points.findLastIndex((p) => p <= now + 1)
      : points.findIndex((p) => p >= now - 1));
    aim = Math.min(points.length - 1, Math.max(0, from + by));
    row.scrollTo({ left: points[aim], behavior: reducedMotion ? 'auto' : 'smooth' });
  };
  if (prev && next) {
    prev.hidden = false;
    next.hidden = false;
    prev.addEventListener('click', () => move(wide.matches ? -2 : -1));
    next.addEventListener('click', () => move(wide.matches ? 2 : 1));
    let queued = false;
    const queue = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        updateArrows();
      });
    };
    updateArrows();
    row.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue);
  }

  row.addEventListener('pointerdown', (event) => {
    aim = null;
    if (event.pointerType !== 'mouse' || event.button !== 0 || row.scrollWidth <= row.clientWidth) return;
    // Catching the row mid-glide holds it where it is.
    if (frame) stop();
    pointer = event.pointerId;
    startX = event.clientX;
    startLeft = row.scrollLeft;
    dragging = false;
    samples = [];
  });
  // A wheel or trackpad scroll takes over from a glide.
  row.addEventListener('wheel', () => {
    aim = null;
    if (frame) stop();
  }, { passive: true });
  row.addEventListener('pointermove', (event) => {
    if (event.pointerId !== pointer) return;
    const dx = event.clientX - startX;
    if (!dragging) {
      // A few pixels of give, so a slightly shaky click still opens the card.
      if (Math.abs(dx) < 6) return;
      dragging = true;
      row.setPointerCapture(event.pointerId);
      row.classList.add('is-dragging');
      window.getSelection()?.removeAllRanges();
    }
    row.scrollLeft = startLeft - dx;
    const t = performance.now();
    samples.push({ t, left: row.scrollLeft });
    while (samples.length > 2 && t - samples[0].t > 100) samples.shift();
  });
  const end = (event: PointerEvent) => {
    if (event.pointerId !== pointer) return;
    pointer = null;
    if (!dragging) return;
    dragging = false;
    row.classList.remove('is-dragging');
    suppressClick = true;
    window.setTimeout(() => (suppressClick = false), 0);
    release();
  };
  row.addEventListener('pointerup', end);
  row.addEventListener('pointercancel', end);
  row.addEventListener('click', (event) => {
    if (!suppressClick) return;
    event.preventDefault();
    event.stopPropagation();
  }, true);
  // The browser's own drag of a link or image would take over the gesture.
  row.addEventListener('dragstart', (event) => event.preventDefault());
}

// Work page: skill filter buttons.
function initFilter() {
  const bar = document.querySelector<HTMLElement>('[data-filter]');
  if (!bar) return;
  const rows = document.querySelectorAll<HTMLElement>('[data-skills]');
  bar.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-value]');
    if (!button) return;
    const value = button.dataset.value;
    bar.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
    rows.forEach((row) => {
      row.hidden = value !== 'all' && !JSON.parse(row.dataset.skills ?? '[]').includes(value);
    });
  });
}

// Videos: one calm play button over the poster instead of the browser's
// controls, which take over once the clip plays.
function initVideo() {
  document.querySelectorAll<HTMLElement>('.figure--video').forEach((figure) => {
    const video = figure.querySelector('video');
    const play = figure.querySelector<HTMLButtonElement>('.figure__play');
    const poster = figure.querySelector<HTMLImageElement>('.figure__poster img');
    if (!video || !play) return;
    video.controls = false;
    play.hidden = false;
    const removePoster = () => poster?.closest('picture')?.remove();
    play.addEventListener('click', () => {
      play.hidden = true;
      video.controls = true;
      video.focus();
      if (poster?.complete && poster.currentSrc) {
        // The loaded poster becomes the video's own, so nothing flashes while the clip loads.
        video.poster = poster.currentSrc;
        removePoster();
      } else {
        video.addEventListener('playing', removePoster, { once: true });
      }
      // If the clip cannot play, the browser's controls show why.
      video.play().catch(removePoster);
    });
  });
}

// Project pages: the process index stays pinned below the header (CSS) and
// marks the section being read.
function initProcessIndex() {
  const head = document.querySelector<HTMLElement>('.process__head');
  const row = head?.querySelector<HTMLElement>('.process__row');
  if (!head || !row) return;
  const links = [...head.querySelectorAll<HTMLAnchorElement>('.process__index a')];
  const headings = links.map((link) => document.getElementById(decodeURIComponent(link.hash.slice(1))));
  let current: HTMLAnchorElement | undefined;
  const update = () => {
    const box = head.getBoundingClientRect();
    head.classList.toggle('is-stuck', box.top <= parseFloat(getComputedStyle(head).top) + 1);
    // The section being read: the last heading above a line a quarter of the way down the reading area.
    const line = box.bottom + (window.innerHeight - box.bottom) / 4;
    const next = links.findLast((_, i) => (headings[i]?.getBoundingClientRect().top ?? Infinity) <= line);
    if (next === current) return;
    current?.removeAttribute('aria-current');
    next?.setAttribute('aria-current', 'true');
    current = next;
    // When the row is wider than the screen, swipe it so the marked section
    // shows, and back to its start once no section is marked (above the process).
    if (row.scrollWidth > row.clientWidth) {
      const behavior = reducedMotion ? 'auto' : 'smooth';
      if (next) {
        const pill = next.getBoundingClientRect();
        const view = row.getBoundingClientRect();
        row.scrollBy({ left: pill.left - view.left - (view.width - pill.width) / 2, behavior });
      } else {
        row.scrollTo({ left: 0, behavior });
      }
    }
  };
  let queued = false;
  const queue = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      update();
    });
  };
  update();
  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue);
}

// Project pages: reading progress line along the bottom of the header pill.
function initProgress() {
  const bar = document.querySelector<HTMLElement>('[data-progress]');
  if (!bar) return;
  const update = () => {
    const root = document.documentElement;
    const max = root.scrollHeight - root.clientHeight;
    bar.style.transform = `scaleX(${max > 0 ? root.scrollTop / max : 0})`;
  };
  update();
  window.addEventListener('scroll', update, { passive: true });
}

initMenu();
initReveal();
initScrollCue();
initCarousel();
initFilter();
initVideo();
initProcessIndex();
initProgress();
