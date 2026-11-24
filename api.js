/* =========================================================
   DívidaClara — api.js
   Camada de acesso ao backend (Supabase). O resto da app só usa DC.api;
   trocar de backend implica reescrever apenas este ficheiro.
   ========================================================= */
(function () {
  const cfg = window.DC_CONFIG;

  class ApiError extends Error { constructor(code, message) { super(message); this.code = code; } }

  const ERR = [
    [/invalid login credentials/i, 'Email ou palavra-passe incorretos.'],
    [/email not confirmed/i, 'Ainda não confirmaste o email. Abre a ligação que te enviámos.'],
    [/user already registered|already been registered/i, 'Já existe uma conta com este email. Entra ou recupera a palavra-passe.'],
    [/rate limit|too many|over_email_send/i, 'Demasiados pedidos seguidos. Tenta daqui a alguns minutos.'],
    [/password.*(at least|weak|short)|weak_password/i, 'Palavra-passe demasiado fraca. Usa pelo menos 10 caracteres, com letras e números.'],
    [/pwned|compromised|leaked/i, 'Essa palavra-passe apareceu em fugas de dados conhecidas. Escolhe outra.'],
    [/same.*password|should be different/i, 'A nova palavra-passe tem de ser diferente da anterior.'],
    [/failed to fetch|network/i, 'Sem ligação ao servidor. Verifica a internet.'],
    [/sem_conta_dividaclara/i, 'Esta conta ainda não está ativada na DívidaClara.'],
    [/confirmacao_invalida/i, 'Confirmação inválida.']
  ];
  function toApiError(e) {
    const msg = (e && (e.message || e.error_description)) || String(e);
    for (const [re, pt] of ERR) if (re.test(msg) || re.test(e && e.code || '')) return new ApiError(e.code || 'ERROR', pt);
    console.error('[DívidaClara]', e);
    return new ApiError((e && e.code) || 'ERROR', 'Ocorreu um erro. Tenta novamente.');
  }
  const must = ({ data, error }) => { if (error) throw toApiError(error); return data; };

  const store = {
    get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} },
    del(k) { try { sessionStorage.removeItem(k); } catch (e) {} }
  };

  let sb = null;
  let profile = null;   // perfil dc_profiles do utilizador autenticado
  let authUser = null;  // utilizador do Supabase Auth
  const listeners = [];
  const redirectURL = () => location.origin + location.pathname;

  async function loadProfile() {
    if (!authUser) { profile = null; return null; }
    const data = must(await sb.from('dc_profiles').select('*').eq('id', authUser.id).maybeSingle());
    profile = data || null;
    return profile;
  }

  const api = {
    isConfigured: () => !!(cfg.BACKEND.SUPABASE_URL && cfg.BACKEND.SUPABASE_KEY && window.supabase),

    async init() {
      if (!api.isConfigured()) return;
      sb = window.supabase.createClient(cfg.BACKEND.SUPABASE_URL, cfg.BACKEND.SUPABASE_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'implicit' }
      });
      sb.auth.onAuthStateChange((event, session) => {
        authUser = session ? session.user : null;
        // não fazer chamadas à BD dentro deste callback (recomendação Supabase); adiar
        setTimeout(async () => {
          if (event === 'SIGNED_OUT') profile = null;
          else if (authUser && (!profile || profile.id !== authUser.id)) { try { await loadProfile(); } catch (e) {} }
          listeners.forEach(fn => fn(event));
        }, 0);
      });
      const { data } = await sb.auth.getSession();
      authUser = data.session ? data.session.user : null;
      if (authUser) { try { await loadProfile(); } catch (e) { profile = null; } }
    },
    onAuth(fn) { listeners.push(fn); },

    /* ---------- sessão ---------- */
    isDemo: () => store.get('dc_demo') === '1',
    startDemo() { store.set('dc_demo', '1'); },
    hasSession: () => !!authUser,
    authEmail: () => authUser ? authUser.email : '',
    currentUser() {
      if (api.isDemo()) return { id: 'DEMO', name: 'Utilizador de demonstração', email: 'demo@exemplo.invalid', plan: 'gratuito', status: 'ativo', demo: true };
      return profile;
    },

    async register({ name, email, phone, type, password }) {
      const data = must(await sb.auth.signUp({
        email, password,
        options: { emailRedirectTo: redirectURL(), data: { app: 'dividaclara', name, phone, account_type: type } }
      }));
      // Com confirmação de email ativa, um email já existente devolve um utilizador sem identidades
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0)
        throw new ApiError('EXISTS', 'Já existe uma conta com este email. Entra ou recupera a palavra-passe.');
      return { needsConfirmation: !data.session };
    },
    async login(email, password) {
      const data = must(await sb.auth.signInWithPassword({ email, password }));
      authUser = data.user;
      await loadProfile();
      if (profile && profile.status !== 'ativo') { await sb.auth.signOut(); profile = null; throw new ApiError('SUSPENDED', 'Esta conta está suspensa. Contacta o suporte.'); }
      if (profile) api.log('login');
      return { needsActivation: !profile };
    },
    async activate({ name, phone, type }) {
      must(await sb.rpc('dc_create_profile', { p_name: name, p_phone: phone || null, p_account_type: type, p_consent: true }));
      return loadProfile();
    },
    async logout() {
      store.del('dc_demo');
      if (sb && authUser) { if (profile) await api.log('logout'); await sb.auth.signOut(); }
      authUser = null; profile = null;
    },
    async requestPasswordReset(email) { must(await sb.auth.resetPasswordForEmail(email, { redirectTo: redirectURL() })); },
    async updatePassword(password) { must(await sb.auth.updateUser({ password })); if (profile) api.log('palavra_passe.alterada'); },
    async log(op, result) { try { await sb.rpc('dc_log', { p_operation: op, p_result: result || 'ok' }); } catch (e) {} },

    /* ---------- perfil e RGPD ---------- */
    async updateProfile({ name, phone, account_type }) {
      must(await sb.from('dc_profiles').update({ name, phone: phone || null, account_type }).eq('id', authUser.id));
      await api.log('perfil.alterado');
      return loadProfile();
    },
    async setAIConsent(on) {
      must(await sb.from('dc_profiles').update({ consent_ai_at: on ? new Date().toISOString() : null }).eq('id', authUser.id));
      await api.log(on ? 'consentimento_ia.dado' : 'consentimento_ia.retirado');
      return loadProfile();
    },
    async history(limit = 50) {
      return must(await sb.from('dc_logs').select('operation,result,created_at').eq('user_id', authUser.id).order('created_at', { ascending: false }).limit(limit));
    },
    async exportData() { return must(await sb.rpc('dc_export_my_data')); },
    async deleteAccount() {
      // 1) apagar ficheiros do utilizador no Storage; 2) apagar dados e conta; 3) terminar sessão
      const bucket = sb.storage.from(cfg.BACKEND.BUCKET);
      const files = must(await bucket.list(authUser.id, { limit: 1000 }));
      if (files && files.length) must(await bucket.remove(files.map(f => authUser.id + '/' + f.name)));
      must(await sb.rpc('dc_delete_my_account', { p_confirm: 'ELIMINAR' }));
      await sb.auth.signOut(); authUser = null; profile = null;
    },

    /* ---------- dados do dashboard ---------- */
    async dashboard() {
      const [debts, ie, docs] = await Promise.all([
        sb.from('dc_debts').select('id,creditor,debt_type,capital,interest,charges,total,monthly_payment,due_date,status,court_case,seizure').order('due_date', { ascending: true, nullsFirst: false }),
        sb.from('dc_income_expenses').select('kind,category,monthly_value'),
        sb.from('dc_documents').select('id', { count: 'exact', head: true }).eq('analysis_status', 'concluida')
      ]);
      return { debts: must(debts), ie: must(ie), docsAnalysed: docs.error ? 0 : (docs.count || 0) };
    },

    /* ---------- público ---------- */
    async contact({ name, email, message }) {
      must(await sb.from('dc_contact_messages').insert({ name, email, message, consent: true }));
    },
    async publicPlans() {
      const data = must(await sb.from('dc_settings').select('value').eq('key', 'plans').maybeSingle());
      return data ? data.value : null;
    }
  };

  window.DC = window.DC || {};
  window.DC.ApiError = ApiError;
  window.DC.api = api;
})();
