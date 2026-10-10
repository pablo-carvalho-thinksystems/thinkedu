# thinkEdu

**ThinkSystems · Projeto de Educação**

Primeira versão funcional para educação infantil: famílias acompanham seus filhos; educadoras registram o dia e conversam com responsáveis; a direção organiza a escola.

[Design editável no Figma](https://www.figma.com/design/hDsTdE0wXVbGNxXSENY0DF) · [Repositório](https://github.com/pablo-carvalho-thinksystems/thinkedu)

## Tecnologia

A mesma base do Origens: **React Native + Expo + TypeScript**, interface web da direção em **React + Vite** e API em **Node.js ESM**. Aplicativo compartilhado para Android, iOS e prévia web. Fontes Plus Jakarta Sans, cores e espaçamentos em `packages/core/theme.mjs`.

## Experimentar

Node.js 22.13 ou superior e npm.

```sh
npm ci
npm run dev:web
```

Aplicativo: http://localhost:4341. Alterne entre família e educadora no topo. A família Rafael tem Lia e Bento; a educadora Ana acompanha quatro crianças. Todos os dados são fictícios. A demonstração usa outubro de 2026 e salva alterações neste dispositivo, inclusive ao alternar de perfil. O painel local mantém sua própria cópia: use a API para compartilhar dados entre os aplicativos.

Em outro terminal:

```sh
npm run dev:admin
```

Direção: http://127.0.0.1:4342.

Para desenvolvimento em dispositivo, execute `npm run dev:mobile`. A versão iOS foi compilada em Release, instalada e aberta no iPhone 17 Pro Max com iOS 26.5. Android e aparelhos físicos ainda não foram validados.

### Simulador iOS

No macOS com Xcode e CocoaPods instalados:

```sh
npm run ios:simulator -- --device "iPhone 17 Pro Max"
```

O Expo gera o projeto iOS, instala os pods, empacota o código e instala o aplicativo no simulador. A configuração Release inclui o código e os recursos no aplicativo e não depende de Metro para abrir. Os diretórios nativos são gerados por Expo Prebuild e ficam fora do Git; a configuração versionada está em `apps/mobile/app.json`.

Detalhes da verificação e caminho do artefato: [compilação iOS](docs/ios-simulator.md).

### API demonstrativa compartilhada

```sh
cp .env.example .env
npm run dev:api
```

API: http://127.0.0.1:4340. Por padrão inicia em loopback e só aceita sessões de demonstração se `THINKEDU_DEMO=true`. Sem essa opção, `/health` e o endpoint público de versões `/app/version` estão disponíveis. O modo demonstrativo permite escolher perfis conhecidos sem senha e **não pode ser exposto como autenticação de produção**.

Para conectar as interfaces, reinicie seus servidores com estas variáveis:

```sh
EXPO_PUBLIC_API_URL=http://127.0.0.1:4340 npm run dev:web
VITE_API_URL=http://127.0.0.1:4340 npm run dev:admin
```

Para aparelho físico, configure deliberadamente host, URL e origens adequados à rede de desenvolvimento. Não coloque dados de alunos reais na demonstração.

API persiste em `apps/api/data/demo.json`, ignorado pelo Git. `THINKEDU_DATA_FILE` permite outro arquivo. Tokens de demonstração expiram após uma hora; recarregar gera uma nova sessão. Os clientes consultam o estado ao iniciar/trocar perfil e após seus próprios comandos; atualizações em outro cliente aparecem ao recarregar, sem sincronização em tempo real.

## Fluxos implementados

- Família com vários filhos, seleção individual e visão conjunta.
- Rotina publicada, alimentação, descanso, higiene e observação da educadora.
- Momentos da turma e fotos individuais ilustrativas de Lia e Bento nos cartões e seletores. [Origem e prompts dos retratos](docs/demo-assets.md).
- Comunicados, filtros, registro de leitura e autorizações individuais por criança.
- Conversas contextualizadas por aluno; mensagens persistidas.
- Calendário mensal, navegação entre meses, detalhes e criação de eventos pela equipe.
- Financeiro conjunto da família, total de todos os filhos e cobranças agrupadas por competência. Um caminho de pagamento com Pix/boleto únicos e composição opcional do total. A seleção de um filho em outra tela não filtra a cobrança familiar. Pagamentos ainda são demonstrativos.
- Educadora: turma, rascunho de rotina, revisão/publicação, destinatários de comunicados, solicitações de materiais e acompanhamento de respostas.
- Direção: visão geral, pesquisa de alunos, comunicados, eventos e visão financeira.
- Regras no servidor de vínculo responsável/aluno, turma/escola, acesso financeiro, validação de comandos e auditoria sem copiar conteúdo das mensagens.

O Figma tem **10 telas de famílias e 8 telas de educadoras**, componentes com variantes, variáveis de cores/geometria, fonte e navegação entre os principais fluxos. São camadas editáveis, não imagens de telas. O painel da direção foi implementado em código; ainda não possui prancha própria no Figma. Os designs são uma referência de linguagem visual; a implementação inclui estados e dados adicionais e não é uma réplica pixel a pixel.

O plano Starter do Figma atingiu o limite de chamadas antes da ligação dos menus inferiores e das variantes individuais para Bento. Veja [estado do design](design/README.md). No aplicativo a navegação está funcional.

## Estrutura

```text
apps/mobile        aplicativo Expo
apps/admin         painel web da direção
apps/api           servidor HTTP demonstrativo
packages/core      regras, tipos e identidade visual compartilhados
tests              regras de negócio e integração HTTP
design             scripts Figma, IDs dos nós e referências aprovadas
docs               arquitetura, limites e próximos marcos
```

## Verificação

```sh
npm test
npm run typecheck
npm run build
```

CI executa esses comandos em Node 22. Os testes verificam isolamento, permissões, autorizações, expiração, publicação, validações, calendário, valores monetários e persistência entre sessões HTTP.

## Próximo marco: piloto seguro

Esta entrega é uma base demonstrativa funcional. Antes de operar uma escola real, implementar autenticação com convites verificados, vínculos e permissões administráveis, banco relacional/migrações, armazenamento privado de fotos, consentimentos e retenção, notificações, monitoramento e backups. Integração financeira exige provedor, webhooks idempotentes e conciliação. Captura/upload de fotos, registros em lote, busca avançada e exportações ainda não estão implementados.

Confira [arquitetura e próximos marcos](docs/architecture.md) e [limites de segurança](docs/security.md).

## Administrativo web

[Fluxos administrativos e limites da demonstração](docs/administrativo-web.md). [Configuração do aviso de atualização](docs/atualizacoes.md).
