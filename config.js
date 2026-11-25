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
  VERSION: '0.4.1 · Fase 4',

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

  // Números oficiais (recurso). Os valores reais vêm de dc_settings.public_stats.
  STATS: {
    updated: '2026-11-25',
    items: [
      { value: '6 368', label: 'pessoas foram declaradas insolventes em Portugal em 2025', source: 'DGPJ — Estatísticas da Justiça', period: '2025', url: 'https://estatisticas.justica.gov.pt/' },
      { value: '3 em cada 4', label: 'insolvências decretadas em 2025 foram de particulares, não de empresas', source: 'DGPJ — Estatísticas da Justiça', period: '2025 (6 368 de 8 384)', url: 'https://estatisticas.justica.gov.pt/' },
      { value: '7 846', label: 'processos por mês abertos pelos bancos para clientes com prestações em atraso (PERSI)', source: 'Banco de Portugal — Relatório de Acompanhamento dos Mercados de Crédito', period: 'média mensal de 2025', url: 'https://www.bportugal.pt/publicacao/relatorio-de-acompanhamento-dos-mercados-de-credito-2025' },
      { value: '36 meses', label: 'foi a duração média de uma execução cível (cobrança judicial de dívidas)', source: 'DGPJ — Estatísticas da Justiça', period: '2025', url: 'https://estatisticas.justica.gov.pt/' }
    ]
  },

  // Mostra a ligação "Ver demonstração" (dados fictícios, nada é gravado).
  DEMO_MODE: true
};
