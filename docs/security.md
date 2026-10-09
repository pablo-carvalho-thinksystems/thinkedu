# Limites de segurança desta versão

Esta versão usa dados e imagem fictícios. A API de demonstração não autentica pessoas: qualquer cliente autorizado à rede pode solicitar um perfil conhecido se `THINKEDU_DEMO=true`. Por isso o host padrão é loopback. Não publicar esse modo para uma escola real.

Já existem filtragem de estado por vínculo/escola/turma, papel financeiro, autorização individual por criança, validação dos comandos, expiração de tokens, origens explícitas, limite de corpo HTTP e auditoria de ações. Esses controles são uma base testada, sem comprovar prontidão de produção.

Ainda faltam login real, revogação distribuída, limitação de requisições, gestão de usuários e consentimentos, banco transacional, armazenamento privado de mídia, criptografia e políticas operacionais, exportação/eliminação, backup e monitoramento. O aplicativo local também depende do armazenamento do dispositivo. Não persistir dados reais nessa implementação.

## Dependências

A instalação baseada no mesmo Expo/React Native do Origens apresentou avisos do `npm audit` em dependências transitivas, principalmente ferramentas de desenvolvimento Expo. Na revisão desta entrega, `braces` e `node-forge` não tinham versões corrigidas disponibilizadas no registro consultado; o reparo automático sugeria versões incompatíveis de Expo/React Native. Não aplicar `npm audit fix --force` cegamente. Reavaliar o arquivo de lock e atualizações compatíveis antes de publicar. A exposição de servidores de desenvolvimento e assinatura de atualizações exigem revisão específica.

## Pagamentos

Nenhuma transação é realizada. Os botões Pix/boleto são pontos de integração. Pagamentos reais precisam de provedor, validação de webhooks, idempotência, conciliação e identificação correta do responsável financeiro; o cliente não deve marcar mensalidades como pagas.
