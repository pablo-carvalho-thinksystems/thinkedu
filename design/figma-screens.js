// Native editable screens; run once per page, using existing local components.
const cfg = CONFIG;
await Promise.all(
  ["Regular", "Bold", "ExtraBold"].map((style) =>
    figma.loadFontAsync({ family: "Plus Jakarta Sans", style }),
  ),
);
const page = await figma.getNodeByIdAsync(cfg.page);
await figma.setCurrentPageAsync(page);
const ids = [];
const screens = {};
const links = [];
const palette = {
  blue: "#254BFF",
  lime: "#E6F581",
  orange: "#FF754B",
  sky: "#EAF0FF",
  peach: "#FFF0E7",
  ink: "#14203D",
  white: "#FFFFFF",
  muted: "#62708A",
  line: "#E3E8F2",
  canvas: "#F2F5FB",
};
const variables = {};
for (const [k, v] of Object.entries(cfg.variables))
  variables[k] = await figma.variables.getVariableByIdAsync(v);
const components = {};
for (const [k, v] of Object.entries(cfg.components))
  components[k] = await figma.getNodeByIdAsync(v.id);
const rgb = (h) => ({
  r: parseInt(h.slice(1, 3), 16) / 255,
  g: parseInt(h.slice(3, 5), 16) / 255,
  b: parseInt(h.slice(5, 7), 16) / 255,
});
function fill(n, k) {
  n.fills = [
    figma.variables.setBoundVariableForPaint(
      { type: "SOLID", color: rgb(palette[k]) },
      "color",
      variables[k],
    ),
  ];
}
function frame(parent, name, width = 343, bg = "white", pad = 0, gap = 12) {
  const n = figma.createFrame();
  ids.push(n.id);
  n.name = name;
  n.layoutMode = "VERTICAL";
  n.resize(width, 10);
  n.primaryAxisSizingMode = "AUTO";
  n.counterAxisSizingMode = "FIXED";
  n.paddingTop = n.paddingBottom = n.paddingLeft = n.paddingRight = pad;
  n.itemSpacing = gap;
  fill(n, bg);
  parent.appendChild(n);
  return n;
}
function txt(p, s, size = 14, color = "ink", bold = false, w = 343) {
  const n = figma.createText();
  ids.push(n.id);
  n.fontName = {
    family: "Plus Jakarta Sans",
    style: bold ? "Bold" : "Regular",
  };
  n.fontSize = size;
  n.lineHeight = { unit: "PIXELS", value: Math.round(size * 1.45) };
  n.textAutoResize = "HEIGHT";
  n.resize(w, 30);
  n.textAutoResize = "HEIGHT";
  n.characters = s;
  fill(n, color);
  p.appendChild(n);
  return n;
}
function inst(p, key, props = {}, variant) {
  let c = components[key];
  if (c.type === "COMPONENT_SET")
    c = c.children.find((n) =>
      Object.entries(variant || {}).every(
        ([k, v]) => n.variantProperties[k] === v,
      ),
    );
  const n = c.createInstance();
  p.appendChild(n);
  n.setProperties(props);
  ids.push(n.id, ...n.findAll().map((x) => x.id));
  return n;
}
function button(p, s, to, tone = "Primary") {
  const n = inst(
    p,
    "Button",
    { [cfg.components.Button.labelKey]: s },
    { Tone: tone, State: "Default" },
  );
  if (to) links.push([n, to]);
  return n;
}
function card(p, meta, title, body, tone = "white", to) {
  const keys = cfg.components.InfoCard.props;
  const n = inst(
    p,
    "InfoCard",
    { [keys.Meta]: meta, [keys.Title]: title, [keys.Body]: body },
    { Tone: tone },
  );
  if (to) links.push([n, to]);
  return n;
}
function row(p, title, value, to) {
  const c = cfg.components.DetailRow;
  const n = inst(p, "DetailRow", { [c.titleKey]: title, [c.valueKey]: value });
  if (to) links.push([n, to]);
  return n;
}
function heading(p, s) {
  inst(p, "Heading", { [cfg.components.Heading.labelKey]: s });
}
function selector(p, s = "Lia e Bento") {
  const n = inst(p, "ChildSelector", {
    [cfg.components.ChildSelector.labelKey]: s,
  });
  if (cfg.role === "Family") links.push([n, "children"]);
}
function field(p, label, value) {
  txt(p, label, 11, "muted", true);
  const n = frame(p, label, 343, "canvas", 16, 4);
  n.cornerRadius = 16;
  txt(n, value, 14, "ink", false, 311);
  return n;
}
function calendar(p) {
  const n = frame(p, "Calendário · outubro 2026", 343, "sky", 14, 8);
  n.cornerRadius = 24;
  txt(n, "‹       Outubro 2026       ›", 18, "ink", true, 315);
  const labels = ["D", "S", "T", "Q", "Q", "S", "S"];
  let days = [
    "",
    "",
    "",
    "",
    "1",
    "2",
    "3",
    ...Array.from({ length: 28 }, (_, i) => String(i + 4)),
  ];
  for (let r = -1; r < 5; r++) {
    const line = frame(n, "Semana", 315, "sky", 0, 3);
    line.layoutMode = "HORIZONTAL";
    for (let j = 0; j < 7; j++) {
      const value = r < 0 ? labels[j] : days[r * 7 + j] || "";
      const cell = frame(
        line,
        "Dia " + value,
        42,
        value === "13" ? "blue" : value === "9" ? "lime" : "sky",
        0,
        0,
      );
      cell.cornerRadius = 12;
      cell.paddingTop = cell.paddingBottom = 7;
      const t = txt(
        cell,
        value,
        12,
        value === "13" ? "white" : "ink",
        r < 0,
        42,
      );
      t.textAlignHorizontal = "CENTER";
    }
  }
}
function screen(key, title, active, build, index) {
  const n = frame(page, title, 390, "white", 23.5, 16);
  n.primaryAxisSizingMode = "FIXED";
  n.resize(390, 932);
  n.x = 80 + (index % cfg.cols) * 454;
  n.y = 160 + Math.floor(index / cfg.cols) * 1030;
  n.cornerRadius = 36;
  n.clipsContent = true;
  n.strokes = [{ type: "SOLID", color: rgb(palette.line) }];
  n.strokeWeight = 1;
  txt(n, "9:41                                      ●  ▰", 11, "ink", true);
  inst(n, "BrandHeader");
  const content = frame(n, "Conteúdo · rolagem", 343, "white", 0, 14);
  content.layoutSizingVertical = "FILL";
  content.clipsContent = true;
  content.overflowDirection = "VERTICAL";
  build(content);
  const dock = inst(
    n,
    "BottomNavigation",
    {},
    { Role: cfg.role, Active: active },
  );
  screens[key] = n;
  const targets = cfg.role === "Family"
    ? ["home", "calendar", "notices", "finance"]
    : ["classroom", "inbox", "calendar", "materials"];
  for (const [index, item] of dock.children.entries()) {
    if (targets[index] !== key) links.push([item, targets[index]]);
  }
  return n;
}
if (cfg.role === "Family") {
  screen(
    "home",
    "F01 · Visão da família",
    "Hoje",
    (p) => {
      heading(p, "Perto, mesmo\nde longe.");
      selector(p);
      card(
        p,
        "LIA · INFANTIL 3",
        "Um dia de descobertas",
        "Brincou com argila, almoçou bem e descansou.",
        "sky",
        "day",
      );
      card(
        p,
        "BENTO · BERÇÁRIO",
        "Pequenos grandes passos",
        "Explorou novas texturas e dormiu 1h20.",
        "lime",
        "day",
      );
      card(
        p,
        "PRECISA DE VOCÊ",
        "Passeio ao jardim",
        "Autorize a participação de Lia até 12 out.",
        "peach",
        "notice",
      );
      button(p, "Ver momentos da turma", "moments");
    },
    0,
  );
  screen(
    "children",
    "F02 · Trocar filho",
    "Hoje",
    (p) => {
      heading(p, "Quem vamos\nacompanhar?");
      txt(p, "Uma família. Cada criança, seu mundo.");
      row(p, "Lia e Bento", "Todos os filhos", "home");
      card(
        p,
        "INFANTIL 3",
        "Lia Carvalho",
        "Escola Semente · manhã",
        "sky",
        "day",
      );
      card(
        p,
        "BERÇÁRIO",
        "Bento Carvalho",
        "Escola Semente · integral",
        "lime",
        "day",
      );
    },
    1,
  );
  screen(
    "day",
    "F03 · Dia de Lia",
    "Hoje",
    (p) => {
      heading(p, "O dia da Lia.");
      selector(p, "Lia · Infantil 3");
      txt(p, "SEXTA, 9 OUTUBRO", 11, "muted", true);
      card(
        p,
        "ANA · EDUCADORA",
        "Hoje ela se encantou",
        "Lia explorou a argila e criou um pequeno jardim. Participou com muita curiosidade.",
        "sky",
      );
      row(p, "Alimentação", "Comeu bem");
      row(p, "Descanso", "1h20 · tranquila");
      row(p, "Higiene", "Trocas registradas");
      row(p, "Como se sentiu", "Animada");
      button(p, "Ver momentos", "moments");
    },
    2,
  );
  screen(
    "moments",
    "F04 · Momentos",
    "Hoje",
    (p) => {
      heading(p, "Infância em\nmovimento.");
      selector(p);
      inst(p, "AtelierPhoto");
      txt(p, "Mãos pequenas, grandes ideias.", 22, "ink", true);
      txt(p, "Ateliê da turma · Infantil 3\nHoje, às 10h20 · Ana");
      card(
        p,
        "DESCOBERTAS",
        "Um jardim de argila",
        "Experimentamos texturas, formas e imaginação.",
        "lime",
      );
      txt(p, "Imagem ilustrativa · crianças fictícias", 10, "muted");
    },
    3,
  );
  screen(
    "notices",
    "F05 · Comunicados",
    "Conversas",
    (p) => {
      heading(p, "A escola,\nbem pertinho.");
      selector(p);
      txt(p, "Todos     Pendentes     Conversas", 12, "blue", true);
      card(
        p,
        "AUTORIZAÇÃO · LIA",
        "Passeio ao jardim",
        "Responder até 12 out · 1 pendência",
        "lime",
        "notice",
      );
      card(
        p,
        "MATERIAIS · BENTO",
        "Uma troca de roupa",
        "Enviar na terça-feira, 13 out.",
        "peach",
        "notice",
      );
      card(
        p,
        "ESCOLA SEMENTE",
        "Encontro de famílias",
        "Vamos conversar sobre as descobertas do semestre.",
        "sky",
        "calendar",
      );
      button(p, "Conversar com Ana", "chat", "Outline");
    },
    4,
  );
  screen(
    "notice",
    "F06 · Autorização",
    "Conversas",
    (p) => {
      heading(p, "Um passeio\npara descobrir.");
      card(
        p,
        "LIA · INFANTIL 3",
        "Passeio ao jardim",
        "Terça, 13 out · 9h. Visitaremos o jardim da escola com a turma e as educadoras.",
        "lime",
      );
      txt(p, "Pedimos a sua autorização até 12 de outubro.");
      row(p, "Participante", "Lia Carvalho");
      button(p, "Autorizar para Lia", "notices");
      button(p, "Não autorizar", "notices", "Outline");
      txt(p, "A resposta é individual por criança.", 11, "muted");
      button(p, "Falar com a educadora", "chat", "Outline");
    },
    5,
  );
  screen(
    "finance",
    "F07 · Financeiro",
    "Perfil",
    (p) => {
      heading(p, "Tudo em dia,\ncom clareza.");
      selector(p);
      card(
        p,
        "OUTUBRO · EM ABERTO",
        "R$ 2.600,00",
        "2 mensalidades · vencimento em 10 out.",
        "blue",
      );
      row(p, "Lia · Infantil 3", "R$ 1.450,00", "invoice");
      row(p, "Bento · Berçário", "R$ 1.150,00", "invoice");
      txt(p, "Histórico", 20, "ink", true);
      row(p, "Setembro · Lia", "Pago · R$ 1.450,00");
      txt(p, "Dados de demonstração. Sem cobrança real.", 11, "muted");
    },
    6,
  );
  screen(
    "invoice",
    "F08 · Mensalidade",
    "Perfil",
    (p) => {
      heading(p, "Mensalidade\nde outubro.");
      card(
        p,
        "LIA · INFANTIL 3",
        "R$ 1.450,00",
        "Vence em 10 out · em aberto",
        "sky",
      );
      row(p, "Referência", "Outubro 2026");
      row(p, "Responsável", "Rafael Carvalho");
      row(p, "Escola", "Escola Semente");
      button(p, "Pagar com Pix");
      button(p, "Ver boleto", null, "Outline");
      txt(
        p,
        "Prévia do fluxo. Pagamento requer integração com o provedor financeiro.",
        11,
        "muted",
      );
    },
    7,
  );
  screen(
    "calendar",
    "F09 · Calendário",
    "Agenda",
    (p) => {
      heading(p, "Dias para\nlembrar.");
      selector(p);
      calendar(p);
      card(
        p,
        "13 OUT · 09H",
        "Passeio ao jardim",
        "Lia · Infantil 3 · autorização pendente",
        "lime",
        "notice",
      );
      card(
        p,
        "16 OUT · 18H",
        "Encontro de famílias",
        "Lia e Bento · Escola Semente",
        "sky",
      );
    },
    8,
  );
  screen(
    "chat",
    "F10 · Conversa",
    "Conversas",
    (p) => {
      heading(p, "Conversa\ncom Ana.");
      selector(p, "Lia · Infantil 3");
      card(
        p,
        "ANA · 10H35",
        "Olá, Rafael!",
        "Lia participou muito bem do ateliê hoje. Ficou encantada com a argila!",
        "sky",
      );
      card(
        p,
        "VOCÊ · 10H42",
        "Que alegria!",
        "Ela contou que queria fazer um jardim. Obrigado por compartilhar.",
        "lime",
      );
      field(p, "MENSAGEM", "Escreva para a educadora…");
      button(p, "Enviar mensagem");
      txt(
        p,
        "Canal da escola · respostas no horário de atendimento.",
        11,
        "muted",
      );
    },
    9,
  );
} else {
  screen(
    "classroom",
    "E01 · Minha turma",
    "Turma",
    (p) => {
      heading(p, "Bom dia, Ana!");
      selector(p, "Infantil 3 · manhã");
      card(
        p,
        "ROTINA DE HOJE",
        "4 alunos · 2 publicados",
        "Sexta, 9 out · Escola Semente",
        "sky",
      );
      row(p, "Lia Carvalho", "Publicado · 12h30", "routine");
      row(p, "Miguel Santos", "A registrar", "routine");
      row(p, "Alice Oliveira", "A registrar", "routine");
      row(p, "Bento Carvalho", "Publicado · 12h45", "routine");
      button(p, "Registrar o dia", "routine");
      button(p, "Novo comunicado", "compose", "Outline");
    },
    0,
  );
  screen(
    "routine",
    "E02 · Registrar rotina",
    "Turma",
    (p) => {
      heading(p, "O dia, em\npequenos detalhes.");
      selector(p, "Lia · Infantil 3");
      field(p, "ALIMENTAÇÃO", "Bem   ·   Pouco   ·   Não comeu");
      field(p, "DESCANSO", "80 minutos");
      field(p, "COMO SE SENTIU", "Animada");
      field(p, "HIGIENE", "Trocas registradas");
      field(p, "OBSERVAÇÃO", "Lia criou um jardim no ateliê de argila.");
      button(p, "Revisar e publicar", "classroom");
      button(p, "Salvar rascunho", "classroom", "Outline");
    },
    1,
  );
  screen(
    "inbox",
    "E03 · Mensagens",
    "Mensagens",
    (p) => {
      heading(p, "Famílias\npor perto.");
      txt(p, "Conversas        Comunicados", 12, "blue", true);
      card(
        p,
        "RAFAEL · LIA",
        "Que alegria!",
        "Ela contou que queria fazer um jardim.",
        "sky",
        "chat",
      );
      card(
        p,
        "COMUNICADO · 3 ALUNOS",
        "Passeio ao jardim",
        "1 autorização recebida · 2 pendentes",
        "lime",
        "materials",
      );
      button(p, "Escrever comunicado", "compose");
    },
    2,
  );
  screen(
    "chat",
    "E04 · Conversa com família",
    "Mensagens",
    (p) => {
      heading(p, "Rafael,\nresponsável da Lia.");
      card(
        p,
        "VOCÊ · 10H35",
        "O ateliê de hoje",
        "Lia participou muito bem e explorou a argila.",
        "sky",
      );
      card(
        p,
        "RAFAEL · 10H42",
        "Que alegria!",
        "Obrigado por compartilhar esse momento.",
        "lime",
      );
      field(p, "MENSAGEM", "Escreva uma resposta…");
      button(p, "Enviar mensagem");
    },
    3,
  );
  screen(
    "compose",
    "E05 · Novo comunicado",
    "Mensagens",
    (p) => {
      heading(p, "Uma mensagem\nque chega bem.");
      field(p, "DESTINATÁRIOS", "Infantil 3 · Lia, Miguel e Alice");
      field(p, "TIPO", "Autorização");
      field(p, "TÍTULO", "Passeio ao jardim");
      field(
        p,
        "MENSAGEM",
        "Vamos descobrir o jardim com a turma na terça-feira, às 9h.",
      );
      field(p, "PRAZO PARA RESPOSTA", "12 de outubro de 2026");
      button(p, "Revisar e publicar", "inbox");
      txt(p, "Confira os destinatários antes de enviar.", 11, "muted");
    },
    4,
  );
  screen(
    "materials",
    "E06 · Materiais e respostas",
    "Mais",
    (p) => {
      heading(p, "Tudo pronto\npara amanhã.");
      card(
        p,
        "BERÇÁRIO · 1 ALUNO",
        "Uma troca de roupa",
        "Enviar até terça, 13 out.",
        "peach",
      );
      row(p, "Bento Carvalho", "Aguardando confirmação");
      txt(p, "Autorizações", 20, "ink", true);
      card(
        p,
        "INFANTIL 3",
        "Passeio ao jardim",
        "1 de 3 respostas recebidas",
        "lime",
      );
      row(p, "Lia Carvalho", "Confirmado");
      row(p, "Miguel Santos", "Pendente");
      row(p, "Alice Oliveira", "Pendente");
      button(p, "Nova solicitação", "compose");
    },
    5,
  );
  screen(
    "calendar",
    "E07 · Agenda da turma",
    "Agenda",
    (p) => {
      heading(p, "Organizar\npara acolher.");
      selector(p, "Infantil 3 · manhã");
      calendar(p);
      card(
        p,
        "13 OUT · 09H",
        "Passeio ao jardim",
        "3 alunos · autorizações em acompanhamento",
        "lime",
        "materials",
      );
      button(p, "Novo evento", "event");
    },
    6,
  );
  screen(
    "event",
    "E08 · Criar evento",
    "Agenda",
    (p) => {
      heading(p, "Um encontro\npara a agenda.");
      field(p, "TÍTULO", "Ateliê com as famílias");
      field(p, "DATA", "16 de outubro de 2026");
      field(p, "HORÁRIO", "18:00");
      field(p, "DESTINATÁRIOS", "Infantil 3");
      field(p, "DETALHES", "Uma conversa sobre as descobertas do semestre.");
      button(p, "Criar evento", "calendar");
    },
    7,
  );
}
for (const [n, key] of links)
  if (screens[key])
    await n.setReactionsAsync([
      {
        trigger: { type: "ON_CLICK" },
        actions: [
          {
            type: "NODE",
            destinationId: screens[key].id,
            navigation: "NAVIGATE",
            transition: {
              type: "DISSOLVE",
              easing: { type: "EASE_OUT" },
              duration: 0.18,
            },
            preserveScrollPosition: false,
          },
        ],
      },
    ]);
const title = txt(
  page,
  cfg.role === "Family" ? "thinkEdu · Família" : "thinkEdu · Educadora",
  40,
  "blue",
  true,
  1800,
);
title.x = 80;
title.y = 60;
figma.viewport.scrollAndZoomIntoView(Object.values(screens));
return {
  createdNodeIds: ids,
  mutatedNodeIds: [page.id],
  screens: Object.fromEntries(
    Object.entries(screens).map(([k, v]) => [k, v.id]),
  ),
  validation: {
    screens: Object.keys(screens).length,
    fonts: [
      ...new Set(
        page.findAll((n) => n.type === "TEXT").map((n) => n.fontName.family),
      ),
    ],
    nativeEditable: true,
  },
};
