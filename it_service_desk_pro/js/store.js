// js/store.js
// Camada de dados em LocalStorage (sem libs/frameworks)

const KEY = 'chamados.v1';

function readAll() {
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function writeAll(arr) {
  localStorage.setItem(KEY, JSON.stringify(arr));
}

function uid() {
  // id legível + timestamp (sem libs externas)
  const n = Date.now();
  return `chm_${n.toString(36)}_${Math.floor(Math.random() * 1e4).toString(36)}`;
}

export const store = {
  all() {
    return readAll();
  },

  get(id) {
    return readAll().find((c) => c.id === id) || null;
  },

  add(chamado) {
    const base = readAll();
    base.push(chamado);
    writeAll(base);
  },

  update(id, patch) {
    const base = readAll();
    const i = base.findIndex((c) => c.id === id);
    if (i === -1) return false;
    base[i] = { ...base[i], ...patch, atualizadoEm: Date.now() };
    writeAll(base);
    return true;
  },

  remove(id) {
    const out = readAll().filter((c) => c.id !== id);
    writeAll(out);
  },

  create({
    titulo,
    descricao,
    categoria = 'Outro',
    prioridade = 'Média',
    solicitante = '',
  }) {
    const now = Date.now();
    return {
      id: uid(),
      titulo: String(titulo || '').trim(),
      descricao: String(descricao || '').trim(),
      categoria,
      prioridade,
      status: 'Aberto',
      solicitante,
      criadoEm: now,
      atualizadoEm: now,
      logs: [{ data: now, acao: 'CRIADO', por: solicitante || 'sistema' }],
    };
  },

  seedIfEmpty(samples = []) {
    const curr = readAll();
    if (curr.length === 0 && samples.length) {
      writeAll(samples);
    }
  },
};
