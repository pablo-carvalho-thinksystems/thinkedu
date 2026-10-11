const normalize = (s) =>
  String(s)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
export function resolveAssistantChild(children, question) {
  const tokens = normalize(question).match(/[a-z0-9]+/g) || [];
  const phrase = ` ${tokens.join(" ")} `;
  const full = children.filter((c) =>
    phrase.includes(` ${normalize(c.name).trim()} `),
  );
  if (full.length === 1) return { childId: full[0].id };
  const matches = children.filter((c) =>
    normalize(c.name)
      .split(/\s+/)
      .some((n) => tokens.includes(n)),
  );
  if (matches.length === 1) return { childId: matches[0].id };
  const named = normalize(question).match(
    /(?:dia|rotina|prova|trabalho)\s+(?:do|da|de)\s+([a-z]+)/,
  )?.[1];
  if (
    matches.length > 1 ||
    (named && !["hoje", "ontem", "amanha"].includes(named))
  )
    return {
      clarification: `Sobre qual criança você quer saber? Me diga o nome: ${children.map((c) => c.name).join(" ou ")}.`,
    };
  // Family invoices are consolidated; no pupil selection is needed.
  if (
    children.length === 1 ||
    /fatura|mensalidade|boleto|cobranc|financeir/.test(normalize(question))
  )
    return { childId: children[0]?.id };
  return {
    clarification: `Sobre qual criança você quer saber? Me diga o nome: ${children.map((c) => c.name).join(" ou ")}.`,
  };
}
