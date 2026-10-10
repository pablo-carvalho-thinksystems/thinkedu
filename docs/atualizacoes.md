# Avisos de atualização do thinkEdu

Preparados e desativados por padrão: o aplicativo ainda não possui páginas nas lojas.

`apps/mobile/app.json` define versão pública `0.1.0`, build iOS `1` e código Android `1`. Novas distribuições devem incrementar a versão e o build correspondente e regenerar os projetos nativos via Expo Prebuild antes de compilar.

## Política pública

`GET /app/version?platform=ios` ou `android` funciona sem sessão da escola. O servidor lê a cada consulta um arquivo apontado por `THINKEDU_RELEASE_FILE`. A política abaixo é uma configuração inicial segura:

```json
{
  "ios": {"enabled": false, "latestVersion": "0.1.0", "latestBuild": 1, "minimumVersion": "0.1.0", "storeUrl": "", "releaseNotes": ""},
  "android": {"enabled": false, "latestVersion": "0.1.0", "latestBuild": 1, "minimumVersion": "0.1.0", "storeUrl": "", "releaseNotes": ""}
}
```

Após a publicação, preencha o link oficial de cada loja, as versões e os builds já disponibilizados e ative `enabled`. iOS aceita HTTPS em `apps.apple.com` com identificador de app no caminho; Android aceita o aplicativo `com.thinksystems.thinkedu` em `play.google.com/store/apps/details`. Configurações ausentes, inválidas ou arquivo ilegível mantêm os avisos desativados.

## Comportamento no aplicativo

`EXPO_PUBLIC_VERSION_URL` aponta para o endpoint público HTTPS, ou usa `/app/version` em `EXPO_PUBLIC_API_URL`. Sem endpoint, não faz consultas. A versão instalada vem de Expo Application, com fallback para a configuração Expo. Verifica ao iniciar e voltar ao primeiro plano, com intervalo mínimo de cinco minutos e limite de oito segundos por consulta. Falhas de rede não impedem o uso.

Uma versão/build posterior exibe atualização opcional, com botão para a loja e adiamento por 24 horas. Quando a versão instalada está abaixo de `minimumVersion`, o aviso exige atualização. Só eleve essa versão mínima depois que o release estiver disponível nas lojas. O aviso não faz download nem instalação automática; a loja cuida desse processo. A prévia web não mostra esse aviso.

Comparação numérica de versão/build e validação de links estão cobertas por testes. A política inicial sem URLs permanece desativada; o redirecionamento real depende das páginas oficiais futuras.
