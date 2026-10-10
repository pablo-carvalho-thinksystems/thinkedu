# Auditoria · thinkEdu

O perfil **Administração** consulta o histórico no portal e no aplicativo e libera consulta/exportação por perfil ou por pessoa. Diretoria gerencia a equipe, mas não cria nem modifica Administração e não libera auditoria. Conceder auditoria libera o histórico de toda a escola, inclusive todas as unidades e dados anteriores/posteriores de áreas normalmente restritas; a tela de liberação informa esse alcance. Uma concessão individual soma-se à do perfil: desmarcar somente a individual não revoga uma concessão herdada.

A API registra comandos concluídos, recusados ou com falha, entrada/saída de sessão, acessos rejeitados, consultas de dados, consultas e exportações de auditoria e alterações de permissões. Cada registro preserva nome e perfil do autor no momento da ação, horário do servidor, solicitação, origem, registro afetado, resultado e mudanças anteriores/posteriores. A origem web/app é declarada pelo cliente e não é prova de dispositivo. IP/dispositivo verificado dependerá da autenticação e infraestrutura reais.

Os horários aparecem em America/Sao_Paulo; datas de filtro usam o mesmo fuso. Há busca, filtros, paginação, detalhe de mudanças e exportação CSV/JSON no portal. Exportações respeitam a mesma permissão e também são auditadas. Valores de texto que poderiam virar fórmulas são neutralizados no CSV. Campos conhecidos de credenciais são removidos dos snapshots.

Consultas registram as coleções e IDs devolvidos. Seleção visual de uma turma, abertura de um detalhe já baixado e outras navegações sem nova solicitação não geram eventos adicionais; a consulta de dados que os abasteceu fica registrada. Health checks, configuração pública de versões e preflight de CORS não são ações escolares auditadas.

## Integridade e persistência

A API não oferece comando para editar/excluir o histórico. As entradas são encadeadas e assinadas com HMAC-SHA256, com cabeça e contagem assinadas. A gravação é serializada e substitui o arquivo JSON atomicamente. O sistema verifica a cadeia ao iniciar e nas consultas de auditoria e recusa uma cadeia alterada ou sem chave original.

A chave local fica por padrão ao lado do arquivo de dados, com sufixo `.audit.key`, permissões 0600 e ignorada no Git. `THINKEDU_AUDIT_KEY_FILE` permite separar sua localização. Guarde backups de dados e chave juntos e restrinja o acesso. Quem controla o servidor e a chave pode reconstruir uma cadeia; assinatura local não substitui arquivo externo imutável, backups seguros e controles de operação. Não há garantia de retenção contra acesso administrativo ao disco.

Registros anteriores à auditoria detalhada são identificados como anteriores. Nome/perfil que não foi registrado e dados anteriores/posteriores inexistentes não são inventados na migração.

## Limites da demonstração

A identidade ainda vem do seletor de pessoas, sem credenciais ou convites verificados. O histórico identifica a pessoa escolhida na sessão demonstrativa, não prova a identidade de uma pessoa real. Produção exige autenticação real, banco/transações, proteção da chave e retenção/arquivo externo.

No modo desconectado, comandos bem-sucedidos têm mudanças locais; consultas, exportações, falhas e autenticação não têm a trilha completa da API. A rastreabilidade ampliada e a assinatura estão disponíveis no ambiente compartilhado conectado. A tela indica modo local sem assinatura.
