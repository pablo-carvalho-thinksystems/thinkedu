# Compilação iOS · 9 de outubro de 2026

## Resultado

Compilação Release concluída com Xcode 26.6. Instalado e aberto no iPhone 17 Pro Max, iOS 26.5, bundle `com.thinksystems.thinkedu`. O bundle JavaScript e os recursos estão incorporados, sem dependência de um servidor Metro. Resultado do Xcode: zero erros, três avisos de bibliotecas/fases de compilação das dependências.

## Revisão aplicada

- Ajuste da tela com KeyboardAvoidingView no iOS, preservando acesso aos campos e ações quando o teclado abre.
- Toques nos controles do formulário tratados com o teclado aberto; arrastar permite dispensar o teclado.
- Selecionar o perfil já ativo não dispara uma espera sem novo carregamento.
- Troca de perfil bloqueada durante gravação para evitar mudança de contexto no meio da operação.
- Dependências verificadas pelo Expo; tipagem validada e 12 testes de regras/integração aprovados.

A leitura dos controles do simulador confirmou a tela inicial com Lia e Bento e a navegação para o dia de Lia, incluindo rotina, alimentação, descanso e momentos. A captura de tela pelo controle de aplicativos falhou e a sessão foi interrompida por bloqueio do Mac. A validação interativa dos formulários com teclado e dos demais fluxos no iOS permanece pendente de desbloqueio; não se trata de uma falha de compilação.

## Reproduzir

```sh
npm ci
npm run ios:simulator -- --device "iPhone 17 Pro Max"
```

Uma cópia local do aplicativo desta compilação está em `build/ios-simulator/thinkEdu.app`, ignorada pelo Git. Não é um pacote para App Store ou aparelho físico.

Os projetos nativos são gerados por Expo Prebuild. Alterações permanentes devem ser feitas na configuração Expo ou em config plugins, para sobreviver à regeneração. Autenticação, notificações e cobrança reais continuam fora desta demonstração.
