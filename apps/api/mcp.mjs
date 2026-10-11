import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { retrieveKnowledge } from "../../packages/core/assistant.mjs";
import { can } from "../../packages/core/permissions.mjs";
export async function handleSchoolMcp(req, res, body, run, command) {
  const server = new McpServer({ name: "thinkEdu · Samuca", version: "0.1.0" });
  const childSchema = { childId: z.string().min(1).max(100) };
  const add = (name, description, inputSchema, read) =>
    server.registerTool(
      name,
      {
        description,
        inputSchema,
        annotations: { readOnlyHint: true, destructiveHint: false },
      },
      async (args) => {
        const result = await run(name, args, (view) => {
          if (view.currentActor.role !== "family")
            throw Error("Ferramenta exclusiva dos responsáveis.");
          if (args.childId && !view.children.some((c) => c.id === args.childId))
            throw Error("Aluno sem vínculo autorizado.");
          return read(view, args);
        });
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
      },
    );
  add(
    "family_invoices",
    "Cobranças da família autenticada. Nunca recebe ID de outro responsável.",
    {},
    (v) => {
      if (!can(v.currentActor, "finance.read"))
        throw Error("Sem permissão financeira.");
      return v.invoices.map(({ id, childId, due, amount, status }) => ({
        id,
        childId,
        due,
        amount,
        status,
      }));
    },
  );
  add(
    "student_calendar",
    "Eventos confirmados do aluno na data. Ausência de evento NÃO indica ausência de aula.",
    { ...childSchema, date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) },
    (v, a) =>
      v.events.filter(
        (e) => e.childIds.includes(a.childId) && e.date === a.date,
      ),
  );
  add(
    "student_assignments",
    "Orientações e conteúdo programático das atividades do aluno.",
    {
      ...childSchema,
      date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
    },
    (v, a) =>
      v.assignments.filter(
        (w) => w.childIds.includes(a.childId) && (!a.date || w.due === a.date),
      ),
  );
  add(
    "student_routine",
    "Somente rotinas publicadas. Não é acompanhamento em tempo real.",
    { ...childSchema, date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) },
    (v, a) =>
      v.routines.filter(
        (r) => r.childId === a.childId && r.date === a.date && r.published,
      ),
  );
  add(
    "school_knowledge",
    "Busca textual em orientações gerais revisadas pela escola, no escopo do aluno.",
    { ...childSchema, query: z.string().min(1).max(2000) },
    (v, a) =>
      retrieveKnowledge(v, a.query, a.childId, new Date().toISOString()),
  );
  server.registerTool(
    "ask_samuca",
    {
      description:
        "Consulta fontes autorizadas e encaminha dúvidas sem resposta à equipe escolar. Cria uma conversa privada.",
      inputSchema: { ...childSchema, question: z.string().min(1).max(2000) },
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async (args) => {
      const result = await command({ type: "assistant.ask", ...args });
      return {
        content: [
          { type: "text", text: JSON.stringify(result.assistantThreads[0]) },
        ],
      };
    },
  );
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  res.on("close", () => {
    void server.close();
  });
  await server.connect(transport);
  await transport.handleRequest(req, res, body);
}
