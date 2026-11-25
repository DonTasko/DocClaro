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
    monthLabel(m) { const x = new Date(m + (String(m).length === 10 ? 'T00:00:00' : '')); return ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'][x.getMonth()] + '/' + String(x.getFullYear()).slice(2); },
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
        { kind: 'despesa', category: 'Renda da casa', monthly_value: 450 }, { kind: 'despesa', category: 'Alimentação', monthly_value: 260 },
        { kind: 'despesa', category: 'Água', monthly_value: 25 }, { kind: 'despesa', category: 'Eletricidade', monthly_value: 50 }, { kind: 'despesa', category: 'Gás', monthly_value: 20 },
        { kind: 'despesa', category: 'Telecomunicações', monthly_value: 38 }, { kind: 'despesa', category: 'Transportes', monthly_value: 70 }
      ],
      history: [
        { month: d(-150).slice(0, 8) + '01', total: 19840 }, { month: d(-120).slice(0, 8) + '01', total: 19610 }, { month: d(-90).slice(0, 8) + '01', total: 19470 },
        { month: d(-60).slice(0, 8) + '01', total: 19220 }, { month: d(-30).slice(0, 8) + '01', total: 19050 }, { month: d(0).slice(0, 8) + '01', total: 18901.95 }
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
    renderStats(st) {
      if (!st || !Array.isArray(st.items)) return;
      $('#stats').innerHTML = st.items.map(i => `<figure class="stat">
          <div class="stat-val">${util.esc(i.value)}</div>
          <figcaption><span class="stat-label">${util.esc(i.label)}</span>
          <span class="stat-src">Fonte: ${i.url ? `<a href="${util.esc(i.url)}" target="_blank" rel="noopener">${util.esc(i.source)}</a>` : util.esc(i.source)} · ${util.esc(i.period)}</span></figcaption>
        </figure>`).join('');
      $('#stats-updated').textContent = st.updated ? 'Dados recolhidos em ' + util.fmtDate(st.updated) + '. Os números são atualizados quando as entidades publicam novos dados.' : '';
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
      pub.renderStats(cfg.STATS);
      pub.renderContact();
      $('#footer-version').textContent = `© ${new Date().getFullYear()} DívidaClara · versão ${cfg.VERSION}`;
      $('#demo-link').hidden = !cfg.DEMO_MODE;
      $('#contact-form').addEventListener('submit', pub.onContact);
      if (api.isConfigured()) {
        try { const p = await api.publicPlans(); if (Array.isArray(p) && p.length) pub.renderPlans(p); } catch (e) { /* mantém preços locais */ }
        try { const st = await api.publicStats(); if (st) pub.renderStats(st); } catch (e) { /* mantém números locais */ }
      }
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

  /* ---------------- relatório A–L ---------------- */
  const report = {
    labels: { informativo: 'Informativo', atencao: 'Atenção', urgente: 'Urgente' },
    natureza: { carta_informativa: 'Carta informativa', notificacao_formal: 'Notificação formal', judicial_ou_execucao: 'Judicial ou execução', contrato: 'Contrato', fiscal_ou_seguranca_social: 'Finanças ou Segurança Social', outro: 'Outro', indeterminada: 'Não foi possível determinar' },
    badge(p) { return `<span class="badge ${{ urgente: 'badge-urg', atencao: 'badge-warn', informativo: 'badge-info' }[p] || 'badge-info'}">${report.labels[p] || '—'}</span>`; },
    list(a, empty = 'Nada identificado.') { return a && a.length ? `<ul>${a.map(x => `<li>${util.esc(x)}</li>`).join('')}</ul>` : `<p class="empty">${empty}</p>`; },
    txt(s, empty = 'Não consta do documento.') { return s ? `<p>${util.esc(s)}</p>` : `<p class="empty">${empty}</p>`; },
    sec(l, title, body) { return `<div class="rsec"><h3><span class="l">${l}</span>${title}</h3>${body}</div>`; },
    render(r, meta) {
      const p = r.prioridade || 'atencao';
      const head = { urgente: '⚠️ Urgente: pode haver prazos curtos', atencao: '📌 Atenção: este documento pede uma resposta ou análise', informativo: 'ℹ️ Informativo: sem urgência aparente' }[p];
      const v = r.valor_reclamado || {};
      const e = r.entidade_emissora || {};
      const ap = r.acompanhamento_profissional || {};
      return `<article class="report">
        <div class="report-head ${p}"><div><strong>${head}</strong>${util.esc(r.motivo_prioridade || '')}
          ${p === 'urgente' ? '<p style="margin:.5rem 0 0"><strong>Confirma já a situação com um advogado ou solicitador.</strong> Se não tens meios para pagar, podes pedir apoio judiciário na Segurança Social.</p>' : ''}</div></div>
        <div class="report-body">
          ${r.legivel === false ? '<div class="alert warn" style="margin-top:.8rem">O documento não ficou totalmente legível. Tenta uma fotografia com mais luz, de frente e sem cortes.</div>' : ''}
          ${meta ? `<p class="fine" style="margin-top:.8rem">${util.esc(meta)}</p>` : ''}
          ${report.sec('A', 'Identificação do documento', `<p>${util.esc(r.tipo_documento || '—')} · <span class="fine">${report.natureza[r.natureza] || ''}</span></p>`)}
          ${report.sec('B', 'Entidade emissora', `<p>${util.esc(e.nome || 'Não identificada')}${e.nif ? ' · NIF ' + util.esc(e.nif) : ''}</p>${e.contacto ? `<p class="fine">${util.esc(e.contacto)}</p>` : ''}`)}
          ${report.sec('C', 'Destinatário', report.txt(r.destinatario))}
          ${report.sec('D', 'Valor reclamado', `${v.montante != null ? `<p><strong>${util.fmtEUR(v.montante)}</strong></p>` : '<p class="empty">Nenhum valor identificado com segurança.</p>'}${v.texto_original ? `<p class="quote">“${util.esc(v.texto_original)}”</p>` : ''}${v.decomposicao && v.decomposicao.length ? report.list(v.decomposicao) : ''}`)}
          ${report.sec('E', 'Origem da dívida', report.txt(r.origem_divida))}
          ${report.sec('F', 'Datas relevantes', r.datas_relevantes && r.datas_relevantes.length ? `<ul>${r.datas_relevantes.map(d => `<li><strong>${util.esc(d.data)}</strong> — ${util.esc(d.significado)}</li>`).join('')}</ul>` : '<p class="empty">Nenhuma data identificada.</p>')}
          ${report.sec('G', 'Prazo mencionado no documento', r.prazo && r.prazo.existe ? `${r.prazo.texto_original ? `<p class="quote">“${util.esc(r.prazo.texto_original)}”</p>` : ''}<p>${util.esc(r.prazo.explicacao || '')}</p><p class="fine">Confirma a contagem do prazo com um profissional ou com a entidade.</p>` : '<p class="empty">Não foi identificado nenhum prazo.</p>')}
          ${report.sec('H', 'Referências legais e processuais', `<p class="fine">Só o que está expressamente escrito no documento.</p>${report.list(r.referencias_legais, 'Nenhuma norma citada.')}${r.referencias_processuais && r.referencias_processuais.length ? '<p style="margin-top:.4rem"><strong>Referências processuais</strong></p>' + report.list(r.referencias_processuais) : ''}`)}
          ${report.sec('I', 'Explicação em linguagem simples', report.txt(r.explicacao_simples, '—') + `<div class="three"><div><h4>O que o documento diz</h4>${report.list(r.factos)}</div><div><h4>Interpretações possíveis</h4>${report.list(r.interpretacoes)}</div><div><h4>Não foi possível confirmar</h4>${report.list(r.nao_confirmado)}</div></div>`)}
          ${report.sec('J', 'Questões que deves confirmar', report.list(r.questoes_a_confirmar))}
          ${report.sec('K', 'Possíveis passos seguintes', report.list(r.passos_possiveis) + '<p class="fine">São possibilidades, não garantias de resultado.</p>')}
          ${report.sec('L', 'Acompanhamento profissional', ap.necessario ? `<p><strong>Recomendado: ${util.esc(ap.quem || 'profissional habilitado')}</strong></p><p>${util.esc(ap.motivo || '')}</p><a class="btn btn-secondary btn-sm" href="#/app/apoio">Pedir apoio profissional</a>` : `<p>${util.esc(ap.motivo || 'Não parece necessário de imediato, mas podes sempre pedir ajuda.')}</p>`)}
          <p class="fine" style="margin-top:1rem">Análise automática e informativa, feita por inteligência artificial. Pode conter erros. Não é consulta jurídica. Confirma sempre no documento original.</p>
        </div></article>`;
    },
    sample: {
      legivel: true, tipo_documento: 'Carta de cobrança (exemplo fictício)', natureza: 'notificacao_formal',
      entidade_emissora: { nome: 'Cobranças Demonstração, Lda', nif: '', contacto: 'Linha de apoio indicada na carta' },
      destinatario: 'Utilizador de demonstração',
      valor_reclamado: { montante: 431.10, texto_original: 'o montante em dívida de 431,10 €', decomposicao: ['Capital: 389,90 €', 'Juros e despesas: 41,20 €'] },
      origem_divida: 'Faturas de telecomunicações não pagas, segundo a carta.',
      datas_relevantes: [{ data: '02/10/2026', significado: 'Data da carta' }],
      prazo: { existe: true, texto_original: 'no prazo de 15 dias a contar da receção desta carta', explicacao: 'A empresa pede pagamento ou contacto em 15 dias a partir do dia em que recebeste a carta.' },
      referencias_processuais: [], referencias_legais: [],
      explicacao_simples: 'É uma carta de uma empresa de cobranças que diz que tens faturas por pagar. Ainda não é um processo em tribunal. Pede que pagues ou que entres em contacto para acordar um plano.',
      factos: ['A empresa diz agir em nome do operador de telecomunicações', 'Valor reclamado: 431,10 €', 'Prazo de 15 dias'],
      interpretacoes: ['Se não responderes, a empresa pode avançar com outras diligências, como uma injunção'],
      nao_confirmado: ['Data exata em que recebeste a carta', 'Período das faturas em causa'],
      questoes_a_confirmar: ['Reconheces estas faturas?', 'Já pagaste alguma parte?', 'Pede o detalhe das faturas e do cálculo dos juros'],
      passos_possiveis: ['Pedir por escrito o detalhe da dívida', 'Propor um plano de pagamento que caiba no teu orçamento', 'Guardar cópia de toda a correspondência'],
      acompanhamento_profissional: { necessario: false, quem: '', motivo: 'Para já parece possível tratar diretamente com a empresa. Se não reconheceres a dívida, pede ajuda.' },
      prioridade: 'atencao', motivo_prioridade: 'Pede resposta ou pagamento num prazo de 15 dias.'
    }
  };
  let lastAnalyses = [];

  // Reduz fotografias grandes do telemóvel antes de enviar (mais rápido e dentro do limite)
  async function shrinkImage(file) {
    if (!/^image\//.test(file.type)) return file;
    let bmp;
    try { bmp = await createImageBitmap(file); } catch (e) { return file; }
    const max = 2400, scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size < 2.5e6 && (file.type === 'image/jpeg' || file.type === 'image/png')) return file;
    const c = document.createElement('canvas'); c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.85));
    return new File([blob], (file.name || 'fotografia').replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
  }

  /* ---------------- gráficos SVG (uma série, cor da marca, tooltip + tabela) ---------------- */
  const PRESTACOES = 'Prestações de crédito';
  const BUDGET = [
    ['rendimento', 'Salário líquido'], ['rendimento', 'Outros rendimentos'],
    ['despesa', 'Renda da casa', 'essencial'], ['despesa', 'Alimentação', 'essencial'], ['despesa', 'Água', 'essencial'],
    ['despesa', 'Eletricidade', 'essencial'], ['despesa', 'Gás', 'essencial'], ['despesa', 'Saúde', 'essencial'],
    ['despesa', 'Despesas familiares', 'essencial'], ['despesa', 'Telecomunicações', 'reduzivel'],
    ['despesa', 'Transportes', 'reduzivel'], ['despesa', 'Outras despesas', 'reduzivel']
  ];
  const slug = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  let lastDebts = [];

  const charts = {
    color: '#176B9D',
    table(rows, fmt, h1 = 'Item', h2 = 'Valor') {
      return `<details class="chart-table"><summary>Ver como tabela</summary><table><thead><tr><th>${h1}</th><th class="num">${h2}</th></tr></thead><tbody>${rows.map(r => `<tr><td>${util.esc(r.label)}</td><td class="num">${fmt(r.value)}</td></tr>`).join('')}</tbody></table></details>`;
    },
    hbar(rows, fmt, empty = 'Sem dados.', keepOrder = false) {
      if (!rows.length) return `<p class="empty">${empty}</p>`;
      if (!keepOrder) rows = [...rows].sort((a, b) => b.value - a.value);
      const max = Math.max(...rows.map(r => Math.abs(r.value))) || 1;
      const bars = rows.map(r => `<div class="hb-row" data-tip="${util.esc(r.label)}: ${util.esc(fmt(r.value))}" tabindex="0">
          <div class="hb-label">${util.esc(r.label)}</div>
          <div class="hb-track"><div class="hb-bar" style="width:${Math.max(1.5, Math.abs(r.value) / max * 100)}%;background:${r.value < 0 ? '#B42318' : charts.color}"></div></div>
          <div class="hb-val">${fmt(r.value)}</div></div>`).join('');
      return `<div class="hbar" role="img" aria-label="${util.esc(rows.map(r => r.label + ' ' + fmt(r.value)).join('; '))}">${bars}</div>` + charts.table(rows, fmt);
    },
    line(pts, fmt) {
      const W = 560, H = 200, L = 28, R = 28, T = 14, B = 26;
      const max = Math.max(...pts.map(p => p.value)) * 1.1 || 1;
      const x = i => L + (pts.length === 1 ? (W - L - R) / 2 : i * (W - L - R) / (pts.length - 1));
      const y = v => T + (H - T - B) * (1 - v / max);
      const path = pts.map((p, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p.value).toFixed(1)).join(' ');
      const grid = [0.25, 0.5, 0.75, 1].map(f => `<line x1="${L}" x2="${W - R}" y1="${y(max * f / 1.1)}" y2="${y(max * f / 1.1)}" stroke="#EDF1F5"/>`).join('');
      const dots = pts.map((p, i) => `<g class="ln-pt" data-tip="${util.esc(p.label)}: ${util.esc(fmt(p.value))}" tabindex="0"><circle cx="${x(i)}" cy="${y(p.value)}" r="14" fill="transparent"/><circle cx="${x(i)}" cy="${y(p.value)}" r="4.5" fill="${charts.color}" stroke="#fff" stroke-width="2"/></g>`).join('');
      const labels = pts.map((p, i) => (pts.length <= 8 || i % Math.ceil(pts.length / 8) === 0) ? `<text x="${x(i)}" y="${H - 6}" text-anchor="middle" font-size="11" fill="#6B7A8C">${util.esc(p.label)}</text>` : '').join('');
      return `<svg viewBox="0 0 ${W} ${H}" class="line-chart" role="img" aria-label="Evolução: ${util.esc(pts.map(p => p.label + ' ' + fmt(p.value)).join('; '))}">${grid}<line x1="${L}" x2="${W - R}" y1="${H - B}" y2="${H - B}" stroke="#DDE3EA"/><path d="${path}" fill="none" stroke="${charts.color}" stroke-width="2" stroke-linejoin="round"/>${dots}${labels}</svg>` + charts.table(pts, fmt, 'Mês', 'Total');
    }
  };
  // tooltip partilhado
  (function () {
    const tip = document.createElement('div'); tip.className = 'chart-tip'; tip.hidden = true; document.body.appendChild(tip);
    const show = (el, x, y) => { tip.textContent = el.dataset.tip; tip.hidden = false; tip.style.left = Math.min(x + 12, innerWidth - tip.offsetWidth - 8) + 'px'; tip.style.top = (y - 36) + 'px'; };
    document.addEventListener('mousemove', e => { const el = e.target.closest('[data-tip]'); if (el) show(el, e.clientX, e.clientY); else tip.hidden = true; });
    document.addEventListener('focusin', e => { const el = e.target.closest && e.target.closest('[data-tip]'); if (el) { const r = el.getBoundingClientRect(); show(el, r.left, r.top); } });
    document.addEventListener('focusout', () => { tip.hidden = true; });
  })();

  /* ---------------- simulador: cálculos ---------------- */
  const sim = {
    num(s) { const n = parseFloat(String(s || '').replace(/\s|€/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')); return Number.isFinite(n) && n > 0 ? n : 0; },
    read() {
      const v = { income: 0, essential: 0, reducible: 0, financial: 0, items: [] };
      document.querySelectorAll('#f-sim input[data-cat]').forEach(i => {
        const n = sim.num(i.value); v.items.push({ kind: i.dataset.kind, category: i.dataset.cat, value: n });
        if (i.dataset.kind === 'rendimento') v.income += n;
        else if (i.dataset.cls === 'financeira') v.financial += n;
        else if (i.dataset.cls === 'reduzivel') v.reducible += n;
        else v.essential += n;
      });
      v.red = Math.min(80, Math.max(0, sim.num($('#sim-red').value)));
      v.target = sim.num($('#sim-new').value);
      return v;
    },
    // Margem de segurança: nunca se sugere usar o último euro.
    margin: inc => Math.max(50, inc * 0.05),
    scenario(name, income, essential, reducible, financial) {
      const balance = income - essential - reducible - financial;
      const effort = income ? financial / income * 100 : 0;
      const capacity = Math.max(0, balance - sim.margin(income));
      return { name, income, essential, reducible, financial, balance, effort, capacity };
    },
    compute(v) {
      const s1 = sim.scenario('Situação atual', v.income, v.essential, v.reducible, v.financial);
      const reduced = v.reducible * (1 - v.red / 100);
      const s2 = sim.scenario('Redução de despesas', v.income, v.essential, reduced, v.financial);
      // Teto seguro para prestações: o que sobra depois do essencial, das restantes despesas e da margem.
      const safeMax = Math.max(0, v.income - v.essential - reduced - sim.margin(v.income));
      const proposed = v.target > 0 ? v.target : Math.min(v.financial, safeMax);
      const s3 = sim.scenario('Reorganização de pagamentos', v.income, v.essential, reduced, proposed);
      return { s: [s1, s2, s3], safeMax, proposed, overTarget: v.target > safeMax, reduced };
    },
    render(v) {
      if (!v.income) return `<section class="panel"><p class="empty">Indica pelo menos um rendimento para ver os resultados.</p></section>`;
      const r = sim.compute(v), [a, b, c] = r.s;
      const pct = n => util.num.format(n) + ' %';
      const row = (label, f, cls = '') => `<tr class="${cls}"><th>${label}</th>${r.s.map(s => `<td class="num">${f(s)}</td>`).join('')}</tr>`;
      const warn = [];
      if (a.balance < 0) warn.push(`<div class="alert urg">Neste momento gastas mais ${util.fmtEUR(-a.balance)} do que recebes por mês. Mantém o essencial (casa, alimentação, saúde, energia) pago primeiro e fala com os credores antes de falhares prestações.</div>`);
      if (r.overTarget) warn.push(`<div class="alert urg">A prestação de ${util.fmtEUR(v.target)} que indicaste põe em causa despesas essenciais. O valor máximo prudente com estes números é ${util.fmtEUR(r.safeMax)} por mês.</div>`);
      if (v.essential === 0) warn.push(`<div class="alert warn">Não indicaste despesas essenciais. Sem elas, os resultados parecem melhores do que a realidade.</div>`);
      return `${warn.join('')}
        <section class="panel"><h2>Resultados</h2>
          <div class="table-scroll"><table class="sim-table"><thead><tr><th></th>${r.s.map(s => `<th class="num">${s.name}</th>`).join('')}</tr></thead><tbody>
            ${row('Rendimento mensal total', s => util.fmtEUR(s.income))}
            ${row('Despesas essenciais', s => util.fmtEUR(s.essential))}
            ${row('Outras despesas', s => util.fmtEUR(s.reducible))}
            ${row('Encargos financeiros', s => util.fmtEUR(s.financial))}
            ${row('Saldo disponível', s => `<strong class="${s.balance < 0 ? 'neg-txt' : ''}">${util.fmtEUR(s.balance)}</strong>`)}
            ${row('Taxa de esforço', s => `<span class="${s.effort > 35 ? 'neg-txt' : ''}">${pct(s.effort)}</span>`)}
            ${row('Capacidade estimada para pagamentos adicionais', s => util.fmtEUR(s.capacity))}
          </tbody></table></div>
          <p class="fine">Taxa de esforço = encargos financeiros ÷ rendimento. A capacidade adicional já desconta uma margem de segurança de ${util.fmtEUR(sim.margin(v.income))} (5 % do rendimento, mínimo 50 €).</p>
        </section>
        <div class="two">
          <section class="panel"><h2>Saldo disponível por cenário</h2>${charts.hbar(r.s.map(s => ({ label: s.name, value: s.balance })), util.fmtEUR, '', true)}<p class="fine">A vermelho: saldo negativo (gastas mais do que recebes).</p></section>
          <section class="panel"><h2>Como ler os cenários</h2>
            <p><strong>Redução de despesas:</strong> corta ${pct(v.red)} só nas despesas reduzíveis (telecomunicações, transportes, outras). Poupa ${util.fmtEUR(v.reducible - r.reduced)} por mês. As despesas essenciais não são tocadas.</p>
            <p><strong>Reorganização de pagamentos:</strong> ${v.target ? `usa a prestação total que indicaste, ${util.fmtEUR(v.target)}.` : `usa ${util.fmtEUR(r.proposed)}, o menor valor entre as prestações atuais e o máximo prudente (${util.fmtEUR(r.safeMax)}).`} ${r.overTarget ? `<strong class="neg-txt">Este valor é demasiado alto para o teu orçamento.</strong> Não proponhas mais de ${util.fmtEUR(r.safeMax)} por mês.` : 'É o valor de referência para propores aos credores um plano que consigas cumprir.'}</p>
            <p class="fine">Simulação informativa. Não considera juros futuros nem garante aceitação dos credores.</p>
          </section>
        </div>`;
    }
  };

  const views = {
    async inicio() {
      const u = api.currentUser();
      const d = await getData();
      const active = d.debts.filter(x => x.status !== 'Liquidada');
      const totDebt = active.reduce((s, x) => s + Number(x.total), 0);
      const creditors = new Set(active.map(x => x.creditor.trim().toLowerCase())).size;
      const monthly = active.reduce((s, x) => s + Number(x.monthly_payment), 0);
      const inc = d.ie.filter(x => x.kind === 'rendimento').reduce((s, x) => s + Number(x.monthly_value), 0);
      const exp = d.ie.filter(x => x.kind === 'despesa' && x.category !== 'Prestações de crédito').reduce((s, x) => s + Number(x.monthly_value), 0);
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
      return `${empty ? `<section class="panel"><h2>Olá, ${util.esc(u.name)}</h2><p>Começa por registar as tuas dívidas e os teus rendimentos e despesas. Com isso, este painel mostra o total em dívida, o saldo do mês e os alertas.</p>
          <div class="row-actions"><a class="btn btn-primary" href="#/app/dividas">Registar dívidas</a><a class="btn btn-secondary" href="#/app/simulador">Indicar rendimentos e despesas</a></div></section>` : ''}
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
      const demoMode = api.isDemo();
      const [debts, hist] = demoMode ? [demo.debts.map((x, i) => ({ ...x, id: 'demo' + i })), demo.history] : await Promise.all([api.debts(), api.debtHistory()]);
      lastDebts = debts;
      const active = debts.filter(x => x.status !== 'Liquidada');
      const sum = (a, k) => a.reduce((s, x) => s + Number(x[k] || 0), 0);
      const overdue = active.filter(x => x.due_date && util.daysFromToday(x.due_date) < 0 || x.status === 'Em atraso');
      const group = (key, val) => { const m = new Map(); active.forEach(x => m.set(x[key], (m.get(x[key]) || 0) + Number(x[val] || 0))); return [...m].map(([label, value]) => ({ label, value })).filter(r => r.value > 0); };
      const kpis = `<div class="kpis">${kpi('Dívida total', util.fmtEUR(sum(active, 'total')))}${kpi('Credores', new Set(active.map(x => x.creditor.trim().toLowerCase())).size)}${kpi('Prestações mensais', util.fmtEUR(sum(active, 'monthly_payment')))}${kpi('Dívidas vencidas', overdue.length + ' · ' + util.fmtEUR(sum(overdue, 'total')), overdue.length > 0)}</div>`;
      const rows = debts.map(x => `<tr><td>${util.esc(x.creditor)}${x.court_case ? ' <span class="badge badge-urg">Processo</span>' : ''}${x.seizure ? ' <span class="badge badge-urg">Penhora</span>' : ''}</td><td>${util.esc(x.debt_type)}</td><td class="num">${util.fmtEUR(x.total)}</td><td class="num">${util.fmtEUR(x.monthly_payment)}</td><td>${util.fmtDate(x.due_date)}</td><td>${badgeStatus(x.status)}</td>
        <td>${demoMode ? '' : `<div class="row-actions"><button class="btn btn-ghost btn-sm" data-action="edit-debt" data-id="${x.id}">Editar</button><button class="btn btn-ghost btn-sm" data-action="delete-debt" data-id="${x.id}">Apagar</button></div>`}</td></tr>`).join('');
      const histPts = hist.map(h => ({ label: util.monthLabel(h.month), value: Number(h.total) }));
      return `${kpis}
        <section class="panel"><div class="panel-head"><h2>Dívidas registadas</h2>${demoMode ? '' : '<button class="btn btn-primary" data-action="new-debt">+ Adicionar dívida</button>'}</div>
          ${debts.length ? `<div class="table-scroll"><table><thead><tr><th>Credor</th><th>Tipo</th><th class="num">Total</th><th class="num">Prestação</th><th>Vencimento</th><th>Estado</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>` : '<p class="empty">Ainda não há dívidas registadas. Começa por adicionar a primeira.</p>'}
        </section>
        ${active.length ? `<div class="two">
          <section class="panel"><h2>Dívida por credor</h2>${charts.hbar(group('creditor', 'total'), util.fmtEUR)}</section>
          <section class="panel"><h2>Distribuição por tipo de crédito</h2>${charts.hbar(group('debt_type', 'total'), util.fmtEUR)}</section>
          <section class="panel"><h2>Prestações mensais por credor</h2>${charts.hbar(group('creditor', 'monthly_payment'), util.fmtEUR, 'Sem prestações definidas.')}</section>
          <section class="panel"><h2>Evolução do endividamento</h2>${histPts.length > 1 ? charts.line(histPts, util.fmtEUR) : '<p class="empty">O gráfico aparece a partir do segundo mês com registos. Cada mês guarda automaticamente o total em dívida.</p>' + (histPts.length ? charts.table(histPts, util.fmtEUR, 'Mês', 'Total') : '')}</section>
        </div>
        <section class="panel"><h2>Dívidas vencidas</h2>${overdue.length ? `<table><thead><tr><th>Credor</th><th>Vencimento</th><th class="num">Total</th></tr></thead><tbody>${overdue.map(x => `<tr><td>${util.esc(x.creditor)}</td><td>${util.fmtDate(x.due_date)}</td><td class="num">${util.fmtEUR(x.total)}</td></tr>`).join('')}</tbody></table>
          <p class="fine">Em dívidas vencidas, contactar o credor cedo costuma abrir mais opções de acordo. Se houver carta de tribunal ou agente de execução, fala já com advogado ou solicitador.</p>` : '<p class="empty">Nenhuma dívida vencida.</p>'}</section>` : ''}`;
    },
    async analisar() {
      if (api.isDemo()) {
        return `<div class="notice">Na demonstração não é enviado nenhum documento. Este é um exemplo fictício do relatório que recebes.</div>` + report.render(report.sample);
      }
      const u = api.currentUser();
      if (!u.consent_ai_at) {
        return `<section class="panel"><h2>Antes de começar</h2>
          <p>Para analisar um documento, o ficheiro é enviado ao <strong>Google Gemini</strong> (Google LLC), um serviço de inteligência artificial, em regime pago que não usa os teus documentos para treinar modelos.</p>
          <p>O documento fica guardado num espaço privado só teu e é apagado automaticamente ao fim do prazo de conservação. Podes apagá-lo antes, quando quiseres.</p>
          <p class="fine">A análise é automática e informativa. Não é aconselhamento jurídico e pode ter erros.</p>
          <label class="check"><input type="checkbox" id="ai-ok"><span>Autorizo o envio dos documentos que eu escolher para análise pelo Google Gemini.</span></label>
          <button class="btn btn-primary" data-action="give-ai-consent">Continuar</button></section>`;
      }
      const [debts, list] = await Promise.all([api.debtsLite(), api.analyses()]);
      return `<section class="panel"><h2>Novo documento</h2>
          <p>Fotografa a carta com boa luz e de frente, ou carrega o PDF. Uma página de cada vez funciona melhor nas fotografias.</p>
          <form id="f-doc" novalidate>
            <div class="upload-box">
              <label class="btn btn-primary btn-lg" for="doc-cam">📷 Tirar fotografia</label>
              <input id="doc-cam" type="file" accept="image/*" capture="environment">
              <label class="btn btn-secondary btn-lg" for="doc-file">📎 Escolher ficheiro</label>
              <input id="doc-file" type="file" accept="application/pdf,image/jpeg,image/png">
            </div>
            <div id="doc-chosen" class="file-chosen"></div>
            ${debts.length ? `<div class="field"><label for="doc-debt">Associar a uma dívida <span class="fine">(opcional)</span></label><select id="doc-debt"><option value="">— Nenhuma —</option>${debts.map(d => `<option value="${d.id}">${util.esc(d.creditor)}</option>`).join('')}</select></div>` : ''}
            <div class="notice">Ao carregar em “Analisar”, o documento é guardado no teu espaço privado e enviado ao Google Gemini para leitura automática.</div>
            <button class="btn btn-primary btn-lg" type="submit" id="doc-go" disabled>Analisar documento</button>
          </form>
          <div id="doc-progress"></div>
        </section>
        <div id="doc-result"></div>
        <section class="panel"><h2>Análises anteriores</h2>
          ${list.length ? `<div class="table-scroll"><table><thead><tr><th>Data</th><th>Documento</th><th>Prioridade</th><th></th></tr></thead><tbody>
            ${list.map(a => `<tr><td>${util.fmtDateTime(a.created_at)}</td><td>${util.esc((a.dc_documents && a.dc_documents.name) || a.result.tipo_documento || '—')}</td><td>${report.badge(a.priority)}</td>
              <td><div class="row-actions"><button class="btn btn-ghost btn-sm" data-action="view-analysis" data-id="${a.id}">Ver</button>${a.document_id ? `<button class="btn btn-ghost btn-sm" data-action="delete-doc" data-id="${a.document_id}">Apagar documento</button>` : ''}</div></td></tr>`).join('')}
          </tbody></table></div>` : '<p class="empty">Ainda não analisaste nenhum documento.</p>'}
        </section>`;
    },
    async simulador() {
      const demoMode = api.isDemo();
      const [saved, debts] = demoMode ? [demo.ie, demo.debts] : await Promise.all([api.budget(), api.debts()]);
      const val = cat => { const r = saved.find(x => x.category === cat); return r ? Number(r.monthly_value) : ''; };
      const debtPay = debts.filter(x => x.status !== 'Liquidada').reduce((s, x) => s + Number(x.monthly_payment || 0), 0);
      const savedPay = val(PRESTACOES);
      const field = ([kind, cat, cls]) => `<div class="field sim-f"><label for="sim-${slug(cat)}">${cat}${cls === 'reduzivel' ? ' <span class="fine">(reduzível)</span>' : ''}</label>
        <input id="sim-${slug(cat)}" data-kind="${kind}" data-cat="${util.esc(cat)}" data-cls="${cls || ''}" inputmode="decimal" placeholder="0,00" value="${val(cat) === '' ? '' : String(val(cat)).replace('.', ',')}"></div>`;
      return `<section class="panel"><h2>Os teus valores mensais</h2>
          <p>Preenche o que souberes. Valores em euros por mês. Os cálculos atualizam à medida que escreves.</p>
          <form id="f-sim" novalidate>
            <h3>Rendimentos</h3><div class="sim-grid">${BUDGET.filter(b => b[0] === 'rendimento').map(field).join('')}</div>
            <h3>Despesas</h3><div class="sim-grid">${BUDGET.filter(b => b[0] === 'despesa').map(field).join('')}</div>
            <h3>Encargos financeiros</h3><div class="sim-grid">
              ${field(['despesa', PRESTACOES, 'financeira']).replace(`value=""`, `value="${String(savedPay !== '' ? savedPay : (debtPay || '')).replace('.', ',')}"`)}
            </div>
            ${debtPay ? `<p class="fine">As tuas dívidas registadas somam ${util.fmtEUR(debtPay)} de prestações por mês.</p>` : ''}
            <h3>Cenários</h3><div class="sim-grid">
              <div class="field sim-f"><label for="sim-red">Redução nas despesas reduzíveis (%)</label><input id="sim-red" inputmode="numeric" value="15"></div>
              <div class="field sim-f"><label for="sim-new">Prestação total que queres propor aos credores (€/mês)</label><input id="sim-new" inputmode="decimal" placeholder="automático"></div>
            </div>
            ${demoMode ? '' : '<button class="btn btn-primary" type="submit">Guardar os meus valores</button>'}
          </form></section>
        <div id="sim-out"></div>`;
    },
    insolvencia: () => phaseCard(5, ['O que é a insolvência de pessoa singular e quando pode ser ponderada', 'Consequências, exoneração do passivo restante e plano de pagamentos', 'Responsabilidades do devedor e documentação habitual', 'Diferença entre insolvência e processo executivo', 'Questionário de organização com relatório preliminar'], 'Conteúdo a redigir a partir do texto em vigor do CIRE no Diário da República, com data de atualização. A decisão de avançar deve ser sempre acompanhada por profissional habilitado.'),
    apoio: () => phaseCard(5, ['Pedido de contacto com advogado, solicitador, contabilista certificado ou entidade de apoio ao sobre-endividamento', 'Autorização expressa e revogável para partilhar documentos com o profissional escolhido', 'Distinção clara entre informação automática e serviço prestado por profissional'], 'Os dados nunca são vendidos. Parcerias remuneradas, se existirem, serão identificadas.'),
    biblioteca: () => phaseCard(5, ['Insolvência e recuperação (CIRE), processo executivo e penhoras, prescrição, crédito ao consumo e à habitação, sobre-endividamento, proteção de rendimentos, negociação com credores', 'Cada artigo com fontes oficiais (Diário da República, Banco de Portugal, Portal das Finanças, Segurança Social, DGPJ) e data da última verificação'], 'Nenhuma norma é publicada sem confirmação da versão em vigor.'),
    async conta() {
      const u = api.currentUser();
      if (api.isDemo()) return `<section class="panel"><h2>Conta de demonstração</h2><p>Na demonstração não há conta real. Cria uma conta gratuita para guardares os teus dados.</p><button class="btn btn-primary" data-action="open-register">Criar conta</button></section>`;
      const hist = await api.history(30);
      const opLabel = { registo: 'Registo', login: 'Entrada', logout: 'Saída', 'perfil.alterado': 'Dados pessoais alterados', 'consentimento_ia.dado': 'Consentimento IA dado', 'consentimento_ia.retirado': 'Consentimento IA retirado', 'palavra_passe.alterada': 'Palavra-passe alterada', exportacao: 'Exportação de dados', analise_ia: 'Análise de documento', 'dc_documents.insert': 'Documento carregado', 'dc_documents.delete': 'Documento apagado', 'dc_debts.insert': 'Dívida adicionada', 'dc_debts.update': 'Dívida alterada', 'dc_debts.delete': 'Dívida apagada' };
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
    simulador() {
      const f = $('#f-sim'); if (!f) return;
      const update = () => { $('#sim-out').innerHTML = sim.render(sim.read()); };
      f.addEventListener('input', update); update();
      f.addEventListener('submit', async ev => {
        ev.preventDefault(); if (api.isDemo()) return; const btn = $('button[type=submit]', f);
        const v = sim.read();
        ui.busy(btn, true, 'A guardar…');
        try { await api.saveBudget(v.items.filter(i => i.value > 0)); ui.toast('Valores guardados. O dashboard já os usa.', 'ok'); }
        catch (e) { ui.error(e); } finally { ui.busy(btn, false); }
      });
    },
    async analisar() {
      const f = $('#f-doc'); if (!f) return;
      try { lastAnalyses = await api.analyses(); } catch (e) { lastAnalyses = []; }
      let chosen = null;
      const pick = ev => {
        const file = ev.target.files && ev.target.files[0]; if (!file) return;
        if (!/^(application\/pdf|image\/)/.test(file.type)) { ui.toast('Formato não suportado. Usa PDF, JPG ou PNG.', 'err'); return; }
        chosen = file; $('#doc-chosen').textContent = '✔ ' + (file.name || 'fotografia'); $('#doc-go').disabled = false;
      };
      $('#doc-cam').addEventListener('change', pick); $('#doc-file').addEventListener('change', pick);
      f.addEventListener('submit', async ev => {
        ev.preventDefault(); if (!chosen) return;
        const btn = $('#doc-go'), prog = $('#doc-progress');
        ui.busy(btn, true, 'A analisar…');
        const step = t => { prog.innerHTML = `<div class="progress"><div class="spinner"></div><div>${t}</div></div>`; };
        try {
          step('A preparar o documento…');
          const file = await shrinkImage(chosen);
          if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) throw new Error('Formato não suportado. Usa PDF, JPG ou PNG.');
          step('A guardar no teu espaço privado…');
          const doc = await api.uploadDocument(file, $('#doc-debt') ? $('#doc-debt').value : '');
          step('A ler o documento com inteligência artificial. Pode demorar até um minuto…');
          const an = await api.analyse(doc.id);
          prog.innerHTML = '';
          $('#doc-result').innerHTML = report.render(an.result, `${doc.name} · ${util.fmtDateTime(an.created_at)}`);
          $('#doc-result').scrollIntoView({ behavior: 'smooth' });
          chosen = null; f.reset(); $('#doc-chosen').textContent = '';
        } catch (e) {
          prog.innerHTML = `<div class="alert urg">${util.esc(e.message || 'Erro.')}</div>`;
        } finally { ui.busy(btn, false); $('#doc-go').disabled = !chosen; }
      });
    },
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
  const DEBT_TYPES = ['Crédito pessoal', 'Crédito à habitação', 'Crédito automóvel', 'Cartão de crédito', 'Descoberto bancário', 'Crédito consolidado', 'Finanças (AT)', 'Segurança Social', 'Fornecedores', 'Telecomunicações', 'Água, luz ou gás', 'Rendas em atraso', 'Empréstimo particular', 'Outro'];
  const DEBT_STATUS = ['Em pagamento', 'Em atraso', 'Em cobrança', 'Em negociação', 'Contestada', 'Liquidada'];
  async function debtForm(d = {}) {
    const n = v => v == null || v === '' ? '' : String(v).replace('.', ',');
    const opt = (list, cur) => list.map(o => `<option ${o === cur ? 'selected' : ''}>${util.esc(o)}</option>`).join('');
    ui.openModal(`<h2 id="modal-title">${d.id ? 'Editar dívida' : 'Nova dívida'}</h2>
      <form id="f-debt" class="form" novalidate>
        <div class="field"><label for="d-cred">Credor</label><input id="d-cred" name="creditor" maxlength="120" required value="${util.esc(d.creditor || '')}" placeholder="Ex.: nome do banco ou da empresa"></div>
        <div class="field"><label for="d-type">Tipo de dívida</label><select id="d-type" name="debt_type">${opt(DEBT_TYPES, d.debt_type || 'Crédito pessoal')}</select></div>
        <div class="sim-grid">
          <div class="field"><label for="d-ini">Valor inicial</label><input id="d-ini" name="initial_amount" inputmode="decimal" value="${n(d.initial_amount)}"></div>
          <div class="field"><label for="d-cap">Capital em dívida</label><input id="d-cap" name="capital" inputmode="decimal" value="${n(d.capital)}" required></div>
          <div class="field"><label for="d-int">Juros</label><input id="d-int" name="interest" inputmode="decimal" value="${n(d.interest)}"></div>
          <div class="field"><label for="d-chg">Encargos e despesas</label><input id="d-chg" name="charges" inputmode="decimal" value="${n(d.charges)}"></div>
          <div class="field"><label for="d-mon">Prestação mensal</label><input id="d-mon" name="monthly_payment" inputmode="decimal" value="${n(d.monthly_payment)}"></div>
          <div class="field"><label for="d-st">Estado</label><select id="d-st" name="status">${opt(DEBT_STATUS, d.status || 'Em pagamento')}</select></div>
          <div class="field"><label for="d-start">Data de início</label><input id="d-start" name="start_date" type="date" value="${d.start_date || ''}"></div>
          <div class="field"><label for="d-due">Data de vencimento</label><input id="d-due" name="due_date" type="date" value="${d.due_date || ''}"></div>
        </div>
        <label class="check"><input type="checkbox" name="court_case" ${d.court_case ? 'checked' : ''}><span>Existe processo judicial</span></label>
        <label class="check"><input type="checkbox" name="seizure" ${d.seizure ? 'checked' : ''}><span>Existe penhora</span></label>
        <div class="field"><label for="d-notes">Observações</label><textarea id="d-notes" name="notes" rows="3" maxlength="2000">${util.esc(d.notes || '')}</textarea></div>
        <div id="d-docs"></div>
        <button class="btn btn-primary btn-block" type="submit">Guardar</button>
      </form>`);
    const f = $('#f-debt');
    if (d.id) {
      try {
        const docs = await api.documentsForDebt(d.id);
        $('#d-docs').innerHTML = `<div class="field"><label>Documentos associados</label>${docs.length ? `<ul>${docs.map(x => `<li>${util.esc(x.name)} · ${util.fmtDate(x.uploaded_at)}</li>`).join('')}</ul>` : '<p class="fine">Nenhum. Associa documentos em “Analisar documento”.</p>'}</div>`;
      } catch (e) { /* opcional */ }
    }
    f.addEventListener('submit', async ev => {
      ev.preventDefault(); const btn = $('button[type=submit]', f);
      const money = el => { const raw = el.value.trim(); if (!raw) return { ok: true, v: 0 }; const v = sim.num(raw); const ok = v > 0 || /^0+([.,]0+)?$/.test(raw); ui.setFieldError(el, ok ? '' : 'Valor inválido.'); return { ok, v }; };
      const fields = ['initial_amount', 'capital', 'interest', 'charges', 'monthly_payment'].map(k => [k, money(f[k])]);
      const creditor = f.creditor.value.trim();
      ui.setFieldError(f.creditor, creditor ? '' : 'Indica o credor.');
      if (!creditor || fields.some(([, r]) => !r.ok)) return;
      if (f.start_date.value && f.due_date.value && f.due_date.value < f.start_date.value) return ui.setFieldError(f.due_date, 'O vencimento é anterior ao início.');
      const data = { id: d.id, creditor, debt_type: f.debt_type.value, status: f.status.value, start_date: f.start_date.value, due_date: f.due_date.value,
        court_case: f.court_case.checked, seizure: f.seizure.checked, notes: f.notes.value.trim() };
      fields.forEach(([k, r]) => { data[k] = r.v; });
      if (!f.initial_amount.value.trim()) data.initial_amount = null;
      ui.busy(btn, true, 'A guardar…');
      try { await api.saveDebt(data); ui.closeModal(); ui.toast('Dívida guardada.', 'ok'); route(); }
      catch (e) { ui.error(e); ui.busy(btn, false); }
    });
  }

  const actions = {
    'new-debt'() { debtForm(); },
    'edit-debt'(btn) { const d = lastDebts.find(x => x.id === btn.dataset.id); if (d) debtForm(d); },
    'delete-debt'(btn) {
      const d = lastDebts.find(x => x.id === btn.dataset.id); if (!d) return;
      ui.openModal(`<h2 id="modal-title">Apagar dívida</h2><p>Apagar <strong>${util.esc(d.creditor)}</strong>? Os documentos associados ficam guardados, sem associação.</p>
        <button class="btn btn-primary btn-block" style="background:var(--urg)" data-action="confirm-delete-debt" data-id="${d.id}">Apagar</button>`);
    },
    async 'confirm-delete-debt'(btn) {
      ui.busy(btn, true, 'A apagar…');
      try { await api.deleteDebt(btn.dataset.id); ui.closeModal(); ui.toast('Dívida apagada.', 'ok'); route(); } catch (e) { ui.error(e); ui.busy(btn, false); }
    },
    'toggle-nav'(btn) { const n = $('#site-nav'); n.classList.toggle('open'); btn.setAttribute('aria-expanded', n.classList.contains('open')); },
    'toggle-sidebar'(btn) { const s = $('#sidebar'); s.classList.toggle('open'); btn.setAttribute('aria-expanded', s.classList.contains('open')); },
    'open-login'() { auth.loginForm(); },
    'open-register'() { auth.registerForm(); },
    'open-reset'() { auth.resetForm(); },
    'close-modal'() { ui.closeModal(); },
    'change-password'() { auth.newPasswordForm('Alterar palavra-passe'); },
    async 'give-ai-consent'(btn) {
      if (!$('#ai-ok').checked) return ui.toast('Marca a autorização para continuar.', 'err');
      ui.busy(btn, true, 'A guardar…');
      try { await api.setAIConsent(true); route(); } catch (e) { ui.error(e); ui.busy(btn, false); }
    },
    'view-analysis'(btn) {
      const a = lastAnalyses.find(x => x.id === btn.dataset.id); if (!a) return;
      $('#doc-result').innerHTML = report.render(a.result, `${(a.dc_documents && a.dc_documents.name) || ''} · ${util.fmtDateTime(a.created_at)}`);
      $('#doc-result').scrollIntoView({ behavior: 'smooth' });
    },
    'delete-doc'(btn) {
      ui.openModal(`<h2 id="modal-title">Apagar documento</h2><p>O ficheiro e a respetiva análise são apagados definitivamente.</p>
        <button class="btn btn-primary btn-block" style="background:var(--urg)" data-action="confirm-delete-doc" data-id="${util.esc(btn.dataset.id)}">Apagar</button>`);
    },
    async 'confirm-delete-doc'(btn) {
      ui.busy(btn, true, 'A apagar…');
      try { await api.deleteDocument(btn.dataset.id); ui.closeModal(); ui.toast('Documento apagado.', 'ok'); route(); }
      catch (e) { ui.error(e); ui.busy(btn, false); }
    },
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
