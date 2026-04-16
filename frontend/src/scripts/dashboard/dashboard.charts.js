import { escapeHtml, formatCompactNumber, formatCurrency } from "./dashboard.ui.js";

function getMaxValue(items, valueKeys) {
  const maxValue = items.reduce((highest, item) => {
    return Math.max(highest, ...valueKeys.map((key) => Number(item[key] || 0)));
  }, 0);

  return maxValue > 0 ? maxValue : 1;
}

function buildPolyline(items, valueKey, maxValue, color, height) {
  const width = 100;

  const points = items.map((item, index) => {
    const x = items.length === 1 ? width / 2 : (index / (items.length - 1)) * width;
    const y = height - (Number(item[valueKey] || 0) / maxValue) * height;
    return `${x},${y.toFixed(2)}`;
  });

  return `<polyline fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="${points.join(
    " "
  )}"></polyline>`;
}

export function renderTrendChart({ title, items = [], series = [], emptyLabel }) {
  if (!items.length) {
    return `
      <article class="surface-card dashboard-chart-card">
        <div class="surface-card__header"><h2>${escapeHtml(title)}</h2><span class="badge text-bg-light">Sem dados</span></div>
        <div class="dashboard-empty-panel">${escapeHtml(emptyLabel || "Nenhum dado encontrado para o periodo selecionado.")}</div>
      </article>
    `;
  }

  const maxValue = getMaxValue(items, series.map((entry) => entry.key));
  const svgHeight = 56;

  return `
    <article class="surface-card dashboard-chart-card">
      <div class="surface-card__header">
        <h2>${escapeHtml(title)}</h2>
        <div class="dashboard-chart-legend">
          ${series
            .map(
              (entry) => `
                <span><i style="background:${entry.color}"></i>${escapeHtml(entry.label)}</span>
              `
            )
            .join("")}
        </div>
      </div>
      <div class="dashboard-line-chart">
        <svg viewBox="0 0 100 ${svgHeight}" preserveAspectRatio="none" aria-hidden="true">
          <line x1="0" y1="${svgHeight}" x2="100" y2="${svgHeight}" class="dashboard-line-chart__axis"></line>
          ${series
            .map((entry) => buildPolyline(items, entry.key, maxValue, entry.color, svgHeight - 4))
            .join("")}
        </svg>
        <div class="dashboard-line-chart__footer">
          ${items
            .map(
              (item) => `
                <div>
                  <span>${escapeHtml(item.label)}</span>
                  <strong>${formatCurrency(item.valor_vendas || 0)}</strong>
                  <small>${formatCurrency(item.lucro || 0)}</small>
                </div>
              `
            )
            .join("")}
        </div>
      </div>
    </article>
  `;
}

export function renderBarChart({ title, items = [], formatter = formatCurrency, emptyLabel }) {
  if (!items.length) {
    return `
      <article class="surface-card dashboard-chart-card">
        <div class="surface-card__header"><h2>${escapeHtml(title)}</h2><span class="badge text-bg-light">Sem dados</span></div>
        <div class="dashboard-empty-panel">${escapeHtml(emptyLabel || "Nenhum dado encontrado para o periodo selecionado.")}</div>
      </article>
    `;
  }

  const maxValue = Math.max(...items.map((item) => Number(item.value || 0)), 1);

  return `
    <article class="surface-card dashboard-chart-card">
      <div class="surface-card__header"><h2>${escapeHtml(title)}</h2><span class="badge text-bg-light">${items.length} itens</span></div>
      <div class="dashboard-bar-chart">
        ${items
          .map((item) => {
            const percentage = Math.max((Number(item.value || 0) / maxValue) * 100, 4);
            return `
              <div class="dashboard-bar-chart__item">
                <div class="dashboard-bar-chart__meta">
                  <span>${escapeHtml(item.label)}</span>
                  <strong>${formatter(item.value || 0)}</strong>
                </div>
                <div class="dashboard-bar-chart__track">
                  <div class="dashboard-bar-chart__fill" style="width:${percentage}%"></div>
                </div>
                <small>${escapeHtml(item.note || formatCompactNumber(item.value || 0))}</small>
              </div>
            `;
          })
          .join("")}
      </div>
    </article>
  `;
}
