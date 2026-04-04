// nav-fx.js — Page transition fade-out on internal link clicks
document.querySelectorAll('a:not([target="_blank"])').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    const href = a.href;
    document.body.classList.add('fade-out');
    setTimeout(() => window.location = href, 50);
  });
});
