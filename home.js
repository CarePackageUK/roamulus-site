(() => {
  const nav = document.getElementById('nav');
  const opening = document.querySelector('.opening');
  const hero = opening.querySelector('.hero');
  const sequence = opening.querySelector('.app-sequence');
  const intro = sequence.querySelector('.app-intro');
  const screenFlight = intro.querySelector('.screen-flight');
  const screen = intro.querySelector('.app-intro-home img');
  const route = screenFlight.querySelector('.flight-route');
  const campsite = screenFlight.querySelector('.flight-camp');
  const routeCanvas = route.querySelector('canvas');
  const routeStop = route.querySelector('.route-stop');
  const routeNote = route.querySelector('.route-note');
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
  let renderRoute = null;
  let lastWaypoint = -1;
  const waypoints = [
    ['Portsmouth to Caen', 'Across the Channel to Ouistreham.'],
    ['Caen ferry port', 'Off the ferry and onto the roads of Ouistreham.'],
    ['Aire Camping-Car Ouistreham', 'Your first overnight stop.']
  ];

  const clamp = value => Math.min(1, Math.max(0, value));
  const ease = value => value * value * (3 - 2 * value);
  const between = (value, start, end) => ease(clamp((value - start) / (end - start)));

  function drawScreenFlight(height) {
    const pinTop = Math.min(0, height - intro.offsetHeight);
    intro.style.setProperty('--intro-pin', `${pinTop}px`);

    const runway = sequence.offsetHeight - intro.offsetHeight;
    const progress = clamp((pinTop - sequence.getBoundingClientRect().top) / Math.max(1, runway));
    if (progress === lastDive) return;
    lastDive = progress;
    const dive = clamp(progress / .74);
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
    const advance = between(dive, 0, .25);
    // Aim at Home’s Speak it control so the push-in leads naturally to Lupa.
    const zoom = Math.max(frame.width / width * 1.4, height / screenHeight * 1.22);
    const targetX = frame.width / 2 + width * .115 * zoom;
    const targetY = height / 2 - pinTop - screenHeight * .002 * zoom;
    const tap = between(dive, .21, .26) * (1 - between(dive, .27, .33));

    screenFlight.style.setProperty('--screen-width', `${width}px`);
    screenFlight.style.setProperty('--screen-x', `${x + (targetX - x) * advance}px`);
    screenFlight.style.setProperty('--screen-y', `${y + (targetY - y) * advance}px`);
    screenFlight.style.setProperty('--screen-scale', zoom ** advance);
    screenFlight.style.setProperty('--screen-angle', `${-9 * (1 - advance)}deg`);
    screenFlight.style.setProperty('--dive-visible', between(dive, 0, .075));
    screenFlight.style.setProperty('--dive-shade', between(dive, 0, .31));
    screenFlight.style.setProperty('--tap', tap);
    screenFlight.style.setProperty('--tap-scale', 1.18 - tap * .33);
    screenFlight.style.setProperty('--story-in', between(dive, .28, .35));
    screenFlight.style.setProperty('--plan-in', between(dive, .48, .55));
    screenFlight.style.setProperty('--words-1', between(dive, .32, .37));
    screenFlight.style.setProperty('--words-2', between(dive, .36, .41));
    screenFlight.style.setProperty('--words-3', between(dive, .40, .45));
    screenFlight.style.setProperty('--dive-exit', between(progress, .962, 1));
    screenFlight.style.setProperty('--story-top', `${-pinTop}px`);
    screenFlight.style.setProperty('--story-height', `${height}px`);
    const open = between(dive, .57, .65);
    route.style.setProperty('--route-open', open);
    if (open > 0) {
      const waypoint = dive >= .925 ? 2 : dive >= .777 ? 1 : 0;
      if (waypoint !== lastWaypoint) {
        [routeStop.textContent, routeNote.textContent] = waypoints[waypoint];
        lastWaypoint = waypoint;
      }
      const siteZoom = between(progress, .685, .76);
      renderRoute(clamp((dive - .60) / .175), clamp((dive - .804) / .121), between(dive, .774, .806), siteZoom);
    }

    const arrival = between(progress, .748, .818);
    const parking = between(progress, .777, .927);
    const frameTop = campsite.getBoundingClientRect().top;
    const map = routeCanvas.getBoundingClientRect();
    campsite.style.setProperty('--pin-y', `${map.top + map.height / 2 - frameTop}px`);
    campsite.style.setProperty('--camp-reveal', arrival);
    campsite.style.setProperty('--parking', parking);
    campsite.style.setProperty('--camp-caption', between(progress, .88, .948));
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
      const [{createHighlandJourney}, {createDayOneMap}] = await Promise.all([
        import('./highland-camera.js?v=4'),
        import('./day-one-map.js?v=9')
      ]);
      renderRoute = createDayOneMap(routeCanvas);
      if (renderRoute) render = await createHighlandJourney(scene, photograph);
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
