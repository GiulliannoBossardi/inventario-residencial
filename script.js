/* ════════════════════════════════════════
   INVENTÁRIO RESIDENCIAL — script.js
   Banco de dados: Firebase Firestore
════════════════════════════════════════ */

/* ── Firebase SDK via CDN ── */
import { initializeApp }                              from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/* ── Configuração do projeto Firebase ── */
const firebaseConfig = {
  apiKey:            "AIzaSyDO4SDUnaDKiB4zXINMNkW3zjsZXQM5MGE",
  authDomain:        "inventario-residencial-d44b8.firebaseapp.com",
  projectId:         "inventario-residencial-d44b8",
  storageBucket:     "inventario-residencial-d44b8.firebasestorage.app",
  messagingSenderId: "951642398157",
  appId:             "1:951642398157:web:ded40bf97768f32b8ab884"
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

/* ── Referência ao documento central de dados ── */
const DATA_REF = doc(db, 'inventario', 'dados');

/* ── Hash simples (ofusca senhas) ── */
function simpleHash(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h) ^ str.charCodeAt(i);
  return (h >>> 0).toString(36);
}

/* ════════════════════════════════════════
   STATE
════════════════════════════════════════ */
let state   = { comodos: [], items: [], users: [], avalItems: [] };
let session = { user: null };
let avalFilter = 'all';
let _saveTimer = null;

/* Carrega dados do Firestore uma vez e escuta mudanças em tempo real */
async function loadState() {
  showLoader(true);
  try {
    // Escuta mudanças em tempo real — atualiza automaticamente para todos os usuários
    onSnapshot(DATA_REF, (snap) => {
      if (snap.exists()) {
        const remote = snap.data();
        state.comodos   = remote.comodos   || [];
        state.items     = remote.items     || [];
        state.users     = remote.users     || [];
        state.avalItems = remote.avalItems || [];
      } else {
        // Primeira execução — cria dados padrão
        state.users = [{ id: 'u0', name: 'Administrador', username: 'admin', passHash: simpleHash('admin123'), role: 'admin' }];
        state.comodos = ['Sala', 'Cozinha', 'Quarto', 'Banheiro', 'Escritório'];
        saveState();
      }
      // Só re-renderiza se já estiver logado
      if (session.user) renderAll();
      showLoader(false);
    });
  } catch (e) {
    console.error('Erro ao carregar dados:', e);
    showLoader(false);
    toast('Erro ao conectar ao banco de dados.', false);
  }
}

/* Salva state completo no Firestore (com debounce para não sobrecarregar) */
function saveState() {
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(async () => {
    try {
      await setDoc(DATA_REF, {
        comodos:   state.comodos,
        items:     state.items,
        users:     state.users,
        avalItems: state.avalItems
      });
    } catch (e) {
      console.error('Erro ao salvar:', e);
      toast('Erro ao salvar dados.', false);
    }
  }, 500);
}

/* ── Loader de conexão ── */
function showLoader(show) {
  let el = document.getElementById('db-loader');
  if (!el) return;
  el.style.display = show ? 'flex' : 'none';
}

/* ════════════════════════════════════════
   TEMA
════════════════════════════════════════ */
function toggleTheme() {
  const d = document.body.classList.toggle('dark');
  localStorage.setItem('theme', d ? 'dark' : 'light');
  document.getElementById('theme-icon').textContent  = d ? '☀️' : '🌙';
  document.getElementById('theme-label').textContent = d ? 'Claro' : 'Escuro';
  if (pieChart) pieChart.update();
}
function applyTheme() {
  const s = localStorage.getItem('theme'), p = window.matchMedia('(prefers-color-scheme:dark)').matches;
  if (s === 'dark' || (s === null && p)) {
    document.body.classList.add('dark');
    document.getElementById('theme-icon').textContent  = '☀️';
    document.getElementById('theme-label').textContent = 'Claro';
  }
}

/* ════════════════════════════════════════
   LOGIN / LOGOUT
════════════════════════════════════════ */
function doLogin() {
  const u = document.getElementById('login-user').value.trim();
  const p = document.getElementById('login-pass').value;
  const found = state.users.find(x => x.username === u && x.passHash === simpleHash(p));
  if (!found) {
    document.getElementById('login-error').style.display = 'block';
    document.getElementById('login-pass').value = '';
    return;
  }
  document.getElementById('login-error').style.display = 'none';
  session.user = found;
  document.getElementById('login-page').style.display = 'none';
  document.getElementById('app-page').style.display   = 'block';
  document.getElementById('chip-name').textContent    = found.name;
  document.getElementById('chip-role').textContent    = found.role === 'admin' ? '· Admin' : '· Usuário';
  document.getElementById('add-user-card').style.display = found.role === 'admin' ? '' : 'none';
  renderAll();
}
function doLogout() {
  session.user = null;
  document.getElementById('login-user').value = '';
  document.getElementById('login-pass').value = '';
  document.getElementById('app-page').style.display   = 'none';
  document.getElementById('login-page').style.display = 'flex';
}

/* ════════════════════════════════════════
   TABS
════════════════════════════════════════ */
function switchTab(n) {
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('pane-' + n).classList.add('active');
  document.getElementById('tab-'  + n).classList.add('active');
  if (n === 'dashboard') renderDashboard();
  if (n === 'avaliacao') renderAvalTable();
}
function switchSubTab(n) {
  document.querySelectorAll('.sub-pane').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.sub-tab').forEach(b => b.classList.remove('active'));
  document.getElementById('spane-' + n).classList.add('active');
  document.getElementById('stab-'  + n).classList.add('active');
}

/* ════════════════════════════════════════
   TOAST
════════════════════════════════════════ */
let _tt;
function toast(msg, ok = true) {
  const el = document.getElementById('toast');
  el.textContent = (ok ? '✅ ' : '⚠️ ') + msg;
  el.style.background = ok ? '#1e293b' : '#dc2626';
  el.classList.add('show');
  clearTimeout(_tt);
  _tt = setTimeout(() => el.classList.remove('show'), 2800);
}

/* ════════════════════════════════════════
   MOEDA
════════════════════════════════════════ */
function maskCurrency(i) {
  let v = i.value.replace(/\D/g, '');
  v = (parseInt(v || '0') / 100).toFixed(2);
  i.value = v.replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
function parseCurrency(s) { return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0; }
function fmtBRL(v) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }

document.getElementById('item-valor').addEventListener('input', function () { maskCurrency(this); });
document.getElementById('av-valor').addEventListener('input',   function () { maskCurrency(this); });

/* ════════════════════════════════════════
   FORÇA DE SENHA
════════════════════════════════════════ */
function pwdStrength(inp, barId, hintId) {
  const v = inp.value, bar = document.getElementById(barId), hint = document.getElementById(hintId);
  bar.className = 'pwd-strength';
  if (!v) { hint.textContent = ''; return; }
  let s = 0;
  if (v.length >= 6)  s++;
  if (v.length >= 10) s++;
  if (/[A-Z]/.test(v) && /[0-9]/.test(v)) s++;
  if (/[^A-Za-z0-9]/.test(v)) s++;
  bar.classList.add('s' + (s || 1));
  hint.textContent = ['Muito fraca', 'Fraca', 'Média', 'Forte'][s > 0 ? s - 1 : 0];
}

/* ════════════════════════════════════════
   CÔMODOS — CONFIG
════════════════════════════════════════ */
function saveComodo() {
  const inp = document.getElementById('new-comodo'), n = inp.value.trim();
  if (!n) { toast('Digite um nome.', false); return; }
  if (state.comodos.includes(n)) { toast('Já existe.', false); return; }
  state.comodos.push(n); saveState(); inp.value = '';
  renderRoomList(); renderComodoSelect();
  toast('Cômodo "' + n + '" adicionado!');
}
function deleteComodo(n) {
  if (state.items.some(i => i.comodo === n)) { toast('Remova os itens deste cômodo antes.', false); return; }
  state.comodos = state.comodos.filter(c => c !== n); saveState();
  renderRoomList(); renderComodoSelect(); toast('Cômodo removido.');
}
function renderRoomList() {
  const el = document.getElementById('room-list'), em = document.getElementById('room-empty');
  if (!state.comodos.length) { el.innerHTML = ''; em.style.display = ''; return; }
  em.style.display = 'none';
  el.innerHTML = state.comodos.map(c =>
    `<div class="room-tag">🏠 ${esc(c)}<button onclick="deleteComodo('${esc(c)}')" title="Remover">✕</button></div>`
  ).join('');
}
function renderComodoSelect() {
  const opts = '<option value="">Selecione...</option>' +
    state.comodos.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
  document.getElementById('item-comodo').innerHTML = opts;
  document.getElementById('av-comodo').innerHTML   = opts;
}

/* ════════════════════════════════════════
   ITENS — CÔMODOS
════════════════════════════════════════ */
function addItem() {
  const comodo = document.getElementById('item-comodo').value;
  const desc   = document.getElementById('item-desc').value.trim();
  const marca  = document.getElementById('item-marca').value.trim();
  const qty    = parseInt(document.getElementById('item-qty').value) || 0;
  const valor  = parseCurrency(document.getElementById('item-valor').value);
  if (!comodo) { toast('Selecione um cômodo.', false); return; }
  if (!desc)   { toast('Informe a descrição.', false); return; }
  if (qty < 1) { toast('Quantidade ≥ 1.', false); return; }
  if (valor <= 0) { toast('Informe o valor.', false); return; }
  state.items.push({ id: Date.now(), comodo, desc, marca, qty, valor });
  saveState();
  document.getElementById('item-desc').value  = '';
  document.getElementById('item-marca').value = '';
  document.getElementById('item-qty').value   = '1';
  document.getElementById('item-valor').value = '';
  renderItemsTable(); toast('Item adicionado!');
}
function deleteItem(id) {
  state.items = state.items.filter(i => i.id !== id); saveState();
  renderItemsTable(); toast('Item removido.');
}
function renderItemsTable() {
  const tb = document.getElementById('items-tbody'), em = document.getElementById('items-empty');
  if (!state.items.length) { tb.innerHTML = ''; em.style.display = ''; return; }
  em.style.display = 'none';
  tb.innerHTML = state.items.map(i => `
    <tr>
      <td><span class="badge">${esc(i.comodo)}</span></td>
      <td><div style="font-weight:600">${esc(i.desc)}</div>${i.marca ? `<div style="font-size:.78rem;color:#94a3b8">${esc(i.marca)}</div>` : ''}</td>
      <td>${i.qty}</td>
      <td>${fmtBRL(i.valor)}</td>
      <td style="font-weight:700;color:#1d4ed8">${fmtBRL(i.qty * i.valor)}</td>
      <td><button class="btn btn-danger" onclick="deleteItem(${i.id})">✕</button></td>
    </tr>`).join('');
}

/* ════════════════════════════════════════
   AVALIAÇÃO
════════════════════════════════════════ */
function addAvalItem() {
  const comodo = document.getElementById('av-comodo').value;
  const desc   = document.getElementById('av-desc').value.trim();
  const marca  = document.getElementById('av-marca').value.trim();
  const qty    = parseInt(document.getElementById('av-qty').value) || 0;
  const valor  = parseCurrency(document.getElementById('av-valor').value);
  const link   = document.getElementById('av-link').value.trim();
  const obs    = document.getElementById('av-obs').value.trim();
  if (!comodo) { toast('Selecione uma categoria.', false); return; }
  if (!desc)   { toast('Informe a descrição.', false); return; }
  if (qty < 1) { toast('Quantidade ≥ 1.', false); return; }
  if (valor <= 0) { toast('Informe o valor.', false); return; }
  state.avalItems.push({
    id: Date.now(), comodo, desc, marca, qty, valor, link, obs,
    status: 'pending',
    createdAt: new Date().toLocaleDateString('pt-BR')
  });
  saveState();
  ['av-desc','av-marca','av-link','av-obs'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('av-qty').value   = '1';
  document.getElementById('av-valor').value = '';
  renderAvalTable(); toast('Item adicionado à avaliação!');
}

function setAvalStatus(id, status) {
  const item = state.avalItems.find(i => i.id === id);
  if (!item) return;
  item.status = status; saveState(); renderAvalTable();
  const labels = { approved: '✅ Aprovado', rejected: '❌ Reprovado', pending: '⏳ Pendente' };
  toast(labels[status] + ': ' + item.desc);
}

function deleteAvalItem(id) {
  state.avalItems = state.avalItems.filter(i => i.id !== id); saveState();
  renderAvalTable(); toast('Item removido.');
}

function filterAval(f, btn) {
  avalFilter = f;
  document.querySelectorAll('.aval-filter').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderAvalTable();
}

function showObs(id) {
  const item = state.avalItems.find(i => i.id === id);
  if (!item || !item.obs) return;
  document.getElementById('obs-text').textContent = item.obs;
  document.getElementById('obs-modal').style.display = 'flex';
}
function closeObsModal() { document.getElementById('obs-modal').style.display = 'none'; }

function renderAvalStats() {
  const total    = state.avalItems.length;
  const pending  = state.avalItems.filter(i => i.status === 'pending').length;
  const approved = state.avalItems.filter(i => i.status === 'approved').length;
  const rejected = state.avalItems.filter(i => i.status === 'rejected').length;
  const totalVal = state.avalItems.filter(i => i.status === 'approved').reduce((s, i) => s + (i.qty * i.valor), 0);
  document.getElementById('aval-stats').innerHTML = `
    <div class="aval-stat total">   <span class="stat-val">${total}</span>    <span class="stat-lbl">Total de Itens</span></div>
    <div class="aval-stat pending"> <span class="stat-val">${pending}</span>  <span class="stat-lbl">⏳ Pendentes</span></div>
    <div class="aval-stat approved"><span class="stat-val">${approved}</span> <span class="stat-lbl">✅ Aprovados</span></div>
    <div class="aval-stat rejected"><span class="stat-val">${rejected}</span> <span class="stat-lbl">❌ Reprovados</span></div>
    <div class="aval-stat money">   <span class="stat-val" style="font-size:1.1rem">${fmtBRL(totalVal)}</span><span class="stat-lbl">💰 Total Aprovado</span></div>`;
}

function renderAvalTable() {
  renderAvalStats();
  const tb       = document.getElementById('aval-tbody'), em = document.getElementById('aval-empty');
  const filtered = avalFilter === 'all' ? state.avalItems : state.avalItems.filter(i => i.status === avalFilter);
  if (!filtered.length) { tb.innerHTML = ''; em.style.display = ''; return; }
  em.style.display = 'none';
  const badge = {
    pending : '<span class="badge badge-pending">⏳ Pendente</span>',
    approved: '<span class="badge badge-approved">✅ Aprovado</span>',
    rejected: '<span class="badge badge-rejected">❌ Reprovado</span>'
  };
  tb.innerHTML = filtered.map(i => `
    <tr>
      <td>${badge[i.status]}</td>
      <td><span class="badge">${esc(i.comodo)}</span></td>
      <td>
        <div style="font-weight:600">${esc(i.desc)}</div>
        ${i.marca ? `<div style="font-size:.78rem;color:#94a3b8">${esc(i.marca)}</div>` : ''}
        <div style="font-size:.72rem;color:#94a3b8;margin-top:2px">${i.createdAt}</div>
      </td>
      <td>${i.qty}</td>
      <td>${fmtBRL(i.valor)}</td>
      <td style="font-weight:700;color:#1d4ed8">${fmtBRL(i.qty * i.valor)}</td>
      <td class="link-cell">
        ${i.link
          ? `<a href="${esc(i.link)}" target="_blank" rel="noopener">
               <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
               Ver link</a>`
          : '<span style="color:#94a3b8;font-size:.78rem">—</span>'}
        ${i.obs ? `<br><button class="btn btn-ghost" style="margin-top:4px;padding:3px 8px;font-size:.72rem" onclick="showObs(${i.id})">📝 Obs.</button>` : ''}
      </td>
      <td>
        <div style="display:flex;gap:5px;flex-wrap:wrap">
          ${i.status !== 'approved' ? `<button class="btn btn-approve" onclick="setAvalStatus(${i.id},'approved')">✅ Aprovar</button>`  : ''}
          ${i.status !== 'rejected' ? `<button class="btn btn-reject"  onclick="setAvalStatus(${i.id},'rejected')">❌ Reprovar</button>` : ''}
          ${i.status !== 'pending'  ? `<button class="btn btn-warn"    onclick="setAvalStatus(${i.id},'pending')">⏳ Pendente</button>`  : ''}
          <button class="btn btn-danger" onclick="deleteAvalItem(${i.id})">✕</button>
        </div>
      </td>
    </tr>`).join('');
}

/* ════════════════════════════════════════
   DASHBOARD
════════════════════════════════════════ */
const COLORS = ['#2563eb','#7c3aed','#db2777','#ea580c','#16a34a','#0891b2','#ca8a04','#9333ea','#e11d48','#0d9488'];
let pieChart = null;

function calcByRoom() {
  const m = {};
  state.comodos.forEach(c => m[c] = 0);
  state.items.forEach(i => { if (m[i.comodo] === undefined) m[i.comodo] = 0; m[i.comodo] += i.qty * i.valor; });
  return Object.entries(m).filter(([, v]) => v > 0);
}
function renderDashboard() {
  const br = calcByRoom(), total = br.reduce((s, [, v]) => s + v, 0);
  document.getElementById('dash-total').textContent = fmtBRL(total);
  const sl = document.getElementById('summary-list');
  sl.innerHTML = br.length
    ? br.sort((a, b) => b[1] - a[1]).map(([n, v], i) => `
        <div class="summary-item">
          <span class="room-name" style="display:flex;align-items:center;gap:6px">
            <span style="width:10px;height:10px;border-radius:50%;background:${COLORS[i % COLORS.length]};display:inline-block"></span>${esc(n)}
          </span>
          <span class="room-val">${fmtBRL(v)}</span>
        </div>`).join('')
    : '<div class="empty" style="width:100%">Nenhum item cadastrado.</div>';
  const labels = br.map(([n]) => n), data = br.map(([, v]) => v), colors = labels.map((_, i) => COLORS[i % COLORS.length]);
  if (pieChart) {
    pieChart.data.labels = labels; pieChart.data.datasets[0].data = data; pieChart.data.datasets[0].backgroundColor = colors; pieChart.update();
  } else {
    pieChart = new Chart(document.getElementById('pieChart').getContext('2d'), {
      type: 'doughnut',
      data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 2, borderColor: '#fff', hoverOffset: 6 }] },
      options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 14, font: { size: 12 } } }, tooltip: { callbacks: { label: c => ' ' + fmtBRL(c.raw) } } } }
    });
  }
}

/* ════════════════════════════════════════
   USUÁRIOS
════════════════════════════════════════ */
function addUser() {
  const name     = document.getElementById('nu-name').value.trim();
  const username = document.getElementById('nu-user').value.trim().toLowerCase();
  const role     = document.getElementById('nu-role').value;
  const pass     = document.getElementById('nu-pass').value;
  if (!name || !username) { toast('Preencha nome e usuário.', false); return; }
  if (!pass || pass.length < 4) { toast('Senha mínima: 4 caracteres.', false); return; }
  if (state.users.find(u => u.username === username)) { toast('Nome de usuário já existe.', false); return; }
  state.users.push({ id: 'u' + Date.now(), name, username, passHash: simpleHash(pass), role });
  saveState();
  ['nu-name','nu-user','nu-pass'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('nu-strength').className = 'pwd-strength';
  document.getElementById('nu-hint').textContent   = '';
  renderUsersList(); toast('Usuário "' + username + '" criado!');
}
function deleteUser(id) {
  if (id === session.user.id) { toast('Você não pode remover seu próprio usuário.', false); return; }
  if (state.users.filter(u => u.role === 'admin').length === 1 && state.users.find(u => u.id === id)?.role === 'admin') {
    toast('Deve existir ao menos um administrador.', false); return;
  }
  state.users = state.users.filter(u => u.id !== id); saveState();
  renderUsersList(); toast('Usuário removido.');
}
function renderUsersList() {
  const el = document.getElementById('users-list'), isAdmin = session.user?.role === 'admin';
  el.innerHTML = state.users.map(u => {
    const rb = u.role === 'admin' ? 'badge-purple' : 'badge-green', rl = u.role === 'admin' ? 'Admin' : 'Usuário';
    const canEdit   = isAdmin || u.id === session.user?.id;
    const canDelete = isAdmin && u.id !== session.user?.id;
    return `<div class="user-card">
      <div class="user-info">
        <span class="uname">👤 ${esc(u.name)}</span>
        <span class="umeta">@${esc(u.username)} · <span class="badge ${rb}" style="font-size:.7rem;padding:2px 7px">${rl}</span></span>
      </div>
      <div class="user-actions">
        ${canEdit   ? `<button class="btn btn-warn"   onclick="openPwdModal('${u.id}')">🔑 Alterar Senha</button>` : ''}
        ${canDelete ? `<button class="btn btn-danger" onclick="deleteUser('${u.id}')">✕ Remover</button>` : ''}
      </div>
    </div>`;
  }).join('') || '<div class="empty">Nenhum usuário cadastrado.</div>';
}

/* ── Modal Senha ── */
function openPwdModal(uid) {
  const u = state.users.find(x => x.id === uid); if (!u) return;
  document.getElementById('modal-uid').value           = uid;
  document.getElementById('modal-uname').textContent   = u.username;
  ['modal-old','modal-new','modal-confirm'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('modal-strength').className  = 'pwd-strength';
  document.getElementById('modal-hint').textContent    = '';
  document.getElementById('old-pass-wrap').style.display = uid === session.user.id ? '' : 'none';
  document.getElementById('pwd-modal').style.display   = 'flex';
}
function closePwdModal() { document.getElementById('pwd-modal').style.display = 'none'; }
function savePwd() {
  const uid = document.getElementById('modal-uid').value;
  const u   = state.users.find(x => x.id === uid);
  const nw  = document.getElementById('modal-new').value;
  const cf  = document.getElementById('modal-confirm').value;
  if (uid === session.user.id) {
    const old = document.getElementById('modal-old').value;
    if (simpleHash(old) !== u.passHash) { toast('Senha atual incorreta.', false); return; }
  }
  if (!nw || nw.length < 4) { toast('Nova senha: mínimo 4 caracteres.', false); return; }
  if (nw !== cf)             { toast('As senhas não coincidem.', false); return; }
  u.passHash = simpleHash(nw); saveState(); closePwdModal(); toast('Senha alterada com sucesso!');
}

/* ════════════════════════════════════════
   EXPORTAÇÃO XLSX
════════════════════════════════════════ */
function exportXLSX(type) {
  if (type === 'items') {
    if (!state.items.length) { toast('Nenhum item para exportar.', false); return; }
    const rows = state.items.map(i => ({ 'Cômodo': i.comodo, 'Descrição': i.desc, 'Marca': i.marca || '—', 'Quantidade': i.qty, 'Valor Unitário': i.valor, 'Valor Total': i.qty * i.valor }));
    const grand = state.items.reduce((s, i) => s + (i.qty * i.valor), 0);
    rows.push({ 'Cômodo': '', 'Descrição': '', 'Marca': '', 'Quantidade': '', 'Valor Unitário': 'TOTAL GERAL', 'Valor Total': grand });
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 18 }, { wch: 28 }, { wch: 16 }, { wch: 12 }, { wch: 18 }, { wch: 16 }];
    applyMoneyFmt(ws, ['E', 'F']);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Inventário');
    XLSX.writeFile(wb, `inventario_${fmtDate()}.xlsx`);
  } else {
    const src = avalFilter === 'all' ? state.avalItems : state.avalItems.filter(i => i.status === avalFilter);
    if (!src.length) { toast('Nenhum item para exportar.', false); return; }
    const statusPt = { pending: 'Pendente', approved: 'Aprovado', rejected: 'Reprovado' };
    const rows = src.map(i => ({ 'Status': statusPt[i.status], 'Categoria': i.comodo, 'Descrição': i.desc, 'Marca': i.marca || '—', 'Quantidade': i.qty, 'Valor Unitário': i.valor, 'Valor Total': i.qty * i.valor, 'Link': i.link || '', 'Observações': i.obs || '', 'Data': i.createdAt }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 12 }, { wch: 16 }, { wch: 28 }, { wch: 16 }, { wch: 10 }, { wch: 16 }, { wch: 16 }, { wch: 40 }, { wch: 40 }, { wch: 12 }];
    applyMoneyFmt(ws, ['F', 'G']);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Avaliação');
    XLSX.writeFile(wb, `avaliacao_${fmtDate()}.xlsx`);
  }
  toast('XLSX exportado com sucesso!');
}
function applyMoneyFmt(ws, cols) {
  const fmt = '"R$"#,##0.00', rng = XLSX.utils.decode_range(ws['!ref']);
  for (let r = rng.s.r + 1; r <= rng.e.r; r++) {
    cols.forEach(col => { const c = ws[col + (r + 1)]; if (c && typeof c.v === 'number') { c.z = fmt; c.t = 'n'; } });
  }
}
function fmtDate() { return new Date().toLocaleDateString('pt-BR').replace(/\//g, '-'); }

/* ════════════════════════════════════════
   UTILITÁRIOS
════════════════════════════════════════ */
function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function renderAll() { renderRoomList(); renderComodoSelect(); renderItemsTable(); renderDashboard(); renderUsersList(); renderAvalTable(); }

/* ════════════════════════════════════════
   INIT
════════════════════════════════════════ */
function init() {
  applyTheme();
  loadState();
}
init();

/* ════════════════════════════════════════
   EXPÕE FUNÇÕES NO ESCOPO GLOBAL
   (necessário pois o script usa type="module")
════════════════════════════════════════ */
Object.assign(window, {
  doLogin, doLogout,
  toggleTheme,
  switchTab, switchSubTab,
  saveComodo, deleteComodo,
  addItem, deleteItem,
  addAvalItem, deleteAvalItem, setAvalStatus, filterAval, showObs, closeObsModal,
  addUser, deleteUser,
  openPwdModal, closePwdModal, savePwd,
  exportXLSX,
  pwdStrength
});
