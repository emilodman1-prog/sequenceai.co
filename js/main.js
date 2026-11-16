(() => {
  const desktop = matchMedia('(min-width: 1024px)');
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const INBOX = 'hello@sequence.industries';

  /* Nav --------------------------------------------------------------------
     White over a dark hero and black after it, with a soft dark fade behind
     it while the hero is on screen. Slides away going down, returns going up.
     On phones it starts below the announcement bar and rides up with it. */
  function initNav(nav) {
    const root = document.documentElement;
    const body = document.body;
    const hero = document.querySelector('.hero');
    const overDark = body.dataset.hero === 'dark' && hero;
    const announce = document.querySelector('.announce');
    let lastY = window.scrollY;
    let queued = false;

    function update() {
      queued = false;
      const y = window.scrollY;
      const navH = nav.offsetHeight;

      const offset = announce && !desktop.matches ? Math.max(0, announce.offsetHeight - y) : 0;
      root.style.setProperty('--announce-offset', `${offset}px`);

      if (overDark) {
        const edge = hero.offsetHeight - navH;
        root.style.setProperty('--melt', clamp((edge - y) / 160, 0, 1).toFixed(3));
        nav.classList.toggle('is-light', y < edge - navH / 2);
      } else {
        root.style.setProperty('--melt', '0');
      }

      nav.classList.toggle('is-frosted', !nav.classList.contains('is-light') && y > 8);

      if (Math.abs(y - lastY) > 4) {
        nav.classList.toggle('is-away', y > lastY && y > 160);
        lastY = y;
      }
    }

    function queue() {
      if (queued) return;
      queued = true;
      requestAnimationFrame(update);
    }

    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue);
    update();
  }

  /* Mobile menu ----------------------------------------------------------- */
  function initMenu(toggle) {
    const menu = document.getElementById('menu');

    function set(open) {
      document.body.classList.toggle('menu-open', open);
      toggle.setAttribute('aria-expanded', String(open));
    }

    toggle.addEventListener('click', () => set(!document.body.classList.contains('menu-open')));
    menu.addEventListener('click', (e) => {
      if (e.target.closest('a, button')) set(false);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') set(false);
    });
    matchMedia('(min-width: 768px)').addEventListener('change', () => set(false));
  }

  /* Story, desktop ----------------------------------------------------------
     The image beside the text changes as each [data-visual] block scrolls by. */
  function initStory(frames) {
    const figures = [...frames.querySelectorAll('figure')];
    const blocks = [...document.querySelectorAll('[data-visual]')];
    let current = 0;
    let queued = false;

    function update() {
      queued = false;
      if (!desktop.matches) return;
      const mark = window.innerHeight * 0.55;
      let index = 0;
      for (const block of blocks) {
        if (block.getBoundingClientRect().top < mark) index = Number(block.dataset.visual);
      }
      if (index === current) return;
      current = index;
      figures.forEach((f, i) => f.classList.toggle('is-active', i === index));
    }

    function queue() {
      if (queued) return;
      queued = true;
      requestAnimationFrame(update);
    }

    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue);
    update();
  }

  /* Story, phones: swipe or arrow keys through the same images. ------------ */
  function initCarousel(carousel) {
    const track = carousel.querySelector('.carousel-track');
    const figures = [...track.querySelectorAll('figure')];
    const dots = [...carousel.querySelectorAll('.carousel-dots span')];
    let current = 0;
    let startX = null;

    function show(index) {
      current = clamp(index, 0, figures.length - 1);
      figures.forEach((f, i) => {
        f.classList.toggle('is-active', i === current);
        f.classList.toggle('is-before', i < current);
      });
      dots.forEach((d, i) => d.classList.toggle('is-active', i === current));
    }

    // Steps through every image on its own while the carousel is on screen,
    // back to the first after the last. A swipe or key restarts the wait.
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let timer = null;
    let visible = false;

    function play() {
      clearInterval(timer);
      timer = null;
      if (reduceMotion || !visible) return;
      timer = setInterval(() => show((current + 1) % figures.length), 4000);
    }

    new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
      play();
    }).observe(carousel);

    track.addEventListener('pointerdown', (e) => {
      startX = e.clientX;
    });
    track.addEventListener('pointerup', (e) => {
      if (startX === null) return;
      const dx = e.clientX - startX;
      startX = null;
      if (Math.abs(dx) > 30) {
        show(current + (dx < 0 ? 1 : -1));
        play();
      }
    });
    track.addEventListener('pointercancel', () => {
      startX = null;
    });
    carousel.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') show(current + 1);
      if (e.key === 'ArrowLeft') show(current - 1);
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') play();
    });
  }

  /* Access dialog --------------------------------------------------------- */
  function initAccess(dialog) {
    const form = dialog.querySelector('#access-form');
    const status = dialog.querySelector('#access-status');

    document.querySelectorAll('[data-open-access]').forEach((button) => {
      button.addEventListener('click', () => dialog.showModal());
    });
    dialog.querySelector('.access-close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) dialog.close();
    });

    // No server: the request opens in the visitor's own email app, addressed
    // to the inbox below and ready to send.
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = form.elements.email.value.trim();
      const subject = 'Early access to Sequence';
      const body = `Please add ${email} to the list for early access to Sequence.`;
      window.location.href = `mailto:${INBOX}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      status.textContent = `Opening your email app. Or write to ${INBOX}`;
    });

    dialog.addEventListener('close', () => {
      status.textContent = '';
      form.reset();
    });
  }

  /* Feature view -------------------------------------------------------------
     Every feature card carries its own picture, title and text. Opening one
     copies them into the shared dialog. */
  function initFeatures(dialog) {
    const image = dialog.querySelector('#feature-image');
    const title = dialog.querySelector('#feature-title');
    const text = dialog.querySelector('#feature-text');

    document.querySelectorAll('.feature').forEach((feature) => {
      feature.querySelector('.feature-open').addEventListener('click', () => {
        const shot = feature.querySelector('img');
        image.src = shot.currentSrc || shot.src;
        image.alt = shot.alt;
        title.textContent = feature.querySelector('.t-h6').textContent;
        text.innerHTML = feature.querySelector('.feature-more').innerHTML;
        dialog.showModal();
      });
    });
    dialog.querySelector('.access-close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) dialog.close();
    });
  }

  /* Join: team tabs, search and "See all" ---------------------------------- */
  function initRoles(list) {
    const tabs = document.getElementById('roles-tabs');
    const buttons = [...tabs.querySelectorAll('button')];
    const search = document.getElementById('roles-search');
    const more = document.getElementById('roles-more');
    const empty = document.getElementById('roles-empty');
    const roles = [...list.querySelectorAll('.role')];
    const pageSize = 12;
    let team = 'all';
    let showAll = false;

    function centre(button, smooth) {
      const left = button.offsetLeft + button.offsetWidth / 2 - tabs.clientWidth / 2;
      tabs.scrollTo({ left, behavior: smooth ? 'smooth' : 'auto' });
    }

    function render() {
      const active = buttons.findIndex((b) => b.dataset.team === team);
      buttons.forEach((b, i) => {
        b.dataset.near = String(Math.min(3, Math.abs(i - active)));
        b.setAttribute('aria-pressed', String(i === active));
      });

      const query = search.value.trim().toLowerCase();
      const matches = roles.filter((role) => {
        const inTeam = team === 'all' || role.dataset.team === team;
        return inTeam && role.textContent.toLowerCase().includes(query);
      });
      const limit = showAll || query ? matches.length : pageSize;
      roles.forEach((role) => {
        role.hidden = matches.indexOf(role) === -1 || matches.indexOf(role) >= limit;
      });
      more.hidden = matches.length <= limit;
      empty.hidden = matches.length > 0;
    }

    buttons.forEach((button) => {
      button.addEventListener('click', () => {
        team = button.dataset.team;
        showAll = false;
        render();
        centre(button, true);
      });
    });
    search.addEventListener('input', render);
    more.addEventListener('click', () => {
      showAll = true;
      render();
    });

    render();
    centre(buttons[0], false);
    window.addEventListener('resize', () => centre(buttons.find((b) => b.dataset.team === team), false));
  }

  /* Role view -----------------------------------------------------------------
     Every role carries its own text. Opening one copies it into the shared
     dialog, with an Apply link addressed to the inbox. */
  function initRoleView(dialog) {
    const team = dialog.querySelector('#role-team');
    const title = dialog.querySelector('#role-title');
    const text = dialog.querySelector('#role-text');
    const apply = dialog.querySelector('#role-apply');

    document.querySelectorAll('.role').forEach((role) => {
      role.querySelector('.role-open').addEventListener('click', () => {
        const name = role.querySelector('h3').textContent;
        team.textContent = role.dataset.team;
        title.textContent = name;
        text.innerHTML = role.querySelector('.role-more').innerHTML;
        apply.href = `mailto:${INBOX}?subject=${encodeURIComponent(`Application: ${name}`)}`;
        dialog.showModal();
      });
    });
    dialog.querySelector('.access-close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) dialog.close();
    });
  }

  const nav = document.getElementById('nav');
  if (nav) initNav(nav);

  const toggle = document.querySelector('.nav-toggle');
  if (toggle) initMenu(toggle);

  const frames = document.getElementById('frames');
  if (frames) initStory(frames);

  const carousel = document.getElementById('carousel');
  if (carousel) initCarousel(carousel);

  const dialog = document.getElementById('access');
  if (dialog) initAccess(dialog);

  const feature = document.getElementById('feature');
  if (feature) initFeatures(feature);

  const list = document.getElementById('roles-list');
  if (list) initRoles(list);

  const roleView = document.getElementById('role');
  if (roleView) initRoleView(roleView);
})();
