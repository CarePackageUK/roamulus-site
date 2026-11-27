(() => {
  const nav = document.getElementById('nav');
  const hero = document.querySelector('.hero');
  const scene = hero.querySelector('.scene');
  const photograph = scene.querySelector('img');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width: 760px)');
  let frame = 0;
  let render = null;
  let loading = false;
  let lastProgress = -1;

  function draw() {
    frame = 0;
    nav.classList.toggle('is-scrolled', scrollY > 10);
    if (!render || reducedMotion.matches) return;

    // Delay the layout enhancement if somebody has already started reading.
    if (!hero.classList.contains('is-journey')) {
      if (scrollY > 40) return;
      hero.classList.add('is-journey');
    }

    const travel = hero.offsetHeight - scene.clientHeight;
    const progress = Math.min(1, Math.max(0, -hero.getBoundingClientRect().top / Math.max(1, travel)));
    if (progress === lastProgress) return;
    lastProgress = progress;
    hero.style.setProperty('--road-progress', progress);
    render(progress, mobile.matches);
  }

  function scheduleFrame() {
    if (!frame) frame = requestAnimationFrame(draw);
  }

  async function startCamera() {
    if (reducedMotion.matches) {
      hero.classList.remove('is-journey');
      lastProgress = -1;
      return;
    }
    if (render || loading) {
      scheduleFrame();
      return;
    }
    loading = true;
    try {
      const {createHighlandJourney} = await import('./highland-camera.js?v=3');
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
    hero.classList.remove('is-journey');
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
