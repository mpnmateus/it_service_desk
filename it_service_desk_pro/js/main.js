// js/main.js
// Lógica da aplicação (tabs, lista, detalhe, formulário) em JS puro, sem libs/frameworks.

import { store } from './store.js';

/* -------------------- utilidades -------------------- */
// Atalhos sem usar $/$$ (sem jQuery): apenas funções locais.
const query = (sel, root = document) => root.querySelector(sel);
const queryAll = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const formatarDataHora = (ms) => new Date(ms).toLocaleString('pt-BR');
const prioridadeRanking = { Alta: 3, Média: 2, Baixa: 1 };

/* -------------------- abas -------------------- */
const tabs = queryAll('.tab');
const panels = queryAll('.panel');
let currentTab = query('#tab-home');

function targetFromTab(btn) {
  const s = btn.getAttribute('data-target');
  return s ? document.querySelector(s) : null;
}

function mostrarAba(btn) {
  if (!btn || btn === currentTab) return;
  const currPanel = targetFromTab(currentTab);
  const nextPanel = targetFromTab(btn);
  currentTab.classList.remove('is-active');
  currentTab.setAttribute('aria-selected', 'false');
  currPanel.hidden = true;

  btn.classList.add('is-active');
  btn.setAttribute('aria-selected', 'true');
  nextPanel.hidden = false;
  currentTab = btn;
  btn.focus();

  const pid = nextPanel.id;
  if (pid === 'home') desenharHome();
  if (pid === 'lista') desenharLista();
  if (pid === 'detalhe') desenharDetalhe(); // reidrata se houver item selecionado
}

tabs.forEach((tab) => {
  tab.addEventListener('click', (e) => {
    e.preventDefault();
    mostrarAba(tab);
  });
});

/* -------------------- dados-exemplo (opcional) -------------------- */
store.seedIfEmpty([
  store.create({
    titulo: 'Impressora não imprime',
    descricao: 'Erro 0x09',
    categoria: 'Hardware',
    prioridade: 'Média',
    solicitante: 'João',
  }),
  store.create({
    titulo: 'Acesso VPN',
    descricao: 'Falha ao conectar',
    categoria: 'Rede',
    prioridade: 'Alta',
    solicitante: 'Maria',
  }),
  store.create({
    titulo: 'Atualizar Office',
    descricao: 'Solicito versão 2021',
    categoria: 'Software',
    prioridade: 'Baixa',
    solicitante: 'Carlos',
  }),
]);

/* -------------------- HOME -------------------- */
function desenharHome() {
  const todos = store.all();
  const abertos = todos.filter((c) => c.status === 'Aberto').length;
  const andamento = todos.filter((c) => c.status === 'Em andamento').length;
  const fechados = todos.filter((c) => c.status === 'Fechado').length;

  query('#kpi-abertos').textContent = abertos;
  query('#kpi-andamento').textContent = andamento;
  query('#kpi-fechados').textContent = fechados;

  const recentes = [...todos].sort((a, b) => b.criadoEm - a.criadoEm).slice(0, 5);
  const tbody = query('#home-recentes');
  tbody.innerHTML = '';
  recentes.forEach((c) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${c.id.split('_')[1]}</td>
      <td>${c.titulo}</td>
      <td>${c.status}</td>
      <td>${c.prioridade}</td>
      <td>${formatarDataHora(c.criadoEm)}</td>`;
    tbody.appendChild(tr);
  });
}

/* -------------------- FORMULÁRIO: Abrir Chamado -------------------- */
const form = query('#form-chamado');
form.addEventListener('submit', (ev) => {
  ev.preventDefault();

  const titulo = query('#f-titulo').value.trim();
  const descricao = query('#f-descricao').value.trim();
  if (!titulo || !descricao) {
    alert('Preencha Título e Descrição.');
    return;
  }

  const categoria = query('#f-categoria').value;
  const prioridade = query('#f-prioridade').value;
  const solicitante = query('#f-solicitante').value.trim();

  const novo = store.create({ titulo, descricao, categoria, prioridade, solicitante });
  store.add(novo);

  form.reset();
  mostrarAba(query('#tab-lista'));
  desenharLista();
});

/* -------------------- LISTA -------------------- */
const filtroStatus = query('#filtro-status');
const filtroPrio = query('#filtro-prioridade');
const campoBusca = query('#busca');
const botaoOrdenarData = query('#btn-ordenar-data');
const botaoOrdenarPrio = query('#btn-ordenar-prio');

let ordenarPor = 'data'; // 'data' | 'prioridade'

[filtroStatus, filtroPrio, campoBusca].forEach((el) => {
  el.addEventListener('input', desenharLista);
});

botaoOrdenarData.addEventListener('click', () => {
  ordenarPor = 'data';
  desenharLista();
});
botaoOrdenarPrio.addEventListener('click', () => {
  ordenarPor = 'prioridade';
  desenharLista();
});

function desenharLista() {
  const tbody = query('#lista-body');
  const termo = campoBusca.value.trim().toLowerCase();
  const st = filtroStatus.value;
  const pr = filtroPrio.value;

  let data = store.all();

  if (st) data = data.filter((c) => c.status === st);
  if (pr) data = data.filter((c) => c.prioridade === pr);
  if (termo) data = data.filter((c) => c.titulo.toLowerCase().includes(termo));

  if (ordenarPor === 'data') {
    data.sort((a, b) => b.criadoEm - a.criadoEm);
  } else {
    data.sort(
      (a, b) =>
        prioridadeRanking[b.prioridade] - prioridadeRanking[a.prioridade] ||
        b.criadoEm - a.criadoEm
    );
  }

  tbody.innerHTML = '';
  data.forEach((c) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${c.id.split('_')[1]}</td>
      <td>${c.titulo}</td>
      <td>${c.status}</td>
      <td>${c.prioridade}</td>
      <td>${formatarDataHora(c.criadoEm)}</td>
      <td>
        <button class="abrir btn" data-id="${c.id}">Abrir</button>
        <button class="excluir btn danger" data-id="${c.id}">Excluir</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Delegação de eventos para ações da tabela
  tbody.querySelectorAll('button.abrir').forEach((b) => {
    b.addEventListener('click', () => abrirDetalhe(b.dataset.id));
  });
  tbody.querySelectorAll('button.excluir').forEach((b) => {
    b.addEventListener('click', () => {
      const id = b.dataset.id;
      if (confirm('Excluir chamado permanentemente?')) {
        store.remove(id);
        desenharHome();
        desenharLista();
        const currId = query('#d-id').value;
        if (currId === id) limparDetalhe();
      }
    });
  });
}

/* -------------------- DETALHE -------------------- */
function limparDetalhe() {
  query('#detalhe-vazio').hidden = false;
  query('#detalhe-conteudo').hidden = true;
  query('#d-id').value = '';
}

function desenharDetalhe() {
  const id = query('#d-id').value;
  if (!id) {
    limparDetalhe();
    return;
  }
  const c = store.get(id);
  if (!c) {
    limparDetalhe();
    return;
  }

  query('#detalhe-vazio').hidden = true;
  query('#detalhe-conteudo').hidden = false;

  query('#d-titulo').textContent = c.titulo;
  query('#d-solicitante').textContent = c.solicitante || '—';
  query('#d-categoria').textContent = c.categoria;
  query('#d-descricao').textContent = c.descricao;
  query('#d-status').value = c.status;
  query('#d-prioridade').value = c.prioridade;
}

function abrirDetalhe(id) {
  query('#d-id').value = id;
  desenharDetalhe();
  mostrarAba(query('#tab-detalhe'));
}

query('#d-salvar-status').addEventListener('click', () => {
  const id = query('#d-id').value;
  if (!id) return;
  const status = query('#d-status').value;
  store.update(id, { status });
  desenharHome();
  desenharLista();
  desenharDetalhe();
});

query('#d-salvar-prio').addEventListener('click', () => {
  const id = query('#d-id').value;
  if (!id) return;
  const prioridade = query('#d-prioridade').value;
  store.update(id, { prioridade });
  desenharHome();
  desenharLista();
  desenharDetalhe();
});

query('#d-excluir').addEventListener('click', () => {
  const id = query('#d-id').value;
  if (!id) return;
  if (confirm('Excluir este chamado?')) {
    store.remove(id);
    desenharHome();
    desenharLista();
    limparDetalhe();
    mostrarAba(query('#tab-lista'));
  }
});

query('#d-voltar-lista').addEventListener('click', () => {
  mostrarAba(query('#tab-lista'));
});

/* -------------------- inicialização -------------------- */
desenharHome();
desenharLista();
