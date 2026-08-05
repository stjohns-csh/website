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
