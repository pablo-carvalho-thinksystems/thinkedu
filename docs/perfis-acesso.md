# Perfis de acesso · thinkEdu

As regras estão em `packages/core/permissions.mjs` e são compartilhadas pela web, pelo app e pela API. O domínio resolve o usuário efetivo a partir do cadastro persistido: mudar um papel, vínculo ou indicador financeiro no pedido não amplia seu acesso. Perfis desconhecidos e usuários desativados não recebem acesso.

| Área | Diretoria | Coordenação | Professor(a) | Financeiro | Secretaria |
| --- | --- | --- | --- | --- | --- |
| Consulta de alunos | Toda a escola | Toda a escola | Turmas vinculadas | Toda a escola, dados básicos | Toda a escola |
| Cadastro de aluno/responsável | Sim | Não | Não | Não | Sim |
| Presença | Sim | Sim | Turmas vinculadas | Não | Sim |
| Rotinas e planejamento | Sim | Sim | Turmas vinculadas | Não | Não |
| Comunicados, mural e calendário | Sim | Sim | Turmas vinculadas | Não | Sim |
| Conversas individuais | Sim | Sim | Turmas vinculadas | Não | Não |
| Cobranças por família | Sim | Não | Não | Sim | Não |
| Gestão de usuários e auditoria | Sim | Não | Não | Não | Não |

Financeiro é consulta de cobranças nesta versão; não processa pagamentos. Famílias mantêm acesso apenas aos filhos vinculados, rotinas publicadas, materiais e agenda dos próprios filhos; acesso financeiro depende de seu vínculo financeiro. Professores sempre precisam de ao menos uma turma válida.

## Gestão da equipe

No portal, entre como Diretoria e abra **Usuários e acessos**. É possível criar pessoas, mudar o papel, selecionar turmas dos professores e ativar/desativar o acesso. A matriz de permissões aparece nessa mesma tela. Não é permitido remover seu próprio acesso de diretoria nem deixar a escola sem uma diretoria ativa. As mudanças são auditadas.

O papel antigo `admin` continua funcionando como Diretoria. A migração acrescenta os perfis demonstrativos Camila (Coordenação), Bruno (Financeiro) e Sofia (Secretaria) sem apagar os dados ou reativar usuários desativados.

## Mesma conta no portal e no aplicativo

Os dois usam a mesma API quando `VITE_API_URL` no administrativo e `EXPO_PUBLIC_API_URL` no app apontam para o mesmo servidor. Nesta revisão, os arquivos `.env` locais, ignorados no Git, foram configurados com `http://127.0.0.1:4340` e a API local foi iniciada com `THINKEDU_DEMO=true`. Essa URL atende ao navegador e ao simulador iOS; um aparelho físico precisa de um endereço alcançável na rede.

As contas são consultadas em `/demo/profiles`, a sessão demonstrativa é emitida por `/demo/session`, e `/state` devolve apenas as informações autorizadas, incluindo o usuário atual. O perfil criado no portal aparece no seletor do app ao abrir/atualizar a lista. Usuário desativado não inicia sessão; sessões existentes deixam de acessar a API. Alterações de papel são verificadas em cada comando e consulta, inclusive em pedidos já enfileirados. O app e o portal atualizam o estado ao voltar ao primeiro plano/foco.

Sem configuração de API, cada dispositivo/navegador conserva sua demonstração local independente. A migração não apaga essas cópias ao configurar a API.

## Limite de autenticação

A escolha de pessoa nas interfaces é exclusiva da demonstração e não equivale a autenticação com senha. Cadastro de credenciais, convites, recuperação de senha e conexão com um provedor de identidade ainda precisam ser implementados antes de produção. A API demonstrativa permanece em loopback; sem `THINKEDU_DEMO=true`, rotas de contas e dados escolares ficam desativadas. O endpoint público de versões continua disponível.

## Validação

Testes cobrem leitura e escrita por perfil, acesso do professor por turma, tentativa de forjar perfil, cadastro de usuário, exigência de turma, desativação, proteção de diretoria e revogação de sessões. Revisão de interface incluiu criar uma professora no portal e entrar com ela no app conectado, recebendo apenas o Maternal I.
