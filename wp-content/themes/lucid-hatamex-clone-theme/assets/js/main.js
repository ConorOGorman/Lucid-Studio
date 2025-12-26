(() => {
  const docEl = document.documentElement;

  // Match reference root class used by Lenis (even if we don't enable smooth scroll).
  docEl.classList.add('lenis');

  function prefersReducedMotion() {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
  }

  function createFreezeDetector() {
    let frozen = false;

    const recompute = () => {
      const styles = Array.from(document.querySelectorAll('style'));
      frozen = styles.some((styleEl) => {
        const text = styleEl.textContent || '';
        return text.includes('animation-play-state: paused') && text.includes('transition-duration: 0s');
      });
    };

    recompute();
    const observer = new MutationObserver(recompute);
    const rootTargets = [document.head, document.body].filter(Boolean);
    for (const target of rootTargets) observer.observe(target, { childList: true });

    return () => frozen;
  }

  const isMotionFrozen = createFreezeDetector();

  function canAnimate() {
    return !prefersReducedMotion() && !isMotionFrozen();
  }

  function isElementInViewport(el) {
    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) return false;
    const vh = window.innerHeight || 0;
    return rect.bottom > 0 && rect.top < vh;
  }

  function getCssVar(name, fallback = '') {
    const value = window.getComputedStyle(document.documentElement).getPropertyValue(name);
    const trimmed = value.trim();
    return trimmed || fallback;
  }

  function parseTimeMs(input, fallbackMs) {
    const raw = String(input || '').trim();
    if (!raw) return fallbackMs;
    if (raw.endsWith('ms')) {
      const ms = Number.parseFloat(raw.slice(0, -2));
      return Number.isFinite(ms) ? ms : fallbackMs;
    }
    if (raw.endsWith('s')) {
      const seconds = Number.parseFloat(raw.slice(0, -1));
      return Number.isFinite(seconds) ? seconds * 1000 : fallbackMs;
    }
    const ms = Number.parseFloat(raw);
    return Number.isFinite(ms) ? ms : fallbackMs;
  }

  function getMotionDurationMs(tokenName, fallbackMs) {
    return parseTimeMs(getCssVar(tokenName, ''), fallbackMs);
  }

  function getMotionEasing(tokenName, fallback) {
    return getCssVar(tokenName, fallback);
  }

  function easeOutQuart(t) {
    const clamped = Math.max(0, Math.min(1, t));
    return 1 - Math.pow(1 - clamped, 4);
  }

  const lineAnimations = new Set();
  let lineRaf = 0;

  function tickLineAnimations(now) {
    lineRaf = 0;

    for (const anim of Array.from(lineAnimations)) {
      if (!canAnimate()) {
        anim.line.style.transform = 'translate3d(0px, 0%, 0px)';
        lineAnimations.delete(anim);
        continue;
      }

      const t = (now - anim.startTime) / anim.durationMs;
      if (t <= 0) continue;

      const eased = easeOutQuart(t);
      const currentPercent = anim.fromPercent * (1 - eased);
      anim.line.style.transform = `translate3d(0px, ${currentPercent}%, 0px)`;

      if (t >= 1) {
        anim.line.style.transform = 'translate3d(0px, 0%, 0px)';
        lineAnimations.delete(anim);
      }
    }

    if (lineAnimations.size) lineRaf = requestAnimationFrame(tickLineAnimations);
  }

  function scheduleLineAnimation(line, startTime, durationMs, fromPercent = 100) {
    lineAnimations.add({ line, startTime, durationMs, fromPercent });
    if (!lineRaf) lineRaf = requestAnimationFrame(tickLineAnimations);
  }

  const SPLIT_SELECTOR = '[data-lucid-split="1"][aria-label]';
  const LINE_MASK_STYLE_BASE = 'position:relative;display:block;overflow:clip;';
  function lineStyle(initialYPercent, textAlign) {
    return [
      'position:relative',
      'display:block',
      `text-align:${textAlign}`,
      'translate:none',
      'rotate:none',
      'scale:none',
      `transform:translate3d(0px, ${initialYPercent}%, 0px)`,
    ].join(';');
  }

  function debounce(fn, waitMs) {
    let t = 0;
    return (...args) => {
      window.clearTimeout(t);
      t = window.setTimeout(() => fn(...args), waitMs);
    };
  }

  function getSplitHost(maskEl) {
    if (!maskEl) return null;
    if (!(maskEl instanceof HTMLElement)) return null;
    if (maskEl.getAttribute('data-lucid-split') !== '1') return null;
    if (!maskEl.getAttribute('aria-label')) return null;
    return maskEl;
  }

  function measureLines(host, text) {
    const computed = window.getComputedStyle(host);
    const textAlign = computed.textAlign || 'left';
    const rawText = String(text);

    host.textContent = rawText;
    const textNode = host.firstChild;
    if (!textNode || textNode.nodeType !== Node.TEXT_NODE) {
      return { lines: [rawText], textAlign };
    }

    // Force layout.
    // eslint-disable-next-line no-unused-expressions
    host.offsetHeight;

    const tokenRe = /\S+\s*/g;
    const tokens = [];
    let match;
    while ((match = tokenRe.exec(rawText))) {
      const rawToken = match[0];
      const word = rawToken.replace(/\s+$/g, '');
      if (!word) continue;
      tokens.push({
        start: match.index,
        end: match.index + word.length,
        raw: rawToken,
      });
    }

    const range = document.createRange();
    const groups = [];
    let currentTop = null;
    for (const token of tokens) {
      range.setStart(textNode, token.start);
      range.setEnd(textNode, token.end);
      const rect = range.getClientRects()[0];
      if (!rect) continue;
      const top = Math.round(rect.top);
      if (currentTop === null || top !== currentTop) {
        currentTop = top;
        groups.push([]);
      }
      groups[groups.length - 1].push(token.raw);
    }
    range.detach?.();

    const lines = groups
      .map((parts) => {
        // Match reference splitter output: keep each token's trailing whitespace exactly.
        // This affects pixel diffs for long paragraphs where the reference keeps a trailing
        // space before the line break.
        return parts.join('');
      })
      .filter((line) => line.trim().length > 0);

    return { lines, textAlign };
  }

  function applyLineMasks(host, lines, textAlign) {
    const initialYPercent = 0;

    host.innerHTML = '';
    for (let i = 0; i < lines.length; i++) {
      const idx = i + 1;
      const mask = document.createElement('div');
      mask.className = `line-mask line${idx}-mask`;
      mask.setAttribute('aria-hidden', 'true');
      mask.style.cssText = `${LINE_MASK_STYLE_BASE}text-align:${textAlign};`;

      const line = document.createElement('div');
      line.className = `line line${idx}`;
      line.setAttribute('aria-hidden', 'true');
      line.style.cssText = lineStyle(initialYPercent, textAlign);
      line.textContent = lines[i];

      mask.appendChild(line);
      host.appendChild(mask);
    }
  }

  function splitHost(host) {
    const text = host.getAttribute('aria-label');
    if (!text) return;

    const rect = host.getBoundingClientRect();
    const key = `${Math.round(rect.width)}|${Math.round(rect.left)}|${Math.round(rect.top)}|${host.className}`;
    if (host.dataset.lucidLineKey === key) return;

    const { lines, textAlign } = measureLines(host, text);
    if (!lines.length) return;

    applyLineMasks(host, lines, textAlign);
    host.dataset.lucidLineKey = key;
  }

  function syncLineRevealForHost(host, { forceVisible = false } = {}) {
    const lines = Array.from(host.querySelectorAll('.line'));
    if (!lines.length) return;

    const revealed = host.dataset.lucidRevealed === '1';
    const inViewport = isElementInViewport(host);
    const shouldBeVisible = forceVisible || revealed || !canAnimate() || inViewport;

    if (!revealed && inViewport) host.dataset.lucidRevealed = '1';

    for (const line of lines) {
      line.style.transform = shouldBeVisible ? 'translate3d(0px, 0%, 0px)' : 'translate3d(0px, 100%, 0px)';
    }
  }

  function initLineReveals(hosts) {
    const baseDelayMs = getMotionDurationMs('--motion-delay-reveal', 300);
    const durationMs = getMotionDurationMs('--motion-duration-reveal', 900);
    const staggerMs = getMotionDurationMs('--motion-stagger-reveal', 120);

    for (const host of hosts) syncLineRevealForHost(host);

    if (!('IntersectionObserver' in window)) {
      for (const host of hosts) syncLineRevealForHost(host, { forceVisible: true });
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const now = performance.now();
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const host = entry.target;
          if (host.dataset.lucidRevealed === '1') continue;

          host.dataset.lucidRevealed = '1';
          const lines = Array.from(host.querySelectorAll('.line'));
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (!canAnimate()) {
              line.style.transform = 'translate3d(0px, 0%, 0px)';
              continue;
            }
            const startTime = now + baseDelayMs + i * staggerMs;
            scheduleLineAnimation(line, startTime, durationMs, 100);
          }
        }
      },
      { threshold: 0 }
    );

    for (const host of hosts) observer.observe(host);
  }

  function applyCaseStudiesSliderSpacing() {
    const section = document.querySelector('section[data-slice-type="case_studies_showcase"]');
    if (!section) return;

    const slider = section.querySelector('.keen-slider');
    if (!slider) return;

    const slides = Array.from(slider.querySelectorAll('.keen-slider__slide'));
    if (!slides.length) return;

    // Observed on reference:
    // - < 1024px: 8px spacing (translate3d 0, 8, 16, ...)
    // - >= 1024px: 33px spacing (translate3d 0, 33, 66, ...)
    const spacing = window.matchMedia('(min-width: 1024px)').matches ? 33 : 8;

    for (let i = 0; i < slides.length; i++) {
      slides[i].style.transform = `translate3d(${i * spacing}px, 0px, 0px)`;
    }
  }

  function applyHeroCtaLabelWidths() {
    const hero = document.querySelector('section[data-slice-type="hero"]');
    if (!hero) return;

    // Observed on reference (label span widths differ by breakpoint/font-size):
    // - < 1024px: BOOK A CALL = 75px, EXPLORE OUR WORK = 109px
    // - >= 1024px: BOOK A CALL = 88px, EXPLORE OUR WORK = 128px
    const isLg = window.matchMedia('(min-width: 1024px)').matches;
    const targets = {
      'BOOK A CALL': isLg ? 88 : 75,
      'EXPLORE OUR WORK': isLg ? 128 : 109,
    };

    const spans = Array.from(hero.querySelectorAll('a span'));
    for (const span of spans) {
      const text = (span.textContent || '').trim().replace(/\s+/g, ' ').toUpperCase();
      const width = targets[text];
      if (!width) continue;

      const next = `${width}px`;
      if (span.style.width === next && span.style.minWidth === next && span.style.maxWidth === next) continue;

      span.style.width = next;
      span.style.minWidth = next;
      span.style.maxWidth = next;
    }
  }

  function applyStaticCtaLabelWidths() {
    // Match reference's fixed-width span labels that vary at <1024px.
    const isLg = window.matchMedia('(min-width: 1024px)').matches;
    const targets = {
      'BOOK A CALL': isLg ? 88 : 75,
      'EXPLORE OUR WORK': isLg ? 128 : 109,
      'VIEW MORE CASES': isLg ? 120 : 103,
      'TAKE THE FIRST STEP': isLg ? 152 : 130,
      'LET’S WORK TOGETHER': isLg ? 152 : 130,
      "LET'S WORK TOGETHER": isLg ? 152 : 130,
      'REACH OUT IN ANOTHER WAY': isLg ? 192 : 164,
      // Observed on reference at <1024px only (tablet/mobile): 130px.
      'LEARN MORE ABOUT US': isLg ? 0 : 130,
    };

    const spans = Array.from(document.querySelectorAll('a span'));
    for (const span of spans) {
      const text = (span.textContent || '').trim().replace(/\s+/g, ' ').toUpperCase();
      const width = targets[text];
      if (!width) continue;

      const next = `${width}px`;
      if (span.style.width === next && span.style.minWidth === next && span.style.maxWidth === next) continue;

      span.style.width = next;
      span.style.minWidth = next;
      span.style.maxWidth = next;
    }
  }

  function initProcessSteps() {
    const section = document.querySelector('section[data-slice-type="process_steps"]');
    if (!section) return;

    const circles = Array.from(section.querySelectorAll('[data-step-index] circle'));
    if (!circles.length) return;

    for (const circle of circles) {
      const dasharray = parseFloat(circle.style.strokeDasharray || circle.getAttribute('stroke-dasharray') || '');
      if (!Number.isFinite(dasharray) || dasharray <= 0) continue;

      // Reference sets the initial ring to hidden using an integer dashoffset (163px),
      // even though dasharray is fractional (~163.363).
      const offset = Math.floor(dasharray);
      const next = `${offset}px`;
      if (circle.style.strokeDashoffset === next) continue;
      circle.style.strokeDashoffset = next;
    }
  }

  function initAchievementsCounters() {
    const section = document.querySelector('section[data-slice-type="achievements"]');
    if (!section) return;
    if (section.dataset.lucidCountersInit === '1') return;
    section.dataset.lucidCountersInit = '1';

    const targets = [95, 40, 99];
    const spans = Array.from(section.querySelectorAll('div.bg-white span.font-title'));
    if (spans.length < targets.length) return;

    const durationMs = getMotionDurationMs('--motion-duration-slow', 2000);

    const setValue = (span, value) => {
      span.textContent = `${Math.round(value)}%`;
    };

    const run = () => {
      if (!canAnimate()) {
        for (let i = 0; i < targets.length; i++) setValue(spans[i], targets[i]);
        return;
      }

      const start = performance.now();
      const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

      const tick = (now) => {
        const p = Math.min(1, (now - start) / durationMs);
        const eased = easeOutCubic(p);
        for (let i = 0; i < targets.length; i++) {
          setValue(spans[i], targets[i] * eased);
        }
        if (p < 1) requestAnimationFrame(tick);
      };

      requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        io.disconnect();
        run();
      },
      { threshold: 0.35 }
    );
    io.observe(section);
  }

  function initServicesAccordion() {
    const section = document.querySelector('section[data-slice-type="services_accordion"]');
    if (!section) return;
    if (section.dataset.lucidServicesInit === '1') return;
    section.dataset.lucidServicesInit = '1';

    const grids = Array.from(section.querySelectorAll('div.grid[style*="grid-template-rows"]'));
    if (!grids.length) return;

    const items = grids
      .map((grid) => {
        const parent = grid.parentElement;
        if (!parent) return null;
        const header = parent.querySelector(':scope > div.flex.items-center.justify-between');
        const icon = header?.querySelector('div.transition-transform');
        const content = grid.querySelector('div.transition-opacity');
        if (!header || !content || !icon) return null;
        return { parent, header, grid, icon, content };
      })
      .filter(Boolean);

    const closeItem = (item) => {
      item.grid.style.gridTemplateRows = '0fr';
      item.content.style.opacity = '0';
      item.icon.classList.remove('rotate-45');
      item.header.setAttribute('aria-expanded', 'false');
    };

    const openItem = (item) => {
      item.grid.style.gridTemplateRows = '1fr';
      item.content.style.opacity = '1';
      item.icon.classList.add('rotate-45');
      item.header.setAttribute('aria-expanded', 'true');
    };

    const toggleItem = (item) => {
      const isOpen = item.header.getAttribute('aria-expanded') === 'true';
      for (const other of items) closeItem(other);
      if (!isOpen) openItem(item);
    };

    for (const item of items) {
      item.header.setAttribute('role', 'button');
      item.header.setAttribute('tabindex', '0');
      item.header.setAttribute('aria-expanded', 'false');

      closeItem(item);

      const onActivate = () => toggleItem(item);
      item.header.addEventListener('click', onActivate);
      item.header.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        onActivate();
      });
    }
  }

  function initServiceHoverPreviews() {
    const section = document.querySelector('section[data-slice-type="services_accordion"]');
    if (!section) return;
    if (section.dataset.lucidServicesHoverInit === '1') return;
    section.dataset.lucidServicesHoverInit = '1';

    const items = Array.from(section.querySelectorAll('.service-item[data-service-index]'));
    for (const item of items) {
      if (item.dataset.lucidHoverBound === '1') continue;
      item.dataset.lucidHoverBound = '1';

      const idx = item.getAttribute('data-service-index');
      const image = item.querySelector(`[data-service-image="${idx}"]`);
      const borderCover = item.querySelector(`[data-border-cover="${idx}"]`);
      if (!image || !borderCover) continue;

      const animateTo = (show) => {
        const hiddenClip = 'inset(0% 0% 100% 0%)';
        const shownClip = 'inset(0% 0% 0% 0%)';
        image.style.clipPath = show ? shownClip : hiddenClip;
        borderCover.style.opacity = show ? '1' : '0';
      };

      item.addEventListener('mouseenter', () => animateTo(true));
      item.addEventListener('mouseleave', () => animateTo(false));
      item.addEventListener('focusin', () => animateTo(true));
      item.addEventListener('focusout', () => animateTo(false));
    }
  }

  function initCaseStudiesSlider() {
    const section = document.querySelector('section[data-slice-type="case_studies_showcase"]');
    if (!section) return;
    if (section.dataset.lucidSliderInit === '1') return;
    section.dataset.lucidSliderInit = '1';

    const slider = section.querySelector('.keen-slider');
    if (!slider) return;
    const slides = Array.from(slider.querySelectorAll('.keen-slider__slide'));
    if (slides.length < 2) return;

    const prevBtn = section.querySelector('button[aria-label="Previous slide"]');
    const nextBtn = section.querySelector('button[aria-label="Next slide"]');

    const durationMs = getMotionDurationMs('--motion-duration-med', 300);
    const easing = getMotionEasing('--motion-ease-standard', 'ease');

    let activeIndex = 0;
    let translateX = 0;
    let rafId = 0;

    const measureSlidePositions = () => {
      const positions = [];
      for (const slide of slides) {
        const m = /translate3d\(([-\d.]+)px/i.exec(slide.style.transform || '');
        const extra = m ? Number.parseFloat(m[1]) : 0;
        positions.push(slide.offsetLeft + (Number.isFinite(extra) ? extra : 0));
      }
      return positions;
    };

    let slidePositions = measureSlidePositions();

    const applyButtons = () => {
      if (prevBtn) prevBtn.disabled = activeIndex <= 0;
      if (nextBtn) nextBtn.disabled = activeIndex >= slides.length - 1;
    };

    const setTranslateX = (next, animate) => {
      translateX = next;
      const transform = `translate3d(${translateX}px, 0px, 0px)`;
      if (!animate || !canAnimate()) {
        slider.style.transform = transform;
        return;
      }
      slider.animate([{ transform: slider.style.transform || 'translate3d(0px, 0px, 0px)' }, { transform }], {
        duration: durationMs,
        easing,
        fill: 'forwards',
      });
      slider.style.transform = transform;
    };

    const goTo = (idx, animate = true) => {
      activeIndex = Math.max(0, Math.min(slides.length - 1, idx));
      applyButtons();
      slidePositions = measureSlidePositions();
      setTranslateX(-slidePositions[activeIndex], animate);
    };

    applyButtons();
    goTo(0, false);

    prevBtn?.addEventListener('click', () => goTo(activeIndex - 1));
    nextBtn?.addEventListener('click', () => goTo(activeIndex + 1));

    const getClosestIndex = () => {
      const x = -translateX;
      let bestIdx = 0;
      let bestDist = Infinity;
      for (let i = 0; i < slidePositions.length; i++) {
        const dist = Math.abs(slidePositions[i] - x);
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = i;
        }
      }
      return bestIdx;
    };

    const clampTranslate = (x) => {
      const min = -slidePositions[slidePositions.length - 1];
      const max = 0;
      return Math.max(min, Math.min(max, x));
    };

    let pointerDown = false;
    let startX = 0;
    let startTranslate = 0;
    let activePointerId = null;

    const onPointerMove = (e) => {
      if (!pointerDown) return;
      const dx = e.clientX - startX;
      const next = clampTranslate(startTranslate + dx);
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        setTranslateX(next, false);
      });
    };

    const onPointerUp = () => {
      if (!pointerDown) return;
      pointerDown = false;
      if (activePointerId !== null) slider.releasePointerCapture?.(activePointerId);
      activePointerId = null;
      goTo(getClosestIndex(), true);
    };

    slider.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      pointerDown = true;
      startX = e.clientX;
      startTranslate = translateX;
      slidePositions = measureSlidePositions();
      activePointerId = e.pointerId;
      slider.setPointerCapture?.(e.pointerId);
    });
    slider.addEventListener('pointermove', onPointerMove);
    slider.addEventListener('pointercancel', onPointerUp);
    slider.addEventListener('pointerup', onPointerUp);

    window.addEventListener(
      'resize',
      debounce(() => {
        slidePositions = measureSlidePositions();
        goTo(activeIndex, false);
      }, 100),
      { passive: true }
    );
  }

  function initProcessStepsMotion() {
    const section = document.querySelector('section[data-slice-type="process_steps"]');
    if (!section) return;
    if (section.dataset.lucidProcessMotionInit === '1') return;
    section.dataset.lucidProcessMotionInit = '1';

    const line = section.querySelector('div.bg-accent.origin-top');
    const steps = Array.from(section.querySelectorAll('[data-step-index]'));
    const circles = steps
      .map((step) => step.querySelector('circle'))
      .filter((circle) => circle instanceof SVGCircleElement);

    const durationMs = getMotionDurationMs('--motion-duration-med', 300);
    const easing = getMotionEasing('--motion-ease-standard', 'ease');

    if (!canAnimate()) {
      if (line) line.style.transform = 'scaleY(1)';
      for (const circle of circles) circle.style.strokeDashoffset = '0px';
      return;
    }

    const revealed = new Set();
    const revealCircle = (circle) => {
      if (revealed.has(circle)) return;
      revealed.add(circle);
      circle.animate([{ strokeDashoffset: circle.style.strokeDashoffset || '163px' }, { strokeDashoffset: '0px' }], {
        duration: durationMs,
        easing,
        fill: 'forwards',
      });
      circle.style.strokeDashoffset = '0px';
    };

    const stepObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const circle = entry.target.querySelector('circle');
          if (circle) revealCircle(circle);
        }
      },
      { threshold: 0.4 }
    );
    for (const step of steps) stepObserver.observe(step);

    if (!line) return;

    let raf = 0;
    let sectionVisible = false;

    const clamp01 = (v) => Math.max(0, Math.min(1, v));

    const tick = () => {
      raf = 0;
      if (!sectionVisible) return;

      const rect = section.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const progress = clamp01((vh - rect.top) / (rect.height + vh));
      line.style.transform = `scaleY(${progress})`;

      raf = requestAnimationFrame(tick);
    };

    const sectionObserver = new IntersectionObserver(
      (entries) => {
        sectionVisible = entries.some((e) => e.isIntersecting);
        if (sectionVisible && !raf) raf = requestAnimationFrame(tick);
        if (!sectionVisible && raf) {
          cancelAnimationFrame(raf);
          raf = 0;
        }
      },
      { rootMargin: '200px 0px 200px 0px' }
    );
    sectionObserver.observe(section);
  }

  function initVideoHero() {
    const section = document.querySelector('section[data-slice-type="video_hero"]');
    if (!section) return;
    if (section.dataset.lucidVideoInit === '1') return;
    section.dataset.lucidVideoInit = '1';

    const wrapper = section.querySelector('div.group.cursor-pointer');
    const video = wrapper?.querySelector('video');
    const button = wrapper?.querySelector('button');
    if (!wrapper || !video || !button) return;

    const showButton = () => {
      button.classList.remove('opacity-0', 'scale-90', 'pointer-events-none');
      button.classList.add('opacity-100', 'scale-100');
      button.setAttribute('aria-label', 'Play video');
    };

    const hideButton = () => {
      button.classList.add('opacity-0', 'scale-90', 'pointer-events-none');
      button.classList.remove('opacity-100', 'scale-100');
      button.setAttribute('aria-label', 'Pause video');
    };

    showButton();

    const toggle = async () => {
      if (video.paused) {
        try {
          await video.play();
          hideButton();
        } catch {
          // Ignore if the placeholder video can't play.
          showButton();
        }
      } else {
        video.pause();
        showButton();
      }
    };

    wrapper.addEventListener('click', (e) => {
      if (e.target instanceof HTMLElement && e.target.closest('a')) return;
      toggle();
    });
    video.addEventListener('pause', showButton);
    video.addEventListener('play', hideButton);
  }

  async function init() {
    window.__lucid_line_split_ready = false;

    if (document.fonts?.ready) {
      try {
        await document.fonts.ready;
      } catch {
        // Ignore font readiness errors; splitting will still run with fallback fonts.
      }
    }

    const maskEls = Array.from(document.querySelectorAll(SPLIT_SELECTOR));
    const hosts = Array.from(new Set(maskEls.map(getSplitHost).filter(Boolean)));

    for (const host of hosts) splitHost(host);
    initLineReveals(hosts);
    applyHeroCtaLabelWidths();
    applyStaticCtaLabelWidths();
    initProcessSteps();
    applyCaseStudiesSliderSpacing();
    initAchievementsCounters();
    initServicesAccordion();
    initServiceHoverPreviews();
    initCaseStudiesSlider();
    initProcessStepsMotion();
    initVideoHero();

    const onResize = debounce(() => {
      for (const host of hosts) splitHost(host);
      for (const host of hosts) syncLineRevealForHost(host);
      applyHeroCtaLabelWidths();
      applyStaticCtaLabelWidths();
      initProcessSteps();
      applyCaseStudiesSliderSpacing();
    }, 100);

    window.addEventListener('resize', onResize, { passive: true });

    if ('ResizeObserver' in window) {
      const ro = new ResizeObserver(onResize);
      for (const host of hosts) ro.observe(host);
      const section = document.querySelector('section[data-slice-type="case_studies_showcase"]');
      const slider = section?.querySelector?.('.keen-slider');
      if (slider) ro.observe(slider);
    }

    window.__lucid_line_split_ready = true;
  }

  init();
})();
