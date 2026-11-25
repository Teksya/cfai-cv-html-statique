// Progressive enhancement only. Without this script the CV is a normal
// scrolling page with every chamber visible. With it, the CV becomes a
// game: one level per screen, puzzles to solve, doors to the next level.
(function () {
  'use strict';

  var root = document.documentElement;
  root.classList.add('js');

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var header = document.querySelector('.site-header');
  var bar = document.querySelector('.test-progress-bar');
  var narrator = document.querySelector('.narrator');
  var narratorText = document.querySelector('.narrator-text');
  var chambers = Array.prototype.slice.call(document.querySelectorAll('.chamber'));
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav-list a'));
  var toggle = document.getElementById('toggle-classic');
  var toggleLabel = toggle && toggle.querySelector('.tool-label');
  var sprite = document.querySelector('.sprite');
  var current = -1;

  function isGame() { return root.classList.contains('game'); }
  function chamberIndex(id) {
    for (var i = 0; i < chambers.length; i++) if (chambers[i].id === id) return i;
    return -1;
  }

  // ---------- Portal rim animation (SVG/SMIL: CSS cannot stop it) ----------
  // Runs only on levels that show portals, and never with reduced motion.
  function syncSvgMotion() {
    if (!sprite || !sprite.pauseAnimations) return;
    var portalVisible = !isGame() || current === 0 || current === chambers.length - 1;
    if (reduceMotion.matches || !portalVisible) sprite.pauseAnimations();
    else sprite.unpauseAnimations();
  }
  if (reduceMotion.addEventListener) reduceMotion.addEventListener('change', syncSvgMotion);

  // ---------- Narrator ----------
  var narratorTimer;
  function say(text) {
    if (!narrator || !text || !isGame()) return;
    narrator.classList.add('is-hidden');
    clearTimeout(narratorTimer);
    narratorTimer = setTimeout(function () {
      narratorText.textContent = text;
      narrator.classList.remove('is-hidden');
      narratorTimer = setTimeout(function () { narrator.classList.add('is-hidden'); }, 7000);
    }, reduceMotion.matches ? 0 : 200);
  }

  // ---------- Levels ----------
  function activate(index, moveFocus) {
    current = index;
    chambers.forEach(function (section, i) {
      section.classList.toggle('is-active', i === index);
      if (i !== index) section.classList.remove('is-in');
    });
    var section = chambers[index];
    // next frame, so the panels fold out of the wall
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { section.classList.add('is-in'); });
    });
    navLinks.forEach(function (link) {
      if (link.getAttribute('href') === '#' + section.id) link.setAttribute('aria-current', 'step');
      else link.removeAttribute('aria-current');
    });
    if (bar) bar.style.width = (index / (chambers.length - 1) * 100) + '%';
    root.classList.toggle('at-end', index === chambers.length - 1);
    var room = section.querySelector('.room');
    if (room) room.scrollTop = 0;
    if (isGame()) window.scrollTo(0, 0); // focus or scroll restoration must not shift the screen
    say(section.getAttribute('data-annonce'));
    syncSvgMotion();
    if (moveFocus) {
      var heading = section.querySelector('h1, h2');
      heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
    }
  }

  var warp = document.createElement('div');
  warp.className = 'warp';
  warp.setAttribute('aria-hidden', 'true');
  document.body.appendChild(warp);
  var warping = false;

  // Level change: step through an orange portal opened where you clicked.
  function goTo(index, options) {
    options = options || {};
    if (index < 0 || index >= chambers.length || index === current || warping) return;
    if (options.push) history.pushState(null, '', '#' + chambers[index].id);
    if (!isGame() || reduceMotion.matches) {
      activate(index, options.focus);
      return;
    }
    warping = true;
    warp.style.setProperty('--x', (options.x || window.innerWidth / 2) + 'px');
    warp.style.setProperty('--y', (options.y || window.innerHeight / 2) + 'px');
    warp.classList.add('is-on');
    setTimeout(function () {
      activate(index, options.focus);
      warp.classList.remove('is-on');
      warping = false;
    }, 260);
  }

  function indexFromHash() {
    var i = chamberIndex(location.hash.slice(1));
    return i < 0 ? 0 : i;
  }

  window.addEventListener('popstate', function () {
    if (isGame()) goTo(indexFromHash(), { focus: true });
  });

  // Every in-page link to a chamber becomes a level change.
  document.addEventListener('click', function (event) {
    if (!isGame()) return;
    var link = event.target.closest('a[href^="#"]');
    if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    var index = chamberIndex(link.getAttribute('href').slice(1));
    if (index < 0) return;
    event.preventDefault();
    goTo(index, { push: true, focus: true, x: event.clientX, y: event.clientY });
  });

  // ---------- Puzzles ----------
  function finish(scene) {
    var section = scene.closest('.chamber');
    var exit = scene.querySelector('.exit-btn');
    scene.classList.add('is-cleared');
    exit.setAttribute('aria-label', 'Porte ouverte : passer au niveau suivant');
    navLinks.forEach(function (link) {
      if (link.getAttribute('href') === '#' + section.id) link.classList.add('is-solved');
    });
    var num = section.querySelector('.chamber-num');
    say('Niveau ' + (num ? num.textContent : '') + ' terminé. La porte de sortie est ouverte.');
    exit.focus({ preventScroll: true });
  }

  // Launch plate: the cube follows the dotted trajectory.
  function launchCube(scene, done) {
    var cube = scene.querySelector('.level-cube-ledge');
    var svg = scene.querySelector('.launch-arc');
    var path = svg.querySelector('path');
    if (!cube.animate || !path.getPointAtLength || reduceMotion.matches) { done(); return; }
    var box = svg.getBoundingClientRect();
    var end = cube.getBoundingClientRect();
    var length = path.getTotalLength();
    var frames = [];
    for (var i = 0; i <= 24; i++) {
      var pt = path.getPointAtLength(length * i / 24);
      var x = box.left + pt.x * box.width / 400 - (end.left + end.width / 2);
      var y = box.top + pt.y * box.height / 120 - end.bottom;
      frames.push({ transform: 'translate(' + x + 'px,' + y + 'px) rotate(' + (i * 15) + 'deg)', opacity: 1 });
    }
    frames.push({ transform: 'none', opacity: 1 });
    cube.animate(frames, { duration: 900, easing: 'cubic-bezier(.3,.1,.6,1)' }).onfinish = function () {
      scene.classList.add('is-cleared');
      done();
    };
  }

  var solvers = { formation: launchCube };

  Array.prototype.forEach.call(document.querySelectorAll('.level-scene'), function (scene) {
    var section = scene.closest('.chamber');
    var trigger = scene.querySelector('.puzzle-btn');
    var exit = scene.querySelector('.exit-btn');
    trigger.hidden = false;
    exit.hidden = false;
    exit.setAttribute('aria-label', 'Porte verrouillée : résolvez l’énigme pour l’ouvrir');

    trigger.addEventListener('click', function () {
      if (scene.classList.contains('is-cleared') || scene.classList.contains('is-busy')) return;
      scene.classList.add('is-busy');
      function done() { scene.classList.remove('is-busy'); finish(scene); }
      var solver = solvers[section.id];
      if (solver) { solver(scene, done); return; }
      // CSS transitions play the solution; open the door once they are done
      scene.classList.add('is-cleared');
      setTimeout(done, reduceMotion.matches ? 0 : 550);
    });

    exit.addEventListener('click', function (event) {
      if (!scene.classList.contains('is-cleared') || scene.classList.contains('is-busy')) {
        exit.classList.remove('is-locked');
        void exit.offsetWidth; // restart the shake
        exit.classList.add('is-locked');
        say('Porte verrouillée. Résolvez l’énigme, ou passez par le menu des niveaux.');
        return;
      }
      var rect = exit.getBoundingClientRect();
      goTo(chamberIndex(section.id) + 1, {
        push: true, focus: true,
        x: event.clientX || rect.left + rect.width / 2,
        y: event.clientY || rect.top + rect.height / 2
      });
    });
  });

  // Keyboard: arrows / PageUp / PageDown change level, E uses the puzzle.
  document.addEventListener('keydown', function (event) {
    if (!isGame() || event.altKey || event.ctrlKey || event.metaKey) return;
    var tag = event.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (event.key === 'ArrowRight' || event.key === 'PageDown') {
      goTo(current + 1, { push: true, focus: true });
      event.preventDefault();
    } else if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
      goTo(current - 1, { push: true, focus: true });
      event.preventDefault();
    } else if (event.key === 'e' || event.key === 'E') {
      var trigger = chambers[current].querySelector('.puzzle-btn');
      if (trigger) trigger.click();
    }
  });

  // ---------- Classic view ----------
  function readPref() {
    try { return localStorage.getItem('cv-view') === 'classic'; } catch (e) { return false; }
  }
  function savePref(on) {
    try { localStorage.setItem('cv-view', on ? 'classic' : 'game'); } catch (e) { /* storage blocked */ }
  }

  // Classic view keeps a sticky header: anchored headings must clear it.
  function syncHeaderHeight() {
    var sticky = !isGame() && getComputedStyle(header).position === 'sticky';
    root.style.setProperty('--header-h', sticky ? header.offsetHeight + 'px' : '0px');
  }
  window.addEventListener('resize', syncHeaderHeight);

  function setClassic(on) {
    root.classList.toggle('classic', on);
    root.classList.toggle('game', !on);
    if (toggle) {
      toggle.setAttribute('aria-pressed', String(on));
      toggleLabel.textContent = on ? 'Revenir au mode jeu' : 'Afficher le CV classique';
      toggle.title = toggleLabel.textContent;
    }
    if (narrator) narrator.classList.add('is-hidden');
    syncHeaderHeight();
    if (on) {
      chambers.forEach(function (section) { section.classList.add('is-in'); });
      if (current > 0) chambers[current].scrollIntoView();
      else window.scrollTo(0, 0);
    } else {
      var index = current < 0 ? 0 : current;
      current = -1;
      window.scrollTo(0, 0); // the game screen never scrolls
      activate(index, false);
    }
    syncSvgMotion();
  }

  if (toggle) {
    toggle.hidden = false;
    toggle.addEventListener('click', function () {
      var on = !root.classList.contains('classic');
      setClassic(on);
      savePref(on);
    });
  }

  // Printing (and "save as PDF") always uses the classic layout.
  var gameBeforePrint = false;
  window.addEventListener('beforeprint', function () {
    gameBeforePrint = isGame();
    root.classList.add('classic');
    root.classList.remove('game');
  });
  window.addEventListener('afterprint', function () {
    if (!gameBeforePrint) return;
    root.classList.remove('classic');
    root.classList.add('game');
  });

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  current = indexFromHash();
  setClassic(/[?&]classique\b/.test(location.search) || readPref());
})();
