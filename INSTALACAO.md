# DívidaClara

Plataforma de apoio ao endividamento (Portugal). Substitui o DocClaro.
Versão antiga do DocClaro: ramo `docclaro-antigo`.

## Estado
- Fase 1 ✅ Identidade, página inicial, navegação, área de cliente, modo demonstração.
- Fase 2 ✅ Supabase: registo, login, recuperação e alteração de palavra-passe, perfil, consentimentos (RGPD e IA), histórico de atividade, exportação de dados, eliminação de conta, dashboard ligado à base de dados.
- Fases 3–7 por fazer (Gemini, gestão de dívidas, simulador, insolvência/empresas/biblioteca, pagamentos/admin, publicação).

## Arquitetura
| Camada | Onde |
|---|---|
| Interface | GitHub Pages (este repositório): index.html, style.css, app.js |
| Acesso ao backend | api.js (único ficheiro que fala com o Supabase) |
| Autenticação | Supabase Auth (projeto MasterTable, partilhado) |
| Base de dados | Supabase Postgres, tabelas `public.dc_*` com Row Level Security |
| Documentos | Supabase Storage, bucket privado `dc-documents`, pasta por utilizador |
| IA (Fase 3) | Supabase Edge Function com a chave Gemini em secret, nunca no frontend |
| Configuração | config.js (só URL e chave publishable, que é pública por natureza) |

Biblioteca supabase-js 2.119.0 incluída em assets/vendor (validada: publicada 04/11/2026, mantainers oficiais Supabase).

## Tabelas (prefixo dc_)
dc_profiles, dc_admins, dc_debts, dc_documents, dc_ai_analyses, dc_income_expenses,
dc_creditors, dc_notifications, dc_payments, dc_settings, dc_logs, dc_contact_messages.
Funções RPC: dc_create_profile, dc_log, dc_export_my_data, dc_delete_my_account.
Migrações no histórico do projeto: dividaclara_fase2_schema, dividaclara_fase2_hardening, dividaclara_fase2_activate_profile.

Projeto partilhado: o perfil DívidaClara só é criado para registos feitos pela app
(metadata app=dividaclara). Quem já tem conta noutra app ativa a DívidaClara ao entrar.

## Configuração obrigatória no painel Supabase (não se faz por código)
1. Authentication → URL Configuration → Redirect URLs: acrescentar
   `https://dontasko.github.io/DocClaro/**`
2. Authentication → SMTP: configurar um SMTP próprio (Brevo, Resend, etc.).
   O SMTP de origem do Supabase é só para testes e tem limites de envio muito baixos.
3. Authentication → Emails: os modelos são partilhados com as outras apps do projeto.
4. Authentication → Attack Protection: ativar "Leaked password protection" (se o plano o permitir).

## Tornar alguém administrador
```sql
insert into public.dc_admins (user_id) select id from auth.users where email = 'EMAIL_AQUI';
```

## Testes feitos
- Base de dados (transação revertida): perfis criados só para registos DívidaClara; utilizador A vê só as suas dívidas;
  B não vê nem altera dados de A; utilizador não muda o próprio plano; conta de outra app sem perfil não grava;
  anónimo vê só preços e só insere contactos; exportação devolve os dados; eliminação apaga conta e dados.
- Interface: sintaxe JS, Chrome 390px e 1366px sem erros, validação de formulários, demonstração.
- Por testar após publicação: registo real com email, confirmação, recuperação de palavra-passe.

## Antes de abrir ao público
- Parecer de advogado sobre a análise de documentos (atos próprios — Lei n.º 10/2024).
- Política de privacidade e termos são rascunhos: revisão por jurista.
- Preencher CONTACT.ENTITY em config.js.
- Pôr DEMO_MODE: false se não quiseres a demonstração visível.
