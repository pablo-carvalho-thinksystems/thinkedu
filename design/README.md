# Design thinkEdu

[Arquivo editável](https://www.figma.com/design/hDsTdE0wXVbGNxXSENY0DF)

Três páginas: componentes, família (10 telas) e educadora (8 telas). Variáveis de cores e geometria; componentes de cabeçalho, seletor, título, cartão, linha, avatar, botões e navegação inferior com variantes. Plus Jakarta Sans; azul, lima e coral; dock com contorno azul.

`figma-state.json` registra os nós reais criados e alterações verificadas. Os scripts são fonte de construção para execução no contexto Figma, não comandos Node. Não executar novamente no mesmo arquivo sem primeiro conferir os IDs e as páginas: isso criaria duplicatas. `figma-screens.js` depende de CONFIG com os componentes e variáveis presentes no ledger.

As telas usam camadas nativas editáveis. A única imagem na composição é a fotografia ilustrativa do ateliê. `references/` guarda as referências visuais aprovadas da conversa, ainda com o nome antigo Origens; a identidade implementada é thinkEdu.

## Estado do protótipo

Os links de ações principais foram criados. A auditoria detectou que os quatro itens da navegação inferior ainda não tinham reações: os filhos do componente se chamam Frame, e a associação pelo nome não encontrou os rótulos. Antes de corrigir isso, o plano Starter atingiu seu limite de chamadas MCP. Os layouts permanecem editáveis; a ligação dos menus e as variantes individuais de dia/mensalidade para Bento ficam pendentes no Figma. No aplicativo esses fluxos são funcionais.

O painel da direção foi implementado em código e não foi transferido para uma quarta página. As prévias mostram a interface web validada. A implementação evolui com estados e dados adicionais, mantendo a linguagem visual, sem equivalência pixel a pixel com todas as telas de referência.
