export function renderModulePage(route) {
  return `
    <section class="module-hero">
      <span class="module-hero__eyebrow">Modulo em preparacao</span>
      <h1 class="module-hero__title">${route.title}</h1>
      <p class="module-hero__text">
        Esta area ja tem navegacao, permissao e estrutura de pagina prontas.
        O proximo passo e ligar formularios, tabelas e consumo real da API.
      </p>
    </section>

    <section class="placeholder-grid">
      <article class="placeholder-card">
        <h2>Responsabilidade esperada</h2>
        <p>${route.description}</p>
      </article>

      <article class="placeholder-card">
        <h2>Estados previstos</h2>
        <ul class="placeholder-list">
          <li>loading para carregamento da API</li>
          <li>empty state para listas vazias</li>
          <li>feedback de sucesso e erro</li>
          <li>filtros e acoes por perfil</li>
        </ul>
      </article>
    </section>
  `;
}
