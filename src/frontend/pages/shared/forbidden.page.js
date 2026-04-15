export function renderForbiddenPage() {
  return `
    <section class="module-hero module-hero--danger">
      <span class="module-hero__eyebrow">Acesso negado</span>
      <h1 class="module-hero__title">Voce esta autenticado, mas sem permissao para esta area</h1>
      <p class="module-hero__text">
        O backend bloqueou esta operacao com resposta 403. Volte para um modulo permitido
        pelo seu perfil ou faca login com outro usuario.
      </p>
      <a class="btn btn-outline-success mt-3" href="#/login">Voltar para o login</a>
    </section>
  `;
}
