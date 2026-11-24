/* =========================================================
   DívidaClara — config.js
   Único ficheiro a editar para ligar o frontend ao backend.
   A chave "publishable" do Supabase é pública por natureza: a proteção
   dos dados é feita por Row Level Security na base de dados.
   NUNCA colocar aqui chaves secretas (Gemini, service_role, Stripe...).
   ========================================================= */
window.DC_CONFIG = {
  APP_NAME: 'DívidaClara',
  SLOGAN: 'Compreender. Organizar. Resolver.',
  VERSION: '0.3.0 · Fase 3',

  BACKEND: {
    TYPE: 'supabase',
    SUPABASE_URL: 'https://pqrqxvpzxqwblhxtmdns.supabase.co',
    SUPABASE_KEY: 'sb_publishable_Vuk6Fzf26IbLGjjTGNL_5A_8vzr9B2U',
    BUCKET: 'dc-documents'
  },

  CONTACT: {
    EMAIL: '',
    PHONE: '',
    ENTITY: '' // denominação legal + NIF da entidade responsável
  },

  // Preços de recurso. Os preços reais vêm da tabela dc_settings (chave "plans").
  PLANS: [
    { id: 'gratuito', name: 'Gratuito', price: 0, period: '', features: ['Registo e área pessoal', 'Introdução manual de dívidas', 'Dashboard básico', 'Informação educativa', '1 análise documental de demonstração'] },
    { id: 'individual', name: 'Individual', price: 7.99, period: '/mês', highlight: true, features: ['Análises de documentos com IA (limite mensal)', 'Gestão de dívidas', 'Simulador financeiro', 'Histórico e relatórios PDF', 'Alertas e notificações'] },
    { id: 'analise', name: 'Análise avulsa', price: 9.99, period: '/análise', features: ['Uma análise documental adicional', 'Relatório organizado A–L', 'Sem subscrição'] },
    { id: 'empresarial', name: 'Empresarial', price: 19.90, period: '/mês', from: true, features: ['Gestão financeira da empresa', 'Documentos e análises IA', 'Indicadores de tesouraria', 'Relatórios'] }
  ],

  // Mostra a ligação "Ver demonstração" (dados fictícios, nada é gravado).
  DEMO_MODE: true
};
