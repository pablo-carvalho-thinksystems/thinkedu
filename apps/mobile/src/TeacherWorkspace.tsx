import React, { useEffect, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { colors as C, typography as T } from "../../../packages/core/theme.mjs";
import {
  attendanceLabel,
  classroomDay,
} from "../../../packages/core/teacher.mjs";
import type {
  Actor,
  Child,
  VisibleStore,
} from "../../../packages/core/model.mjs";

export type TeacherPage =
  | "classroom"
  | "teacherAttendance"
  | "teacherAttendanceEdit"
  | "teacherPlan"
  | "teacherActivity"
  | "teacherStudents"
  | "teacherStudent";
type IconName = React.ComponentProps<typeof Feather>["name"];
interface Props {
  page: TeacherPage;
  data: VisibleStore;
  actor: Actor;
  busy: boolean;
  classId: string;
  date: string;
  studentId: string;
  onClass: (id: string) => void;
  onDate: (date: string) => void;
  onGo: (page: TeacherPage, child?: Child) => void;
  onCommand: (
    command: Record<string, unknown> & { type: string },
  ) => Promise<boolean>;
  onRoutine: (child: Child) => void;
  onChat: (child: Child) => void;
  onCompose: (child?: Child) => void;
  onMural: () => void;
  onClassUpdate: () => void;
  onClassMessage: () => void;
  onMaterials: () => void;
  onCalendar: () => void;
}
const photos: Record<string, number> = {
  lia: require("../assets/lia-avatar.png"),
  bento: require("../assets/bento-avatar.png"),
};
function Label({
  children,
  bold = false,
  size = 14,
  color = C.ink,
}: {
  children: React.ReactNode;
  bold?: boolean;
  size?: number;
  color?: string;
}) {
  return (
    <Text
      style={{
        fontFamily: bold ? T.bold : T.regular,
        fontSize: size,
        lineHeight: size * 1.45,
        color,
      }}
    >
      {children}
    </Text>
  );
}
function Glyph({
  name,
  color = C.blue,
  size = 21,
}: {
  name: IconName;
  color?: string;
  size?: number;
}) {
  return <Feather name={name} color={color} size={size} />;
}
function Face({ child, size = 48 }: { child: Child; size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: "hidden",
        backgroundColor: child.tone === "peach" ? C.peach : C.sky,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {photos[child.id] ? (
        <Image
          accessibilityLabel={`Foto ilustrativa de ${child.name}`}
          source={photos[child.id]}
          style={{ width: size, height: size }}
        />
      ) : (
        <Label bold size={16}>
          {child.initials}
        </Label>
      )}
    </View>
  );
}
function Panel({
  children,
  tone = C.white,
}: {
  children: React.ReactNode;
  tone?: string;
}) {
  return <View style={[s.panel, { backgroundColor: tone }]}>{children}</View>;
}
function Action({
  title,
  icon,
  onPress,
  disabled = false,
  outline = false,
}: {
  title: string;
  icon?: IconName;
  onPress: () => void;
  disabled?: boolean;
  outline?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled}
      onPress={onPress}
      style={[
        s.action,
        {
          backgroundColor: outline ? C.white : C.blue,
          opacity: disabled ? 0.45 : 1,
          borderColor: C.blue,
        },
      ]}
    >
      {icon && (
        <Glyph name={icon} color={outline ? C.blue : C.white} size={18} />
      )}
      <Label bold color={outline ? C.blue : C.white}>
        {title}
      </Label>
    </Pressable>
  );
}
function Input({
  label,
  value,
  onChange,
  multiline = false,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  placeholder?: string;
}) {
  return (
    <View style={{ gap: 7 }}>
      <Label size={12} bold>
        {label}
      </Label>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={C.muted}
        multiline={multiline}
        style={[
          s.input,
          multiline && { minHeight: 100, textAlignVertical: "top" },
        ]}
      />
    </View>
  );
}
const shortDate = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
const statusName: Record<string, string> = {
  present: "Na escola",
  absent: "Ausente",
  left: "Saiu",
};

export function TeacherWorkspace(p: Props) {
  const classes = [...new Set(p.data.children.map((c) => c.classId))];
  const classId = classes.includes(p.classId) ? p.classId : classes[0];
  const roster = p.data.children.filter((c) => c.classId === classId);
  const day = classroomDay(p.data, roster, p.date);
  const student =
    p.data.children.find((c) => c.id === p.studentId) || roster[0];
  const record = p.data.attendance.find(
    (a) => a.childId === student?.id && a.date === p.date,
  );
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("present"),
    [arrival, setArrival] = useState("08:00"),
    [departure, setDeparture] = useState("17:00"),
    [note, setNote] = useState("");
  const [title, setTitle] = useState(""),
    [description, setDescription] = useState(""),
    [time, setTime] = useState("10:00");
  useEffect(() => {
    setQuery("");
  }, [classId]);
  useEffect(() => {
    if (p.page === "teacherAttendanceEdit") {
      setStatus(record?.status || "present");
      setArrival(record?.arrival || "08:00");
      setDeparture(record?.departure || "17:00");
      setNote(record?.note || "");
    }
    if (p.page === "teacherActivity") {
      setTitle("");
      setDescription("");
      setTime("10:00");
    }
  }, [p.page, p.date, p.studentId]);
  if (p.actor.role === "family")
    return <Label>Esta área é exclusiva da equipe da escola.</Label>;
  if (!student || !roster.length)
    return <Label>Nenhuma turma vinculada a este perfil.</Label>;
  const routineFor = (child: Child) =>
    p.data.routines.find((r) => r.childId === child.id && r.date === p.date);
  const attendanceFor = (child: Child) =>
    p.data.attendance.find((a) => a.childId === child.id && a.date === p.date);
  const routineState = (child: Child) =>
    routineFor(child)?.published
      ? "Publicado"
      : routineFor(child)
        ? "Rascunho"
        : attendanceFor(child)?.status === "absent"
          ? "Ausente"
          : "A registrar";
  const dateMove = (amount: number) => {
    const date = new Date(`${p.date}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + amount);
    p.onDate(date.toISOString().slice(0, 10));
  };
  const classPicker = (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingBottom: 15 }}
    >
      {classes.map((id) => {
        const items = p.data.children.filter((c) => c.classId === id);
        return (
          <Pressable
            key={id}
            accessibilityRole="button"
            accessibilityLabel={`Turma ${items[0].group} · ${p.data.units.find((u) => u.id === items[0].unitId)?.name}`}
            accessibilityState={{ selected: id === classId }}
            onPress={() => p.onClass(id)}
            style={[
              s.classChip,
              { backgroundColor: id === classId ? C.ink : C.sky },
            ]}
          >
            <Label bold size={12} color={id === classId ? C.white : C.ink}>
              {items[0].group} ·{" "}
              {p.data.units.find((u) => u.id === items[0].unitId)?.name} ·{" "}
              {items.length}
            </Label>
          </Pressable>
        );
      })}
    </ScrollView>
  );
  const datePicker = (
    <View
      style={[s.row, { justifyContent: "space-between", marginBottom: 20 }]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dia anterior da turma"
        onPress={() => dateMove(-1)}
        style={s.circle}
      >
        <Glyph name="chevron-left" />
      </Pressable>
      <Label bold size={13}>
        {shortDate(p.date)}
      </Label>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Próximo dia da turma"
        onPress={() => dateMove(1)}
        style={s.circle}
      >
        <Glyph name="chevron-right" />
      </Pressable>
    </View>
  );
  function header(title: string, subtitle: string, showClass = true) {
    return (
      <>
        <View
          style={[
            s.row,
            {
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 12,
            },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text style={s.title}>{title}</Text>
            <Label color={C.muted} size={13}>
              {subtitle}
            </Label>
          </View>
          <View style={s.flower}>
            {[0, 1, 2, 3].map((n) => (
              <View key={n} style={s.petal} />
            ))}
          </View>
        </View>
        {showClass && classPicker}
        {datePicker}
      </>
    );
  }
  function quick(
    label: string,
    sub: string,
    icon: IconName,
    tone: string,
    onPress: () => void,
  ) {
    return (
      <Pressable
        key={label}
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        style={[s.quick, { backgroundColor: tone }]}
      >
        <Glyph name={icon} size={24} />
        <Label bold size={15}>
          {label}
        </Label>
        <Label size={11} color={C.muted}>
          {sub}
        </Label>
      </Pressable>
    );
  }
  function studentRow(child: Child, action: () => void, mode = "routine") {
    const entry = attendanceFor(child);
    return (
      <Pressable
        key={child.id}
        accessibilityRole="button"
        accessibilityLabel={
          mode === "attendance"
            ? `Registrar presença de ${child.name}`
            : `Ficha de ${child.name}`
        }
        onPress={action}
        style={s.student}
      >
        <Face child={child} />
        <View style={{ flex: 1 }}>
          <Label bold size={16}>
            {child.name}
          </Label>
          <Label size={11} color={C.muted}>
            {mode === "attendance" ? attendanceLabel(entry) : child.group}
          </Label>
        </View>
        <Label
          bold
          size={11}
          color={
            mode === "attendance"
              ? entry
                ? C.green
                : C.orange
              : routineFor(child)?.published
                ? C.green
                : C.orange
          }
        >
          {mode === "attendance"
            ? entry
              ? statusName[entry.status]
              : "Registrar"
            : routineState(child)}
        </Label>
        <Glyph name="chevron-right" size={17} />
      </Pressable>
    );
  }
  switch (p.page) {
    case "classroom":
      return (
        <>
          {header(
            `Olá, ${p.actor.name}.\nVamos cuidar do dia.`,
            "Seu trabalho, mais leve. Sua turma, mais perto.",
          )}
          <Panel tone={C.blue}>
            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Label bold size={25} color={C.white}>
                  {roster[0].group}
                </Label>
                <Label size={12} color={C.white}>
                  {roster.length} crianças · {day.present} na escola
                </Label>
              </View>
              <View style={s.badge}>
                <Glyph name="sun" color={C.ink} size={24} />
              </View>
            </View>
            <View style={s.progress}>
              <View
                style={{
                  height: 6,
                  width: `${Math.round((day.published / roster.length) * 100)}%`,
                  backgroundColor: C.lime,
                  borderRadius: 10,
                }}
              />
            </View>
            <View style={[s.row, { justifyContent: "space-between" }]}>
              <Label size={12} color={C.white}>
                {day.published} de {roster.length} rotinas publicadas
              </Label>
              <Label bold size={12} color={C.lime}>
                {Math.round((day.published / roster.length) * 100)}%
              </Label>
            </View>
          </Panel>
          <View style={s.grid}>
            {quick(
              "Chamada",
              `${day.unchecked} a registrar`,
              "user-check",
              C.sky,
              () => p.onGo("teacherAttendance"),
            )}
            {quick(
              "Rotinas",
              `${day.pendingRoutines} para concluir`,
              "edit-3",
              C.peach,
              () => p.onGo("teacherStudents"),
            )}
            {quick(
              "Planejar",
              `${day.activities.length} atividades no dia`,
              "calendar",
              C.lime,
              () => p.onGo("teacherPlan"),
            )}
            {quick(
              "Mural",
              "Compartilhar com as famílias",
              "book-open",
              C.sky,
              p.onMural,
            )}
          </View>
          <Panel tone={C.lime}>
            <Label bold size={20}>
              Conte para toda a turma
            </Label>
            <Label size={12}>
              O dia, as descobertas e os retornos gerais chegam a todos os
              responsáveis da turma selecionada.
            </Label>
            <Action
              title="Publicar atualização na timeline"
              onPress={p.onClassUpdate}
            />
            <Action
              title="Enviar comunicado para a turma"
              onPress={() => p.onCompose()}
            />
            <Action
              title="Enviar mensagem para todos"
              onPress={p.onClassMessage}
            />
          </Panel>
          <View style={{ marginTop: 22, marginBottom: 12 }}>
            <Label bold size={20}>
              O que pede atenção
            </Label>
          </View>
          <Panel tone={C.peach}>
            {day.unchecked > 0 && (
              <Pressable
                accessibilityRole="button"
                onPress={() => p.onGo("teacherAttendance")}
                style={s.row}
              >
                <Glyph name="user-check" color={C.orange} />
                <View style={{ flex: 1 }}>
                  <Label bold>Concluir a chamada</Label>
                  <Label size={12}>
                    {day.unchecked}{" "}
                    {day.unchecked === 1
                      ? "criança aguarda"
                      : "crianças aguardam"}{" "}
                    registro.
                  </Label>
                </View>
                <Glyph name="arrow-up-right" />
              </Pressable>
            )}
            {day.pendingRoutines > 0 && (
              <Pressable
                accessibilityRole="button"
                onPress={() => p.onGo("teacherStudents")}
                style={s.row}
              >
                <Glyph name="edit-3" color={C.orange} />
                <View style={{ flex: 1 }}>
                  <Label bold>Preparar os registros do dia</Label>
                  <Label size={12}>
                    {day.pendingRoutines}{" "}
                    {day.pendingRoutines === 1
                      ? "rotina ainda não publicada"
                      : "rotinas ainda não publicadas"}
                    .
                  </Label>
                </View>
                <Glyph name="arrow-up-right" />
              </Pressable>
            )}
            {!day.unchecked && !day.pendingRoutines && (
              <Label>Chamada e rotinas em dia. Tudo pronto por aqui!</Label>
            )}
          </Panel>
          <Panel>
            <Label bold size={18}>
              Próxima experiência
            </Label>
            {day.activities.find((a) => a.status === "planned") ? (
              <>
                <Label bold size={20}>
                  {day.activities.find((a) => a.status === "planned")!.title}
                </Label>
                <Label size={12} color={C.muted}>
                  {day.activities.find((a) => a.status === "planned")!.time} ·{" "}
                  {roster[0].group}
                </Label>
                <Action
                  title="Ver planejamento do dia"
                  outline
                  onPress={() => p.onGo("teacherPlan")}
                />
              </>
            ) : (
              <>
                <Label color={C.muted}>
                  Crie uma atividade ou consulte o que já foi concluído.
                </Label>
                <Action
                  title="Planejar uma experiência"
                  outline
                  onPress={() => p.onGo("teacherActivity")}
                />
              </>
            )}
          </Panel>
          <Action
            title="Materiais e autorizações"
            outline
            icon="package"
            onPress={p.onMaterials}
          />
        </>
      );
    case "teacherAttendance":
      return (
        <>
          {header(
            "Quem chegou\npara descobrir?",
            "Chamada, entradas e saídas da turma.",
          )}
          <View style={[s.row, { marginBottom: 16 }]}>
            {[
              [day.present, "na escola", C.sky],
              [day.absent, "ausentes", C.peach],
              [day.unchecked, "a registrar", C.lime],
            ].map(([count, label, tone]) => (
              <View
                key={String(label)}
                style={[s.metric, { backgroundColor: String(tone) }]}
              >
                <Label bold size={27}>
                  {count}
                </Label>
                <Label size={11}>{label}</Label>
              </View>
            ))}
          </View>
          {roster.map((c) =>
            studentRow(
              c,
              () => p.onGo("teacherAttendanceEdit", c),
              "attendance",
            ),
          )}
          <Panel tone={C.sky}>
            <Label bold>Um registro por criança.</Label>
            <Label size={12}>
              Toque no aluno para registrar a entrada, uma ausência ou a saída.
            </Label>
          </Panel>
        </>
      );
    case "teacherAttendanceEdit":
      return (
        <>
          {header(
            "Cada chegada\nimporta.",
            "Atualize a chamada desta criança.",
            false,
          )}
          <Panel tone={C.sky}>
            <View style={s.row}>
              <Face child={student} size={58} />
              <View>
                <Label bold size={23}>
                  {student.name}
                </Label>
                <Label size={12}>{student.group}</Label>
              </View>
            </View>
          </Panel>
          <View style={[s.row, { flexWrap: "wrap", marginBottom: 20 }]}>
            {[
              ["present", "Na escola"],
              ["absent", "Ausente"],
              ["left", "Saiu"],
            ].map(([id, label]) => (
              <Pressable
                key={id}
                accessibilityRole="button"
                accessibilityState={{ selected: status === id }}
                onPress={() => setStatus(id)}
                style={[
                  s.classChip,
                  { backgroundColor: status === id ? C.ink : C.sky },
                ]}
              >
                <Label bold size={12} color={status === id ? C.white : C.ink}>
                  {label}
                </Label>
              </Pressable>
            ))}
          </View>
          <Panel>
            {status !== "absent" && (
              <Input
                label="Entrada (HH:MM)"
                value={arrival}
                onChange={setArrival}
              />
            )}{" "}
            {status === "left" && (
              <Input
                label="Saída (HH:MM)"
                value={departure}
                onChange={setDeparture}
              />
            )}
            <Input
              label="Observação da chamada"
              value={note}
              onChange={setNote}
              multiline
              placeholder="Uma informação sobre a entrada ou ausência"
            />
          </Panel>
          <Action
            title="Salvar chamada"
            disabled={p.busy}
            icon="check"
            onPress={async () => {
              if (
                await p.onCommand({
                  type: "attendance.save",
                  childId: student.id,
                  date: p.date,
                  status,
                  arrival: status === "absent" ? null : arrival,
                  departure: status === "left" ? departure : null,
                  note,
                })
              )
                p.onGo("teacherAttendance");
            }}
          />
        </>
      );
    case "teacherPlan":
      return (
        <>
          {header(
            "Um dia cheio\nde possibilidades.",
            "Organize as experiências da sua turma.",
          )}
          <Action
            title="Adicionar atividade"
            icon="plus"
            onPress={() => p.onGo("teacherActivity")}
          />
          <View
            style={[
              s.row,
              { marginVertical: 20, justifyContent: "space-between" },
            ]}
          >
            <Label bold size={20}>
              O ritmo do dia
            </Label>
            <Label size={12} color={C.muted}>
              {day.activities.filter((a) => a.status === "done").length}/
              {day.activities.length} concluídas
            </Label>
          </View>
          {day.activities.map((a, i) => (
            <View key={a.id} style={[s.row, { alignItems: "flex-start" }]}>
              <View style={{ alignItems: "center", width: 48, paddingTop: 15 }}>
                <Label bold size={12} color={C.blue}>
                  {a.time}
                </Label>
                <View
                  style={{
                    width: 2,
                    minHeight: 100,
                    backgroundColor: C.line,
                    marginTop: 8,
                  }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Panel
                  tone={a.status === "done" ? C.sky : i % 2 ? C.peach : C.lime}
                >
                  <View style={s.row}>
                    <Glyph
                      name={a.status === "done" ? "check-circle" : "sun"}
                    />
                    <Label bold size={11}>
                      {a.status === "done" ? "CONCLUÍDA" : "PLANEJADA"}
                    </Label>
                  </View>
                  <Label bold size={21}>
                    {a.title}
                  </Label>
                  <Label size={13}>{a.description}</Label>
                  <Action
                    title={
                      a.status === "done"
                        ? `Reabrir ${a.title}`
                        : `Concluir ${a.title}`
                    }
                    outline
                    disabled={p.busy}
                    onPress={() =>
                      p.onCommand({
                        type: "activity.status",
                        activityId: a.id,
                        status: a.status === "done" ? "planned" : "done",
                      })
                    }
                  />
                </Panel>
              </View>
            </View>
          ))}
          {!day.activities.length && (
            <Panel tone={C.sky}>
              <Label>
                Este dia ainda não tem atividades. Vamos preparar a primeira
                experiência?
              </Label>
            </Panel>
          )}
          <Action
            title="Calendário de eventos da turma"
            outline
            icon="calendar"
            onPress={p.onCalendar}
          />
        </>
      );
    case "teacherActivity":
      return (
        <>
          {header(
            "Planejar é abrir\nnovos caminhos.",
            "Uma experiência para a turma selecionada.",
          )}
          <Panel tone={C.lime}>
            <Label bold size={18}>
              {roster[0].group}
            </Label>
            <Label size={12}>
              {roster.length} crianças · {shortDate(p.date)}
            </Label>
          </Panel>
          <Panel>
            <Input
              label="Nome da atividade"
              value={title}
              onChange={setTitle}
              placeholder="Explorar texturas no ateliê"
            />
            <Input
              label="Horário da atividade (HH:MM)"
              value={time}
              onChange={setTime}
            />
            <Input
              label="Proposta e materiais"
              value={description}
              onChange={setDescription}
              multiline
              placeholder="Como será a atividade? O que preparar?"
            />
          </Panel>
          <Action
            title="Adicionar ao dia"
            icon="plus"
            disabled={p.busy || !title.trim() || !description.trim()}
            onPress={async () => {
              if (
                await p.onCommand({
                  type: "activity.create",
                  title,
                  description,
                  time,
                  date: p.date,
                  childIds: roster.map((c) => c.id),
                })
              )
                p.onGo("teacherPlan");
            }}
          />
          <View style={{ marginTop: 12 }}>
            <Label size={11} color={C.muted}>
              O planejamento fica com a equipe. Use o mural para compartilhar
              uma proposta com as famílias.
            </Label>
          </View>
        </>
      );
    case "teacherStudents":
      return (
        <>
          {header(
            "Cada criança.\nUm olhar atento.",
            "Presença, registros e famílias em um lugar.",
          )}
          <View style={{ marginBottom: 18 }}>
            <Input
              label="Buscar aluno"
              value={query}
              onChange={setQuery}
              placeholder="Nome da criança"
            />
          </View>
          {roster
            .filter((c) =>
              c.name
                .toLocaleLowerCase("pt-BR")
                .includes(query.trim().toLocaleLowerCase("pt-BR")),
            )
            .map((c) => studentRow(c, () => p.onGo("teacherStudent", c)))}
          {!roster.some((c) =>
            c.name
              .toLocaleLowerCase("pt-BR")
              .includes(query.trim().toLocaleLowerCase("pt-BR")),
          ) && (
            <Panel>
              <Label>Nenhum aluno encontrado nesta turma.</Label>
            </Panel>
          )}
        </>
      );
    case "teacherStudent": {
      const routine = routineFor(student);
      const last = p.data.messages
        .filter((m) => m.childId === student.id)
        .at(-1);
      return (
        <>
          {header("O dia de\n" + student.name + ".", student.group, false)}
          <Panel tone={student.tone === "peach" ? C.peach : C.sky}>
            <View style={s.row}>
              <Face child={student} size={72} />
              <View style={{ flex: 1 }}>
                <Label bold size={25}>
                  {student.name}
                </Label>
                <Label size={12}>{student.group}</Label>
                <Label size={12} color={C.green}>
                  {attendanceLabel(record)}
                </Label>
              </View>
            </View>
            <Action
              title="Atualizar chamada"
              outline
              icon="user-check"
              onPress={() => p.onGo("teacherAttendanceEdit", student)}
            />
          </Panel>
          <Panel tone={C.lime}>
            <View style={[s.row, { justifyContent: "space-between" }]}>
              <Label bold size={19}>
                Registro do dia
              </Label>
              <Label bold size={11} color={C.blue}>
                {routineState(student)}
              </Label>
            </View>
            {routine ? (
              <>
                <Label size={13}>
                  Alimentação: {routine.meal} · Descanso: {routine.sleep} min
                </Label>
                <Label size={13}>
                  Disposição: {routine.mood} · Higiene: {routine.hygiene}
                </Label>
                {!!routine.note && <Label size={13}>{routine.note}</Label>}
              </>
            ) : (
              <Label size={13}>
                Comece o registro de alimentação, descanso, higiene e
                descobertas.
              </Label>
            )}
            <Action
              title={
                routine ? "Editar rotina do aluno" : "Registrar rotina do aluno"
              }
              icon="edit-3"
              onPress={() => p.onRoutine(student)}
            />
          </Panel>
          <Panel>
            <Label bold size={19}>
              Perto da família
            </Label>
            <Label size={13} color={C.muted}>
              {last?.body ||
                "Inicie uma conversa com os responsáveis deste aluno."}
            </Label>
            <Action
              title="Conversar com os responsáveis"
              outline
              icon="message-circle"
              onPress={() => p.onChat(student)}
            />
            <Action
              title="Enviar comunicado para este aluno"
              outline
              icon="send"
              onPress={() => p.onCompose(student)}
            />
          </Panel>
        </>
      );
    }
  }
}
const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  title: {
    fontFamily: T.extraBold,
    fontSize: 31,
    lineHeight: 38,
    color: C.ink,
    letterSpacing: -1.2,
    marginBottom: 8,
  },
  panel: {
    padding: 20,
    borderRadius: 25,
    marginBottom: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: C.line,
  },
  classChip: { paddingHorizontal: 15, paddingVertical: 11, borderRadius: 18 },
  circle: {
    height: 36,
    width: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.sky,
  },
  flower: {
    width: 38,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 3,
    marginTop: 9,
  },
  petal: { width: 16, height: 16, borderRadius: 10, backgroundColor: C.orange },
  badge: {
    height: 48,
    width: 48,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.lime,
  },
  progress: {
    height: 6,
    borderRadius: 10,
    backgroundColor: "#6F8AFF",
    overflow: "hidden",
    marginTop: 8,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  quick: {
    flexBasis: "46%",
    flexGrow: 1,
    padding: 17,
    borderRadius: 23,
    gap: 7,
    borderWidth: 1,
    borderColor: C.line,
  },
  action: {
    borderWidth: 1,
    borderRadius: 17,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginBottom: 4,
  },
  input: {
    fontFamily: T.regular,
    fontSize: 14,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 16,
    padding: 14,
    color: C.ink,
    backgroundColor: C.white,
  },
  student: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
    marginBottom: 8,
  },
  metric: { flex: 1, borderRadius: 22, padding: 16, gap: 3 },
});
