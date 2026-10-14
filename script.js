/* No dependencies. Every page and link works without JavaScript. */
(() => {
  'use strict';
  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  let savedMotion = null;
  try { savedMotion = localStorage.getItem('lf-motion'); } catch (_) { /* Private mode */ }
  let paused = savedMotion === 'paused' || reduced.matches;
  const motionButton = document.querySelector('.motion-toggle');
  const animations = new Set();
  function applyMotion() {
    root.classList.toggle('motion-paused', paused);
    document.dispatchEvent(new Event('portfolio:motion'));
    document.querySelectorAll('img[data-animated]').forEach(img => { img.src = paused ? img.dataset.still : img.dataset.animated; });
    if (motionButton) {
      motionButton.setAttribute('aria-pressed', String(paused));
      motionButton.textContent = paused ? motionButton.dataset.play : motionButton.dataset.pause;
    }
    if (paused) { animations.forEach(a => a.cancel()); animations.clear(); }
  }
  applyMotion();
  motionButton?.addEventListener('click', () => {
    paused = !paused;
    try { localStorage.setItem('lf-motion', paused ? 'paused' : 'playing'); } catch (_) {}
    applyMotion();
  });
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

  // Original portfolio's image-trail idea, with a bounded number of elements.
  const hero = document.querySelector('.hero');
  const trail = document.querySelector('.image-trail');
  if (hero && trail && typeof Element.prototype.animate === 'function') {
    const sources = trail.dataset.images.split('|');
    let last = {x:-1000,y:-1000,time:0}, index = 0;
    hero.addEventListener('pointermove', e => {
      if (paused || !finePointer.matches || e.target.closest('a,button') || document.hidden) return;
      const now = performance.now();
      if (now-last.time < 120 || Math.hypot(e.clientX-last.x,e.clientY-last.y) < 85) return;
      last = {x:e.clientX,y:e.clientY,time:now};
      if (trail.children.length >= 7) return;
      const rect = hero.getBoundingClientRect();
      const image = new Image(); image.className = 'trail-image'; image.alt = '';
      image.src = sources[index++ % sources.length];
      image.style.left = `${e.clientX-rect.left}px`; image.style.top = `${e.clientY-rect.top}px`;
      trail.append(image);
      const rotation = (index % 5 - 2) * 5;
      const animation = image.animate([
        {opacity:0,transform:`translate(-50%,-45%) rotate(${rotation}deg) scale(.8)`},
        {opacity:1,transform:`translate(-50%,-50%) rotate(${rotation}deg) scale(1)`,offset:.15},
        {opacity:1,transform:`translate(-50%,-50%) rotate(${rotation}deg) scale(1)`,offset:.6},
        {opacity:0,transform:`translate(-50%,-65%) rotate(${rotation}deg) scale(.92)`}
      ],{duration:1100,easing:'cubic-bezier(.22,1,.36,1)'});
      animations.add(animation);
      const cleanup = () => { image.remove(); animations.delete(animation); };
      animation.onfinish = cleanup; animation.oncancel = cleanup;
    }, {passive:true});
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
  // Word-by-word heading entrances keep the underlying text accessible.
  const titles = [...document.querySelectorAll('.section-heading h2,.about h2,.contact-title h2,.project-heading h1,.next-project strong')];
  if ('IntersectionObserver' in window) {
    const titleObserver = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.remove('title-waiting'); titleObserver.unobserve(entry.target); }
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
    cursor.style.transform=`translate3d(${cursorX}px,${cursorY}px,0)`;
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
  document.addEventListener('pointerdown',e=>{if(!cursorAllowed() || e.pointerType==='touch')return;pointerX=cursorX=e.clientX;pointerY=cursorY=e.clientY;cursor.style.transform=`translate3d(${cursorX}px,${cursorY}px,0)`;cursor.classList.add('is-pressed');},{passive:true});
  document.addEventListener('pointerup',()=>cursor.classList.remove('is-pressed'),{passive:true});
  document.documentElement.addEventListener('pointerleave',stopCursor);
  window.addEventListener('blur',stopCursor);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stopCursor();});
  document.addEventListener('keydown',e=>{if(e.key==='Tab')stopCursor();});
  document.addEventListener('portfolio:motion',()=>{if(!cursorAllowed())stopCursor();});
  finePointer.addEventListener('change',stopCursor);wide.addEventListener('change',stopCursor);

  // Keep download buttons stationary so the pointer and click target never slide apart.

})();
