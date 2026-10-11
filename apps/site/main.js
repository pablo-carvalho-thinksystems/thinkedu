const atelierUrl = new URL("./assets/atelier.png", import.meta.url).href;
const childUrl = new URL("./assets/lia.png", import.meta.url).href;
document.documentElement.classList.add("js");
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const reveal = new IntersectionObserver(
  (entries) =>
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("visible");
        reveal.unobserve(e.target);
      }
    }),
  { threshold: 0.12 },
);
document.querySelectorAll(".reveal").forEach((e) => reveal.observe(e));
let scheduled = false;
function updateScroll() {
  const total = document.documentElement.scrollHeight - innerHeight;
  document.querySelector(".progress").style.transform =
    `scaleX(${total ? scrollY / total : 0})`;
  if (!reduced) {
    const photo = document.querySelector(".cinema>img");
    const rect = photo.parentElement.getBoundingClientRect();
    if (rect.top < innerHeight && rect.bottom > 0)
      photo.style.transform = `translateY(${Math.max(-35, Math.min(35, rect.top * 0.05))}px)`;
  }
  scheduled = false;
}
addEventListener(
  "scroll",
  () => {
    if (!scheduled) {
      scheduled = true;
      requestAnimationFrame(updateScroll);
    }
  },
  { passive: true },
);
const personas = {
  family: {
    number: "01",
    title: "O dia deles.<br>Mais perto de você.",
    description:
      "Uma janela para as descobertas dos seus filhos. Rotina, recados, materiais e calendário, com o contexto de cada criança.",
    features: [
      "Todos os filhos no mesmo acesso",
      "Timeline com novidades da turma",
      "Financeiro reunido para a família",
    ],
    badge: "Um só acesso.",
    badgeSub: "Uma família inteira mais perto.",
    heading: "Oi, Rafael!",
    strip: "Lia e Bento",
    stripSub: "Todos os filhos · Escola Semente",
    card: "Cada descoberta.<br>Mais perto.",
    body: "Hoje foi dia de criar com argila. Uma nova história para compartilhar.",
    rows: [
      ["Rotina do dia", "Acompanhar ↗"],
      ["Comunicados", "2 novidades"],
      ["Financeiro da família", "Ver cobranças"],
    ],
  },
  teacher: {
    number: "02",
    title: "Uma turma inteira.<br>Um cuidado de cada vez.",
    description:
      "Do registro individual ao retorno geral. O professor organiza o dia e compartilha descobertas com as famílias das suas turmas.",
    features: [
      "Acesso às turmas vinculadas",
      "Publicações e mensagens para toda a turma",
      "Chamada, rotina e planejamento",
    ],
    badge: "Uma publicação.",
    badgeSub: "Todos os responsáveis da turma.",
    heading: "Olá, Beatriz.",
    strip: "Jardim II",
    stripSub: "16 alunos · Unidade Central",
    card: "Conte para<br>toda a turma.",
    body: "O dia, as descobertas e os retornos gerais em uma única publicação.",
    rows: [
      ["Atualização na timeline", "Publicar ↗"],
      ["Comunicado da turma", "Escrever ↗"],
      ["Mensagem para todos", "Enviar ↗"],
    ],
  },
  school: {
    number: "03",
    title: "A escola inteira.<br>Uma visão mais clara.",
    description:
      "Uma operação com contexto: unidades, turmas, comunicação e perfis de acesso, com o histórico das ações da equipe.",
    features: [
      "Visão por unidade ou visão conjunta",
      "Perfis com permissões diferentes",
      "Auditoria de ações e registros",
    ],
    badge: "Do detalhe ao todo.",
    badgeSub: "A gestão encontra seu contexto.",
    heading: "Bom dia, direção.",
    strip: "Escola Semente",
    stripSub: "4 unidades · visão conjunta",
    card: "Mais clareza.<br>Mais cuidado.",
    body: "Acompanhe as turmas e a comunicação da escola com o contexto de cada unidade.",
    rows: [
      ["Turmas e alunos", "20 · 320"],
      ["Comunicação", "Acompanhar ↗"],
      ["Histórico de ações", "Consultar ↗"],
    ],
  },
};
function persona(key) {
  const p = personas[key];
  document.querySelectorAll("[data-persona]").forEach((b) => {
    const active = b.dataset.persona === key;
    b.setAttribute("aria-selected", String(active));
    b.tabIndex = active ? 0 : -1;
  });
  document
    .querySelector("#persona-panel")
    .setAttribute("aria-labelledby", `tab-${key}`);
  document.querySelector(".chapterNumber").textContent = p.number;
  document.querySelector("#persona-title").innerHTML = p.title;
  document.querySelector("#persona-description").textContent = p.description;
  document.querySelector("#persona-features").replaceChildren(
    ...p.features.map((text) => {
      const li = document.createElement("li");
      li.textContent = text;
      return li;
    }),
  );
  document.querySelector("#product-badge").textContent = p.badge;
  document.querySelector("#product-badge-sub").textContent = p.badgeSub;
  document.querySelector("#phone-content").innerHTML =
    `<div class="phoneBody"><h4>${p.heading}</h4><div class="childStrip"><img src="${childUrl}" alt="Foto ilustrativa de uma criança"><div><b>${p.strip}</b><small>${p.stripSub}</small></div></div><div class="phoneCard"><small>${key === "teacher" ? "ATUALIZAÇÕES GERAIS" : "ESCOLA E FAMÍLIA"}</small><b>${p.card}</b><img src="${atelierUrl}" alt="Atividade ilustrativa na escola"><p>${p.body}</p></div><div class="phoneRows">${p.rows.map((r) => `<div><span>${r[0]}</span><strong>${r[1]}</strong></div>`).join("")}</div></div>`;
}
document.querySelectorAll("[data-persona]").forEach((b) => {
  b.addEventListener("click", () => persona(b.dataset.persona));
  b.addEventListener("keydown", (e) => {
    if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
      e.preventDefault();
      const buttons = [...document.querySelectorAll("[data-persona]")];
      const i = buttons.indexOf(b);
      const next =
        e.key === "Home"
          ? 0
          : e.key === "End"
            ? 2
            : (i + (e.key === "ArrowRight" ? 1 : 2)) % 3;
      persona(buttons[next].dataset.persona);
      buttons[next].focus();
    }
  });
});
persona("family");
const units = {
  all: {
    name: "Quatro unidades. Uma visão conjunta.",
    students: "320",
    classes: "20",
    count: "4",
    row: "Central",
    row2: "Jardins",
  },
  central: { name: "Unidade Central. O cuidado começa aqui.", row: "Central" },
  jardins: {
    name: "Unidade Jardins. Descobertas por toda parte.",
    row: "Jardins",
  },
  parque: {
    name: "Unidade Parque. Uma rotina com espaço para crescer.",
    row: "Parque",
  },
  lago: { name: "Unidade Lago. Cada turma, mais perto.", row: "Lago" },
};
document.querySelector("#unit-select").addEventListener("change", (e) => {
  const u = units[e.target.value];
  document.querySelector("#unit-caption").textContent = u.name;
  document.querySelector("#unit-students").textContent = u.students || "80";
  document.querySelector("#unit-classes").textContent = u.classes || "5";
  document.querySelector("#unit-count").textContent = u.count || "1";
  document.querySelector("#unit-row").textContent = u.row;
  document.querySelector("#unit-row2").textContent = u.row2 || u.row;
});
function openDialog(dialog) {
  dialog.showModal();
  document.body.classList.add("dialog-open");
}
document.querySelectorAll("[data-video]").forEach((b) =>
  b.addEventListener("click", () => {
    const dialog = document.querySelector("#video-dialog");
    openDialog(dialog);
    dialog
      .querySelector("video")
      .play()
      .catch(() => {});
  }),
);
document
  .querySelector("#contact-open")
  .addEventListener("click", () =>
    openDialog(document.querySelector("#contact-dialog")),
  );
document.querySelectorAll("dialog").forEach((d) => {
  d.querySelector(".closeDialog").addEventListener("click", () => d.close());
  d.addEventListener("close", () => {
    document.body.classList.remove("dialog-open");
    d.querySelector("video")?.pause();
  });
  d.addEventListener("click", (e) => {
    if (e.target === d) {
      const r = d.getBoundingClientRect();
      if (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      )
        d.close();
    }
  });
});
document.querySelector("#contact-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const fields = new FormData(e.target);
  const text = `Olá, Pablo! Gostaria de conhecer o thinkEdu.\n\nNome: ${fields.get("name")}\nEscola: ${fields.get("school")}\nContato: ${fields.get("email")}\n\n${fields.get("message") || ""}`;
  const link = document.querySelector("#email-request");
  link.href =
    "mailto:pablo.carvalho@thinksystems.com.br?subject=" +
    encodeURIComponent("Apresentação thinkEdu · " + fields.get("school")) +
    "&body=" +
    encodeURIComponent(text);
  link.hidden = false;
  document.querySelector("#contact-status").textContent =
    "Pedido pronto. Abra seu e-mail para revisar e enviar para pablo.carvalho@thinksystems.com.br.";
  link.focus();
});
