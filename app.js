/* =========================================================
   DívidaClara — app.js
   Módulos: util · ui · demo · public · auth · views · router · ações
   ========================================================= */
(function () {
  'use strict';
  const cfg = window.DC_CONFIG;
  const api = window.DC.api;
  const $ = (s, el = document) => el.querySelector(s);

  /* ---------------- util ---------------- */
  const util = {
    eur: new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }),
    num: new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 1 }),
    fmtEUR(v) { return util.eur.format(Number(v) || 0); },
    fmtDate(d) {
      if (!d) return '—';
      const x = d instanceof Date ? d : new Date(d);
      if (isNaN(x)) return '—';
      return String(x.getDate()).padStart(2, '0') + '/' + String(x.getMonth() + 1).padStart(2, '0') + '/' + x.getFullYear();
    },
    fmtDateTime(d) { const x = new Date(d); return util.fmtDate(x) + ' ' + String(x.getHours()).padStart(2, '0') + ':' + String(x.getMinutes()).padStart(2, '0'); },
    daysFromToday(d) { const a = new Date(); a.setHours(0, 0, 0, 0); const b = new Date(d); b.setHours(0, 0, 0, 0); return Math.round((b - a) / 864e5); },
    esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); },
    isEmail(s) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(s).trim()); },
    isPhonePT(s) { return !s || /^(\+351)?[29]\d{8}$/.test(String(s).replace(/\s/g, '')); },
    cleanPhone(s) { return String(s || '').replace(/\s/g, ''); },
    strongPw(p) { return p.length >= 10 && /[A-Za-z]/.test(p) && /\d/.test(p); },
    download(name, obj) {
      const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1500);
    }
  };

  /* ---------------- ui ---------------- */
  const ui = {
    toast(msg, type = '') {
      const t = document.createElement('div'); t.className = 'toast ' + type; t.textContent = msg;
      $('#toasts').appendChild(t); setTimeout(() => t.remove(), 5500);
    },
    openModal(html) { $('#modal-body').innerHTML = html; $('#modal').hidden = false; const f = $('#modal-body input, #modal-body button'); if (f) f.focus(); },
    closeModal() { $('#modal').hidden = true; $('#modal-body').innerHTML = ''; },
    setFieldError(input, msg) {
      input.classList.toggle('invalid', !!msg);
      let e = input.parentElement.querySelector('.err');
      if (msg) { if (!e) { e = document.createElement('div'); e.className = 'err'; input.parentElement.appendChild(e); } e.textContent = msg; }
      else if (e) e.remove();
    },
    busy(btn, on, label) {
      if (!btn) return;
      if (on) { btn.dataset.label = btn.textContent; btn.textContent = label || 'A enviar…'; btn.disabled = true; }
      else if (document.body.contains(btn)) { btn.textContent = btn.dataset.label || btn.textContent; btn.disabled = false; }
    },
    error(err) { ui.toast((err && err.message) || 'Ocorreu um erro.', 'err'); }
  };

  /* ---------------- dados de demonstração (fictícios) ---------------- */
  const demo = (() => {
    const d = n => { const x = new Date(); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
    const debt = (creditor, debt_type, capital, interest, monthly_payment, status, due_date) => ({ creditor, debt_type, capital, interest, charges: 0, total: capital + interest, monthly_payment, status, due_date });
    return {
      debts: [
        debt('Banco Exemplo, S.A. (fictício)', 'Crédito pessoal', 6420.00, 512.30, 185.00, 'Em pagamento', d(9)),
        debt('Cartões Fictícios, S.A.', 'Cartão de crédito', 2310.45, 298.10, 90.00, 'Em atraso', d(-12)),
        debt('Cobranças Demonstração, Lda', 'Telecomunicações', 389.90, 41.20, 0, 'Em cobrança', d(4)),
        debt('Crédito Automóvel Exemplo, S.A.', 'Crédito automóvel', 8930.00, 0, 214.60, 'Em pagamento', d(21))
      ],
      ie: [
        { kind: 'rendimento', category: 'Salário líquido', monthly_value: 1180 }, { kind: 'rendimento', category: 'Outros rendimentos', monthly_value: 120 },
        { kind: 'despesa', category: 'Renda', monthly_value: 450 }, { kind: 'despesa', category: 'Alimentação', monthly_value: 260 },
        { kind: 'despesa', category: 'Água, luz e gás', monthly_value: 95 }, { kind: 'despesa', category: 'Telecomunicações', monthly_value: 38 },
        { kind: 'despesa', category: 'Transportes', monthly_value: 70 }
      ],
      docsAnalysed: 1
    };
  })();
  const getData = () => api.isDemo() ? Promise.resolve(demo) : api.dashboard();

  /* ---------------- área pública ---------------- */
  const pub = {
    renderPlans(plans) {
      $('#plans').innerHTML = plans.map(p => `
        <div class="plan ${p.highlight ? 'hl' : ''}">
          <h3>${util.esc(p.name)}</h3>
          <div class="price">${Number(p.price) === 0 ? 'Grátis' : (p.from ? '<small>desde </small>' : '') + util.fmtEUR(p.price) + ' <small>' + util.esc(p.period) + '</small>'}</div>
          <ul>${(p.features || []).map(f => `<li>${util.esc(f)}</li>`).join('')}</ul>
          <button class="btn ${p.highlight ? 'btn-primary' : 'btn-ghost'} btn-block" data-action="choose-plan" data-plan="${util.esc(p.id)}">${Number(p.price) === 0 ? 'Começar gratuitamente' : 'Escolher'}</button>
        </div>`).join('');
    },
    renderContact() {
      const c = cfg.CONTACT, lines = [];
      if (c.EMAIL) lines.push(`Email: <a href="mailto:${util.esc(c.EMAIL)}">${util.esc(c.EMAIL)}</a>`);
      if (c.PHONE) lines.push(`Telefone: ${util.esc(c.PHONE)}`);
      if (c.ENTITY) lines.push(util.esc(c.ENTITY));
      $('#contact-info').innerHTML = lines.length ? '<p>' + lines.join('<br>') + '</p>' : '<p>Usa o formulário abaixo para nos contactares.</p>';
    },
    async init() {
      pub.renderPlans(cfg.PLANS);
      pub.renderContact();
      $('#footer-version').textContent = `© ${new Date().getFullYear()} DívidaClara · versão ${cfg.VERSION}`;
      $('#demo-link').hidden = !cfg.DEMO_MODE;
      $('#contact-form').addEventListener('submit', pub.onContact);
      if (api.isConfigured()) { try { const p = await api.publicPlans(); if (Array.isArray(p) && p.length) pub.renderPlans(p); } catch (e) { /* mantém preços locais */ } }
    },
    async onContact(ev) {
      ev.preventDefault();
      const f = ev.target, btn = $('button[type=submit]', f);
      const name = f.name.value.trim(), email = f.email.value.trim(), message = f.message.value.trim();
      const checks = [[f.name, name.length >= 2, 'Indica o teu nome.'], [f.email, util.isEmail(email), 'Email inválido.'], [f.message, message.length >= 10, 'Escreve pelo menos 10 caracteres.']];
      let ok = true; checks.forEach(([el, g, m]) => { ui.setFieldError(el, g ? '' : m); if (!g) ok = false; });
      if (!f.consent.checked) { ui.toast('Tens de aceitar o tratamento dos dados para enviar.', 'err'); ok = false; }
      if (!ok) return;
      ui.busy(btn, true);
      try { await api.contact({ name, email, message }); f.reset(); ui.toast('Mensagem enviada. Respondemos por email.', 'ok'); }
      catch (e) { ui.error(e); } finally { ui.busy(btn, false); }
    }
  };

  /* ---------------- autenticação ---------------- */
  const pwHint = '<span class="fine">(mínimo 10 caracteres, com letras e números)</span>';
  const auth = {
    loginForm(note) {
      ui.openModal(`<h2 id="modal-title">Entrar</h2>${note ? `<p class="fine">${util.esc(note)}</p>` : ''}
        <form id="f-login" class="form" novalidate>
          <div class="field"><label for="l-email">Email</label><input id="l-email" name="email" type="email" autocomplete="email" required></div>
          <div class="field"><label for="l-pass">Palavra-passe</label><input id="l-pass" name="password" type="password" autocomplete="current-password" required></div>
          <button class="btn btn-primary btn-block" type="submit">Entrar</button>
        </form>
        <div class="modal-alt"><button data-action="open-reset">Esqueci-me da palavra-passe</button> · <button data-action="open-register">Criar conta</button></div>`);
      $('#f-login').addEventListener('submit', auth.onLogin);
    },
    registerForm(note) {
      ui.openModal(`<h2 id="modal-title">Criar conta gratuita</h2>${note ? `<p class="fine">${util.esc(note)}</p>` : ''}
        <form id="f-reg" class="form" novalidate>
          ${auth.personalFields()}
          <div class="field"><label for="r-email">Email</label><input id="r-email" name="email" type="email" autocomplete="email" maxlength="120" required></div>
          <div class="field"><label for="r-pass">Palavra-passe ${pwHint}</label><input id="r-pass" name="password" type="password" autocomplete="new-password" minlength="10" required></div>
          <div class="field"><label for="r-pass2">Repetir palavra-passe</label><input id="r-pass2" name="password2" type="password" autocomplete="new-password" required></div>
          ${auth.consentFields()}
          <button class="btn btn-primary btn-block" type="submit">Criar conta</button>
        </form>
        <div class="modal-alt">Já tens conta? <button data-action="open-login">Entrar</button></div>`);
      $('#f-reg').addEventListener('submit', auth.onRegister);
    },
    personalFields(p = {}) {
      return `<div class="field"><label for="r-name">Nome</label><input id="r-name" name="name" autocomplete="name" maxlength="80" required value="${util.esc(p.name || '')}"></div>
        <div class="field"><label for="r-phone">Telemóvel <span class="fine">(opcional)</span></label><input id="r-phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" value="${util.esc(p.phone || '')}"></div>
        <div class="field"><label for="r-type">Tipo de conta</label><select id="r-type" name="type">
          <option value="particular" ${p.account_type !== 'empresa' ? 'selected' : ''}>Particular</option>
          <option value="empresa" ${p.account_type === 'empresa' ? 'selected' : ''}>Empresa / empresário em nome individual</option></select></div>`;
    },
    consentFields() {
      return `<label class="check"><input type="checkbox" name="adult" required><span>Tenho 18 anos ou mais.</span></label>
        <label class="check"><input type="checkbox" name="consent" required><span>Li a <a href="#/privacidade" target="_blank">política de privacidade</a> e aceito o tratamento dos meus dados para prestar o serviço.</span></label>`;
    },
    validatePersonal(f) {
      const v = { name: f.name.value.trim(), phone: util.cleanPhone(f.phone.value), type: f.type.value };
      const checks = [[f.name, v.name.length >= 2, 'Indica o teu nome.'], [f.phone, util.isPhonePT(v.phone), 'Número português inválido (9 dígitos).']];
      let ok = true; checks.forEach(([el, g, m]) => { ui.setFieldError(el, g ? '' : m); if (!g) ok = false; });
      return ok ? v : null;
    },
    activationForm() {
      ui.openModal(`<h2 id="modal-title">Ativar a DívidaClara</h2>
        <p>Este email já tem conta noutro serviço nosso. Para usar a DívidaClara, completa os dados e aceita a política de privacidade.</p>
        <form id="f-act" class="form" novalidate>${auth.personalFields()}${auth.consentFields()}
          <button class="btn btn-primary btn-block" type="submit">Ativar</button></form>
        <div class="modal-alt"><button data-action="logout">Cancelar e sair</button></div>`);
      $('#f-act').addEventListener('submit', async ev => {
        ev.preventDefault(); const f = ev.target, btn = $('button[type=submit]', f);
        const v = auth.validatePersonal(f); if (!v) return;
        if (!f.adult.checked || !f.consent.checked) return ui.toast('Confirma a idade e aceita a política de privacidade.', 'err');
        ui.busy(btn, true, 'A ativar…');
        try { await api.activate(v); ui.closeModal(); location.hash = '#/app/inicio'; route(); ui.toast('Conta ativada.', 'ok'); }
        catch (e) { ui.error(e); } finally { ui.busy(btn, false); }
      });
    },
    resetForm() {
      ui.openModal(`<h2 id="modal-title">Recuperar palavra-passe</h2>
        <p>Indica o email da conta. Se existir, enviamos uma ligação para criares uma nova palavra-passe.</p>
        <form id="f-reset" class="form" novalidate>
          <div class="field"><label for="p-email">Email</label><input id="p-email" name="email" type="email" autocomplete="email" required></div>
          <button class="btn btn-primary btn-block" type="submit">Enviar ligação</button></form>`);
      $('#f-reset').addEventListener('submit', auth.onReset);
    },
    newPasswordForm(title = 'Nova palavra-passe') {
      ui.openModal(`<h2 id="modal-title">${title}</h2>
        <form id="f-newpw" class="form" novalidate>
          <div class="field"><label for="n-pass">Nova palavra-passe ${pwHint}</label><input id="n-pass" name="password" type="password" autocomplete="new-password" required></div>
          <div class="field"><label for="n-pass2">Repetir</label><input id="n-pass2" name="password2" type="password" autocomplete="new-password" required></div>
          <button class="btn btn-primary btn-block" type="submit">Guardar</button></form>`);
      $('#f-newpw').addEventListener('submit', async ev => {
        ev.preventDefault(); const f = ev.target, btn = $('button', f), pw = f.password.value;
        ui.setFieldError(f.password, util.strongPw(pw) ? '' : 'Mínimo 10 caracteres, com letras e números.');
        ui.setFieldError(f.password2, f.password2.value === pw ? '' : 'As palavras-passe não coincidem.');
        if (!util.strongPw(pw) || f.password2.value !== pw) return;
        ui.busy(btn, true, 'A guardar…');
        try { await api.updatePassword(pw); ui.closeModal(); ui.toast('Palavra-passe alterada.', 'ok'); if (!location.hash.startsWith('#/app')) location.hash = '#/app/inicio'; }
        catch (e) { ui.error(e); } finally { ui.busy(btn, false); }
      });
    },
    async onLogin(ev) {
      ev.preventDefault();
      const f = ev.target, btn = $('button', f), email = f.email.value.trim(), password = f.password.value;
      ui.setFieldError(f.email, util.isEmail(email) ? '' : 'Email inválido.');
      ui.setFieldError(f.password, password ? '' : 'Indica a palavra-passe.');
      if (!util.isEmail(email) || !password) return;
      ui.busy(btn, true, 'A entrar…');
      try {
        const r = await api.login(email, password);
        if (r.needsActivation) return auth.activationForm();
        ui.closeModal(); location.hash = '#/app/inicio';
      } catch (e) { ui.error(e); } finally { ui.busy(btn, false); }
    },
    async onRegister(ev) {
      ev.preventDefault();
      const f = ev.target, btn = $('button[type=submit]', f);
      const v = auth.validatePersonal(f);
      const email = f.email.value.trim(), password = f.password.value;
      const checks = [[f.email, util.isEmail(email), 'Email inválido.'], [f.password, util.strongPw(password), 'Mínimo 10 caracteres, com letras e números.'], [f.password2, f.password2.value === password, 'As palavras-passe não coincidem.']];
      let ok = !!v; checks.forEach(([el, g, m]) => { ui.setFieldError(el, g ? '' : m); if (!g) ok = false; });
      if (!f.adult.checked || !f.consent.checked) { ui.toast('Confirma a idade e aceita a política de privacidade.', 'err'); ok = false; }
      if (!ok) return;
      ui.busy(btn, true, 'A criar conta…');
      try {
        const r = await api.register({ ...v, email, password });
        if (r.needsConfirmation) {
          ui.openModal(`<h2 id="modal-title">Confirma o teu email</h2><p>Enviámos uma ligação para <strong>${util.esc(email)}</strong>. Abre-a para ativar a conta e depois entra.</p><p class="fine">Não chegou? Vê a pasta de spam ou lixo.</p><button class="btn btn-primary btn-block" data-action="open-login">Entrar</button>`);
        } else { ui.closeModal(); location.hash = '#/app/inicio'; ui.toast('Conta criada.', 'ok'); }
      } catch (e) { ui.error(e); } finally { ui.busy(btn, false); }
    },
    async onReset(ev) {
      ev.preventDefault();
      const f = ev.target, btn = $('button', f), email = f.email.value.trim();
      ui.setFieldError(f.email, util.isEmail(email) ? '' : 'Email inválido.');
      if (!util.isEmail(email)) return;
      ui.busy(btn, true);
      try { await api.requestPasswordReset(email); ui.closeModal(); ui.toast('Se o email existir, vais receber uma ligação.', 'ok'); }
      catch (e) { ui.error(e); } finally { ui.busy(btn, false); }
    }
  };

  /* ---------------- vistas da área de cliente ---------------- */
  const MENU = [
    ['inicio', '🏠', 'Início'], ['dividas', '📋', 'As minhas dívidas'], ['analisar', '📄', 'Analisar documento'],
    ['simulador', '🧮', 'Simulador financeiro'], ['insolvencia', '⚖️', 'Insolvência'], ['apoio', '🤝', 'Apoio profissional'],
    ['biblioteca', '📚', 'Biblioteca de informação'], ['conta', '👤', 'A minha conta']
  ];
  const phaseCard = (phase, items, note) => `
    <div class="phase"><span class="badge badge-info">Disponível na Fase ${phase}</span>
      <p style="margin-top:.8rem">Esta área vai incluir:</p><ul>${items.map(i => `<li>${i}</li>`).join('')}</ul>
      ${note ? `<p class="fine">${note}</p>` : ''}</div>`;
  const kpi = (l, v, neg) => `<div class="kpi"><div class="k-label">${l}</div><div class="k-val ${neg ? 'neg' : ''}">${v}</div></div>`;
  function badgeStatus(s) {
    const map = { 'Em atraso': 'badge-urg', 'Em cobrança': 'badge-warn', 'Em negociação': 'badge-warn', 'Em pagamento': 'badge-info', 'Liquidada': 'badge-ok', 'Contestada': 'badge-warn' };
    return `<span class="badge ${map[s] || 'badge-info'}">${util.esc(s)}</span>`;
  }

  const views = {
    async inicio() {
      const u = api.currentUser();
      const d = await getData();
      const active = d.debts.filter(x => x.status !== 'Liquidada');
      const totDebt = active.reduce((s, x) => s + Number(x.total), 0);
      const creditors = new Set(active.map(x => x.creditor.trim().toLowerCase())).size;
      const monthly = active.reduce((s, x) => s + Number(x.monthly_payment), 0);
      const inc = d.ie.filter(x => x.kind === 'rendimento').reduce((s, x) => s + Number(x.monthly_value), 0);
      const exp = d.ie.filter(x => x.kind === 'despesa').reduce((s, x) => s + Number(x.monthly_value), 0);
      const bal = inc - exp - monthly;
      const effort = inc ? monthly / inc * 100 : 0;
      const overdue = active.filter(x => x.due_date && util.daysFromToday(x.due_date) < 0);
      const upcoming = active.filter(x => { if (!x.due_date) return false; const n = util.daysFromToday(x.due_date); return n >= 0 && n <= 30; });
      const alerts = [];
      active.filter(x => x.court_case || x.seizure).forEach(x => alerts.push(`<div class="alert urg">⚖️ <div><strong>${util.esc(x.creditor)}</strong>: tem ${x.court_case ? 'processo judicial' : 'penhora'} registado. Os prazos podem ser curtos: confirma já com advogado ou solicitador.</div></div>`));
      overdue.forEach(x => alerts.push(`<div class="alert urg">⚠️ <div><strong>${util.esc(x.creditor)}</strong>: vencimento ultrapassado em ${util.fmtDate(x.due_date)}. Contacta o credor ou pede apoio.</div></div>`));
      if (inc && effort > 35) alerts.push(`<div class="alert warn">📊 <div>As prestações absorvem ${util.num.format(effort)} % do rendimento. Acima de 35 % a situação merece atenção.</div></div>`);
      if (inc && bal < 0) alerts.push(`<div class="alert urg">💶 <div>As despesas e prestações são superiores ao rendimento em ${util.fmtEUR(-bal)} por mês.</div></div>`);
      const empty = !d.debts.length && !d.ie.length;
      return `${empty ? `<section class="panel"><h2>Olá, ${util.esc(u.name)}</h2><p>Ainda não registaste dívidas, rendimentos ou despesas. O registo manual chega na Fase 4; por agora podes rever a tua conta e os consentimentos.</p><a class="btn btn-secondary" href="#/app/conta">A minha conta</a></section>` : ''}
        <div class="kpis">
          ${kpi('Total de dívidas', util.fmtEUR(totDebt))}${kpi('Credores', creditors)}${kpi('Prestações mensais', util.fmtEUR(monthly))}
          ${kpi('Rendimentos mensais', util.fmtEUR(inc))}${kpi('Despesas mensais', util.fmtEUR(exp))}
          ${kpi('Saldo mensal estimado', util.fmtEUR(bal), bal < 0)}${kpi('Taxa de esforço', inc ? util.num.format(effort) + ' %' : '—', effort > 35)}
          ${kpi('Documentos analisados', d.docsAnalysed)}
        </div>
        <div class="two">
          <section class="panel"><h2>Alertas importantes</h2>${alerts.join('') || '<p class="empty">Sem alertas.</p>'}</section>
          <section class="panel"><h2>Próximos vencimentos (30 dias)</h2>
            ${upcoming.length ? `<table><thead><tr><th>Data</th><th>Credor</th><th class="num">Prestação</th></tr></thead><tbody>
              ${upcoming.map(x => `<tr><td>${util.fmtDate(x.due_date)}</td><td>${util.esc(x.creditor)}</td><td class="num">${Number(x.monthly_payment) ? util.fmtEUR(x.monthly_payment) : '—'}</td></tr>`).join('')}
            </tbody></table>` : '<p class="empty">Nada a vencer nos próximos 30 dias.</p>'}</section>
        </div>
        ${api.isDemo() ? '<p class="fine">Valores fictícios de demonstração. Os cálculos são os mesmos que se aplicam aos teus dados.</p>' : ''}`;
    },
    async dividas() {
      const d = await getData();
      const rows = d.debts.map(x => `<tr><td>${util.esc(x.creditor)}</td><td>${util.esc(x.debt_type)}</td><td class="num">${util.fmtEUR(x.capital)}</td><td class="num">${util.fmtEUR(Number(x.interest) + Number(x.charges || 0))}</td><td class="num">${util.fmtEUR(x.monthly_payment)}</td><td>${util.fmtDate(x.due_date)}</td><td>${badgeStatus(x.status)}</td></tr>`).join('');
      return `<section class="panel"><h2>Dívidas registadas</h2>
        ${d.debts.length ? `<div class="table-scroll"><table><thead><tr><th>Credor</th><th>Tipo</th><th class="num">Capital</th><th class="num">Juros e encargos</th><th class="num">Prestação</th><th>Vencimento</th><th>Estado</th></tr></thead><tbody>${rows}</tbody></table></div>` : '<p class="empty">Ainda não há dívidas registadas.</p>'}
        </section>` + phaseCard(4, ['Adicionar, editar e apagar dívidas (credor, capital, juros, encargos, prestação, datas, processo judicial, penhora)', 'Associar documentos a cada dívida', 'Gráficos: dívida total, por credor, evolução, prestações, vencidas, por tipo de crédito'], 'Os dados ficam guardados no servidor e só tu os vês.');
    },
    analisar: () => phaseCard(3, ['Carregar PDF, JPG, PNG ou tirar fotografia com o telemóvel', 'Aviso prévio sobre o envio do documento ao Google Gemini e consentimento expresso', 'Relatório A–L: entidade, valor reclamado, datas, prazo, referências legais expressas, explicação simples, questões a confirmar', 'Prioridade: Informativo, Atenção ou Urgente', 'Separação entre factos do documento, interpretações possíveis e o que não foi possível confirmar'], 'A chave do Gemini fica apenas no servidor. Nunca no navegador.'),
    simulador: () => phaseCard(4, ['Rendimentos: salário líquido e outros', 'Despesas: renda, alimentação, água, luz, gás, telecomunicações, transportes, saúde, família, prestações, outras', 'Cálculo de rendimento total, despesas essenciais, encargos financeiros, saldo, taxa de esforço e capacidade de pagamento', 'Três cenários: atual, redução de despesas e reorganização de pagamentos', 'Gráficos e tabelas'], 'O simulador nunca sugere pagamentos que deixem as despesas essenciais por cobrir.'),
    insolvencia: () => phaseCard(5, ['O que é a insolvência de pessoa singular e quando pode ser ponderada', 'Consequências, exoneração do passivo restante e plano de pagamentos', 'Responsabilidades do devedor e documentação habitual', 'Diferença entre insolvência e processo executivo', 'Questionário de organização com relatório preliminar'], 'Conteúdo a redigir a partir do texto em vigor do CIRE no Diário da República, com data de atualização. A decisão de avançar deve ser sempre acompanhada por profissional habilitado.'),
    apoio: () => phaseCard(5, ['Pedido de contacto com advogado, solicitador, contabilista certificado ou entidade de apoio ao sobre-endividamento', 'Autorização expressa e revogável para partilhar documentos com o profissional escolhido', 'Distinção clara entre informação automática e serviço prestado por profissional'], 'Os dados nunca são vendidos. Parcerias remuneradas, se existirem, serão identificadas.'),
    biblioteca: () => phaseCard(5, ['Insolvência e recuperação (CIRE), processo executivo e penhoras, prescrição, crédito ao consumo e à habitação, sobre-endividamento, proteção de rendimentos, negociação com credores', 'Cada artigo com fontes oficiais (Diário da República, Banco de Portugal, Portal das Finanças, Segurança Social, DGPJ) e data da última verificação'], 'Nenhuma norma é publicada sem confirmação da versão em vigor.'),
    async conta() {
      const u = api.currentUser();
      if (api.isDemo()) return `<section class="panel"><h2>Conta de demonstração</h2><p>Na demonstração não há conta real. Cria uma conta gratuita para guardares os teus dados.</p><button class="btn btn-primary" data-action="open-register">Criar conta</button></section>`;
      const hist = await api.history(30);
      const opLabel = { registo: 'Registo', login: 'Entrada', logout: 'Saída', 'perfil.alterado': 'Dados pessoais alterados', 'consentimento_ia.dado': 'Consentimento IA dado', 'consentimento_ia.retirado': 'Consentimento IA retirado', 'palavra_passe.alterada': 'Palavra-passe alterada', exportacao: 'Exportação de dados' };
      const planName = { gratuito: 'Gratuito', individual: 'Individual', empresarial: 'Empresarial' }[u.plan] || u.plan;
      return `<section class="panel"><h2>Dados pessoais</h2>
          <form id="f-profile" class="form" novalidate>
            ${auth.personalFields(u)}
            <div class="field"><label>Email</label><input value="${util.esc(u.email)}" disabled></div>
            <p class="fine">Plano: <strong>${util.esc(planName)}</strong>${u.plan_valid_until ? ' · válido até ' + util.fmtDate(u.plan_valid_until) : ''} · Conta criada em ${util.fmtDate(u.created_at)}</p>
            <button class="btn btn-primary" type="submit">Guardar alterações</button>
            <button class="btn btn-ghost" type="button" data-action="change-password">Alterar palavra-passe</button>
          </form></section>
        <section class="panel"><h2>Consentimentos</h2>
          <p><strong>Tratamento de dados para prestar o serviço:</strong> aceite em ${util.fmtDateTime(u.consent_rgpd_at)}. Para o retirar, elimina a conta.</p>
          <label class="check"><input type="checkbox" id="ai-consent" ${u.consent_ai_at ? 'checked' : ''}><span>Autorizo o envio dos documentos que eu escolher para análise automática pelo Google Gemini (Google LLC), em regime pago que não usa os dados para treino. Posso retirar esta autorização a qualquer momento.</span></label>
          ${u.consent_ai_at ? `<p class="fine">Autorizado em ${util.fmtDateTime(u.consent_ai_at)}.</p>` : '<p class="fine">Sem esta autorização, a análise de documentos não fica disponível.</p>'}
        </section>
        <section class="panel"><h2>Histórico de atividade</h2>
          ${hist.length ? `<div class="table-scroll"><table><thead><tr><th>Data</th><th>Operação</th></tr></thead><tbody>${hist.map(h => `<tr><td>${util.fmtDateTime(h.created_at)}</td><td>${util.esc(opLabel[h.operation] || h.operation)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="empty">Sem atividade registada.</p>'}
        </section>
        <section class="panel"><h2>Os meus dados</h2>
          <p>Descarrega tudo o que guardamos sobre ti num ficheiro.</p>
          <button class="btn btn-secondary" data-action="export-data">Exportar os meus dados (JSON)</button>
          <hr style="border:0;border-top:1px solid var(--grey-100);margin:1.4rem 0">
          <h3>Eliminar conta</h3>
          <p>Apaga definitivamente a conta, as dívidas, os documentos e as análises. Não é possível recuperar.</p>
          <button class="btn btn-ghost" style="color:var(--urg);border-color:var(--urg)" data-action="delete-account">Eliminar a minha conta</button>
        </section>`;
    }
  };

  const bindView = {
    conta() {
      const f = $('#f-profile'); if (!f) return;
      f.addEventListener('submit', async ev => {
        ev.preventDefault(); const btn = $('button[type=submit]', f);
        const v = auth.validatePersonal(f); if (!v) return;
        ui.busy(btn, true, 'A guardar…');
        try { await api.updateProfile({ name: v.name, phone: v.phone, account_type: v.type }); ui.toast('Dados guardados.', 'ok'); route(); }
        catch (e) { ui.error(e); } finally { ui.busy(btn, false); }
      });
      $('#ai-consent').addEventListener('change', async ev => {
        const on = ev.target.checked; ev.target.disabled = true;
        try { await api.setAIConsent(on); ui.toast(on ? 'Autorização registada.' : 'Autorização retirada.', 'ok'); route(); }
        catch (e) { ev.target.checked = !on; ev.target.disabled = false; ui.error(e); }
      });
    }
  };

  /* ---------------- páginas legais (rascunho) ---------------- */
  const legalPages = {
    privacidade: `<h1>Política de privacidade</h1>
      <div class="draft">Rascunho técnico. Tem de ser revisto por jurista e completado com a identificação do responsável pelo tratamento antes de publicar.</div>
      <h2>Responsável pelo tratamento</h2><p>${util.esc(cfg.CONTACT.ENTITY) || '[Denominação, NIF e morada da entidade responsável — a preencher]'}</p>
      <h2>Dados tratados</h2><p>Identificação e contacto; dados financeiros que introduzes (dívidas, rendimentos, despesas); documentos que carregas e os resultados das análises; registos de atividade da conta.</p>
      <h2>Finalidades e fundamento</h2><p>Prestar o serviço que pedes (execução de contrato); cumprir obrigações legais; segurança da plataforma (interesse legítimo). Não usamos os teus dados para publicidade nem os vendemos.</p>
      <h2>Subcontratantes</h2><p>Supabase (alojamento da base de dados e ficheiros, região UE – Zurique); Google (análise de documentos por IA através da Gemini API em regime pago, que não usa os dados para treinar modelos, apenas quando autorizas); GitHub (alojamento da interface, sem dados pessoais).</p>
      <h2>Conservação</h2><p>Documentos: eliminados automaticamente após o prazo definido [a fixar]. Conta: até à sua eliminação, salvo obrigações legais.</p>
      <h2>Direitos</h2><p>Acesso, retificação, apagamento, limitação, portabilidade e oposição, diretamente em “A minha conta” (exportação e eliminação) ou por contacto. Podes apresentar reclamação à CNPD.</p>`,
    termos: `<h1>Termos de utilização</h1>
      <div class="draft">Rascunho técnico. Tem de ser revisto por jurista antes de publicar.</div>
      <p>A DívidaClara é uma ferramenta de informação e organização. Não presta consulta jurídica, fiscal ou financeira, nem representa utilizadores perante credores, tribunais ou entidades públicas.</p>
      <p>As análises automáticas podem conter erros. O utilizador deve confirmar a informação junto da entidade emissora ou de profissional habilitado.</p>
      <p>Não garantimos a redução, anulação ou extinção de dívidas.</p>`
  };

  /* ---------------- router ---------------- */
  function showOnly(id) { ['public', 'legal', 'app'].forEach(x => { $('#' + x).hidden = x !== id; }); }
  let routeSeq = 0;
  async function route() {
    const h = location.hash, seq = ++routeSeq;
    if (!h.startsWith('#/')) { showOnly('public'); return; }
    const parts = h.slice(2).split('/');
    if (legalPages[parts[0]]) { showOnly('legal'); $('#legal').innerHTML = `<p><a href="#/">← Voltar</a></p>` + legalPages[parts[0]]; window.scrollTo(0, 0); return; }
    if (parts[0] !== 'app') { showOnly('public'); return; }

    const user = api.currentUser();
    if (!user) {
      history.replaceState(null, '', location.pathname); showOnly('public');
      if (api.hasSession()) auth.activationForm(); else auth.loginForm('Entra para aceder à tua área.');
      return;
    }
    const key = views[parts[1]] ? parts[1] : 'inicio';
    showOnly('app');
    $('#app-nav').innerHTML = MENU.map(([k, ico, label]) => `<a href="#/app/${k}" class="${k === key ? 'active' : ''}"><span class="ico">${ico}</span>${label}</a>`).join('');
    $('#app-title').textContent = MENU.find(m => m[0] === key)[2];
    $('#demo-flag').hidden = !api.isDemo();
    $('#sidebar').classList.remove('open');
    $('#app-view').innerHTML = '<p class="empty">A carregar…</p>';
    try {
      const html = await views[key]();
      if (seq !== routeSeq) return;
      $('#app-view').innerHTML = html;
      if (bindView[key]) bindView[key]();
    } catch (e) {
      if (seq !== routeSeq) return;
      $('#app-view').innerHTML = `<div class="alert urg">Não foi possível carregar esta página. ${util.esc(e.message || '')}</div>`;
    }
    $('#app-view').focus(); window.scrollTo(0, 0);
  }

  /* ---------------- ações ---------------- */
  const actions = {
    'toggle-nav'(btn) { const n = $('#site-nav'); n.classList.toggle('open'); btn.setAttribute('aria-expanded', n.classList.contains('open')); },
    'toggle-sidebar'(btn) { const s = $('#sidebar'); s.classList.toggle('open'); btn.setAttribute('aria-expanded', s.classList.contains('open')); },
    'open-login'() { auth.loginForm(); },
    'open-register'() { auth.registerForm(); },
    'open-reset'() { auth.resetForm(); },
    'close-modal'() { ui.closeModal(); },
    'change-password'() { auth.newPasswordForm('Alterar palavra-passe'); },
    'goto-analyse'() {
      if (api.currentUser()) location.hash = '#/app/analisar';
      else auth.registerForm('Para analisar um documento precisas de uma conta. O plano gratuito inclui uma análise de demonstração.');
    },
    'choose-plan'(btn) {
      if (btn.dataset.plan === 'gratuito') return auth.registerForm();
      ui.openModal(`<h2 id="modal-title">Pagamentos ainda não ativos</h2><p>As subscrições pagas abrem numa fase posterior, com pagamento seguro por Stripe ou Mollie. Até lá podes usar o plano gratuito.</p><button class="btn btn-primary btn-block" data-action="open-register">Criar conta gratuita</button>`);
    },
    'start-demo'() { api.startDemo(); ui.closeModal(); location.hash = '#/app/inicio'; ui.toast('Modo demonstração: nada do que vês é real nem fica guardado.'); },
    async 'logout'() { ui.closeModal(); await api.logout(); history.replaceState(null, '', location.pathname); showOnly('public'); ui.toast('Sessão terminada.'); },
    async 'export-data'(btn) {
      ui.busy(btn, true, 'A preparar…');
      try { util.download('dividaclara-os-meus-dados.json', await api.exportData()); } catch (e) { ui.error(e); } finally { ui.busy(btn, false); }
    },
    'delete-account'() {
      ui.openModal(`<h2 id="modal-title">Eliminar conta</h2>
        <p>Vais apagar <strong>definitivamente</strong> a conta, as dívidas, os documentos, as análises e o histórico. Esta ação não pode ser anulada.</p>
        <p class="fine">Se quiseres guardar uma cópia, exporta primeiro os teus dados.</p>
        <form id="f-del" class="form" novalidate><div class="field"><label for="del-c">Escreve ELIMINAR para confirmar</label><input id="del-c" name="c" autocomplete="off"></div>
        <button class="btn btn-primary btn-block" style="background:var(--urg)" type="submit">Eliminar definitivamente</button></form>`);
      $('#f-del').addEventListener('submit', async ev => {
        ev.preventDefault(); const f = ev.target, btn = $('button', f);
        if (f.c.value.trim() !== 'ELIMINAR') return ui.setFieldError(f.c, 'Escreve ELIMINAR em maiúsculas.');
        ui.busy(btn, true, 'A eliminar…');
        try { await api.deleteAccount(); ui.closeModal(); history.replaceState(null, '', location.pathname); showOnly('public'); ui.toast('Conta eliminada.', 'ok'); }
        catch (e) { ui.error(e); ui.busy(btn, false); }
      });
    }
  };

  document.addEventListener('click', ev => {
    const s = ev.target.closest('[data-scroll]');
    if (s) {
      ev.preventDefault();
      const go = () => { const t = document.querySelector(s.getAttribute('href')); if (t) t.scrollIntoView({ behavior: 'smooth' }); };
      if (location.hash.startsWith('#/')) { history.pushState(null, '', location.pathname); showOnly('public'); setTimeout(go, 30); } else go();
      $('#site-nav').classList.remove('open');
      return;
    }
    const b = ev.target.closest('[data-action]');
    if (b && actions[b.dataset.action]) { ev.preventDefault(); actions[b.dataset.action](b); }
  });
  document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && !$('#modal').hidden) ui.closeModal(); });
  $('#modal').addEventListener('click', ev => { if (ev.target.id === 'modal') ui.closeModal(); });
  window.addEventListener('hashchange', route);

  /* ---------------- arranque ---------------- */
  (async function boot() {
    pub.init();
    try { await api.init(); } catch (e) { console.error(e); }
    api.onAuth(ev => {
      if (ev === 'PASSWORD_RECOVERY') { auth.newPasswordForm(); return; }
      if (ev === 'SIGNED_IN' && !location.hash.startsWith('#/app') && $('#modal').hidden) {
        // regresso pela ligação de confirmação de email
        if (api.currentUser()) location.hash = '#/app/inicio'; else if (api.hasSession()) auth.activationForm();
      }
    });
    route();
  })();

  window.DC.util = util; window.DC.ui = ui;
})();
