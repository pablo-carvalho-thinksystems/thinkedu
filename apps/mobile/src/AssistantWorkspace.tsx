import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Image,
  StyleSheet,
  ScrollView,
} from "react-native";
import type { VisibleStore, Actor } from "../../../packages/core/model.mjs";
const departments: Record<string, string> = {
  teacher: "Professor(a)",
  finance: "Financeiro",
  secretary: "Secretaria",
  coordinator: "Coordenação",
  director: "Diretoria",
};
const Txt = ({
  children,
  bold = false,
  size = 14,
  color = "#243451",
}: {
  children: React.ReactNode;
  bold?: boolean;
  size?: number;
  color?: string;
}) => (
  <Text
    style={{
      fontFamily: bold ? "JakartaBold" : "JakartaRegular",
      fontSize: size,
      lineHeight: size * 1.5,
      color,
    }}
  >
    {children}
  </Text>
);
export function AssistantWorkspace({
  data,
  actor,
  busy,
  dispatch,
  onRefresh,
}: {
  data: VisibleStore;
  actor: Actor;
  busy: boolean;
  dispatch: (c: Record<string, unknown> & { type: string }) => Promise<boolean>;
  onRefresh: () => Promise<void>;
}) {
  const [childId, setChild] = useState(data.children[0]?.id || ""),
    [question, setQuestion] = useState(""),
    [selected, setSelected] = useState("");
  useEffect(() => {
    const timer = setInterval(() => {
      void onRefresh();
    }, 15000);
    return () => clearInterval(timer);
  }, [actor.id]);
  useEffect(() => {
    if (selected === "latest" && data.assistantThreads[0])
      setSelected(data.assistantThreads[0].id);
  }, [selected, data.assistantThreads]);
  const thread = data.assistantThreads.find((t) => t.id === selected);
  const suggestions = [
    "Tenho faturas em aberto?",
    "O que vai cair na prova de 20/10/2026?",
    "Como foi o dia em 09/10/2026?",
    "Vai ter aula em 12/10/2026?",
  ];
  async function ask() {
    if (!question.trim()) return;
    const success = await dispatch({
      type: "assistant.ask",
      childId,
      question,
    });
    if (success) {
      setQuestion("");
      setSelected("latest");
    }
  }
  const current = selected === "latest" ? data.assistantThreads[0] : thread;
  if (actor.role !== "family")
    return (
      <View style={{ gap: 16 }}>
        <Txt bold size={26}>
          Caixa do Samuca
        </Txt>
        <Txt size={12}>
          Perguntas encaminhadas para seu setor e seus alunos autorizados.
        </Txt>
        {data.assistantThreads
          .filter((t) => t.department)
          .map((t) => (
            <Pressable
              accessibilityRole="button"
              key={t.id}
              onPress={() => setSelected(t.id)}
              style={s.history}
            >
              <Txt bold>{t.question}</Txt>
              <Txt size={12}>
                {data.children.find((c) => c.id === t.childId)?.name} ·{" "}
                {t.status === "waiting" ? "Aguardando" : "Respondida"}
              </Txt>
            </Pressable>
          ))}
        {thread && (
          <View style={s.compose}>
            {thread.messages
              .filter((m) => m.senderId !== "samuca")
              .map((m) => (
                <Txt key={m.id}>{m.body}</Txt>
              ))}
            <TextInput
              accessibilityLabel="Resposta ao responsável pelo Samuca"
              value={question}
              onChangeText={setQuestion}
              multiline
              maxLength={6000}
              style={s.input}
            />
            <Pressable
              accessibilityRole="button"
              disabled={busy || !question.trim()}
              style={s.send}
              onPress={async () => {
                if (
                  await dispatch({
                    type: "assistant.reply",
                    threadId: thread.id,
                    body: question,
                  })
                )
                  setQuestion("");
              }}
            >
              <Txt bold color="white">
                Enviar retorno
              </Txt>
            </Pressable>
          </View>
        )}
      </View>
    );
  return (
    <View style={{ gap: 16 }}>
      <View style={s.hero}>
        <Image
          source={require("../assets/samuca.png")}
          style={{ width: 108, height: 108 }}
          resizeMode="contain"
        />
        <View style={{ flex: 1 }}>
          <Txt bold size={25} color="white">
            Oi, sou o Samuca!
          </Txt>
          <Txt color="#dbe4ff" size={12}>
            Seu assistente para acompanhar a escola e os seus filhos.
          </Txt>
        </View>
      </View>
      <Txt size={12}>
        Consulto registros publicados e orientações aprovadas. Quando faltar uma
        resposta, encaminho sua pergunta à escola.
      </Txt>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {data.children.map((c) => (
          <Pressable
            key={c.id}
            accessibilityRole="button"
            onPress={() => {
              setChild(c.id);
              setSelected("");
            }}
            style={[
              s.chip,
              { backgroundColor: childId === c.id ? "#d7e98a" : "white" },
            ]}
          >
            <Txt bold size={12}>
              {c.name}
            </Txt>
          </Pressable>
        ))}
      </ScrollView>
      {current ? (
        <View style={{ gap: 12 }}>
          <Pressable accessibilityRole="button" onPress={() => setSelected("")}>
            <Txt bold color="#304bff">
              ← Nova pergunta
            </Txt>
          </Pressable>
          {current.messages
            .filter((m) => m.senderId === "samuca" || m.senderId === actor.id)
            .map((m) => (
              <View
                key={m.id}
                style={[s.bubble, m.senderId === actor.id ? s.mine : s.theirs]}
              >
                <Txt bold size={10} color="#63708a">
                  {m.senderId === "samuca" ? "SAMUCA" : "VOCÊ"} ·{" "}
                  {new Date(m.at).toLocaleString("pt-BR")}
                </Txt>
                <Txt>{m.body}</Txt>
              </View>
            ))}
          {current.sources.length > 0 && (
            <View style={s.source}>
              <Txt bold size={11}>
                Fontes consultadas
              </Txt>
              {current.sources.map((r) => (
                <Txt key={r.id} size={11}>
                  {r.label}
                </Txt>
              ))}
            </View>
          )}
          {current.status === "waiting" && (
            <View style={s.source}>
              <Txt bold size={12}>
                Aguardando {departments[current.department || "secretary"]}
              </Txt>
              <Txt size={11}>
                O retorno aparecerá aqui quando a escola responder. Você pode
                acompanhar esta conversa pelo histórico.
              </Txt>
            </View>
          )}
        </View>
      ) : (
        <>
          <View style={s.compose}>
            <Txt bold>O que você quer saber?</Txt>
            <TextInput
              accessibilityLabel="Pergunta para o Samuca"
              placeholder="Pergunte sobre a rotina, provas, cobranças…"
              value={question}
              onChangeText={setQuestion}
              multiline
              maxLength={2000}
              style={s.input}
            />
            <Pressable
              accessibilityRole="button"
              disabled={busy || !question.trim() || !childId}
              onPress={() => void ask()}
              style={[s.send, { opacity: busy || !question.trim() ? 0.6 : 1 }]}
            >
              <Txt bold color="white">
                {busy ? "Consultando…" : "Conversar com Samuca ↗"}
              </Txt>
            </Pressable>
          </View>
          <Txt bold size={12}>
            Experimente perguntar
          </Txt>
          {suggestions.map((q) => (
            <Pressable
              key={q}
              accessibilityRole="button"
              onPress={() => setQuestion(q)}
              style={s.chip}
            >
              <Txt size={12}>{q} ↗</Txt>
            </Pressable>
          ))}
          <Txt bold size={17}>
            Suas conversas
          </Txt>
          {data.assistantThreads
            .filter((t) => t.childId === childId)
            .map((t) => (
              <Pressable
                key={t.id}
                accessibilityRole="button"
                onPress={() => setSelected(t.id)}
                style={s.history}
              >
                <Txt bold size={13}>
                  {t.question}
                </Txt>
                <Txt size={11} color="#63708a">
                  {t.status === "waiting"
                    ? "Aguardando a escola"
                    : "Resposta disponível"}{" "}
                  · {new Date(t.updatedAt).toLocaleDateString("pt-BR")}
                </Txt>
              </Pressable>
            ))}
        </>
      )}
    </View>
  );
}
const s = StyleSheet.create({
  hero: {
    backgroundColor: "#172d65",
    padding: 18,
    borderRadius: 28,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  chip: {
    padding: 12,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#dce2ee",
  },
  compose: { padding: 18, borderRadius: 24, backgroundColor: "white", gap: 12 },
  input: {
    fontFamily: "JakartaRegular",
    fontSize: 14,
    minHeight: 105,
    borderWidth: 1,
    borderColor: "#dce2ee",
    borderRadius: 15,
    padding: 14,
    textAlignVertical: "top",
  },
  send: {
    padding: 15,
    borderRadius: 16,
    backgroundColor: "#304bff",
    alignItems: "center",
  },
  bubble: { padding: 16, borderRadius: 22, gap: 8 },
  mine: { backgroundColor: "#e6edff", marginLeft: 28 },
  theirs: { backgroundColor: "white", marginRight: 8 },
  source: { padding: 14, borderRadius: 18, backgroundColor: "#edf3cd", gap: 5 },
  history: { padding: 16, borderRadius: 20, backgroundColor: "white", gap: 6 },
});
