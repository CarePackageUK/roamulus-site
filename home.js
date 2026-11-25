// Roamulus: a light touch of motion. Everything reads and works without it.
(() => {
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // The bar picks up a background once you scroll.
  const nav = document.getElementById('nav');
  const onScroll = () => nav && nav.classList.toggle('is-scrolled', scrollY > 10);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Sections settle into place as they arrive.
  const seen = new IntersectionObserver(entries => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in'); seen.unobserve(e.target); }
  }, { rootMargin: '0px 0px -8% 0px', threshold: .1 });
  document.querySelectorAll('.reveal').forEach(el => seen.observe(el));

  // The hero phone leans gently toward the pointer.
  const hero = document.getElementById('hero-visual');
  const phone = hero && hero.querySelector('.iphone-lg');
  if (phone && !still && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    addEventListener('pointermove', e => {
      const x = e.clientX / innerWidth - .5, y = e.clientY / innerHeight - .5;
      phone.style.setProperty('--ry', `${(-8 + x * 10).toFixed(2)}deg`);
      phone.style.setProperty('--rx', `${(4 - y * 6).toFixed(2)}deg`);
    }, { passive: true });
  }

  // The camp scene drifts a little slower than the page.
  const scene = document.querySelector('.hero .scene img');
  if (scene && !still) {
    let ticking = false;
    addEventListener('scroll', () => {
      if (ticking) return; ticking = true;
      requestAnimationFrame(() => { scene.style.setProperty('--py', `${Math.min(scrollY, 900) * .25}px`); ticking = false; });
    }, { passive: true });
  }

})();
