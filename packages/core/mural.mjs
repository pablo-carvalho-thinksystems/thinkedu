export function seedPosts() {
  return [
    {
      id: "m-boas-vindas",
      title: "Pequenos gestos, grandes descobertas",
      body: "Nesta semana, exploramos cores, texturas e o cuidado com o outro. Em casa, convidem as crianças a contar qual foi a descoberta favorita do dia. Cada conversa também faz parte do aprender.",
      kind: "text",
      attachment: null,
      childIds: ["lia", "bento", "miguel", "alice"],
      authorId: "direcao",
      createdAt: "2026-10-09T11:00:00-03:00",
    },
    {
      id: "m-video",
      title: "Uma história para assistir juntos",
      body: "Um espaço para vídeos que aproximam escola e família. Este vídeo de demonstração mostra como os materiais serão reproduzidos dentro do aplicativo.",
      kind: "video",
      attachment: {
        name: "Vídeo de demonstração · thinkEdu",
        uri: "demo:school-video",
        mimeType: "video/mp4",
      },
      childIds: ["lia", "miguel", "alice"],
      authorId: "ana",
      createdAt: "2026-10-08T14:00:00-03:00",
    },
    {
      id: "m-arquivo",
      title: "Ideias para brincar em casa",
      body: "Massinha, caixas e imaginação: não é preciso muito para criar bons momentos. O arquivo de exemplo ajuda a conhecer a área de materiais compartilhados.",
      kind: "file",
      attachment: {
        name: "Material de exemplo.pdf",
        uri: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        mimeType: "application/pdf",
      },
      childIds: ["bento"],
      authorId: "ana",
      createdAt: "2026-10-07T14:00:00-03:00",
    },
  ];
}
export function eventsForChild(events, childId) {
  return childId ? events.filter((e) => e.childIds.includes(childId)) : [];
}
export function validateAttachment(value, kind, allowLocal = false) {
  if (kind === "text") return null;
  if (
    !value ||
    typeof value.name !== "string" ||
    !value.name.trim() ||
    value.name.length > 160 ||
    typeof value.uri !== "string" ||
    value.uri.length > 2048
  )
    throw new Error("Informe um arquivo ou link válido.");
  let allowed = allowLocal && /^local:\d{13}-[a-zA-Z0-9_.-]+$/.test(value.uri);
  try {
    const url = new URL(value.uri);
    allowed ||=
      url.protocol === "https:" &&
      !!url.hostname &&
      !url.username &&
      !url.password;
  } catch {}
  if (!allowed)
    throw new Error(
      "Use um link HTTPS. Arquivos locais são exclusivos da demonstração no dispositivo.",
    );
  if (kind === "video" && !/\.(mp4|m4v|mov|webm)(?:[?#]|$)/i.test(value.uri))
    throw new Error(
      "Use um arquivo de vídeo MP4, MOV ou WebM. Links de páginas não são vídeos diretos.",
    );
  return {
    name: value.name.trim(),
    uri: value.uri.trim(),
    mimeType:
      typeof value.mimeType === "string"
        ? value.mimeType.slice(0, 100)
        : kind === "video"
          ? "video/mp4"
          : "application/octet-stream",
  };
}
