const stylesheets = [
  'css-js/reset.css',

  'css-js/header.css',
  'css-js/main.css',
  'css-js/footer.css',

  'css-js/start-end-prayer.css',
  'css-js/list-sitys.css',
  'css-js/prayer-times-day.css',
  'css-js/table-prayer.css',
  'css-js/list-year.css',
];


stylesheets.forEach((stylesheet) => {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = stylesheet;
  document.head.appendChild(link);
});