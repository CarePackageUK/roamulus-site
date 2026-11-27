(() => {
  const nav = document.getElementById('nav');
  const hero = document.querySelector('.hero');
  const scene = hero.querySelector('.scene img');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0;

  function draw() {
    frame = 0;
    nav.classList.toggle('is-scrolled', scrollY > 10);

    if (reducedMotion.matches || scrollY > hero.offsetHeight) return;

    const progress = Math.min(1, Math.max(0, scrollY / hero.offsetHeight));
    scene.style.setProperty('--scene-offset', `${progress * 50}px`);
    scene.style.setProperty('--scene-scale', 1 + progress * .12);
  }

  function scheduleFrame() {
    if (!frame) frame = requestAnimationFrame(draw);
  }

  addEventListener('scroll', scheduleFrame, { passive: true });
  addEventListener('resize', scheduleFrame, { passive: true });
  reducedMotion.addEventListener('change', scheduleFrame);
  draw();

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
