(() => {
  const nav = document.getElementById('nav');
  const opening = document.querySelector('.opening');
  const hero = opening.querySelector('.hero');
  const intro = opening.querySelector('.app-intro');
  const scene = opening.querySelector('.scene');
  const phones = intro.querySelector('.app-intro-visual');
  const photograph = scene.querySelector('img');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width: 760px)');
  let frame = 0;
  let render = null;
  let loading = false;
  let lastProgress = -1;

  const clamp = value => Math.min(1, Math.max(0, value));
  const ease = value => value * value * (3 - 2 * value);

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
