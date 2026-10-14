/* No dependencies. Every page and link works without JavaScript. */
(() => {
  'use strict';
  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  // Animations run automatically, except when the visitor requests reduced motion.
  let paused = reduced.matches;
  const animations = new Set();
  function applyMotion() {
    root.classList.toggle('motion-paused', paused);
    document.dispatchEvent(new Event('portfolio:motion'));
    document.querySelectorAll('img[data-animated]').forEach(img => { img.src = paused ? img.dataset.still : img.dataset.animated; });
    if (paused) { animations.forEach(a => a.cancel()); animations.clear(); }
  }
  applyMotion();
  reduced.addEventListener('change', e => { paused = e.matches; applyMotion(); });

  // The language switch keeps the current section on the equivalent static page.
  const language = document.querySelector('.language-switch');
  if (language) {
    const destination = language.getAttribute('href').split('#')[0];
    const syncLanguage = () => language.setAttribute('href', destination + location.hash);
    syncLanguage(); window.addEventListener('hashchange', syncLanguage);
  }
  const menuButton = document.querySelector('.menu-toggle');
  const menu = document.querySelector('#mobile-nav');
  function closeMenu() { if (!menu) return; menu.hidden = true; menuButton.setAttribute('aria-expanded', 'false'); }
  menuButton?.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') === 'true';
    menu.hidden = open; menuButton.setAttribute('aria-expanded', String(!open));
  });
  menu?.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && menu && !menu.hidden) { closeMenu(); menuButton.focus(); } });
  document.addEventListener('click', e => { if (!e.target.closest('.site-header')) closeMenu(); });
  window.matchMedia('(min-width:701px)').addEventListener('change', e => { if (e.matches) closeMenu(); });

  const header = document.querySelector('.site-header');
  let ticking = false;
  const updateHeader = () => { header?.classList.toggle('scrolled', scrollY > 30); ticking = false; };
  updateHeader();
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(updateHeader); } }, { passive:true });
  if ('IntersectionObserver' in window) {
    const reveals = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.remove('is-waiting'); reveals.unobserve(entry.target); }
    }), { threshold: 0.04 });
    document.querySelectorAll('.reveal').forEach(el => {
      if (!paused && el.getBoundingClientRect().top > innerHeight) el.classList.add('is-waiting');
      reveals.observe(el);
    });
    const sections = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      document.querySelectorAll('.desktop-nav a').forEach(a => {
        if (a.hash === '#' + entry.target.id) a.setAttribute('aria-current','location'); else a.removeAttribute('aria-current');
      });
    }), { rootMargin:'-15% 0px -55% 0px' });
    document.querySelectorAll('main section[id]:not(#hero)').forEach(s => sections.observe(s));
  }

  // A fluid, layered photo trail inspired by Yourwave.
  // All tiles are decorative; links, scrolling and keyboard interactions stay native.
  const hero = document.querySelector('.hero');
  const trail = document.querySelector('.image-trail');
  if (hero && trail && typeof Element.prototype.animate === 'function') {
    const sources = (trail.dataset.images || '').split('|').filter(Boolean);
    const active = new Set();
    const step = 64;
    const maxActive = 13;
    const lifetime = 1550;
    let lastSpawn = null;
    let latest = null;
    let imageIndex = 0;
    let cacheReady = false;
    const canTrail = () => !paused && !reduced.matches && finePointer.matches && window.matchMedia('(min-width:701px)').matches && !document.hidden;

    function preloadTrail() {
      if (cacheReady || !sources.length || !canTrail()) return;
      cacheReady = true;
      sources.forEach(src => { const img = new Image(); img.src = src; });
    }

    function clearTrail() {
      lastSpawn = null;
      latest = null;
      for (const item of active) {
        item.animation.cancel();
        item.element.remove();
      }
      active.clear();
    }

    function spawnTrailImage(x, y, vx) {
      if (!sources.length) return;
      if (active.size >= maxActive) {
        const oldest = active.values().next().value;
        oldest.animation.cancel();
        oldest.element.remove();
        active.delete(oldest);
      }

      const image = new Image();
      const sequence = imageIndex++;
      const angle = Math.max(-11, Math.min(11, vx * 9)) + [-3, 2, 0, -2, 3][sequence % 5];
      image.className = 'trail-image';
      image.alt = '';
      image.draggable = false;
      image.decoding = 'async';
      image.src = sources[sequence % sources.length];
      image.style.left = x + 'px';
      image.style.top = y + 'px';
      image.style.zIndex = String(sequence + 1);
      trail.append(image);

      const transformAt = (vertical, rotation, scale) =>
        'translate(-50%, ' + vertical + ') rotate(' + rotation + 'deg) scale(' + scale + ')';
      const animation = image.animate([
        {
          opacity: 0,
          transform: transformAt('-43%', angle - 4, .78),
          offset: 0,
          easing: 'cubic-bezier(.22, 1, .36, 1)'
        },
        {
          opacity: 1,
          transform: transformAt('-50%', angle, 1),
          offset: .22
        },
        {
          opacity: 1,
          transform: transformAt('-50%', angle, 1),
          offset: .61,
          easing: 'ease-in'
        },
        {
          opacity: 0,
          transform: transformAt('-58%', angle + 3, .92),
          offset: 1
        }
      ], {duration: lifetime, fill: 'forwards'});

      const item = {element: image, animation};
      active.add(item);
      latest = {element: image, x, y};
      const cleanup = () => {
        active.delete(item);
        image.remove();
        if (latest && latest.element === image) latest = null;
      };
      animation.addEventListener('finish', cleanup, {once:true});
      animation.addEventListener('cancel', cleanup, {once:true});
    }

    hero.addEventListener('pointerenter', e => {
      if (e.pointerType !== 'touch') preloadTrail();
    }, {passive:true});

    hero.addEventListener('pointermove', e => {
      if (e.pointerType === 'touch' || !canTrail() || !sources.length) return;
      if (e.target.closest('a, button, summary')) {
        lastSpawn = null;
        latest = null;
        return;
      }

      preloadTrail();
      const rect = hero.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (latest) {
        latest.element.style.left = (latest.x + (x - latest.x) * .22) + 'px';
        latest.element.style.top = (latest.y + (y - latest.y) * .22) + 'px';
      }

      const now = performance.now();
      if (!lastSpawn) {
        spawnTrailImage(x, y, 0);
        lastSpawn = {x, y, time:now};
        return;
      }

      const dx = x - lastSpawn.x;
      const dy = y - lastSpawn.y;
      const distance = Math.hypot(dx, dy);
      if (distance < step || now - lastSpawn.time < 35) return;

      // Fill large pointer jumps with intermediate tiles, but limit DOM churn.
      const count = Math.min(3, Math.floor(distance / step));
      for (let n = 1; n <= count; n++) {
        spawnTrailImage(
          lastSpawn.x + dx * n / count,
          lastSpawn.y + dy * n / count,
          dx / distance
        );
      }
      lastSpawn = {x, y, time:now};
    }, {passive:true});

    hero.addEventListener('pointerleave', () => {
      lastSpawn = null;
      latest = null; // Let the existing images fade out naturally.
    });
    document.addEventListener('portfolio:motion', () => { if (!canTrail()) clearTrail(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) clearTrail(); });
    finePointer.addEventListener('change', () => { if (!canTrail()) clearTrail(); });
  }

  // Mobile-only slideshow: fast, clean project-image transitions between the two logo lines.
  // A static first photo remains available without JS or with reduced motion.
  const mobileGallery = document.querySelector('.mobile-hero-gallery');
  if (mobileGallery && trail) {
    const mobileViewport = window.matchMedia('(max-width:700px)');
    const sources = (trail.dataset.images || '').split('|').filter(Boolean);
    const layers = [...mobileGallery.querySelectorAll('.mobile-hero-photo')];
    let visibleLayer = 0;
    let slideIndex = 0;
    let slideshowTimer = null;
    let loadingSlide = false;
    let generation = 0;
    const slideshowEnabled = () =>
      mobileViewport.matches && !paused && !reduced.matches && !document.hidden && sources.length > 1;

    function advanceMobileSlide() {
      if (!slideshowEnabled() || loadingSlide || layers.length !== 2) return;
      loadingSlide = true;
      const nextIndex = (slideIndex + 1) % sources.length;
      const requestGeneration = generation;
      const nextImage = new Image();
      nextImage.onload = () => {
        if (requestGeneration !== generation || !slideshowEnabled()) return;
        const outgoing = layers[visibleLayer];
        const incoming = layers[1 - visibleLayer];
        incoming.src = nextImage.src;
        incoming.classList.add('is-current');
        outgoing.classList.remove('is-current');
        visibleLayer = 1 - visibleLayer;
        slideIndex = nextIndex;
        loadingSlide = false;
      };
      nextImage.onerror = () => {
        if (requestGeneration !== generation) return;
        slideIndex = nextIndex;
        loadingSlide = false;
      };
      nextImage.src = sources[nextIndex];
    }

    function syncMobileSlides() {
      if (!slideshowEnabled()) {
        if (slideshowTimer !== null) clearInterval(slideshowTimer);
        slideshowTimer = null;
        generation++;
        loadingSlide = false;
        return;
      }
      if (slideshowTimer === null) {
        slideshowTimer = setInterval(advanceMobileSlide, 760);
      }
    }
    syncMobileSlides();
    mobileViewport.addEventListener('change', syncMobileSlides);
    document.addEventListener('portfolio:motion', syncMobileSlides);
    document.addEventListener('visibilitychange', syncMobileSlides);
  }

  // Accessible native dialog. The original image links remain the no-JS fallback.
  const dialog = document.querySelector('.lightbox');
  const gallery = [...document.querySelectorAll('[data-lightbox]')];
  if (dialog && typeof dialog.showModal === 'function') {
    let current = 0, opener = null;
    const image = dialog.querySelector('img');
    const count = dialog.querySelector('.lightbox-count');
    function show(index) {
      current = (index + gallery.length) % gallery.length;
      const source = gallery[current].querySelector('img');
      image.src = paused && source.dataset.still ? source.dataset.still : gallery[current].href;
      image.alt = source.alt; count.textContent = `${current+1} / ${gallery.length}`;
    }
    gallery.forEach((link,index) => link.addEventListener('click', e => {
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
      e.preventDefault(); opener = link; show(index); dialog.showModal(); document.body.classList.add('modal-open');
    }));
    dialog.querySelector('.lightbox-close').addEventListener('click', () => dialog.close());
    dialog.querySelector('.lightbox-prev').addEventListener('click', () => show(current-1));
    dialog.querySelector('.lightbox-next').addEventListener('click', () => show(current+1));
    dialog.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); show(current-1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); show(current+1); }
    });
    dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
    dialog.addEventListener('close', () => { document.body.classList.remove('modal-open'); image.removeAttribute('src'); opener?.focus(); });
  }
  // Word-by-word heading entrances: keep clipping only during the reveal.
  // Once each title finishes animating, its masks become overflow-visible to
  // avoid cutting off glyphs, accents and tightly tracked display lettering.
  const titles = [...document.querySelectorAll('.section-heading h2,.about h2,.contact-title h2,.project-heading h1,.next-project strong')];
  if ('IntersectionObserver' in window) {
    function showTitle(title) {
      if (!title.classList.contains('title-waiting') || paused || reduced.matches) {
        title.classList.remove('title-waiting');
        title.classList.add('title-revealed');
        return;
      }
      const pieces = title.querySelectorAll('.word-piece');
      const last = pieces[pieces.length - 1];
      const finish = () => {
        title.classList.add('title-revealed');
        last?.removeEventListener('transitionend', onFinish);
      };
      function onFinish(event) {
        if (event.target === last && event.propertyName === 'transform') finish();
      }
      last?.addEventListener('transitionend', onFinish);
      title.classList.remove('title-waiting');
      // Fallback for browser-tab changes or disabled transitions.
      window.setTimeout(finish, 1750);
    }
    const titleObserver = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { showTitle(entry.target); titleObserver.unobserve(entry.target); }
    }), {threshold:.12});
    titles.forEach(title => {
      let wordIndex = 0;
      title.setAttribute('aria-label', title.innerText.replace(/\s+/g,' ').trim());
      [...title.childNodes].forEach(node => {
        if (node.nodeType !== Node.TEXT_NODE) return;
        const fragment = document.createDocumentFragment();
        node.textContent.split(/(\s+)/).forEach(word => {
          if (!word.trim()) { fragment.append(document.createTextNode(word)); return; }
          const mask = document.createElement('span'), piece = document.createElement('span');
          mask.className='word-window';mask.setAttribute('aria-hidden','true');
          piece.className='word-piece';piece.textContent=word;piece.style.setProperty('--word-index',Math.min(wordIndex++,8));
          mask.append(piece);fragment.append(mask);
        });
        node.replaceWith(fragment);
      });
      title.classList.add('motion-title');
      if (!paused && title.getBoundingClientRect().top > innerHeight) title.classList.add('title-waiting');
      else title.classList.add('title-revealed');
      titleObserver.observe(title);
    });
  }

  // Scroll-based motion uses the browser's native scrolling; no wheel interception.
  const progress = document.querySelector('.scroll-progress');
  const logo = document.querySelector('.hero-logo');
  const portrait = document.querySelector('.portrait');
  const cards = [...document.querySelectorAll('.project-visual')];
  const wide = window.matchMedia('(min-width:701px)');
  let motionFrame = 0;
  const clamp = (n,min,max) => Math.min(max,Math.max(min,n));
  function paintScroll() {
    motionFrame=0;
    const maxScroll = Math.max(1,root.scrollHeight-innerHeight);
    progress?.style.setProperty('--scroll-progress',clamp(scrollY/maxScroll,0,1));
    const enabled = !paused && !reduced.matches;
    root.classList.toggle('scroll-effects',enabled);
    if (!enabled) return;
    if (hero && logo) {
      const rect=hero.getBoundingClientRect(), amount=clamp(-rect.top/Math.max(rect.height,1),0,1);
      logo.style.setProperty('--hero-shift',`${amount*100}px`);
      logo.style.setProperty('--hero-scale',1+amount*.12);
      logo.style.setProperty('--hero-opacity',clamp(1-amount*1.25,0,1));
    }
    if (wide.matches) {
      cards.forEach(card => {
        const rect=card.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > innerHeight) return;
        const amount=clamp((innerHeight/2-(rect.top+rect.height/2))/innerHeight,-1,1);
        card.style.setProperty('--image-shift',`${amount*28}px`);
      });
      if (portrait) {
        const rect=portrait.getBoundingClientRect(), amount=clamp((innerHeight/2-rect.top)/innerHeight,-1,1);
        portrait.style.setProperty('--portrait-shift',`${amount*-13}px`);
        portrait.style.setProperty('--portrait-rotate',`${amount*2}deg`);
      }
    }
  }
  function scheduleScroll(){if(!motionFrame) motionFrame=requestAnimationFrame(paintScroll);}
  window.addEventListener('scroll',scheduleScroll,{passive:true});
  window.addEventListener('resize',scheduleScroll,{passive:true});
  document.addEventListener('portfolio:motion',scheduleScroll);
  paintScroll();

  // Circular contextual cursor, inspired by the reference's view-cursor interaction.
  const cursor=document.createElement('div'), cursorText=document.createElement('span');
  cursor.className='custom-cursor';cursor.setAttribute('aria-hidden','true');cursor.append(cursorText);document.body.append(cursor);
  let pointerX=0,pointerY=0,cursorX=0,cursorY=0,cursorFrame=0,pointerKnown=false;
  const cursorAllowed=()=>finePointer.matches && wide.matches && !paused && !reduced.matches && !document.body.classList.contains('modal-open');
  function stopCursor(){cancelAnimationFrame(cursorFrame);cursorFrame=0;pointerKnown=false;root.classList.remove('cursor-enabled');cursor.classList.remove('is-visible');}
  function tickCursor(){
    cursorFrame=0;
    if(!cursorAllowed() || document.hidden){stopCursor();return;}
    cursorX+=(pointerX-cursorX)*.3;cursorY+=(pointerY-cursorY)*.3;
    cursor.style.left=`${cursorX}px`;cursor.style.top=`${cursorY}px`;
    if(Math.abs(pointerX-cursorX)+Math.abs(pointerY-cursorY)>.15) cursorFrame=requestAnimationFrame(tickCursor);
  }
  document.addEventListener('pointermove',e=>{
    if(e.pointerType==='touch' || !cursorAllowed()){stopCursor();return;}
    pointerX=e.clientX;pointerY=e.clientY;
    if(!pointerKnown){cursorX=pointerX;cursorY=pointerY;pointerKnown=true;}
    root.classList.add('cursor-enabled');cursor.classList.add('is-visible');
    const target=e.target.closest('a,button,summary');let label='';const es=root.lang==='es';
    if(target?.matches('.project-card a')) label=es?'Ver':'View';
    else if(target?.matches('[data-lightbox]')) label=es?'Ampliar':'Explore';
    else if(target?.matches('.download-button')) label=es?'Descargar':'Download';
    else if(target?.matches('.contact-title')) label=es?'Hablemos':'Say hello';
    cursorText.textContent=label;cursor.classList.toggle('has-label',Boolean(label));cursor.classList.toggle('is-link',Boolean(target));
    if(!cursorFrame)cursorFrame=requestAnimationFrame(tickCursor);
  },{passive:true});
  document.addEventListener('pointerdown',e=>{if(!cursorAllowed() || e.pointerType==='touch')return;pointerX=cursorX=e.clientX;pointerY=cursorY=e.clientY;cursor.style.left=`${cursorX}px`;cursor.style.top=`${cursorY}px`;},{passive:true});
  document.documentElement.addEventListener('pointerleave',stopCursor);
  window.addEventListener('blur',stopCursor);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stopCursor();});
  document.addEventListener('keydown',e=>{if(e.key==='Tab')stopCursor();});
  document.addEventListener('portfolio:motion',()=>{if(!cursorAllowed())stopCursor();});
  finePointer.addEventListener('change',stopCursor);wide.addEventListener('change',stopCursor);

  // Keep download buttons stationary so the pointer and click target never slide apart.

})();
