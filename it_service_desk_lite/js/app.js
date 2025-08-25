// js/app.js
// Versão nível 5: HTML/CSS/JS puros, sem módulos, sem frameworks.
// Abre com duplo clique (file://).

'use strict';

/* ------------ util ------------ */
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const fmt = (ms) => new Date(ms).toLocaleString('pt-BR');

/* ------------ “store” minimalista (LocalStorage) ------------ */
const KEY = 'chamados.v1.simple';

function readAll() {
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}
function writeAll(arr) { localStorage.setItem(KEY, JSON.stringify(arr)); }
function uid() { const n = Date.now(); return `chm_${n.toString(36)}_${Math.floor(Math.random()*1e4).toString(36)}`; }

const store = {
  all() { return readAll(); },
  get(id) { return readAll().find(c => c.id === id) || null; },
  add(ch) { const a = readAll(); a.push(ch); writeAll(a); },
  update(id, patch) {
    const a = readAll(); const i = a.findIndex(c => c.id === id);
    if (i < 0) return false;
    a[i] = { ...a[i], ...patch, atualizadoEm: Date.now() };
    writeAll(a); return true;
  },
  remove(id) { writeAll(readAll().filter(c => c.id !== id)); },
  create({ titulo, descricao, categoria='Outro', prioridade='Média', solicitante='' }) {
    const now = Date.now();
    return { id: uid(), titulo: titulo.trim(), descricao: descricao.trim(),
      categoria, prioridade, status: 'Aberto', solicitante, criadoEm: now, atualizadoEm: now };
  },
  seedIfEmpty() {
    if (readAll().length) return;
    writeAll([
      this.create({ titulo: 'Impressora não imprime', descricao: 'Erro 0x09', categoria: 'Hardware', prioridade: 'Média', solicitante: 'João' }),
      this.create({ titulo: 'Acesso VPN', descricao: 'Falha ao conectar', categoria: 'Rede', prioridade: 'Alta', solicitante: 'Maria' }),
      this.create({ titulo: 'Atualizar Office', descricao: 'Instalar versão 2021', categoria: 'Software', prioridade: 'Baixa', solicitante: 'Carlos' }),
    ]);
  }
};

/* ------------ abas (SPA simples) ------------ */
const tabs = $$('.tab');
let currentTab = $('#tab-home');

function targetFromTab(btn){ return document.querySelector(btn.getAttribute('data-target')); }

function showTab(btn){
  if (!btn || btn === currentTab) return;
  targetFromTab(currentTab).hidden = true;
  currentTab.classList.remove('is-active'); currentTab.setAttribute('aria-selected','false');

  targetFromTab(btn).hidden = false;
  btn.classList.add('is-active'); btn.setAttribute('aria-selected','true');
  currentTab = btn; btn.focus();

  const id = targetFromTab(btn).id;
  if (id === 'home') renderHome();
  if (id === 'lista') renderList();
  if (id === 'detalhe') renderDetail(); // se houver item selecionado
}
tabs.forEach(t => t.addEventListener('click', e => { e.preventDefault(); showTab(t); }));

/* ------------ HOME ------------ */
function renderHome(){
  const all = store.all();
  $('#kpi-abertos').textContent   = all.filter(c => c.status === 'Aberto').length;
  $('#kpi-andamento').textContent = all.filter(c => c.status === 'Em andamento').length;
  $('#kpi-fechados').textContent  = all.filter(c => c.status === 'Fechado').length;

  const recentes = [...all].sort((a,b)=> b.criadoEm - a.criadoEm).slice(0,5);
  const tbody = $('#home-recentes'); tbody.innerHTML = '';
  recentes.forEach(c => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${c.id.split('_')[1]}</td>
                    <td>${c.titulo}</td>
                    <td>${c.status}</td>
                    <td>${c.prioridade}</td>
                    <td>${fmt(c.criadoEm)}</td>`;
    tbody.appendChild(tr);
  });
}

/* ------------ ABRIR (Create) ------------ */
const form = $('#form-chamado');
form.addEventListener('submit', (ev) => {
  ev.preventDefault();
  const titulo = $('#f-titulo').value.trim();
  const descricao = $('#f-descricao').value.trim();
  if (!titulo || !descricao) { alert('Preencha Título e Descrição.'); return; }

  const novo = store.create({
    titulo,
    descricao,
    categoria: $('#f-categoria').value,
    prioridade: $('#f-prioridade').value,
    solicitante: $('#f-solicitante').value.trim()
  });
  store.add(novo);
  form.reset();
  showTab($('#tab-lista'));
  renderList();
});

/* ------------ LISTA (Read + Update Status + Delete) ------------ */
function renderList() {
  const data = [...store.all()].sort((a,b)=> b.criadoEm - a.criadoEm);
  const tbody = $('#lista-body'); tbody.innerHTML = '';
  data.forEach(c => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${c.id.split('_')[1]}</td>
      <td>${c.titulo}</td>
      <td>
        <select class="status" data-id="${c.id}">
          <option ${c.status==='Aberto'?'selected':''}>Aberto</option>
          <option ${c.status==='Em andamento'?'selected':''}>Em andamento</option>
          <option ${c.status==='Fechado'?'selected':''}>Fechado</option>
        </select>
      </td>
      <td>${c.prioridade}</td>
      <td>${fmt(c.criadoEm)}</td>
      <td>
        <button class="abrir btn"   data-id="${c.id}">Abrir</button>
        <button class="excluir btn danger" data-id="${c.id}">Excluir</button>
      </td>`;
    tbody.appendChild(tr);
  });

  // Delegação: mudar status / abrir detalhe / excluir
  tbody.onchange = (e) => {
    const sel = e.target.closest('select.status'); if (!sel) return;
    store.update(sel.dataset.id, { status: sel.value });
    renderHome(); // KPIs
  };
  tbody.onclick = (e) => {
    const btn = e.target.closest('button'); if (!btn) return;
    const id = btn.dataset.id;
    if (btn.classList.contains('abrir')) {
      $('#d-id').value = id; renderDetail(); showTab($('#tab-detalhe'));
    } else if (btn.classList.contains('excluir')) {
      if (confirm('Excluir chamado permanentemente?')) {
        store.remove(id); renderHome(); renderList();
        if ($('#d-id').value === id) { clearDetail(); }
      }
    }
  };
}

/* ------------ DETALHE (Somente leitura) ------------ */
function clearDetail(){
  $('#detalhe-vazio').hidden = false;
  $('#detalhe-conteudo').hidden = true;
  $('#d-id').value = '';
}
function renderDetail(){
  const id = $('#d-id').value; if (!id) { clearDetail(); return; }
  const c = store.get(id);     if (!c)  { clearDetail(); return; }

  $('#detalhe-vazio').hidden = true;
  $('#detalhe-conteudo').hidden = false;

  $('#d-titulo').textContent = c.titulo;
  $('#d-solicitante').textContent = c.solicitante || '—';
  $('#d-categoria').textContent = c.categoria;
  $('#d-descricao').textContent = c.descricao;
  $('#d-status-text').textContent = c.status;
  $('#d-prioridade-text').textContent = c.prioridade;
}

$('#d-excluir').addEventListener('click', () => {
  const id = $('#d-id').value; if (!id) return;
  if (confirm('Excluir este chamado?')) {
    store.remove(id); renderHome(); renderList(); clearDetail(); showTab($('#tab-lista'));
  }
});
$('#d-voltar-lista').addEventListener('click', () => showTab($('#tab-lista')));

/* ------------ bootstrap ------------ */
store.seedIfEmpty();
renderHome();
renderList();
