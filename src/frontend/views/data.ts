import { loadAndRenderTable, handleSort } from '../ui';

export function renderData() {
  const outlet = document.getElementById('router-outlet');
  if (!outlet) return;

  outlet.innerHTML = `
    <div class="search-container">
      <input type="text" id="citySearch" class="search-input" placeholder="🔍 Search cities..." />
    </div>
    <div class="table-container">
      <table id="weatherTable">
        <thead>
          <tr>
            <th class="sortable" data-sort="name">City <span class="sort-arrow"></span></th>
            <th class="sortable" data-sort="state">State <span class="sort-arrow"></span></th>
            <th class="sortable col-dim" data-sort="pm25">PM 2.5 (ppm)<span class="sort-arrow"></span></th>
            <th class="sortable col-dim" data-sort="pm10">PM 10 (ppm)<span class="sort-arrow"></span></th>
            <th class="sortable col-dim" data-sort="ozone">Ozone (ppm)<span class="sort-arrow"></span></th>
            <th class="sortable col-dim" data-sort="methane">Methane (ppm)<span class="sort-arrow"></span></th>
          </tr>
        </thead>
        <tbody id="tableBody"></tbody>
      </table>
    </div>
  `;

  loadAndRenderTable();

  const table = outlet.querySelector('#weatherTable');
  table?.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const header = target.closest('.sortable');
    if (header) {
      const column = header.getAttribute('data-sort') || 'name';
      handleSort(column);
    }
  });
}