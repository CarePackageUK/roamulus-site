(() => {
  const nav = document.getElementById('nav');
  const opening = document.querySelector('.opening');
  const hero = opening.querySelector('.hero');
  const sequence = opening.querySelector('.app-sequence');
  const intro = sequence.querySelector('.app-intro');
  const screenFlight = intro.querySelector('.screen-flight');
  const screen = intro.querySelector('.app-intro-home img');
  const scene = opening.querySelector('.scene');
  const phones = intro.querySelector('.app-intro-visual');
  const photograph = scene.querySelector('img');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width: 760px)');
  let frame = 0;
  let render = null;
  let loading = false;
  let lastProgress = -1;
  let lastDive = -1;

  const clamp = value => Math.min(1, Math.max(0, value));
  const ease = value => value * value * (3 - 2 * value);

  function drawScreenFlight(height) {
    const pinTop = Math.min(0, height - intro.offsetHeight);
    intro.style.setProperty('--intro-pin', `${pinTop}px`);

    const runway = sequence.offsetHeight - intro.offsetHeight;
    const dive = clamp((pinTop - sequence.getBoundingClientRect().top) / Math.max(1, runway));
    if (dive === lastDive) return;
    lastDive = dive;
    if (dive === 0) {
      screenFlight.style.setProperty('--dive-visible', 0);
      return;
    }

    const frame = intro.getBoundingClientRect();
    const display = screen.getBoundingClientRect();
    const width = screen.offsetWidth;
    const screenHeight = screen.offsetHeight;
    const x = display.left + display.width / 2 - frame.left;
    const y = display.top + display.height / 2 - frame.top;
    const advance = ease(clamp(dive / .82));
    // Aim at Home’s Speak it control so the push-in leads naturally to Lupa.
    const zoom = Math.max(frame.width / width * 1.4, height / screenHeight * 1.22);
    const targetX = frame.width / 2 + width * .125 * zoom;
    const targetY = height / 2 - pinTop - screenHeight * .01 * zoom;

    screenFlight.style.setProperty('--screen-width', `${width}px`);
    screenFlight.style.setProperty('--screen-x', `${x + (targetX - x) * advance}px`);
    screenFlight.style.setProperty('--screen-y', `${y + (targetY - y) * advance}px`);
    screenFlight.style.setProperty('--screen-scale', zoom ** advance);
    screenFlight.style.setProperty('--screen-angle', `${-9 * (1 - advance)}deg`);
    screenFlight.style.setProperty('--dive-visible', ease(clamp(dive / .09)));
    screenFlight.style.setProperty('--dive-shade', ease(clamp(dive / .62)));
    screenFlight.style.setProperty('--dive-exit', ease(clamp((dive - .67) / .33)));
  }

  function draw() {
    frame = 0;
    nav.classList.toggle('is-scrolled', scrollY > 10);
    if (!render || reducedMotion.matches) return;

    // Delay the layout enhancement if somebody has already started reading.
    if (!opening.classList.contains('is-journey')) {
      if (scrollY > 40) return;
      opening.classList.add('is-journey');
    }

    // Keep moving through the first part of the product reveal, then hold the valley behind it.
    const height = scene.clientHeight;
    const overlap = Math.min(height * .73, intro.offsetHeight * .66);
    const travel = hero.offsetHeight - height + overlap;
    const progress = clamp(-opening.getBoundingClientRect().top / Math.max(1, travel));
    const entry = (height - phones.getBoundingClientRect().top) / (height * .6);
    phones.style.setProperty('--home-rise', ease(clamp(entry)));
    phones.style.setProperty('--map-rise', ease(clamp((entry - .13) / .87)));
    drawScreenFlight(height);
    if (progress === lastProgress) return;
    lastProgress = progress;
    opening.style.setProperty('--road-progress', progress);
    render(progress, mobile.matches);
  }

  function scheduleFrame() {
    if (!frame) frame = requestAnimationFrame(draw);
  }

  async function startCamera() {
    if (reducedMotion.matches) {
      opening.classList.remove('is-journey');
      lastProgress = -1;
      lastDive = -1;
      return;
    }
    if (render || loading) {
      scheduleFrame();
      return;
    }
    loading = true;
    try {
      const {createHighlandJourney} = await import('./highland-camera.js?v=4');
      render = await createHighlandJourney(scene, photograph);
      if (render) scheduleFrame();
    } catch {
      // The photograph is already present if the optional camera cannot load.
    } finally {
      loading = false;
    }
  }

  scene.addEventListener('webglcontextlost', () => {
    render = null;
    opening.classList.remove('is-journey');
    lastProgress = -1;
  }, true);
  addEventListener('scroll', scheduleFrame, {passive: true});
  addEventListener('resize', () => {
    lastProgress = -1;
    lastDive = -1;
    scheduleFrame();
  }, {passive: true});
  reducedMotion.addEventListener('change', startCamera);
  draw();
  startCamera();

  if ('IntersectionObserver' in window && !reducedMotion.matches) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('in');
        observer.unobserve(entry.target);
      }
    }, { rootMargin: '0px 0px -8% 0px' });
    document.documentElement.classList.add('js');
    document.querySelectorAll('.reveal').forEach(element => observer.observe(element));
  }
})();
