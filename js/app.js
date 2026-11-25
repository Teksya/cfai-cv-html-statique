// Progressive enhancement only: without this script every chamber is
// still rendered and readable, it just loses the portal effects.
(function () {
  'use strict';

  var root = document.documentElement;
  root.classList.add('js');

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // CSS cannot stop the SVG (SMIL) flicker of the portal rims: pause it here.
  var sprite = document.querySelector('.sprite');
  function syncSvgMotion() {
    if (!sprite || !sprite.pauseAnimations) return;
    if (reduceMotion.matches) sprite.pauseAnimations(); else sprite.unpauseAnimations();
  }
  syncSvgMotion();
  if (reduceMotion.addEventListener) reduceMotion.addEventListener('change', syncSvgMotion);
  var header = document.querySelector('.site-header');
  var bar = document.querySelector('.test-progress-bar');
  var narrator = document.querySelector('.narrator');
  var narratorText = document.querySelector('.narrator-text');
  var chambers = Array.prototype.slice.call(document.querySelectorAll('.chamber'));
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav-list a'));

  // Classic view: plain one-column CV. Remembered per browser,
  // forced by ?classique in the URL (used to generate the PDF).
  var toggle = document.getElementById('toggle-classic');
  var toggleLabel = toggle && toggle.querySelector('.tool-label');

  function readPref() {
    try { return localStorage.getItem('cv-view') === 'classic'; } catch (e) { return false; }
  }
  function savePref(on) {
    try { localStorage.setItem('cv-view', on ? 'classic' : 'chambers'); } catch (e) { /* storage blocked */ }
  }
  function setClassic(on) {
    root.classList.toggle('classic', on);
    if (toggle) {
      toggle.setAttribute('aria-pressed', String(on));
      toggleLabel.textContent = on ? 'Revenir au parcours de test' : 'Afficher le CV classique';
    }
    if (narrator) narrator.classList.add('is-hidden');
    syncHeaderHeight();
  }

  if (toggle) {
    toggle.hidden = false;
    toggle.addEventListener('click', function () {
      var on = !root.classList.contains('classic');
      setClassic(on);
      savePref(on);
      window.scrollTo(0, 0);
    });
  }

  // Printing (and "save as PDF") always uses the classic layout.
  var classicBeforePrint = false;
  window.addEventListener('beforeprint', function () {
    classicBeforePrint = root.classList.contains('classic');
    root.classList.add('classic');
  });
  window.addEventListener('afterprint', function () {
    if (!classicBeforePrint) root.classList.remove('classic');
  });

  // Sticky header must not hide anchored headings.
  function syncHeaderHeight() {
    var sticky = getComputedStyle(header).position === 'sticky';
    root.style.setProperty('--header-h', sticky ? header.offsetHeight + 'px' : '0px');
  }
  window.addEventListener('resize', syncHeaderHeight);
  setClassic(/[?&]classique/.test(location.search) || readPref());

  // Scroll progress across the whole test.
  var ticking = false;
  function updateProgress() {
    ticking = false;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var ratio = max > 0 ? Math.min(1, window.scrollY / max) : 0;
    if (bar) bar.style.width = (ratio * 100).toFixed(1) + '%';
    // Keep the footer readable: the narrator steps aside at the very end.
    if (narrator && ratio > .97) narrator.classList.add('is-hidden');
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(updateProgress); }
  }, { passive: true });
  updateProgress();

  // Current chamber: nav highlight and narrator line.
  var current = null;
  var narratorTimer;
  function enterChamber(section) {
    if (section === current) return;
    current = section;
    navLinks.forEach(function (link) {
      if (link.getAttribute('href') === '#' + section.id) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
    say(null);
  }

  // Narrator: a line for the current chamber, or a one-off line.
  function say(text) {
    if (!narrator || root.classList.contains('classic')) return;
    narrator.classList.add('is-hidden');
    clearTimeout(narratorTimer);
    // Read the line when the timer fires: fast jumps must show the last chamber.
    narratorTimer = setTimeout(function () {
      var line = text || (current && current.getAttribute('data-annonce'));
      if (!line) return;
      narratorText.textContent = line;
      narrator.classList.remove('is-hidden');
      // Fade out so the line never sits on top of the content for long.
      narratorTimer = setTimeout(function () { narrator.classList.add('is-hidden'); }, 7000);
    }, reduceMotion.matches ? 0 : 200);
  }

  // Levels: panels fold out when a chamber comes into view, and the
  // puzzle is solved (door opens) when the reader reaches its end.
  var scenes = Array.prototype.slice.call(document.querySelectorAll('.level-scene'));
  if ('IntersectionObserver' in window) {
    var entering = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        entering.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -12% 0px' });
    chambers.forEach(function (section) { entering.observe(section); });

    var solving = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var scene = entry.target;
        solving.unobserve(scene);
        setTimeout(function () { scene.classList.add('is-cleared'); }, reduceMotion.matches ? 0 : 250);
        var num = scene.closest('.chamber').querySelector('.chamber-num');
        if (num) say('Niveau ' + num.textContent + ' terminé. La porte de sortie est ouverte.');
      });
    }, { threshold: .8 });
    scenes.forEach(function (scene) { solving.observe(scene); });

    // The animated portal rims cost CPU: run them only while a portal is on screen.
    var portalsOnScreen = 0;
    var watching = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { portalsOnScreen += entry.isIntersecting ? 1 : -1; });
      portalsOnScreen = Math.max(0, portalsOnScreen);
      if (!sprite || !sprite.pauseAnimations || reduceMotion.matches) return;
      if (portalsOnScreen) sprite.unpauseAnimations(); else sprite.pauseAnimations();
    });
    Array.prototype.forEach.call(document.querySelectorAll('.hero-scene, .space-sky'), function (el) { watching.observe(el); });
  } else {
    chambers.forEach(function (section) { section.classList.add('is-in'); });
    scenes.forEach(function (scene) { scene.classList.add('is-cleared'); });
  }

  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) enterChamber(entry.target);
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    chambers.forEach(function (section) { observer.observe(section); });
  } else if (chambers.length) {
    enterChamber(chambers[0]);
  }

  // In-page links teleport: blue portal where you click, orange portal
  // where you land. Plain anchor jump when motion is reduced.
  function spawnPortal(color, x, y) {
    var fx = document.createElement('span');
    fx.className = 'portal-fx';
    fx.setAttribute('aria-hidden', 'true');
    fx.innerHTML = '<span class="portal portal-' + color + '"><span class="portal-view"></span>' +
      '<svg class="portal-rim" viewBox="0 0 140 240"><use href="#portal-rim"/></svg></span>';
    fx.style.left = x + 'px';
    fx.style.top = y + 'px';
    document.body.appendChild(fx);
    return fx;
  }

  function closePortal(fx) {
    fx.classList.add('is-closing');
    fx.addEventListener('animationend', function () { fx.remove(); }, { once: true });
  }

  document.addEventListener('click', function (event) {
    var link = event.target.closest('a[href^="#"]');
    if (!link || link.classList.contains('skip-link') || reduceMotion.matches) return;
    if (root.classList.contains('classic')) return;
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    var target = document.getElementById(link.getAttribute('href').slice(1));
    if (!target) return;
    event.preventDefault();

    var rect = link.getBoundingClientRect();
    var x = event.clientX || rect.left + rect.width / 2;
    var y = event.clientY || rect.top + rect.height / 2;
    var entry = spawnPortal('blue', x, y);

    setTimeout(function () {
      target.scrollIntoView({ block: 'start' });
      history.pushState(null, '', '#' + target.id);
      var heading = target.querySelector('h1, h2') || target;
      heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });

      var box = heading.getBoundingClientRect();
      var exit = spawnPortal('orange', box.left - 30 > 40 ? box.left - 30 : 40, box.top + box.height / 2);
      closePortal(entry);
      setTimeout(function () { closePortal(exit); }, 200);
    }, 180);
  });
})();
