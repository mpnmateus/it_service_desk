// ======================================================================
// IT Service Desk Lite — app.js
// Arquitetura: SPA simples com HTML/CSS/JS puros, sem módulos e sem build.
// Persistência: localStorage (chave única).
// Foco didático: DOM, eventos, estado em memória + persistência local.
// Execução: abrir index.html via file:// (duplo clique).
// ======================================================================

'use strict'; // Habilita modo estrito — evita variáveis globais acidentais e outros pitfalls.

/* ======================================================================
   SEÇÃO 1 — UTILITÁRIOS DE DOM E FORMATAÇÃO
   - Objetivo: reduzir verbosidade em querySelector e padronizar formatação de datas.
   - Padrão: $ e $$ são helpers comuns em apps que manipulam muito DOM.
   ====================================================================== */

/**
 * Atalho para document.querySelector.
 * @param {string} sel - Seletor CSS (ex.: '#id', '.classe', 'div > span').
 * @param {ParentNode} [root=document] - Raiz opcional para escopo (ex.: um card específico).
 * @returns {Element|null} Primeiro elemento que casar com o seletor ou null.
 */
const $  = (sel, root = document) => root.querySelector(sel);

/**
 * Atalho para document.querySelectorAll com conversão para Array real.
 * Útil para usar métodos de array (map/filter/reduce) nos nós retornados.
 * @param {string} sel
 * @param {ParentNode} [root=document]
 * @returns {Element[]} Array de elementos.
 */
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/**
 * Formata timestamp (em milissegundos) no locale pt-BR.
 * @param {number} ms - Epoch time em milissegundos (ex.: Date.now()).
 * @returns {string} Data e hora legíveis conforme configuração local.
 */
const fmt = (ms) => new Date(ms).toLocaleString('pt-BR');


/* ======================================================================
   SEÇÃO 2 — “STORE” MINIMALISTA EM localStorage
   - Motivação: evitar backend no contexto didático; manter CRUD simples.
   - Estratégia:
     * KEY única para isolar a “tabela” de chamados.
     * Funções puras readAll/writeAll para serializar o estado.
     * Geração de ID (uid) usando time-based + random (suficiente p/ demo).
     * API store: all/get/add/update/remove/create/seedIfEmpty.
   - Observação: ao atualizar (update), marcamos 'atualizadoEm'.
   ====================================================================== */

/** Chave única para persistência no localStorage */
const KEY = 'chamados.v1.simple';

/**
 * Lê TODOS os chamados do localStorage.
 * - Fail-safe: se JSON estiver corrompido ou não for array, devolve [].
 * @returns {Array<object>} Lista de chamados.
 */
function readAll() {
  try {
    const raw = localStorage.getItem(KEY);      // Leitura bruta (string) do localStorage
    const arr = raw ? JSON.parse(raw) : [];     // Parse JSON se existir conteúdo
    return Array.isArray(arr) ? arr : [];       // Garante um array
  } catch {
    return []; // Em caso de erro no parse, evita quebrar a app.
  }
}

/**
 * Sobrescreve a lista de chamados no localStorage.
 * - Single source of truth: sempre gravamos o array inteiro.
 * @param {Array<object>} arr
 */
function writeAll(arr) { localStorage.setItem(KEY, JSON.stringify(arr)); }

/**
 * Gera um ID textual curto “único o suficiente” para fins didáticos.
 * - Combina Date.now (entropia temporal) com um randômico base36.
 * - Não é seguro criptograficamente — é só para demo.
 * @returns {string} ex.: "chm_mbe0z9_8j3"
 */
function uid() {
  const n = Date.now();                                   // Timestamp atual (ms desde 1970)
  const base = n.toString(36);                            // Converte para base36 para encurtar
  const rand = Math.floor(Math.random()*1e4).toString(36);// Pequeno sufixo aleatório base36
  return `chm_${base}_${rand}`;                           // Prefixo + tempo + rand
}

/**
 * API de persistência — CRUD + fábrica de objetos.
 * - Mantém o contrato de dados de um “chamado”.
 * - As operações sempre trabalham sobre um array em memória
 *   e gravam o array atualizado (writeAll).
 */
const store = {
  /**
   * Retorna todos os chamados.
   * @returns {Array<object>}
   */
  all() { return readAll(); },

  /**
   * Busca um chamado por ID.
   * @param {string} id
   * @returns {object|null}
   */
  get(id) { return readAll().find(c => c.id === id) || null; },

  /**
   * Adiciona um novo chamado.
   * - Lê estado atual, dá push e grava de volta.
   * @param {object} ch
   */
  add(ch) { const a = readAll(); a.push(ch); writeAll(a); },

  /**
   * Atualiza parcialmente um chamado (merge “shallow”).
   * - Se não encontrar, retorna false.
   * - Se encontrar, aplica patch e atualiza 'atualizadoEm'.
   * @param {string} id
   * @param {object} patch
   * @returns {boolean}
   */
  update(id, patch) {
    const a = readAll();                        // Tira snapshot atual
    const i = a.findIndex(c => c.id === id);    // Localiza índice do item
    if (i < 0) return false;                    // Não achou → nada a fazer
    a[i] = { ...a[i], ...patch, atualizadoEm: Date.now() }; // Merge e carimbo de atualização
    writeAll(a);                                // Persiste novo array
    return true;                                // Sinaliza sucesso
  },

  /**
   * Remove um chamado por ID.
   * - Filtra o array e grava o resultado.
   * @param {string} id
   */
  remove(id) { writeAll(readAll().filter(c => c.id !== id)); },

  /**
   * Fábrica de objetos “chamado”.
   * - Normaliza strings com .trim().
   * - Define defaults para campos opcionais.
   * @param {object} params
   * @returns {object} chamado “pronto para persistir”
   */
  create({ titulo, descricao, categoria='Outro', prioridade='Média', solicitante='' }) {
    const now = Date.now();                    // Carimbo de data/hora para criação/atualização
    return {
      id: uid(),                               // ID único textual
      titulo: titulo.trim(),                   // Normaliza espaços do título
      descricao: descricao.trim(),             // Normaliza espaços da descrição
      categoria,                               // Categoria (string)
      prioridade,                              // Prioridade (string)
      status: 'Aberto',                        // Estado inicial padrão
      solicitante,                             // Nome do solicitante (opcional)
      criadoEm: now,                           // Carimbo de criação
      atualizadoEm: now                        // Carimbo de última atualização
    };
  },

  /**
   * Semeia dados iniciais se o “banco” estiver vazio.
   * - Acelera testes manuais e demonstrações.
   */
  seedIfEmpty() {
    if (readAll().length) return;              // Se já existe algo, não semeia
    writeAll([
      this.create({ titulo: 'Impressora não imprime', descricao: 'Erro 0x09', categoria: 'Hardware', prioridade: 'Média', solicitante: 'João' }),
      this.create({ titulo: 'Acesso VPN', descricao: 'Falha ao conectar', categoria: 'Rede', prioridade: 'Alta', solicitante: 'Maria' }),
      this.create({ titulo: 'Atualizar Office', descricao: 'Instalar versão 2021', categoria: 'Software', prioridade: 'Baixa', solicitante: 'Carlos' }),
    ]);
  }
};


/* ======================================================================
   SEÇÃO 3 — ABAS (Tabs) E NAVEGAÇÃO SPA
   - Conceito: temos quatro painéis (<section.panel>) e uma barra de abas.
   - Mecanismo: alternamos o atributo 'hidden' nos painéis e estados visuais
     nas abas (classe .is-active e aria-selected).
   - A cada troca de aba, renderizamos o conteúdo correspondente.
   ====================================================================== */

/** Seleciona todos os botões de aba (quatro) */
const tabs = $$('.tab');

/** Guarda referência da aba atualmente ativa (começa em "Home") */
let currentTab = $('#tab-home');

/**
 * Dado um botão de aba, retorna o painel alvo (#home, #abrir, #lista, #detalhe).
 * - Lê do atributo data-target do botão.
 * @param {HTMLButtonElement} btn
 * @returns {HTMLElement} section.panel correspondente
 */
function targetFromTab(btn){
  return document.querySelector(btn.getAttribute('data-target')); // resolve seletor em elemento
}

/**
 * Exibe a aba/painel “btn” e esconde a anterior.
 * - Atualiza estados visuais (.is-active) e acessibilidade (aria-selected).
 * - Foca a aba ativa para navegação por teclado.
 * - Renderiza conteúdo da aba que acabou de abrir (Home/Lista/Detalhe).
 * @param {HTMLButtonElement} btn
 */
function showTab(btn){
  if (!btn || btn === currentTab) return;      // Ignora se null ou já está ativa

  // 1) Esconde painel da aba atual e limpa estados visuais
  targetFromTab(currentTab).hidden = true;     // Painel anterior fica oculto
  currentTab.classList.remove('is-active');    // Remove estilo de “ativa”
  currentTab.setAttribute('aria-selected','false'); // Acessibilidade: não selecionada

  // 2) Mostra painel da nova aba e aplica estados
  targetFromTab(btn).hidden = false;           // Novo painel visível
  btn.classList.add('is-active');              // Estilo de “ativa”
  btn.setAttribute('aria-selected','true');    // Acessibilidade: selecionada

  // 3) Atualiza referência e foca a nova aba
  currentTab = btn;                            // Guarda qual é a aba corrente
  btn.focus();                                 // Move o foco de teclado

  // 4) Renderiza conteúdos específicos da aba aberta
  const id = targetFromTab(btn).id;            // id do painel ativo
  if (id === 'home')    renderHome();          // Atualiza KPIs e últimos chamados
  if (id === 'lista')   renderList();          // Atualiza tabela completa
  if (id === 'detalhe') renderDetail();        // Se houver item selecionado, mostra; senão, vazio
}

/** Registra o clique em cada aba para acionar showTab (sem mudar URL/hash) */
tabs.forEach(t => t.addEventListener('click', e => {
  e.preventDefault();  // Evita qualquer efeito padrão de botão/form
  showTab(t);          // Alterna para a aba clicada
}));


/* ======================================================================
   SEÇÃO 4 — HOME (KPIs + Recentes)
   - KPIs: contagem por status (Aberto / Em andamento / Fechado).
   - Recentes: últimos 5 por data de criação (criadoEm desc).
   - Importante: não há backend; os dados vêm de store.all().
   ====================================================================== */

/**
 * Renderiza o conteúdo da Home (KPIs e últimos 5).
 * - Usa filtro por status para KPIs.
 * - Usa sort por criadoEm (desc) e slice(0,5) para recortes.
 * - Monta linhas <tr> dinamicamente e injeta no <tbody>.
 */
function renderHome(){
  const all = store.all(); // Snapshot atual de todos os chamados (array)

  // KPIs — filtramos por status e contamos o tamanho de cada subconjunto
  $('#kpi-abertos').textContent   = all.filter(c => c.status === 'Aberto').length;
  $('#kpi-andamento').textContent = all.filter(c => c.status === 'Em andamento').length;
  $('#kpi-fechados').textContent  = all.filter(c => c.status === 'Fechado').length;

  // “Recentes” — clona o array, ordena por criadoEm (descendente), pega os 5 primeiros
  const recentes = [...all].sort((a,b)=> b.criadoEm - a.criadoEm).slice(0,5);

  // Alvo para injeção de linhas
  const tbody = $('#home-recentes');
  tbody.innerHTML = ''; // Zera antes de repintar (idempotente)

  // Para cada chamado recente, cria uma <tr> com as colunas e adiciona ao tbody
  recentes.forEach(c => {
    const tr = document.createElement('tr'); // Cria a linha
    // Observação: c.id.split('_')[1] exibe um “trecho legível” do ID
    tr.innerHTML = `
      <td>${c.id.split('_')[1]}</td>
      <td>${c.titulo}</td>
      <td>${c.status}</td>
      <td>${c.prioridade}</td>
      <td>${fmt(c.criadoEm)}</td>`;
    tbody.appendChild(tr); // Insere a linha na tabela
  });
}


/* ======================================================================
   SEÇÃO 5 — ABRIR CHAMADO (CREATE)
   - Captura submit do form, valida campos obrigatórios e cria novo chamado.
   - Após criar: reseta form, vai para aba Lista e re-renderiza tabela.
   ====================================================================== */

/** Referência ao formulário de “Abrir Chamado” */
const form = $('#form-chamado');

/** Listener para o envio (submit) do formulário */
form.addEventListener('submit', (ev) => {
  ev.preventDefault(); // Evita recarregar a página (comportamento padrão do form)

  // Lê e normaliza campos obrigatórios
  const titulo = $('#f-titulo').value.trim();     // Remove espaços nas pontas
  const descricao = $('#f-descricao').value.trim();

  // Validação mínima (campos obrigatórios)
  if (!titulo || !descricao) {
    alert('Preencha Título e Descrição.'); // Feedback simples (poderia ser inline)
    return; // Interrompe o fluxo de criação
  }

  // Monta objeto de chamado com campos complementares
  const novo = store.create({
    titulo,
    descricao,
    categoria: $('#f-categoria').value,          // Lê valor selecionado da categoria
    prioridade: $('#f-prioridade').value,        // Lê valor selecionado da prioridade
    solicitante: $('#f-solicitante').value.trim()// Opcional, normalizado
  });

  // Persiste no “banco”
  store.add(novo);

  // Limpa formulário para próxima entrada
  form.reset();

  // Navega para a aba "Lista" e atualiza a tabela
  showTab($('#tab-lista'));
  renderList(); // Garante que o novo item apareça imediatamente
});


/* ======================================================================
   SEÇÃO 6 — LISTA (READ + UPDATE + DELETE)
   - Renderiza a tabela inteira (ordenada do mais novo para o mais antigo).
   - UPDATE: permite ajustar o status via <select>.
   - DELETE: botão para excluir definitivamente o chamado.
   - Abrir Detalhe: botão que carrega o chamado em “Detalhe”.
   - Técnica: delegação de eventos no <tbody> para não registrar N handlers.
   ====================================================================== */

/**
 * Renderiza a tabela de chamados.
 * - Ordena por criadoEm desc para priorizar o que acabou de entrar.
 * - Cria linhas <tr> com:
 *   - ID curto, título, <select status>, prioridade, criadoEm, botões.
 * - Registra dois manipuladores “delegados” no tbody:
 *   - onchange para o <select.status>
 *   - onclick para botões “Abrir” e “Excluir”
 */
function renderList() {
  // Snapshot dos dados ordenado do mais recente para o mais antigo
  const data = [...store.all()].sort((a,b)=> b.criadoEm - a.criadoEm);

  // Alvo de injeção da tabela
  const tbody = $('#lista-body');
  tbody.innerHTML = ''; // Limpa antes de repintar

  // Para cada chamado, criamos uma linha com colunas e ações
  data.forEach(c => {
    const tr = document.createElement('tr'); // Nova linha

    // Construímos o HTML da linha. Observações:
    // - <select class="status" data-id> é a chave para UPDATE inline.
    // - Botões “Abrir” e “Excluir” usam data-id para saber a qual chamado se referem.
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

    tbody.appendChild(tr); // Adiciona a linha na tabela
  });

  // --- Delegação de eventos no <tbody> ---
  // Vantagem: registramos apenas 1 listener para “n” linhas.

  // 1) UPDATE de status — reage a alterações nos <select.status>
  tbody.onchange = (e) => {
    const sel = e.target.closest('select.status'); // Verifica se a origem é um <select.status>
    if (!sel) return;                              // Se não for, ignora
    store.update(sel.dataset.id, { status: sel.value }); // Atualiza o campo status
    renderHome();                                  // KPIs podem ter mudado — repinta Home
  };

  // 2) Ações de Abrir/Excluir — clique em botões
  tbody.onclick = (e) => {
    const btn = e.target.closest('button'); // Captura o botão mais próximo (se existir)
    if (!btn) return;                        // Se não clicou em botão, ignora
    const id = btn.dataset.id;              // Recupera o ID do chamado alvo

    if (btn.classList.contains('abrir')) {
      // “Abrir” → carrega o detalhe e muda de aba
      $('#d-id').value = id;       // Guarda ID do chamado selecionado no input hidden
      renderDetail();              // Renderiza o conteúdo do detalhe
      showTab($('#tab-detalhe'));  // Troca aba para “Detalhe”

    } else if (btn.classList.contains('excluir')) {
      // “Excluir” → pede confirmação e remove o item
      if (confirm('Excluir chamado permanentemente?')) { // Diálogo nativo simples
        store.remove(id);      // Remove do “banco”
        renderHome();          // Pode afetar KPIs
        renderList();          // Atualiza a tabela

        // Se o detalhe estava mostrando esse mesmo chamado, limpa-o
        if ($('#d-id').value === id) {
          clearDetail();       // Estado “vazio” do detalhe
        }
      }
    }
  };
}


/* ======================================================================
   SEÇÃO 7 — DETALHE (READ-ONLY)
   - Mostra informações do chamado selecionado (armazenado em #d-id).
   - Botão “Excluir” também está disponível aqui (além da tabela).
   - Botão “Voltar” retorna para a Lista.
   ====================================================================== */

/**
 * Coloca o painel Detalhe no estado “vazio” (nenhum item carregado).
 * - Útil ao excluir item que estava aberto ou ao chegar sem ID.
 */
function clearDetail(){
  $('#detalhe-vazio').hidden = false;  // Mostra mensagem “Nenhum chamado selecionado”
  $('#detalhe-conteudo').hidden = true;// Esconde o conteúdo detalhado
  $('#d-id').value = '';               // Limpa o ID armazenado
}

/**
 * Renderiza o painel de detalhe a partir do ID guardado em #d-id.
 * - Se não houver ID ou o item não existir mais, cai para estado “vazio”.
 */
function renderDetail(){
  const id = $('#d-id').value;         // Lê o ID atual do input hidden
  if (!id) {                           // Sem ID → nada a exibir
    clearDetail();
    return;
  }

  const c = store.get(id);             // Busca o chamado no “banco”
  if (!c)  {                           // Não existe (pode ter sido excluído)
    clearDetail();
    return;
  }

  // Exibe conteúdo e esconde o placeholder
  $('#detalhe-vazio').hidden = true;
  $('#detalhe-conteudo').hidden = false;

  // Preenche campos do detalhe com dados do chamado
  $('#d-titulo').textContent          = c.titulo;
  $('#d-solicitante').textContent     = c.solicitante || '—'; // Em falta, exibe travessão
  $('#d-categoria').textContent       = c.categoria;
  $('#d-descricao').textContent       = c.descricao;
  $('#d-status-text').textContent     = c.status;
  $('#d-prioridade-text').textContent = c.prioridade;
}

/** Botão “Excluir” dentro do painel Detalhe */
$('#d-excluir').addEventListener('click', () => {
  const id = $('#d-id').value;        // ID atualmente aberto
  if (!id) return;                    // Sem ID → nada a fazer

  if (confirm('Excluir este chamado?')) { // Confirma ação destrutiva
    store.remove(id);                 // Remove do “banco”
    renderHome();                     // Atualiza KPIs
    renderList();                     // Atualiza tabela
    clearDetail();                    // Volta para estado “vazio” no detalhe
    showTab($('#tab-lista'));         // Retorna à aba “Lista”
  }
});

/** Botão “Voltar para Lista” no painel Detalhe */
$('#d-voltar-lista').addEventListener('click', () => showTab($('#tab-lista')));


/* ======================================================================
   SEÇÃO 8 — BOOTSTRAP (INICIALIZAÇÃO DA APP)
   - Semeia DB se estiver vazio (3 exemplos úteis).
   - Renderiza Home e Lista (estado consistente ao abrir).
   ====================================================================== */

// Semeia dados apenas na primeira execução (ou se o storage foi limpo)
store.seedIfEmpty();

// Pinta KPIs e lista inicial ao carregar a página
renderHome();
renderList();
