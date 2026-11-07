const raw = window.SEAESC_DATA || [];
const source = raw.map(row => Array.isArray(row) ? { data: row[0], turno: row[1], municipio: row[2], escola: row[3], turma: row[4], aplicador: row[5], supervisor: row[6] } : { ...row, turmas: row.turmas || row.turma || '' });
const $ = id => document.getElementById(id);
const applicantFilter = $('applicantFilter'), supervisorFilter = $('supervisorFilter'), dateFilter = $('dateFilter'), results = $('results'), emptyState = $('emptyState'), resultCount = $('resultCount'), resultTitle = $('resultTitle');
const normalize = v => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const escapeHtml = v => String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const unique = values => [...new Set(values.map(v => String(v || '').replace(/\s+/g, ' ').trim()).filter(Boolean))].sort((a,b) => a.localeCompare(b,'pt-BR'));

const annotationWords = /\b(EXTRA|DIA|MATUTINO|VESPERTINO|MAT|VESP|NOTURNO|NOT|INTEGRAL|EM|MANHA|MANHÃ|TARDE|NOITE)\b/gi;
function cleanApplicantName(value) {
  return String(value || '')
    .replace(/\b\d{1,2}\s*(?:\/\s*\d{1,2})?(?:\s*\/\s*\d{2,4})?\b/g, ' ')
    .replace(/[0-9]/g, ' ')
    .replace(annotationWords, ' ')
    .replace(/[^A-Za-zÀ-ÿ\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
function applicantChoices() {
  const choices = [];
  source.forEach(item => {
    const value = String(item.aplicador || '').replace(/\s+/g, ' ').trim();
    if (!value) return;
    const parts = value.split(/\s*(?:\+|;|\/|\bEXTRA\b|\([^)]*\))\s*/i);
    parts.forEach(part => {
      const clean = cleanApplicantName(part);
      if (clean.length >= 3 && /[A-Za-zÀ-ÿ]{2}/.test(clean)) choices.push(clean);
    });
  });
  return unique(choices);
}
function addOptions(select, values) { unique(values).forEach(value => { const o = document.createElement('option'); o.value = value; o.textContent = value; select.appendChild(o); }); }
function populateFilters() {
  addOptions(applicantFilter, applicantChoices());
  addOptions(supervisorFilter, source.map(x => x.supervisor));
  const dates = []; source.forEach(x => String(x.data || '').split(/\s+E\s+/i).forEach(v => v.trim() && dates.push(v.trim())));
  unique(dates).sort((a,b) => Number(a.match(/\d+/)?.[0] || 0) - Number(b.match(/\d+/)?.[0] || 0)).forEach(value => { const o = document.createElement('option'); o.value = value; o.textContent = value; dateFilter.appendChild(o); });
}
function matches(item) {
  const a = normalize(applicantFilter.value), s = normalize(supervisorFilter.value), d = normalize(dateFilter.value);
  return (!a || normalize(item.aplicador).includes(a)) && (!s || normalize(item.supervisor).includes(s)) && (!d || normalize(item.data).includes(d));
}
function render() {
  const filtered = source.filter(matches); resultCount.textContent = `${filtered.length} ${filtered.length === 1 ? 'local encontrado' : 'locais encontrados'}`; resultTitle.textContent = (applicantFilter.value || supervisorFilter.value || dateFilter.value) ? 'Locais conforme os filtros' : 'Todos os locais de prova';
  results.innerHTML = filtered.map((item,index) => `<article class="result-card" style="animation-delay:${Math.min(index,10)*25}ms"><div class="card-top"><div><div class="city">${escapeHtml(item.municipio || 'Município não informado')}</div><div class="school">${escapeHtml(item.escola || 'Local não informado')}</div></div><div class="date-pill">${escapeHtml(item.data || 'Data a confirmar')}</div></div><hr class="card-divider"/><div class="meta-grid"><div class="meta"><label>Aplicador</label><strong>${escapeHtml(item.aplicador || 'Não informado')}</strong></div><div class="meta"><label>Supervisor</label><strong class="secondary">${escapeHtml(item.supervisor || 'Não informado')}</strong></div></div>${(item.turma || item.turmas || item.turno) ? `<div class="classes"><b>Turma / turno</b>${escapeHtml(item.turma || item.turmas || '')}${item.turno ? ` · ${escapeHtml(item.turno)}` : ''}</div>` : ''}</article>`).join('');
  emptyState.classList.toggle('hidden', filtered.length > 0); results.classList.toggle('hidden', filtered.length === 0);
}
function clearFilters() { applicantFilter.value = ''; supervisorFilter.value = ''; dateFilter.value = ''; render(); }
function setView(mode) { results.classList.toggle('cards-mode', mode === 'cards'); results.classList.toggle('list-mode', mode === 'list'); $('cardsView').classList.toggle('active', mode === 'cards'); $('listView').classList.toggle('active', mode === 'list'); localStorage.setItem('seaesc-view', mode); }
$('searchBtn').addEventListener('click', render); $('clearFilters').addEventListener('click', clearFilters); $('emptyClear').addEventListener('click', clearFilters); [applicantFilter, supervisorFilter, dateFilter].forEach(el => el.addEventListener('change', render)); $('cardsView').addEventListener('click', () => setView('cards')); $('listView').addEventListener('click', () => setView('list')); $('exportPdf').addEventListener('click', () => { if (source.filter(matches).length) { document.body.classList.add('printing'); setTimeout(() => { window.print(); document.body.classList.remove('printing'); }, 50); } });
populateFilters(); setView(localStorage.getItem('seaesc-view') || 'cards'); render();
