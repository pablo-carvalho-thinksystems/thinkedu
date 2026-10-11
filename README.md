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

Esta entrega é uma base demonstrativa funcional. Antes de operar uma escola real, implementar autenticação com convites verificados, convites e identidade de produção, banco relacional/migrações, armazenamento privado de fotos, consentimentos e retenção, notificações, monitoramento e backups. Integração financeira exige provedor, webhooks idempotentes e conciliação. Captura/upload de fotos, registros em lote, busca avançada ainda não estão implementados. Exportações de auditoria estão disponíveis no portal conectado.

Confira [arquitetura e próximos marcos](docs/architecture.md) e [limites de segurança](docs/security.md).

## Administrativo web

[Fluxos administrativos e limites da demonstração](docs/administrativo-web.md). [Configuração do aviso de atualização](docs/atualizacoes.md).

## Usuários e permissões

Diretoria, Coordenação, Professores, Financeiro e Secretaria compartilham as regras do domínio e da API. A diretoria gerencia contas em **Usuários e acessos**; professores ficam restritos às suas turmas. [Matriz de permissões e autenticação demonstrativa](docs/perfis-acesso.md).

## Unidades, volume e auditoria

[Cadastro de unidades e cenário com 320 alunos](docs/unidades-e-volume.md). [Rastreabilidade e concessão de auditoria pela Administração](docs/auditoria.md). Com a API demonstrativa iniciada, `npm run demo:populate` reproduz o cenário de 20 turmas de 16 alunos.

## Atividades e solicitações online · versão 0.2.0

O app oferece **Atividades e entregas** para para casa, trabalhos e provas, por aluno/turma, com prazos, orientação, conteúdo programático, anexos e retorno do professor. A agenda destaca essas datas e abre os detalhes. O responsável pode ativar um lembrete local no celular; tocar no lembrete abre a atividade autorizada. Esta versão não envia push remoto. O projeto iOS mantém somente lembretes locais porque o time Apple atual não oferece a capacidade de push.

**Solicitações online** reúne tipo, aluno, anexo, protocolo, status e conversa. A escola configura os tipos e decide se o anexo é obrigatório; a API também valida essa exigência. PDF, PNG, JPEG, TXT e DOCX até 5 MB são embutidos no armazenamento demonstrativo. Em produção, substituir isso por armazenamento privado com URLs temporárias e verificação dos arquivos.

## Samuca · assistente dos responsáveis

A tela do Samuca consulta o financeiro conjunto, rotinas publicadas, atividades/provas e orientações gerais revisadas. As respostas mostram fontes; falta de evento no calendário nunca confirma ausência de aula. Dúvidas sem resposta abrem uma conversa privada na caixa do setor adequado: professor, Coordenação, Financeiro, Secretaria ou Diretoria. Professores só atendem seus alunos vinculados. A direção pode acompanhar todos os setores autorizados.

A escola responde no administrativo ou no app da equipe. O responsável vê o retorno na mesma conversa, atualizada enquanto essa área está aberta e ao retomar o app. Não há entrega por e-mail, WhatsApp ou push remoto nesta versão. Respostas particulares **não viram aprendizado automático**. Diretoria, Administração e Coordenação podem revisar e publicar uma orientação geral, com unidade, turma e validade; a busca ignora orientações expiradas/desativadas.

O motor local funciona sem credenciais externas. A base usa **busca textual**, sem embeddings nesta etapa. Há um adaptador da OpenAI Responses API para roteamento semântico e geração fundamentada nas fontes recuperadas. Ative apenas no servidor com `THINKEDU_AI_ENABLED=true`, `THINKEDU_AI_MODEL` e `OPENAI_API_KEY`. Sem essas configurações, não ocorre transmissão ao provedor. A conexão foi testada com respostas simuladas; a validação com modelo real permanece pendente. Falhas do provedor preservam a consulta local ou o encaminhamento à escola. O servidor limita perguntas e descarta uma resposta preparada se os dados/permissões mudarem antes de salvar.

O MCP oficial está em `POST /mcp`, com o **Bearer da sessão do responsável** e Streamable HTTP stateless. Ferramentas: `family_invoices`, `student_calendar`, `student_assignments`, `student_routine`, `school_knowledge` e `ask_samuca`. Cada consulta recalcula os vínculos na API e registra auditoria. O endpoint não é público/anônimo e não implementa OAuth para conexão automática de serviços externos.

Referências de implementação: [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk), [function calling](https://developers.openai.com/api/docs/guides/function-calling) e [saídas estruturadas](https://developers.openai.com/api/docs/guides/structured-outputs).

## Login e ativação

O app instalado abre a tela de login e não permite trocar livremente de perfil. `POST /auth/login` verifica e-mail/senha com hash scrypt e sessão com expiração. Configure `THINKEDU_AUTH_FILE` com contas `{email, actorId, salt, passwordHash}`; `passwordHash` é o resultado hexadecimal de `scryptSync(password, salt, 64)`, com salt aleatório por conta. Não versionar esse arquivo. Convites, recuperação de senha e persistência segura da sessão ainda precisam ser implementados para o piloto. O iPhone atual foi compilado com a API pública não configurada: contas e endpoint HTTPS devem ser ativados para utilizar os dados reais.

## Landing comercial

`npm run dev:site` abre a landing local na porta 4343. `npm run build:site` gera os arquivos estáticos; o build principal também inclui o site. O tour mostra oito capturas reais do app com dados fictícios, junto de fotografias ilustrativas diferentes e o personagem Samuca. O contato prepara um e-mail para `pablo.carvalho@thinksystems.com.br`, para revisão e envio pelo visitante. Não há hospedagem pública nem envio automático do formulário nesta entrega.

A revisão de dependências atualizou o SDK MCP para a série corrigida 1.32. Ainda existem alertas transitivos no ecossistema Expo/Metro; não aplicar o downgrade incompatível sugerido por `npm audit fix --force`. Revisar essas dependências e o restante dos limites de segurança antes de expor serviços de produção.
