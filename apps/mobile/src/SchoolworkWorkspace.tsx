import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";
import type {
  VisibleStore,
  Attachment,
  Assignment,
} from "../../../packages/core/model.mjs";
import type { Actor, Command } from "./session";
import { can } from "../../../packages/core/permissions.mjs";
import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import AsyncStorage from "@react-native-async-storage/async-storage";
const labels = { homework: "Para casa", project: "Trabalho", exam: "Prova" };
const statuses: Record<string, string> = {
  open: "Aberta",
  in_progress: "Em atendimento",
  waiting: "Aguardando retorno",
  closed: "Encerrada",
};
const tones = { homework: "#edf1ff", project: "#fceee4", exam: "#edf3cd" };
function Txt({
  children,
  bold = false,
  size = 13,
  color = "#27344b",
}: {
  children: React.ReactNode;
  bold?: boolean;
  size?: number;
  color?: string;
}) {
  return (
    <Text
      style={{
        fontFamily: bold ? "JakartaBold" : "JakartaRegular",
        fontSize: size,
        color,
        lineHeight: size * 1.5,
      }}
    >
      {children}
    </Text>
  );
}
function Btn({
  children,
  onPress,
  disabled = false,
  outline = false,
}: {
  children: React.ReactNode;
  onPress: () => void;
  disabled?: boolean;
  outline?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[
        s.button,
        {
          backgroundColor: outline ? "white" : "#304bff",
          opacity: disabled ? 0.5 : 1,
        },
      ]}
    >
      <Txt bold color={outline ? "#304bff" : "white"}>
        {children}
      </Txt>
    </Pressable>
  );
}
function Field({
  label,
  value,
  onChange,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <View style={{ gap: 6, marginTop: 12 }}>
      <Txt bold size={11}>
        {label}
      </Txt>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        style={[
          s.input,
          multiline && { minHeight: 92, textAlignVertical: "top" },
        ]}
      />
    </View>
  );
}
export async function readSchoolAttachment(): Promise<Attachment | null> {
  const picked = await DocumentPicker.getDocumentAsync({
    type: [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "text/plain",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    copyToCacheDirectory: true,
  });
  if (picked.canceled) return null;
  const asset = picked.assets[0];
  if ((asset.size || 0) > 5 * 1024 * 1024)
    throw Error("Escolha um arquivo de até 5 MB.");
  let base64: string;
  if (Platform.OS === "web") {
    const bytes = new Uint8Array(await (await fetch(asset.uri)).arrayBuffer());
    let binary = "";
    for (let i = 0; i < bytes.length; i++)
      binary += String.fromCharCode(bytes[i]);
    base64 = btoa(binary);
  } else base64 = await new File(asset.uri).base64();
  const mime = asset.mimeType || "application/pdf";
  return {
    name: asset.name,
    mimeType: mime,
    uri: `data:${mime};base64,${base64}`,
  };
}
export async function openSchoolAttachment(attachment: Attachment) {
  if (!attachment.uri.startsWith("data:")) return;
  if (Platform.OS === "web") {
    const link = document.createElement("a");
    link.href = attachment.uri;
    link.download = attachment.name;
    link.click();
    return;
  }
  const encoded = attachment.uri.split(",")[1];
  const bytes = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
  const file = new File(
    Paths.cache,
    attachment.name.replace(/[^a-zA-Z0-9_.-]/g, "_"),
  );
  file.write(bytes);
  await Sharing.shareAsync(file.uri, { mimeType: attachment.mimeType });
}
function Attach({
  value,
  onChange,
}: {
  value: Attachment | null;
  onChange: (a: Attachment | null) => void;
}) {
  const [error, setError] = useState("");
  return (
    <View style={{ gap: 8, marginTop: 14 }}>
      <Btn
        outline
        onPress={() => {
          setError("");
          void readSchoolAttachment()
            .then((a) => a && onChange(a))
            .catch((e) => setError(e.message));
        }}
      >
        {value ? `Trocar anexo · ${value.name}` : "Anexar arquivo · até 5 MB"}
      </Btn>
      {value && (
        <Btn outline onPress={() => onChange(null)}>
          Remover anexo
        </Btn>
      )}
      {!!error && <Txt color="#a73c35">{error}</Txt>}
    </View>
  );
}
export async function scheduleWorkReminder(work: Assignment, actorId: string) {
  if (Platform.OS === "web")
    throw Error("Ative os lembretes no aplicativo instalado no celular.");
  const Notifications = await import("expo-notifications");
  const permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted)
    throw Error("Permita notificações nos ajustes para receber este lembrete.");
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === "android")
    await Notifications.setNotificationChannelAsync("schoolwork", {
      name: "Atividades e entregas",
      importance: Notifications.AndroidImportance.HIGH,
    });
  const due = new Date(`${work.due}T${work.time}:00`);
  if (due.getTime() <= Date.now())
    throw Error("Esta data já passou. Não é possível agendar o lembrete.");
  const previous = new Date(due);
  previous.setDate(previous.getDate() - 1);
  previous.setHours(18, 0, 0, 0);
  const date =
    previous.getTime() > Date.now()
      ? previous
      : new Date(Math.max(Date.now() + 60000, due.getTime() - 3600000));
  if (date >= due)
    throw Error("O prazo está próximo demais para agendar um lembrete.");
  const key = `thinkedu.reminder.${actorId}.${work.id}`;
  const old = await AsyncStorage.getItem(key);
  if (old) await Notifications.cancelScheduledNotificationAsync(old);
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: `${labels[work.kind]} · ${work.title}`,
      body: `Confira as orientações para ${work.due} às ${work.time}.`,
      data: { assignmentId: work.id, actorId },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
      channelId: "schoolwork",
    },
  });
  await AsyncStorage.setItem(key, id);
  return date;
}
export async function clearWorkReminders(actorId: string) {
  if (Platform.OS === "web") return;
  const Notifications = await import("expo-notifications");
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.content.data?.actorId === actorId)
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
  const keys = (await AsyncStorage.getAllKeys()).filter((k) =>
    k.startsWith(`thinkedu.reminder.${actorId}.`),
  );
  if (keys.length) await AsyncStorage.multiRemove(keys);
}
export function SchoolworkWorkspace({
  mode,
  data,
  actor,
  busy,
  dispatch,
  initialId,
  initialClassId,
}: {
  mode: "assignments" | "requests";
  data: VisibleStore;
  actor: Actor;
  busy: boolean;
  dispatch: (command: Command) => Promise<boolean>;
  initialId?: string;
  initialClassId?: string;
}) {
  const family = actor.role === "family";
  const [selected, setSelected] = useState(initialId || ""),
    [creating, setCreating] = useState(false),
    [childId, setChildId] = useState(data.children[0]?.id || ""),
    [classId, setClassId] = useState(
      initialClassId || data.classes[0]?.id || "",
    ),
    [filter, setFilter] = useState("all"),
    [kind, setKind] = useState<Assignment["kind"]>("homework"),
    [title, setTitle] = useState(""),
    [body, setBody] = useState(""),
    [syllabus, setSyllabus] = useState(""),
    [due, setDue] = useState(""),
    [time, setTime] = useState("08:00"),
    [typeId, setTypeId] = useState(data.requestTypes[0]?.id || ""),
    [attachment, setAttachment] = useState<Attachment | null>(null),
    [notice, setNotice] = useState("");
  const work = data.assignments.find((w) => w.id === selected),
    ticket = data.requests.find((r) => r.id === selected),
    template = data.requestTypes.find((t) => t.id === typeId);
  const date = (v: string) =>
    new Date(v + "T12:00:00").toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
    });
  function reset() {
    setSelected("");
    setCreating(false);
    setBody("");
    setAttachment(null);
    setNotice("");
  }
  async function send(command: Command) {
    if (await dispatch(command)) {
      setBody("");
      setAttachment(null);
      setCreating(false);
      setNotice("Registro salvo com sucesso.");
    }
  }
  function childChips() {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginVertical: 14 }}
        contentContainerStyle={{ gap: 8 }}
      >
        {data.children.map((c) => (
          <Pressable
            key={c.id}
            accessibilityRole="button"
            onPress={() => setChildId(c.id)}
            style={[s.chip, childId === c.id && s.active]}
          >
            <Txt size={11} bold color={childId === c.id ? "white" : "#6e7b90"}>
              {c.name}
            </Txt>
          </Pressable>
        ))}
      </ScrollView>
    );
  }
  if (work)
    return (
      <View style={{ gap: 16 }}>
        <Btn outline onPress={reset}>
          ← Atividades e entregas
        </Btn>
        <View style={[s.card, { backgroundColor: tones[work.kind] }]}>
          <Txt bold size={10}>
            {labels[work.kind].toUpperCase()} · {date(work.due)} · {work.time}
          </Txt>
          <Txt bold size={25}>
            {work.title}
          </Txt>
          <Txt size={11}>
            {data.actors.find((a) => a.id === work.authorId)?.name ||
              "Professor da turma"}
          </Txt>
        </View>
        <View style={s.card}>
          <Txt bold size={17}>
            Orientação do professor
          </Txt>
          <Txt>{work.description}</Txt>
          <Txt bold size={17}>
            Conteúdo programático
          </Txt>
          <Txt>{work.syllabus}</Txt>
          {work.attachment && (
            <Btn
              outline
              onPress={() =>
                void openSchoolAttachment(work.attachment!).catch((e) =>
                  setNotice(e.message),
                )
              }
            >
              Abrir material · {work.attachment.name}
            </Btn>
          )}
        </View>
        {family && (
          <Btn
            outline
            onPress={() =>
              void scheduleWorkReminder(work, actor.id)
                .then((d) =>
                  setNotice(
                    `Lembrete agendado para ${d.toLocaleString("pt-BR")}.`,
                  ),
                )
                .catch((e) => setNotice(e.message))
            }
          >
            Ativar lembrete no celular
          </Btn>
        )}
        {work.childIds.map((id) => {
          const child = data.children.find((c) => c.id === id),
            submission = work.submissions.find((s) => s.childId === id);
          return (
            <View key={id} style={s.card}>
              <Txt bold>
                {child?.name} · {child?.group}
              </Txt>
              {work.kind === "exam" ? (
                <Txt>
                  Prova na escola. Consulte as orientações e o conteúdo acima.
                </Txt>
              ) : submission ? (
                <>
                  <Txt bold color="#617b39">
                    Entrega registrada ·{" "}
                    {new Date(submission.submittedAt).toLocaleDateString(
                      "pt-BR",
                    )}
                  </Txt>
                  <Txt>{submission.note}</Txt>
                  {submission.attachment && (
                    <Btn
                      outline
                      onPress={() =>
                        void openSchoolAttachment(submission.attachment!).catch(
                          (e) => setNotice(e.message),
                        )
                      }
                    >
                      Abrir entrega · {submission.attachment.name}
                    </Btn>
                  )}
                  {submission.feedback ? (
                    <>
                      <Txt bold>Retorno do professor</Txt>
                      <Txt>{submission.feedback}</Txt>
                    </>
                  ) : !family && can(actor, "assignments.write") ? (
                    <>
                      <Field
                        label={`Retorno para ${child?.name}`}
                        value={body}
                        onChange={setBody}
                        multiline
                      />
                      <Btn
                        disabled={busy || !body.trim()}
                        onPress={() =>
                          void send({
                            type: "assignment.feedback",
                            assignmentId: work.id,
                            childId: id,
                            feedback: body,
                          })
                        }
                      >
                        Registrar retorno
                      </Btn>
                    </>
                  ) : (
                    <Txt color="#7c8595">Aguardando retorno do professor.</Txt>
                  )}
                </>
              ) : family ? (
                <>
                  <Field
                    label={`Registro da entrega de ${child?.name}`}
                    value={body}
                    onChange={setBody}
                    multiline
                  />
                  <Attach value={attachment} onChange={setAttachment} />
                  <Btn
                    disabled={busy || !body.trim()}
                    onPress={() =>
                      void send({
                        type: "assignment.submit",
                        assignmentId: work.id,
                        childId: id,
                        note: body,
                        attachment,
                      })
                    }
                  >
                    Registrar entrega
                  </Btn>
                </>
              ) : (
                <Txt color="#7c8595">Entrega pendente.</Txt>
              )}
            </View>
          );
        })}
        {!!notice && <Txt color="#3d568c">{notice}</Txt>}
      </View>
    );
  if (ticket)
    return (
      <View style={{ gap: 16 }}>
        <Btn outline onPress={reset}>
          ← Solicitações online
        </Btn>
        <View style={[s.card, { backgroundColor: "#edf1ff" }]}>
          <Txt bold size={10}>
            {ticket.protocol} · {statuses[ticket.status]}
          </Txt>
          <Txt bold size={24}>
            {ticket.typeName}
          </Txt>
          <Txt size={11}>
            {data.children.find((c) => c.id === ticket.childId)?.name} · aberto
            em {new Date(ticket.createdAt).toLocaleDateString("pt-BR")}
          </Txt>
        </View>
        {ticket.messages.map((m) => (
          <View key={m.id} style={s.card}>
            <Txt bold size={11}>
              {data.actors.find((a) => a.id === m.senderId)?.name ||
                "Equipe escolar"}{" "}
              · {new Date(m.at).toLocaleString("pt-BR")}
            </Txt>
            <Txt>{m.body}</Txt>
            {m.attachment && (
              <Btn
                outline
                onPress={() =>
                  void openSchoolAttachment(m.attachment!).catch((e) =>
                    setNotice(e.message),
                  )
                }
              >
                Abrir anexo · {m.attachment.name}
              </Btn>
            )}
          </View>
        ))}
        {ticket.status !== "closed" && (
          <View style={s.card}>
            <Field
              label="Responder à solicitação"
              value={body}
              onChange={setBody}
              multiline
            />
            <Attach value={attachment} onChange={setAttachment} />
            <Btn
              disabled={busy || !body.trim()}
              onPress={() =>
                void send({
                  type: "request.reply",
                  requestId: ticket.id,
                  body,
                  attachment,
                })
              }
            >
              Enviar resposta
            </Btn>
          </View>
        )}
        {!family && can(actor, "requests.manage") && (
          <View style={s.card}>
            <Txt bold>Atualizar atendimento</Txt>
            {Object.entries(statuses).map(([status, label]) => (
              <Btn
                outline
                key={status}
                disabled={busy || ticket.status === status}
                onPress={() =>
                  void send({
                    type: "request.status",
                    requestId: ticket.id,
                    status,
                  })
                }
              >
                {label}
              </Btn>
            ))}
          </View>
        )}
        {!!notice && <Txt color="#3d568c">{notice}</Txt>}
      </View>
    );
  if (creating)
    return (
      <View style={{ gap: 12 }}>
        <Btn outline onPress={reset}>
          ← Voltar
        </Btn>
        <Txt bold size={27}>
          {mode === "assignments"
            ? "Uma nova atividade."
            : "Uma solicitação, com contexto."}
        </Txt>
        {mode === "requests" ? (
          <>
            {childChips()}
            <Txt bold>Tipo de solicitação</Txt>
            {data.requestTypes
              .filter((t) => t.active)
              .map((t) => (
                <Btn
                  key={t.id}
                  outline={t.id !== typeId}
                  onPress={() => setTypeId(t.id)}
                >
                  {t.name}
                  {t.attachmentRequired ? " · anexo obrigatório" : ""}
                </Btn>
              ))}
            <Txt color="#7c8595">{template?.description}</Txt>
          </>
        ) : (
          <>
            <ScrollView horizontal contentContainerStyle={{ gap: 8 }}>
              {data.classes.map((g) => (
                <Btn
                  key={g.id}
                  outline={classId !== g.id}
                  onPress={() => setClassId(g.id)}
                >
                  {g.name}
                </Btn>
              ))}
            </ScrollView>
            {Object.entries(labels).map(([k, label]) => (
              <Btn
                key={k}
                outline={kind !== k}
                onPress={() => setKind(k as Assignment["kind"])}
              >
                {label}
              </Btn>
            ))}
            <Field
              label="Título da atividade"
              value={title}
              onChange={setTitle}
            />
            <Field
              label="Prazo ou data da prova (AAAA-MM-DD)"
              value={due}
              onChange={setDue}
            />
            <Field label="Horário (HH:MM)" value={time} onChange={setTime} />
            <Field
              label="Conteúdo programático"
              value={syllabus}
              onChange={setSyllabus}
              multiline
            />
          </>
        )}
        <Field
          label={
            mode === "requests"
              ? "Descreva sua solicitação"
              : "Orientação do professor"
          }
          value={body}
          onChange={setBody}
          multiline
        />
        <Attach value={attachment} onChange={setAttachment} />
        <Btn
          disabled={
            busy ||
            !body.trim() ||
            (mode === "requests" &&
              (!template || (template.attachmentRequired && !attachment)))
          }
          onPress={() =>
            void send(
              mode === "requests"
                ? {
                    type: "request.create",
                    requestTypeId: typeId,
                    childId,
                    body,
                    attachment,
                  }
                : {
                    type: "assignment.create",
                    kind,
                    title,
                    description: body,
                    syllabus,
                    due,
                    time,
                    childIds: data.children
                      .filter((c) => c.classId === classId)
                      .map((c) => c.id),
                    attachment,
                  },
            )
          }
        >
          {mode === "requests" ? "Enviar solicitação" : "Publicar para a turma"}
        </Btn>
        {!!notice && <Txt>{notice}</Txt>}
      </View>
    );
  const list = data.assignments
    .filter(
      (w) =>
        (!family || w.childIds.includes(childId)) &&
        (filter === "all" || w.kind === filter),
    )
    .sort((a, b) => a.due.localeCompare(b.due));
  return (
    <View style={{ gap: 16 }}>
      <Txt bold size={28}>
        {mode === "assignments"
          ? "O que vem pela frente."
          : "Solicitações online."}
      </Txt>
      <Txt color="#7c8595">
        {mode === "assignments"
          ? "Para casa, trabalhos e provas, com orientações e prazos."
          : "Seus pedidos à escola. Um protocolo, todas as respostas."}
      </Txt>
      {mode === "assignments" ? (
        <>
          {family && childChips()}
          <ScrollView horizontal contentContainerStyle={{ gap: 8 }}>
            {[["all", "Tudo"], ...Object.entries(labels)].map(
              ([key, label]) => (
                <Btn
                  key={key}
                  outline={filter !== key}
                  onPress={() => setFilter(key)}
                >
                  {label}
                </Btn>
              ),
            )}
          </ScrollView>
          {list.map((w) => (
            <Pressable
              accessibilityRole="button"
              key={w.id}
              onPress={() => {
                setSelected(w.id);
                setBody("");
              }}
              style={[s.card, { backgroundColor: tones[w.kind] }]}
            >
              <Txt bold size={10}>
                {labels[w.kind].toUpperCase()} · {date(w.due)} · {w.time}
              </Txt>
              <Txt bold size={20}>
                {w.title}
              </Txt>
              <Txt size={11}>
                {w.kind === "exam"
                  ? "Prova na escola"
                  : family && w.submissions.some((a) => a.childId === childId)
                    ? "Entrega registrada"
                    : "Entrega pendente"}{" "}
                · Ver orientações →
              </Txt>
            </Pressable>
          ))}
          {!list.length && <Txt>Nenhuma atividade neste filtro.</Txt>}
          {!family && can(actor, "assignments.write") && (
            <Btn onPress={() => setCreating(true)}>
              Publicar atividade para a turma
            </Btn>
          )}
        </>
      ) : (
        <>
          {family && (
            <Btn onPress={() => setCreating(true)}>Nova solicitação</Btn>
          )}
          {data.requests.map((r) => (
            <Pressable
              key={r.id}
              accessibilityRole="button"
              onPress={() => {
                setSelected(r.id);
                setBody("");
              }}
              style={s.card}
            >
              <Txt bold size={10}>
                {r.protocol} · {statuses[r.status]}
              </Txt>
              <Txt bold size={19}>
                {r.typeName}
              </Txt>
              <Txt size={11}>
                {data.children.find((c) => c.id === r.childId)?.name} ·{" "}
                {r.messages.length} mensagens · Abrir atendimento →
              </Txt>
            </Pressable>
          ))}
          {!data.requests.length && (
            <View style={[s.card, { backgroundColor: "#edf1ff" }]}>
              <Txt bold>A comunicação encontra seu lugar.</Txt>
              <Txt>
                {family
                  ? "Abra um pedido pelos tipos disponibilizados pela escola."
                  : "Os pedidos dos responsáveis aparecerão aqui."}
              </Txt>
            </View>
          )}
        </>
      )}
      {!!notice && <Txt color="#3d568c">{notice}</Txt>}
      {busy && <ActivityIndicator color="#304bff" />}
    </View>
  );
}
const s = StyleSheet.create({
  card: {
    padding: 18,
    borderRadius: 20,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#e7ebf3",
    gap: 11,
  },
  button: {
    padding: 14,
    minHeight: 48,
    borderRadius: 13,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d9e0f5",
    marginTop: 5,
  },
  input: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#dce2ef",
    borderRadius: 12,
    padding: 14,
    fontFamily: "JakartaRegular",
    fontSize: 13,
    color: "#27344b",
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: "#edf1ff",
  },
  active: { backgroundColor: "#304bff" },
});
