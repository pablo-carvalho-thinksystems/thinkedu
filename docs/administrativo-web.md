# Administrativo web · thinkEdu

Interface React/Vite da direção em http://127.0.0.1:4342 (`npm run dev:admin`).

## Fluxos disponíveis

- Visão geral: alunos presentes, chamada pendente, rotinas publicadas e valores em aberto. Presença e rotinas respondem à turma e data escolhidas; o financeiro considera toda a escola.
- Turmas e alunos: busca, consulta individual, cadastro em uma turma existente e vínculo com responsável existente ou novo. Cadastro exige papel de direção e gera auditoria. Convites e matrícula formal ainda não são enviados.
- Presença e rotinas: consulta de registros do professor, registro de entrada, ausência ou saída com observação. Rotinas são consultadas por criança e data.
- Comunicação: comunicado, pedido de material e autorização com prazo; destinatários por escola, turma ou aluno; leituras e respostas; conversas por aluno; mural de texto, vídeo e arquivo por link HTTPS.
- Calendário: grade mensal, seleção de dia e filtro de turma; criação de eventos com local e destinatários. Para famílias, cada filho mantém a sua agenda.
- Financeiro: referências e valores agrupados pelo responsável, com composição por filho. Não realiza pagamentos nem conciliação. Responsáveis financeiros de produção precisarão de um vínculo contratual único por cobrança; a demonstração tem Rafael como responsável por Lia e Bento.
- Configurações: situação das lojas, versão e últimas ações auditadas.

## Persistência e conexão

Sem `VITE_API_URL`, usa `thinkedu.admin.v1` no armazenamento deste navegador e migra os dados antigos sem removê-los. Esta cópia é independente do dispositivo móvel.

Para compartilhar a API demonstrativa: configure `THINKEDU_DEMO=true`, inicie `npm run dev:api` e reinicie o administrativo com `VITE_API_URL=http://127.0.0.1:4340`. No aplicativo, configure `EXPO_PUBLIC_API_URL` para o mesmo servidor. A interface busca dados ao abrir e recebe o estado atualizado ao salvar; alterações feitas em outro dispositivo aparecem ao recarregar.

A API conserva permissões e auditoria. A sessão demonstrativa não substitui autenticação de produção. Não há upload de arquivos nesta interface: PDFs e vídeos devem estar hospedados em HTTPS, vídeos em links diretos. Pagamentos, convites, infraestrutura de arquivos e autenticação de produção ainda requerem integração.

## Verificação

Checagem de tipos, build web e testes de domínio/API. Revisão no navegador incluiu calendário com data e turma, publicação de comunicado, persistência após recarga, cobrança familiar e layout responsivo.
