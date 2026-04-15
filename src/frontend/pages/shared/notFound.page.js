export function renderNotFoundPage() {
  return `
    <section class="module-hero module-hero--danger">
      <span class="module-hero__eyebrow">Rota nao encontrada</span>
      <h1 class="module-hero__title">A pagina solicitada nao existe</h1>
      <p class="module-hero__text">
        Verifique a navegacao lateral ou volte para o dashboard principal.
      </p>
      <a class="btn btn-success mt-3" href="#/dashboard">Voltar ao dashboard</a>
    </section>
  `;
}
