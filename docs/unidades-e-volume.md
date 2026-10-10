# Unidades e cenário de volume · thinkEdu

Uma escola tem várias unidades. Cada unidade tem um endereço completo e suas próprias turmas; cada aluno deriva a unidade da turma. O cadastro não aceita uma unidade fornecida pelo cliente para deslocar um aluno sem mudar a turma.

No portal, **Unidades** permite cadastrar/editar endereços e cadastrar turmas com capacidade de 1 a 100 alunos. A matrícula valida a capacidade disponível. O seletor superior filtra os dados por unidade, incluindo comunicação, calendário e financeiro. Turmas vazias continuam aparecendo e podem receber matrículas.

Em **Usuários e acessos**, vincule a equipe a todas as unidades ou somente às unidades necessárias. Professores têm também as turmas autorizadas. As duas restrições se acumulam. `unitIds` ausente significa todas as unidades; uma lista vazia recebida como restrição de uma sessão não amplia o acesso. Contas escolares e concessões fora do escopo de quem administra são recusadas. A Administração central permanece com acesso à escola inteira.

Famílias recebem somente os filhos vinculados, inclusive quando estudam em unidades diferentes. A agenda continua por filho/turma e a cobrança continua conjunta por família. A seleção administrativa de uma unidade mostra somente a composição financeira daquela unidade; a visão de todas as unidades e o app da família reúnem os filhos.

## Cenário disponível

O ambiente compartilhado local foi preenchido com dados fictícios:

| Dados | Volume |
| --- | ---: |
| Unidades | 4 |
| Turmas por unidade | 5 |
| Alunos por turma | 16 |
| Alunos | 320 |
| Presenças, de 6 a 9 de outubro de 2026 | 1.280 |
| Rotinas no mesmo período | 1.280 |
| Mensagens | 1.282 |
| Comunicados | 43 |
| Mural | 43 |
| Eventos | 42 |
| Composições de mensalidade, setembro e outubro | 640 |

Os endereços são fictícios. Rafael conserva Lia e Bento, em duas unidades, com a mensalidade conjunta de outubro de R$ 2.600. As pessoas e registros anteriores foram preservados. A cópia de segurança antes do preenchimento fica nos arquivos locais ignorados `apps/api/data/demo.before-scale.json` e `demo.before-scale.audit.key`. Restaure dados e chave como um par, com a API parada; nunca substitua apenas um deles.

Para reproduzir após iniciar a API com `THINKEDU_DEMO=true`:

```sh
npm run demo:populate
```

O comando usa a conta Administração demonstrativa, verifica `/health`, preenche por uma ação auditada e encerra a sessão. `THINKEDU_API_URL` muda o endereço da API. O gerador é determinístico e idempotente: não duplica alunos nem registros. Recusa escolas já com mais de 20 turmas ou uma turma com mais de 16 alunos, em vez de remover dados. O cenário organiza as turmas de demonstração em quatro unidades; não deve ser usado para importar dados de uma escola real.

## Verificação

A suíte inclui geração/idempotência, vínculos de alunos, endereços, capacidade, leituras por perfil/unidade, tentativas de forjar vínculos, sessões com permissões alteradas e financeiro de irmãos em unidades diferentes.

O teste HTTP usa uma API isolada: 20 professores gravam presença simultaneamente, seguidos de 40 consultas; confere os 20 registros persistidos, leituras de 16 alunos por professor, 80 alunos por coordenação e a integridade do histórico. Na primeira execução local, as 60 solicitações tiveram mediana de 525 ms e percentil 95 de 1.113 ms. Esses tempos dependem da máquina, da concorrência e do histórico e não representam um compromisso de desempenho de produção.

O portal pagina alunos/rotinas e comunicação; o app carrega alunos e cobranças gradualmente e permite filtrar unidades. O transporte de `/state` ainda entrega as coleções autorizadas completas. Para volume maior e produção, adotar banco relacional, índices e paginação de servidor por coleção, mantendo transações e trilha de auditoria. O arquivo JSON e a fila de uma única API foram testados funcionalmente, não como infraestrutura distribuída.
