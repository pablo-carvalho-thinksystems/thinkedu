import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  TextInput,
  Modal,
  ScrollView,
} from "react-native";
import { can, roleLabels } from "../../../packages/core/permissions.mjs";
import {
  money,
  DEMO_DATE,
  type Actor,
  type VisibleStore,
  type Child,
} from "../../../packages/core/model.mjs";
import { consolidateInvoices } from "../../../packages/core/billing.mjs";
export function StaffWorkspace({
  data,
  actor,
  view = "home",
  busy,
  onGo,
  onCommand,
}: {
  data: VisibleStore;
  actor: Actor;
  view?: string;
  busy: boolean;
  onGo: (page: string) => void;
  onCommand: (
    command: Record<string, unknown> & { type: string },
  ) => Promise<boolean>;
}) {
  const [child, setChild] = useState<Child | null>(null),
    [status, setStatus] = useState("present"),
    [arrival, setArrival] = useState("08:00"),
    [departure, setDeparture] = useState("17:00"),
    [date, setDate] = useState(DEMO_DATE),
    [search, setSearch] = useState("");
  const action = (label: string, page: string) => (
    <Pressable
      accessibilityRole="button"
      style={s.action}
      onPress={() => onGo(page)}
    >
      <Text style={s.actionText}>{label} →</Text>
    </Pressable>
  );
  return (
    <View>
      <Text style={s.eyebrow}>
        {roleLabels[actor.role]} · {data.school.name}
      </Text>
      <Text style={s.title}>
        {view === "finance"
          ? "Financeiro da escola"
          : view === "students"
            ? "As crianças da escola"
            : "Olá, " + actor.name.split(" · ")[0] + "."}
      </Text>
      <Text style={s.copy}>
        Seu espaço acompanha as permissões do seu perfil.
      </Text>
      {view === "home" && (
        <>
          <View style={s.hero}>
            <Text style={s.heroLabel}>THINKEDU · SUA ESCOLA</Text>
            <Text style={s.heroTitle}>
              {can(actor, "routines.read")
                ? "Cuidar, acompanhar, aproximar."
                : can(actor, "finance.read")
                  ? "Clareza para cada família."
                  : "Cada detalhe, bem organizado."}
            </Text>
            <Text style={s.heroCopy}>
              {data.children.length} alunos · {roleLabels[actor.role]}
            </Text>
          </View>
          {can(actor, "students.read") &&
            action("Alunos e responsáveis", "teacherStudents")}
          {can(actor, "routines.read") &&
            action("Rotinas e planejamento", "teacherPlan")}
          {can(actor, "communication.read") && action("Comunicados", "notices")}
          {can(actor, "mural.read") && action("Mural da escola", "mural")}
          {can(actor, "messages.read") &&
            action("Conversas com famílias", "inbox")}
          {can(actor, "calendar.read") && action("Calendário", "calendar")}
          {can(actor, "finance.read") &&
            action("Cobranças por família", "finance")}
          {can(actor, "users.manage") && (
            <View style={s.card}>
              <Text style={s.heading}>Equipe e acessos</Text>
              {data.actors
                .filter((a) => a.role !== "family")
                .map((a) => (
                  <View key={a.id} style={s.row}>
                    <Text style={s.name}>{a.name}</Text>
                    <Text style={s.copy}>
                      {roleLabels[a.role]} ·{" "}
                      {a.active === false ? "Desativado" : "Ativo"}
                    </Text>
                  </View>
                ))}
              <Text style={s.copy}>
                Gerencie os usuários e vínculos de turma no administrativo web.
              </Text>
            </View>
          )}
        </>
      )}
      {view === "students" && (
        <>
          <TextInput
            accessibilityLabel="Buscar aluno"
            placeholder="Buscar aluno"
            value={search}
            onChangeText={setSearch}
            style={s.input}
          />
          {data.children
            .filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
            .map((c) => (
              <View key={c.id} style={s.card}>
                <Text style={s.heading}>{c.name}</Text>
                <Text style={s.copy}>{c.group}</Text>
                {data.actors
                  .filter(
                    (a) => a.role === "family" && a.childIds?.includes(c.id),
                  )
                  .map((a) => (
                    <Text key={a.id} style={s.copy}>
                      Responsável: {a.name}
                    </Text>
                  ))}
                {can(actor, "attendance.read") && (
                  <Text style={s.copy}>
                    Presença:{" "}
                    {(
                      {
                        present: "Na escola",
                        absent: "Ausente",
                        left: "Saída registrada",
                      } as Record<string, string>
                    )[
                      data.attendance.find(
                        (a) => a.childId === c.id && a.date === DEMO_DATE,
                      )?.status || ""
                    ] || "Não registrada"}
                  </Text>
                )}
                {can(actor, "routines.read") &&
                  data.routines
                    .filter((r) => r.childId === c.id && r.date === DEMO_DATE)
                    .map((r) => (
                      <View key={r.id} style={s.routine}>
                        <Text style={s.name}>
                          {r.published ? "Rotina publicada" : "Rascunho"}
                        </Text>
                        <Text style={s.copy}>
                          {r.meal} · Sono {r.sleep} min · {r.mood}
                        </Text>
                        <Text style={s.copy}>{r.note}</Text>
                      </View>
                    ))}
                {can(actor, "attendance.write") && (
                  <Pressable
                    accessibilityRole="button"
                    style={s.action}
                    onPress={() => {
                      setChild(c);
                      setDate(DEMO_DATE);
                      const a = data.attendance.find(
                        (a) => a.childId === c.id && a.date === DEMO_DATE,
                      );
                      setStatus(a?.status || "present");
                      setArrival(a?.arrival || "08:00");
                      setDeparture(a?.departure || "17:00");
                    }}
                  >
                    <Text style={s.actionText}>Registrar presença →</Text>
                  </Pressable>
                )}
              </View>
            ))}
        </>
      )}
      {view === "finance" && can(actor, "finance.read") && (
        <>
          <View style={s.hero}>
            <Text style={s.heroLabel}>EM ABERTO</Text>
            <Text style={s.heroTitle}>
              {money(
                data.invoices
                  .filter((i) => i.status === "open")
                  .reduce((s, i) => s + i.amount, 0),
              )}
            </Text>
            <Text style={s.heroCopy}>
              Valores demonstrativos · Cobranças por família
            </Text>
          </View>
          {data.actors
            .filter((a) => a.role === "family")
            .flatMap((a) =>
              consolidateInvoices(
                data.invoices.filter((i) => a.childIds?.includes(i.childId)),
              ).map((g) => (
                <View key={a.id + g.id} style={s.card}>
                  <Text style={s.heading}>{a.name}</Text>
                  <Text style={s.copy}>
                    {g.reference} · {g.due.split("-").reverse().join("/")}
                  </Text>
                  <Text style={s.amount}>{money(g.amount)}</Text>
                  <Text style={s.copy}>
                    {g.status === "paid" ? "Pago" : "Em aberto"}
                  </Text>
                  {g.invoices.map((i) => (
                    <Text key={i.id} style={s.copy}>
                      {data.children.find((c) => c.id === i.childId)?.name} ·{" "}
                      {money(i.amount)}
                    </Text>
                  ))}
                </View>
              )),
            )}
          <Text style={s.copy}>
            Nenhum pagamento real é processado nesta demonstração.
          </Text>
        </>
      )}
      <Modal
        visible={!!child}
        transparent
        animationType="slide"
        onRequestClose={() => setChild(null)}
      >
        <View style={s.overlay}>
          <ScrollView style={s.sheet}>
            <Text style={s.title}>Presença · {child?.name}</Text>
            <Text style={s.copy}>Data · AAAA-MM-DD</Text>
            <TextInput
              style={s.input}
              accessibilityLabel="Data da presença"
              value={date}
              onChangeText={setDate}
            />
            <View style={s.statuses}>
              {[
                ["present", "Na escola"],
                ["absent", "Ausente"],
                ["left", "Saiu"],
              ].map(([id, label]) => (
                <Pressable
                  key={id}
                  accessibilityRole="button"
                  style={[s.status, status === id && s.active]}
                  onPress={() => setStatus(id)}
                >
                  <Text style={status === id ? s.white : s.name}>{label}</Text>
                </Pressable>
              ))}
            </View>
            {status !== "absent" && (
              <>
                <Text style={s.copy}>Entrada · HH:MM</Text>
                <TextInput
                  style={s.input}
                  accessibilityLabel="Entrada"
                  value={arrival}
                  onChangeText={setArrival}
                />
              </>
            )}
            {status === "left" && (
              <>
                <Text style={s.copy}>Saída · HH:MM</Text>
                <TextInput
                  style={s.input}
                  accessibilityLabel="Saída"
                  value={departure}
                  onChangeText={setDeparture}
                />
              </>
            )}
            <Pressable
              disabled={busy}
              style={[s.action, s.active]}
              accessibilityRole="button"
              onPress={async () => {
                if (
                  await onCommand({
                    type: "attendance.save",
                    childId: child?.id,
                    date,
                    status,
                    arrival,
                    departure,
                    note: "",
                  })
                )
                  setChild(null);
              }}
            >
              <Text style={s.white}>
                {busy ? "Salvando…" : "Salvar presença"}
              </Text>
            </Pressable>
            <Pressable
              style={s.action}
              accessibilityRole="button"
              onPress={() => setChild(null)}
            >
              <Text style={s.actionText}>Cancelar</Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
const s = StyleSheet.create({
  eyebrow: {
    fontFamily: "JakartaBold",
    fontSize: 11,
    color: "#254BFF",
    marginBottom: 12,
  },
  title: {
    fontFamily: "JakartaExtraBold",
    fontSize: 29,
    color: "#14203D",
    marginBottom: 12,
  },
  copy: {
    fontFamily: "JakartaRegular",
    fontSize: 12,
    color: "#62708A",
    lineHeight: 21,
  },
  hero: {
    backgroundColor: "#254BFF",
    padding: 25,
    borderRadius: 25,
    marginVertical: 23,
  },
  heroLabel: { color: "#E6F581", fontFamily: "JakartaBold", fontSize: 10 },
  heroTitle: {
    color: "white",
    fontFamily: "JakartaExtraBold",
    fontSize: 29,
    lineHeight: 37,
    marginVertical: 17,
  },
  heroCopy: { color: "white", fontFamily: "JakartaRegular", fontSize: 12 },
  card: {
    backgroundColor: "white",
    padding: 22,
    borderRadius: 22,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#E3E8F2",
  },
  heading: {
    fontFamily: "JakartaBold",
    fontSize: 17,
    color: "#14203D",
    marginBottom: 8,
  },
  row: { paddingVertical: 12, borderBottomWidth: 1, borderColor: "#E3E8F2" },
  name: { fontFamily: "JakartaBold", fontSize: 12, color: "#14203D" },
  action: {
    backgroundColor: "#EAF0FF",
    borderRadius: 15,
    padding: 17,
    marginTop: 12,
  },
  actionText: { fontFamily: "JakartaBold", color: "#254BFF", fontSize: 13 },
  input: {
    padding: 15,
    borderRadius: 13,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#E3E8F2",
    marginVertical: 12,
    color: "#14203D",
  },
  routine: {
    padding: 15,
    backgroundColor: "#F2F5FB",
    borderRadius: 12,
    marginTop: 14,
  },
  amount: {
    fontFamily: "JakartaExtraBold",
    fontSize: 27,
    color: "#14203D",
    marginVertical: 12,
  },
  overlay: {
    flex: 1,
    backgroundColor: "#14203D88",
    justifyContent: "center",
    padding: 25,
  },
  sheet: {
    backgroundColor: "white",
    padding: 25,
    borderRadius: 24,
    maxHeight: "85%",
  },
  statuses: { flexDirection: "row", gap: 7, marginVertical: 12 },
  status: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#EAF0FF",
  },
  active: { backgroundColor: "#254BFF" },
  white: { color: "white", fontFamily: "JakartaBold", fontSize: 12 },
});
