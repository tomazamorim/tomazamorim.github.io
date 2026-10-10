/* Botões de copiar: aprimoramento progressivo. Sem JavaScript os botões ficam ocultos e o texto continua selecionável. */
if (navigator.clipboard) {
  document.querySelectorAll('[data-copy],[data-copy-text]').forEach(function (b) {
    b.hidden = false;
    b.addEventListener('click', function () {
      var t = b.dataset.copyText || document.getElementById(b.dataset.copy).textContent.trim().replace(/\s+/g, ' ');
      navigator.clipboard.writeText(t).then(function () {
        var l = b.textContent; b.textContent = 'Copied ✓';
        setTimeout(function () { b.textContent = l; }, 1600);
      });
    });
  });
}
