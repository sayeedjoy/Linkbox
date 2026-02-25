(function () {
  var m = window.matchMedia("(prefers-color-scheme: dark)");
  document.documentElement.setAttribute("data-theme", m.matches ? "dark" : "light");
})();
