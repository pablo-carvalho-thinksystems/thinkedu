# Agenda individual e Mural da escola

A agenda da família sempre usa uma criança. A seleção mostra foto, nome e turma. A lista e os marcadores do calendário usam os mesmos eventos filtrados por filho; eventos gerais aparecem no contexto da criança selecionada. O financeiro permanece consolidado por família.

O Mural está acessível em Hoje, Escola e Turma. A equipe publica texto, vídeo ou arquivo, selecionando turmas inteiras ou alunos, e revisa o conteúdo antes de publicar. Responsáveis consultam apenas os materiais destinados aos filhos vinculados e filtram por criança e tipo. Há exemplos ilustrativos dos três formatos. O vídeo de demonstração é uma animação gráfica original de oito segundos, incluída no pacote do app para funcionar sem internet; o PDF é o arquivo de teste público da W3C, não um material pedagógico real.

Vídeos diretos HTTPS (MP4/M4V/MOV/WebM) usam player nativo com controles e tela cheia, sem reprodução automática. Links de arquivos abrem no navegador. No modo local iOS/Android, a equipe pode escolher arquivos e vídeos pelo seletor do sistema (limite de 100 MB); uma cópia persistente fica no diretório de documentos do app. Arquivos locais podem ser abertos pela folha de compartilhamento do sistema. Cancelamento e falhas têm retorno visível.

## Limite atual de armazenamento

Anexos escolhidos no dispositivo ficam exclusivamente na demonstração daquele dispositivo. Ao conectar à API ou usar a versão web, a publicação recebe links HTTPS de materiais já hospedados pela escola. A API não aceita caminhos de arquivos locais. Upload entre dispositivos, controle de acesso ao objeto, expiração de links e processamento de vídeos precisam de um provedor de armazenamento antes do uso em produção. O filtro de destinatários controla acesso às publicações no app; a privacidade do arquivo remoto depende da hospedagem escolhida.

Publicações persistem no armazenamento local ou na API de demonstração. A migração acrescenta exemplos do mural somente quando o campo não existe, preservando rotinas, comunicados, mensagens e cobranças. Publicação é restrita a equipe com vínculo de turma e gera auditoria. Os testes cobrem agendas distintas, público autorizado, negação a famílias, anexos, migração e persistência na API.
