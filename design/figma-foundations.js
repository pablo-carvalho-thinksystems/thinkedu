// Executed by Figma MCP use_figma. No whole-screen raster is imported.
await Promise.all(
  ["Regular", "Bold", "ExtraBold"].map((style) =>
    figma.loadFontAsync({ family: "Plus Jakarta Sans", style }),
  ),
);
const page = figma.currentPage;
page.name = "01 · Componentes";
const created = [];
const rgb = (hex) => ({
  r: parseInt(hex.slice(1, 3), 16) / 255,
  g: parseInt(hex.slice(3, 5), 16) / 255,
  b: parseInt(hex.slice(5, 7), 16) / 255,
});
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
  green: "#238653",
  canvas: "#F2F5FB",
};
const primitives = figma.variables.createVariableCollection(
  "thinkEdu · Primitivos",
);
primitives.renameMode(primitives.modes[0].modeId, "Valor");
const semantic = figma.variables.createVariableCollection("thinkEdu · Cores");
semantic.renameMode(semantic.modes[0].modeId, "Claro");
const geometry = figma.variables.createVariableCollection(
  "thinkEdu · Geometria",
);
geometry.renameMode(geometry.modes[0].modeId, "Padrão");
const vars = {};
for (const [name, hex] of Object.entries(palette)) {
  const primitive = figma.variables.createVariable(name, primitives, "COLOR");
  primitive.scopes = [];
  primitive.setValueForMode(primitives.defaultModeId, rgb(hex));
  primitive.setVariableCodeSyntax("WEB", `var(--primitive-${name})`);
  const v = figma.variables.createVariable(`color/${name}`, semantic, "COLOR");
  v.scopes = ["FRAME_FILL", "SHAPE_FILL", "TEXT_FILL", "STROKE_COLOR"];
  v.setValueForMode(semantic.defaultModeId, {
    type: "VARIABLE_ALIAS",
    id: primitive.id,
  });
  v.setVariableCodeSyntax("WEB", `var(--${name})`);
  v.setVariableCodeSyntax("ANDROID", `ThinkEdu.colors.${name}`);
  v.setVariableCodeSyntax("iOS", `ThinkEdu.colors.${name}`);
  vars[name] = v;
}
for (const [name, value] of Object.entries({
  "space/xs": 4,
  "space/sm": 8,
  "space/md": 16,
  "space/lg": 24,
  "space/xl": 32,
  "radius/control": 16,
  "radius/card": 24,
  "radius/dock": 28,
})) {
  const v = figma.variables.createVariable(name, geometry, "FLOAT");
  v.scopes = [name.startsWith("radius") ? "CORNER_RADIUS" : "GAP"];
  v.setValueForMode(geometry.defaultModeId, value);
  v.setVariableCodeSyntax("WEB", `var(--${name.replace("/", "-")})`);
  vars[name] = v;
}
const styles = {};
for (const [name, size, style, line] of [
  ["Heading", 32, "ExtraBold", 38],
  ["Title", 20, "Bold", 28],
  ["Body", 14, "Regular", 21],
  ["Label", 12, "Bold", 18],
  ["Caption", 10, "Regular", 15],
]) {
  const t = figma.createTextStyle();
  t.name = `thinkEdu/${name}`;
  t.fontName = { family: "Plus Jakarta Sans", style };
  t.fontSize = size;
  t.lineHeight = { unit: "PIXELS", value: line };
  t.letterSpacing = { unit: "PIXELS", value: name === "Heading" ? -1.2 : 0 };
  styles[name] = t;
}
const shadow = figma.createEffectStyle();
shadow.name = "thinkEdu/Dock shadow";
shadow.effects = [
  {
    type: "DROP_SHADOW",
    visible: true,
    blendMode: "NORMAL",
    color: { ...rgb(palette.blue), a: 0.1 },
    offset: { x: 0, y: 4 },
    radius: 14,
    spread: 0,
  },
];
function fill(node, name) {
  node.fills = [
    figma.variables.setBoundVariableForPaint(
      { type: "SOLID", color: rgb(palette[name]) },
      "color",
      vars[name],
    ),
  ];
}
function text(parent, value, width = 311, style = "Body", color = "ink") {
  const t = figma.createText();
  created.push(t.id);
  t.fontName = styles[style].fontName;
  t.fontSize = styles[style].fontSize;
  t.lineHeight = styles[style].lineHeight;
  t.letterSpacing = styles[style].letterSpacing;
  t.textStyleId = styles[style].id;
  t.textAutoResize = "HEIGHT";
  t.resize(width, styles[style].fontSize * 1.5);
  t.textAutoResize = "HEIGHT";
  t.characters = value;
  fill(t, color);
  parent.appendChild(t);
  return t;
}
function component(name, width = 343, bg = "white", pad = 16, gap = 8) {
  const c = figma.createComponent();
  created.push(c.id);
  c.name = name;
  c.layoutMode = "VERTICAL";
  c.resize(width, 80);
  c.primaryAxisSizingMode = "AUTO";
  c.counterAxisSizingMode = "FIXED";
  c.paddingTop = pad;
  c.paddingBottom = pad;
  c.paddingLeft = pad;
  c.paddingRight = pad;
  c.itemSpacing = gap;
  c.setBoundVariable("cornerRadius", vars["radius/card"]);
  c.setBoundVariable("itemSpacing", vars["space/sm"]);
  fill(c, bg);
  c.description = `Componente editável thinkEdu. Fonte: design/figma-foundations.js e componentes do aplicativo.`;
  page.appendChild(c);
  c.x = 80;
  c.y = 80 + created.length * 2;
  return c;
}
function prop(c, node, name) {
  const key = c.addComponentProperty(name, "TEXT", node.characters);
  node.componentPropertyReferences = { characters: key };
  return key;
}
const maps = {};
const buttonVariants = [];
for (const [tone, bg, fg] of [
  ["Primary", "blue", "white"],
  ["Outline", "white", "blue"],
  ["Orange", "orange", "white"],
])
  for (const state of ["Default", "Disabled"]) {
    const c = component(`Tone=${tone}, State=${state}`, 343, bg, 14);
    c.opacity = state === "Disabled" ? 0.45 : 1;
    c.counterAxisAlignItems = "CENTER";
    c.setBoundVariable("cornerRadius", vars["radius/control"]);
    if (tone === "Outline") {
      c.strokes = [
        figma.variables.setBoundVariableForPaint(
          { type: "SOLID", color: rgb(palette.blue) },
          "color",
          vars.blue,
        ),
      ];
      c.strokeWeight = 1;
    }
    const label = text(c, "Continuar", 315, "Body", fg);
    label.fontName = { family: "Plus Jakarta Sans", style: "Bold" };
    label.textAlignHorizontal = "CENTER";
    label.name = "Label";
    buttonVariants.push(c);
  }
const buttonSet = figma.combineAsVariants(buttonVariants, page);
created.push(buttonSet.id);
buttonSet.name = "Button";
buttonSet.x = 80;
buttonSet.y = 150;
buttonSet.children.forEach((c, i) => {
  c.x = (i % 2) * 375;
  c.y = Math.floor(i / 2) * 80;
});
buttonSet.resizeWithoutConstraints(750, 260);
const labelKey = buttonSet.addComponentProperty("Label", "TEXT", "Continuar");
for (const c of buttonSet.children) {
  const t = c.findAllWithCriteria({ types: ["TEXT"] })[0];
  t.componentPropertyReferences = { characters: labelKey };
}
maps.Button = { id: buttonSet.id, labelKey };
const selector = component("ChildSelector", 343, "sky", 12);
selector.layoutMode = "HORIZONTAL";
selector.counterAxisAlignItems = "CENTER";
selector.itemSpacing = 12;
const av = figma.createEllipse();
created.push(av.id);
av.resize(36, 36);
fill(av, "white");
selector.appendChild(av);
const label = text(selector, "Todos os filhos", 255, "Label");
maps.ChildSelector = {
  id: selector.id,
  labelKey: prop(selector, label, "Label"),
};
selector.x = 880;
selector.y = 150;
const header = component("BrandHeader", 343, "white", 0);
const brand = text(header, "thinkEdu·", 300, "Heading");
brand.fontSize = 27;
brand.lineHeight = { unit: "PIXELS", value: 34 };
const strap = text(header, "THINKSYSTEMS · EDUCAÇÃO", 300, "Caption", "muted");
strap.letterSpacing = { unit: "PIXELS", value: 1.2 };
maps.BrandHeader = { id: header.id };
header.x = 880;
header.y = 250;
const heading = component("Heading", 343, "white", 0);
const h = text(heading, "Perto de cada\ndescoberta.", 343, "Heading");
maps.Heading = { id: heading.id, labelKey: prop(heading, h, "Label") };
heading.x = 880;
heading.y = 350;
const cardVariants = [];
for (const tone of ["white", "sky", "lime", "peach", "blue"]) {
  const c = component(`Tone=${tone}`, 343, tone, 20, 8);
  text(
    c,
    "LIA · JARDIM II",
    303,
    "Caption",
    tone === "blue" ? "white" : "muted",
  ).name = "Meta";
  text(
    c,
    "Cada descoberta conta.",
    303,
    "Title",
    tone === "blue" ? "white" : "ink",
  ).name = "Title";
  text(
    c,
    "Uma informação clara para acompanhar o dia.",
    303,
    "Body",
    tone === "blue" ? "white" : "muted",
  ).name = "Body";
  cardVariants.push(c);
}
const cardSet = figma.combineAsVariants(cardVariants, page);
created.push(cardSet.id);
cardSet.name = "InfoCard";
cardSet.x = 80;
cardSet.y = 480;
cardSet.children.forEach((c, i) => {
  c.x = (i % 3) * 375;
  c.y = Math.floor(i / 3) * 200;
});
cardSet.resizeWithoutConstraints(1130, 410);
const cardProps = {};
for (const name of ["Meta", "Title", "Body"]) {
  const k = cardSet.addComponentProperty(name, "TEXT", name);
  cardProps[name] = k;
  for (const c of cardSet.children) {
    c
      .findAllWithCriteria({ types: ["TEXT"] })
      .find((t) => t.name === name).componentPropertyReferences = {
      characters: k,
    };
  }
}
maps.InfoCard = { id: cardSet.id, props: cardProps };
const row = component("DetailRow", 343, "white", 12);
row.layoutMode = "HORIZONTAL";
row.primaryAxisAlignItems = "SPACE_BETWEEN";
row.counterAxisAlignItems = "CENTER";
const rt = text(row, "Almoço", 140, "Label");
const rv = text(row, "Comeu bem", 159, "Body", "muted");
rv.textAlignHorizontal = "RIGHT";
maps.DetailRow = {
  id: row.id,
  titleKey: prop(row, rt, "Title"),
  valueKey: prop(row, rv, "Value"),
};
row.x = 80;
row.y = 960;
const avatar = component("Avatar", 44, "sky", 0);
avatar.resize(44, 44);
avatar.primaryAxisSizingMode = "FIXED";
avatar.cornerRadius = 22;
avatar.counterAxisAlignItems = "CENTER";
avatar.primaryAxisAlignItems = "CENTER";
const initials = text(avatar, "LI", 44, "Label", "blue");
initials.textAlignHorizontal = "CENTER";
maps.Avatar = { id: avatar.id, labelKey: prop(avatar, initials, "Initials") };
avatar.x = 880;
avatar.y = 960;
const photoComp = component("AtelierPhoto", 343, "sky", 0);
photoComp.resize(343, 210);
photoComp.primaryAxisSizingMode = "FIXED";
photoComp.clipsContent = true;
maps.AtelierPhoto = { id: photoComp.id };
photoComp.x = 80;
photoComp.y = 1100;
const navVariants = [];
for (const role of ["Family", "Teacher"]) {
  const labels =
    role === "Family"
      ? ["Hoje", "Agenda", "Conversas", "Perfil"]
      : ["Turma", "Mensagens", "Agenda", "Mais"];
  for (const active of labels) {
    const c = component(`Role=${role}, Active=${active}`, 367, "white", 6);
    c.layoutMode = "HORIZONTAL";
    c.primaryAxisAlignItems = "SPACE_BETWEEN";
    c.counterAxisAlignItems = "CENTER";
    c.setBoundVariable("cornerRadius", vars["radius/dock"]);
    c.strokes = [
      figma.variables.setBoundVariableForPaint(
        { type: "SOLID", color: rgb(palette.blue) },
        "color",
        vars.blue,
      ),
    ];
    c.strokeWeight = 1.5;
    c.effectStyleId = shadow.id;
    for (const name of labels) {
      const item = figma.createAutoLayout("VERTICAL");
      created.push(item.id);
      item.resize(81, 52);
      item.primaryAxisSizingMode = "FIXED";
      item.counterAxisSizingMode = "FIXED";
      item.primaryAxisAlignItems = "CENTER";
      item.counterAxisAlignItems = "CENTER";
      item.cornerRadius = 20;
      item.itemSpacing = 3;
      fill(item, name === active ? "blue" : "white");
      c.appendChild(item);
      const iconName = {
        Hoje: "home",
        Agenda: "calendar",
        Conversas: "message",
        Perfil: "user",
        Turma: "users",
        Mensagens: "message",
        Mais: "more",
      }[name];
      const svg = figma.createNodeFromSvg(
        ICONS[iconName].replaceAll(
          "#14203D",
          name === active ? palette.white : palette.ink,
        ),
      );
      created.push(svg.id, ...svg.findAll(() => true).map((n) => n.id));
      item.appendChild(svg);
      text(
        item,
        name,
        75,
        "Caption",
        name === active ? "white" : "ink",
      ).textAlignHorizontal = "CENTER";
    }
    navVariants.push(c);
  }
}
const navSet = figma.combineAsVariants(navVariants, page);
created.push(navSet.id);
navSet.name = "BottomNavigation";
navSet.x = 80;
navSet.y = 1400;
navSet.children.forEach((c, i) => {
  c.x = (i % 2) * 410;
  c.y = Math.floor(i / 2) * 95;
});
navSet.resizeWithoutConstraints(820, 390);
maps.BottomNavigation = { id: navSet.id };
const familyPage = figma.createPage();
familyPage.name = "02 · Família";
created.push(familyPage.id);
const teacherPage = figma.createPage();
teacherPage.name = "03 · Educadora";
created.push(teacherPage.id);
return {
  createdNodeIds: created,
  mutatedNodeIds: [page.id],
  pages: {
    components: page.id,
    family: familyPage.id,
    teacher: teacherPage.id,
  },
  components: maps,
  variables: Object.fromEntries(
    Object.entries(vars).map(([k, v]) => [k, v.id]),
  ),
  styles: Object.fromEntries(Object.entries(styles).map(([k, v]) => [k, v.id])),
  shadowId: shadow.id,
  collections: [primitives.id, semantic.id, geometry.id],
  validation: {
    componentFamilies: Object.keys(maps),
    colorVariables: 22,
    geometryVariables: 8,
    font: "Plus Jakarta Sans",
  },
};
