/* St. John's — accessible Worship dropdown toggle (progressive enhancement).
   Desktop opens on hover/focus via CSS; this adds click/tap + keyboard support. */
(function () {
  var toggles = document.querySelectorAll('.dropdown-toggle');
  if (!toggles.length) return;

  function closeAll(except) {
    document.querySelectorAll('.has-dropdown.open').forEach(function (li) {
      if (li === except) return;
      li.classList.remove('open');
      var b = li.querySelector('.dropdown-toggle');
      if (b) b.setAttribute('aria-expanded', 'false');
    });
  }

  toggles.forEach(function (btn) {
    var li = btn.closest('.has-dropdown');
    if (!li) return;
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      var isOpen = li.classList.toggle('open');
      btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      closeAll(li);
    });
  });

  document.addEventListener('click', function (e) {
    if (!e.target.closest('.has-dropdown')) closeAll(null);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeAll(null);
  });
})();

/* St. John's — mobile navigation toggle (hamburger). Added Aug 2026.
   Injects a menu button on small screens; CSS shows/hides it by width. */
(function () {
  var nav = document.querySelector('nav[aria-label="Main"]');
  if (!nav) return;
  var masthead = nav.closest('.masthead');
  if (!masthead) return;

  if (!nav.id) nav.id = 'primary-nav';
  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'nav-toggle';
  btn.setAttribute('aria-label', 'Menu');
  btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-controls', nav.id);
  btn.innerHTML = '<span class="bars" aria-hidden="true"></span>';
  nav.parentNode.insertBefore(btn, nav);

  function setOpen(open) {
    masthead.classList.toggle('nav-open', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  btn.addEventListener('click', function () {
    setOpen(!masthead.classList.contains('nav-open'));
  });

  // Tapping a real link closes the menu; the Worship submenu button does not.
  nav.addEventListener('click', function (e) {
    if (e.target.closest('a')) setOpen(false);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') setOpen(false);
  });
})();
