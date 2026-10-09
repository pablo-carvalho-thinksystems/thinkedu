# Arquitetura e próximos marcos

## Decisões desta entrega

O monorepo mantém aplicativo, painel e regras de negócio no mesmo projeto. As interfaces consomem comandos explícitos, como `routine.save`, `notice.create` e `notice.respond`. O núcleo valida destinatários, vínculo, papel e formato dos dados antes de criar um novo estado. O servidor deriva o ator da sessão, nunca de um papel informado no comando.

A demonstração local usa AsyncStorage no aplicativo e localStorage no painel. São cópias separadas. O modo HTTP compartilha estado persistido por arquivo com escrita sequencial e troca atômica. Isso suporta validação das jornadas, mas não substitui banco, concorrência distribuída, transações, migrações ou fila.

Os valores financeiros usam centavos inteiros. A autorização pertence a uma criança e ao responsável que respondeu. Rascunhos de rotina são visíveis à equipe e só chegam à família após publicação. O estado enviado a cada cliente é filtrado por escola, turma e vínculo; educadoras não recebem mensalidades.

## Marco 1 · Identidade e escola

1. Login real, convites expirantes, recuperação e revogação de sessão.
2. Banco relacional: escolas, turmas, matrículas, responsáveis, vínculos e papéis.
3. Gestão de diferentes responsáveis por criança, restrições legais de acesso e permissões financeiras específicas.
4. Histórico de alterações, política de retenção, exportação/eliminação e backups testados.

## Marco 2 · Operação de educadoras

1. Registro em lote com exceções individuais e prevenção de envio para turma errada.
2. Rotina por data, entradas/saídas verificadas e registros por horário.
3. Solicitações, autorizações e calendários vinculados, revisão e prazo de resposta.
4. Fotos privadas com consentimento, autorização por criança, upload e entrega segura.
5. Sincronização incremental, estado offline explícito, conflitos e fila idempotente.

## Marco 3 · Comunicação e financeiro

1. Notificações por push com conteúdo mínimo, preferências e horário de atendimento.
2. Conversas com anexos, estados de entrega e trilha de leitura coerente.
3. Provedor financeiro, geração de cobrança, Pix/boleto e baixa por webhook verificado.
4. Conciliação, estornos e visibilidade por responsável financeiro.

## Marco 4 · Piloto

Testar em Android/iOS reais, acessibilidade com leitor de tela, desempenho em aparelhos simples, rede ruim, fusos/datas, múltiplas escolas e famílias com mais de duas crianças. Fazer revisão de segurança e privacidade antes de incluir dados reais. Validar os fluxos com educadoras e responsáveis, priorizando tempo de registro e facilidade de encontrar pendências.

## Diferenciais a validar

Resumo do dia baseado somente em registros revisados; panorama da família com pendências por filho; timeline acolhedora com evidências; registro em lote sem apagar particularidades; autorizações com contexto e prazo. Sugestões automáticas deverão preservar revisão humana e nunca rotular desenvolvimento ou saúde de crianças.
