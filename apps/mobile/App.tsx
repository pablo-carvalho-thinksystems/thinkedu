import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import Feather from "@expo/vector-icons/Feather";
import { useFonts } from "expo-font";
import { PlusJakartaSans_400Regular } from "@expo-google-fonts/plus-jakarta-sans/400Regular";
import { PlusJakartaSans_500Medium } from "@expo-google-fonts/plus-jakarta-sans/500Medium";
import { PlusJakartaSans_700Bold } from "@expo-google-fonts/plus-jakarta-sans/700Bold";
import { PlusJakartaSans_800ExtraBold } from "@expo-google-fonts/plus-jakarta-sans/800ExtraBold";
import { colors as C, typography as T } from "../../packages/core/theme.mjs";
import { calendarCells, DEMO_DATE, money } from "../../packages/core/model.mjs";
import { Child, useSchool } from "./src/session";

type IconName = React.ComponentProps<typeof Feather>["name"];
type Page =
  | "home"
  | "day"
  | "moments"
  | "notices"
  | "notice"
  | "calendar"
  | "finance"
  | "invoice"
  | "profile"
  | "classroom"
  | "routine"
  | "inbox"
  | "chat"
  | "compose"
  | "materials"
  | "event";
const photo = require("./assets/atelier.png");
const dateLabel = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "short",
  });
const fullDate = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
const monthLabel = (year: number, month: number) =>
  new Date(year, month, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
function Copy({
  children,
  size = 14,
  bold = false,
  color = C.ink,
  style,
}: {
  children: React.ReactNode;
  size?: number;
  bold?: boolean;
  color?: string;
  style?: object;
}) {
  return (
    <Text
      style={[
        {
          fontFamily: bold ? T.bold : T.regular,
          fontSize: size,
          lineHeight: size * 1.5,
          color,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
function Icon({
  name,
  color = C.ink,
  size = 21,
}: {
  name: IconName;
  color?: string;
  size?: number;
}) {
  return <Feather name={name} size={size} color={color} />;
}
function Button({
  children,
  onPress,
  outline = false,
  tone = "blue",
  icon,
  disabled = false,
}: {
  children: React.ReactNode;
  onPress: () => void;
  outline?: boolean;
  tone?: "blue" | "ink" | "orange";
  icon?: IconName;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={typeof children === "string" ? children : undefined}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        {
          backgroundColor: outline ? "transparent" : C[tone],
          borderColor: C[tone],
          opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
        },
      ]}
    >
      <Copy bold color={outline ? C[tone] : C.white}>
        {children}
      </Copy>
      {icon && <Icon name={icon} color={outline ? C[tone] : C.white} />}
    </Pressable>
  );
}
function Card({
  children,
  tone = "white",
  style,
}: {
  children: React.ReactNode;
  tone?: keyof typeof C;
  style?: object;
}) {
  return (
    <View style={[s.card, { backgroundColor: C[tone] }, style]}>
      {children}
    </View>
  );
}
function Avatar({ child, size = 44 }: { child: Child; size?: number }) {
  return (
    <View
      accessibilityLabel={child.name}
      style={[
        s.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: child.tone === "peach" ? C.peach : C.sky,
        },
      ]}
    >
      <Copy bold size={size * 0.3} color={C.blue}>
        {child.initials}
      </Copy>
    </View>
  );
}
function ChildTag({ child }: { child: Child }) {
  return (
    <View style={s.row}>
      <Avatar child={child} size={32} />
      <Copy bold size={12}>
        {child.name} · {child.group}
      </Copy>
    </View>
  );
}
function Flower({ color = C.orange }: { color?: string }) {
  return (
    <View accessibilityElementsHidden style={s.flower}>
      {[0, 1, 2, 3].map((n) => (
        <View
          key={n}
          style={{
            width: 18,
            height: 18,
            borderRadius: 9,
            backgroundColor: color,
            position: "absolute",
            left: (n % 2) * 19,
            top: Math.floor(n / 2) * 19,
          }}
        />
      ))}
    </View>
  );
}
function Heading({
  children,
  sub,
  flower = true,
}: {
  children: React.ReactNode;
  sub?: string;
  flower?: boolean;
}) {
  return (
    <View style={{ marginBottom: 22 }}>
      <View style={[s.row, { alignItems: "flex-start" }]}>
        <Text style={s.heading}>{children}</Text>
        {flower && <Flower />}
      </View>
      {sub && (
        <Copy color={C.muted} style={{ marginTop: 7 }}>
          {sub}
        </Copy>
      )}
    </View>
  );
}
function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline = false,
  keyboardType,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: "numeric";
}) {
  return (
    <View style={{ gap: 8 }}>
      <Copy bold size={12}>
        {label}
      </Copy>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={C.muted}
        multiline={multiline}
        keyboardType={keyboardType}
        style={[
          s.input,
          multiline && { minHeight: 112, textAlignVertical: "top" },
        ]}
      />
    </View>
  );
}
function Chips({
  items,
  value,
  onChange,
}: {
  items: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
    >
      {items.map((item) => (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: value === item.id }}
          key={item.id}
          onPress={() => onChange(item.id)}
          style={[
            s.chip,
            { backgroundColor: value === item.id ? C.ink : C.sky },
          ]}
        >
          <Copy bold size={12} color={value === item.id ? C.white : C.ink}>
            {item.label}
          </Copy>
        </Pressable>
      ))}
    </ScrollView>
  );
}
function Row({
  title,
  sub,
  icon,
  onPress,
  right,
}: {
  title: string;
  sub?: string;
  icon?: IconName;
  onPress: () => void;
  right?: React.ReactNode;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={s.actionRow}>
      {icon && (
        <View style={s.iconBox}>
          <Icon name={icon} color={C.blue} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Copy bold>{title}</Copy>
        {sub && (
          <Copy size={12} color={C.muted}>
            {sub}
          </Copy>
        )}
      </View>
      {right}
      <Icon name="chevron-right" size={18} />
    </Pressable>
  );
}

function SchoolApp() {
  const school = useSchool(),
    { data, actor, busy, dispatch } = school;
  const [page, setPage] = useState<Page>("home"),
    [history, setHistory] = useState<Page[]>([]);
  const [childId, setChildId] = useState("all"),
    [sheet, setSheet] = useState(false);
  const [noticeId, setNoticeId] = useState("n-passeio"),
    [invoiceId, setInvoiceId] = useState("i-lia-oct");
  const [filter, setFilter] = useState("all"),
    [chatId, setChatId] = useState("lia");
  const [message, setMessage] = useState(""),
    [title, setTitle] = useState(""),
    [body, setBody] = useState(""),
    [kind, setKind] = useState("update"),
    [recipients, setRecipients] = useState<string[]>([]),
    [due, setDue] = useState("2026-10-13");
  const [review, setReview] = useState(false),
    [dialog, setDialog] = useState<{ title: string; body: string } | null>(
      null,
    );
  const [meal, setMeal] = useState("Bem"),
    [sleep, setSleep] = useState("45"),
    [mood, setMood] = useState("Animada"),
    [note, setNote] = useState(""),
    [hygiene, setHygiene] = useState("Registrada");
  const [calendar, setCalendar] = useState({ year: 2026, month: 9 }),
    [eventDate, setEventDate] = useState("2026-10-13"),
    [eventTime, setEventTime] = useState("08:30"),
    [place, setPlace] = useState("Escola Semente");
  const [dayDate, setDayDate] = useState(DEMO_DATE);
  const { width } = useWindowDimensions(),
    family = actor.role === "family";
  const children = data.children as Child[],
    selected = children.find((c) => c.id === childId),
    scope = selected ? [selected] : children;
  const routine = data.routines.find(
    (r) => r.childId === (selected?.id || scope[0]?.id) && r.date === dayDate,
  );
  const current = selected || scope[0],
    notice = data.notices.find((n) => n.id === noticeId),
    invoice = data.invoices.find((i) => i.id === invoiceId);
  const notices = data.notices.filter((n) =>
    n.childIds.some((id) => scope.some((c) => c.id === id)),
  );
  const pending = notices.filter(
    (n) =>
      n.type !== "update" &&
      n.childIds.some(
        (id) =>
          scope.some((c) => c.id === id) &&
          !n.responses.some((r) => r.childId === id),
      ),
  );
  useEffect(() => {
    if (Platform.OS === "web" && typeof document !== "undefined")
      document.title = "thinkEdu · ThinkSystems";
  }, []);
  function go(next: Page) {
    setHistory((h) => [...h, page]);
    setPage(next);
    setFilter("all");
  }
  function back() {
    setPage(history.at(-1) || (family ? "home" : "classroom"));
    setHistory((h) => h.slice(0, -1));
  }
  function tab(next: Page) {
    setPage(next);
    setHistory([]);
    setFilter("all");
  }
  function role(id: string) {
    school.switchRole(id);
    setChildId("all");
    setPage(id === "rafael" ? "home" : "classroom");
    setHistory([]);
    setFilter("all");
  }
  async function openNotice(id: string) {
    setNoticeId(id);
    go("notice");
    if (family) await dispatch({ type: "notice.read", noticeId: id });
  }
  function openChild(c: Child) {
    setChildId(c.id);
    setDayDate(DEMO_DATE);
    go("day");
  }
  function openRoutine(c: Child) {
    const r = data.routines.find(
      (r) => r.childId === c.id && r.date === DEMO_DATE,
    );
    setChildId(c.id);
    setMeal(r?.meal || "Bem");
    setSleep(String(r?.sleep || 0));
    setMood(r?.mood || "Animada");
    setHygiene(r?.hygiene || "Não registrado");
    setNote(r?.note || "");
    go("routine");
  }
  function openCompose(type = "update") {
    setKind(type);
    setTitle("");
    setBody("");
    setRecipients(scope.map((c) => c.id));
    setDue("2026-10-13");
    go("compose");
  }
  const selector = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Escolher filho ou aluno"
      onPress={() => setSheet(true)}
      style={s.selector}
    >
      <View style={s.row}>
        {selected ? (
          <Avatar child={selected} size={36} />
        ) : (
          <View style={s.row}>
            {children.slice(0, 2).map((c) => (
              <Avatar key={c.id} child={c} size={32} />
            ))}
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Copy bold size={13}>
            {selected
              ? `${selected.name} · ${selected.group}`
              : family
                ? "Todos os filhos"
                : "Toda a turma"}
          </Copy>
          <Copy size={10} color={C.muted}>
            {data.school.name}
          </Copy>
        </View>
        <Icon name="chevron-down" size={17} />
      </View>
    </Pressable>
  );
  const screenHeader = (
    <View
      style={[s.row, { justifyContent: "space-between", marginBottom: 24 }]}
    >
      {history.length ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          onPress={back}
          style={s.circle}
        >
          <Icon name="arrow-left" />
        </Pressable>
      ) : (
        <View>
          <Text style={s.wordmark}>
            think<Text style={{ color: C.blue }}>Edu</Text>
            <Text style={{ color: C.orange }}>·</Text>
          </Text>
          <Copy size={9} bold color={C.muted} style={{ letterSpacing: 1.4 }}>
            THINKSYSTEMS · EDUCAÇÃO
          </Copy>
        </View>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={family ? "Abrir comunicados" : "Abrir mensagens"}
        style={s.circle}
        onPress={() => tab(family ? "notices" : "inbox")}
      >
        <Icon name="bell" />
        {pending.length > 0 && <View style={s.unread} />}
      </Pressable>
    </View>
  );
  const dateBar = (
    <View
      style={[s.row, { justifyContent: "space-between", marginBottom: 20 }]}
    >
      {[-1, 1].map((n, i) => (
        <React.Fragment key={n}>
          {i === 1 && (
            <Copy bold size={13}>
              {fullDate(dayDate)}
            </Copy>
          )}
          <Pressable
            accessibilityLabel={n === -1 ? "Dia anterior" : "Próximo dia"}
            accessibilityRole="button"
            onPress={() => {
              const d = new Date(`${dayDate}T12:00:00`);
              d.setDate(d.getDate() + n);
              setDayDate(d.toISOString().slice(0, 10));
            }}
            style={s.circle}
          >
            <Icon
              name={n === -1 ? "chevron-left" : "chevron-right"}
              size={18}
            />
          </Pressable>
        </React.Fragment>
      ))}
    </View>
  );
  const noRecords = (
    <Card tone="sky">
      <Icon name="clock" color={C.blue} />
      <Copy bold>Ainda sem registros neste dia.</Copy>
      <Copy color={C.muted}>
        Os registros publicados pela escola aparecerão aqui.
      </Copy>
    </Card>
  );
  const dateMove = (n: number) => {
    const d = new Date(calendar.year, calendar.month + n, 1);
    setCalendar({ year: d.getFullYear(), month: d.getMonth() });
  };
  const content = () => {
    switch (page) {
      case "home":
        return (
          <>
            <Heading>Oi, {actor.name}!</Heading>
            {selector}
            <Copy color={C.muted} size={12} style={{ marginBottom: 16 }}>
              Sexta, 9 de outubro · demonstração
            </Copy>
            <Card tone="blue">
              <View style={[s.row, { alignItems: "flex-start" }]}>
                <Text style={[s.heroTitle, { color: C.white }]}>
                  Cada descoberta.{"\n"}Mais perto.
                </Text>
                <Flower color={C.lime} />
              </View>
              <Copy color={C.white}>
                O dia de {scope.map((c) => c.name).join(" e ")} em um só lugar.
              </Copy>
            </Card>
            {scope.map((c) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Acompanhar ${c.name}`}
                key={c.id}
                onPress={() => openChild(c)}
              >
                <Card tone={c.tone === "peach" ? "peach" : "sky"}>
                  <View style={s.row}>
                    <Avatar child={c} />
                    <View style={{ flex: 1 }}>
                      <Copy bold size={19}>
                        {c.name}
                      </Copy>
                      <Copy size={12}>{c.group}</Copy>
                      <Copy size={11} color={C.green}>
                        ● Na escola · {c.arrival}
                      </Copy>
                    </View>
                    <Icon name="arrow-up-right" color={C.blue} />
                  </View>
                  <View style={[s.row, { marginTop: 4 }]}>
                    <Icon
                      name={c.id === "bento" ? "moon" : "sun"}
                      color={C.blue}
                    />
                    <Copy bold size={12}>
                      {c.id === "bento"
                        ? "Descansou por 50 minutos"
                        : "Um dia de novas descobertas"}
                    </Copy>
                  </View>
                </Card>
              </Pressable>
            ))}
            <Button
              tone="orange"
              icon="arrow-right"
              onPress={() => tab("notices")}
            >
              {pending.length} {pending.length === 1 ? "pendência" : "pendências"} da família
            </Button>
            <Row
              title="Próximos eventos"
              icon="calendar"
              onPress={() => tab("calendar")}
            />
            <Row
              title="Mensalidades e pagamentos"
              icon="credit-card"
              onPress={() => go("finance")}
            />
          </>
        );
      case "day":
        return (
          <>
            {selector}
            <Heading sub="Acompanhe os registros publicados pela escola.">
              O dia {current?.name === "Lia" ? "da" : "do"} {current?.name}.
            </Heading>
            {dateBar}
            <Chips
              items={[
                { id: "routine", label: "Rotina" },
                { id: "moments", label: "Momentos" },
              ]}
              value="routine"
              onChange={() => go("moments")}
            />
            {!routine ? (
              noRecords
            ) : (
              <View style={{ marginTop: 20, gap: 18 }}>
                {(
                  [
                    {
                      time: current.arrival,
                      icon: "log-in",
                      title: "Entrada",
                      detail: "Recebida pela equipe da escola",
                    },
                    {
                      time: "9h30",
                      icon: "coffee",
                      title: "Lanche da manhã",
                      detail: "Banana e pão",
                    },
                    {
                      time: "10h15",
                      icon: "sun",
                      title: "Ateliê da turma",
                      detail: "Exploramos formas e texturas",
                    },
                    {
                      time: "12h",
                      icon: "coffee",
                      title: "Almoço",
                      detail:
                        routine.meal === "Bem"
                          ? "Comeu bem"
                          : routine.meal === "Pouco"
                            ? "Comeu pouco"
                            : "Não comeu",
                    },
                    {
                      time: "13h10",
                      icon: "moon",
                      title: "Descanso",
                      detail: `Dormiu por ${routine.sleep} minutos`,
                    },
                  ] as {
                    time: string;
                    icon: IconName;
                    title: string;
                    detail: string;
                  }[]
                ).map((r, i) => (
                  <View
                    key={r.title}
                    style={[s.row, { alignItems: "flex-start" }]}
                  >
                    <Copy size={11} style={{ width: 42, paddingTop: 7 }}>
                      {r.time}
                    </Copy>
                    <View
                      style={[
                        s.iconBox,
                        { backgroundColor: i % 2 ? C.peach : C.sky },
                      ]}
                    >
                      <Icon name={r.icon} color={i % 2 ? C.orange : C.blue} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Copy bold>{r.title}</Copy>
                      <Copy size={12} color={C.muted}>
                        {r.detail}
                      </Copy>
                      {i === 2 && (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Ver momento da turma"
                          onPress={() => go("moments")}
                        >
                          <Image
                            source={photo}
                            accessibilityLabel="Criança fictícia modelando argila no ateliê"
                            style={[s.photo, { height: 110, marginTop: 8 }]}
                          />
                        </Pressable>
                      )}
                    </View>
                  </View>
                ))}
                <Card tone="sky">
                  <Copy bold size={12}>
                    Observação da professora
                  </Copy>
                  <Copy>{routine.note || "Sem observação adicional."}</Copy>
                </Card>
              </View>
            )}
            <Button
              onPress={() => {
                setChatId(current.id);
                go("chat");
              }}
              icon="message-circle"
            >
              Conversar sobre {current?.name}
            </Button>
          </>
        );
      case "moments":
        return (
          <>
            {selector}
            <Heading>Descobertas{"\n"}que ficam.</Heading>
            <Copy size={12} color={C.muted}>
              Ateliê da turma · Sexta, 9 de outubro
            </Copy>
            <Image
              source={photo}
              style={[s.photo, { height: 260, marginTop: 16 }]}
              accessibilityLabel="Momento fictício do ateliê da turma"
            />
            <Heading
              flower={false}
              sub="Exploramos formas e texturas com muita curiosidade."
            >
              Mãos na argila.
            </Heading>
            <Card tone="sky">
              <View style={s.row}>
                <Icon name="feather" color={C.blue} />
                <Copy bold>Criatividade e coordenação</Copy>
              </View>
              <Copy>Uma experiência de criar com as próprias mãos.</Copy>
              <Copy size={11} color={C.muted}>
                Professora Ana · imagem ilustrativa da turma
              </Copy>
            </Card>
            <Button
              outline
              onPress={() => {
                setChatId(current.id);
                go("chat");
              }}
            >
              Conversar sobre este momento
            </Button>
          </>
        );
      case "notices":
        return (
          <>
            <Heading>A escola,{"\n"}mais perto.</Heading>
            {selector}
            <Chips
              items={[
                { id: "all", label: "Todos" },
                { id: "unread", label: "Não lidos" },
                { id: "pending", label: "Para resolver" },
              ]}
              value={filter}
              onChange={setFilter}
            />
            <View style={{ marginTop: 20 }}>
              {notices
                .filter((n) =>
                  filter === "unread"
                    ? !n.readBy.includes(actor.id)
                    : filter === "pending"
                      ? pending.some((p) => p.id === n.id)
                      : true,
                )
                .map((n) => (
                  <Pressable
                    key={n.id}
                    accessibilityRole="button"
                    onPress={() => openNotice(n.id)}
                  >
                    <Card
                      tone={
                        n.type === "authorization"
                          ? "lime"
                          : n.type === "request"
                            ? "peach"
                            : "sky"
                      }
                    >
                      <View style={s.row}>
                        <Icon
                          name={
                            n.type === "authorization" ? "file-text" : "bell"
                          }
                          color={C.blue}
                        />
                        <Copy bold size={11}>
                          {n.childIds
                            .map(
                              (id) => children.find((c) => c.id === id)?.name,
                            )
                            .join(" e ")}
                        </Copy>
                        {!n.readBy.includes(actor.id) && (
                          <View
                            style={[
                              s.unread,
                              { position: "relative", top: 0, right: 0 },
                            ]}
                          />
                        )}
                      </View>
                      <Copy bold size={20}>
                        {n.title}
                      </Copy>
                      <Copy size={13}>
                        {n.body.slice(0, 90)}
                        {n.body.length > 90 ? "…" : ""}
                      </Copy>
                      <Copy size={11} color={C.muted}>
                        {n.due
                          ? `Responder até ${dateLabel(n.due)}`
                          : "Comunicado da escola"}
                      </Copy>
                      <View
                        style={[
                          s.row,
                          { justifyContent: "space-between", marginTop: 4 },
                        ]}
                      >
                        <Copy bold color={C.blue} size={13}>
                          Ver comunicado
                        </Copy>
                        <Icon name="arrow-right" color={C.blue} />
                      </View>
                    </Card>
                  </Pressable>
                ))}
              {!notices.filter((n) =>
                filter === "unread"
                  ? !n.readBy.includes(actor.id)
                  : filter === "pending"
                    ? pending.some((p) => p.id === n.id)
                    : true,
              ).length && (
                <Card tone="sky">
                  <Copy bold>Tudo em dia por aqui.</Copy>
                </Card>
              )}
            </View>
            <Button
              outline
              onPress={() => {
                setChatId(current.id);
                go("chat");
              }}
            >
              Iniciar conversa
            </Button>
          </>
        );
      case "notice":
        return notice ? (
          <>
            <Heading>{notice.title}</Heading>
            <Card tone={notice.type === "authorization" ? "lime" : "sky"}>
              <Copy bold size={11}>
                {notice.childIds
                  .map((id) => children.find((c) => c.id === id)?.name)
                  .join(" · ")}
              </Copy>
              <Copy size={15}>{notice.body}</Copy>
              {notice.due && (
                <Copy bold size={12}>
                  Prazo: {dateLabel(notice.due)}
                </Copy>
              )}
            </Card>
            {notice.type !== "update" &&
              notice.childIds.map((id) => {
                const child = children.find((c) => c.id === id);
                if (!child) return null;
                const answer = notice.responses.find((r) => r.childId === id);
                return (
                  <Card key={id}>
                    <ChildTag child={child} />
                    {answer ? (
                      <Copy
                        bold
                        color={
                          answer.answer === "confirmed" ? C.green : C.muted
                        }
                      >
                        {answer.answer === "confirmed"
                          ? "Confirmado"
                          : "Não autorizado"}{" "}
                        pelo responsável.
                      </Copy>
                    ) : !family ? (
                      <Copy color={C.muted}>
                        Aguardando resposta do responsável.
                      </Copy>
                    ) : (
                      <>
                        <Button
                          disabled={busy}
                          onPress={async () => {
                            if (
                              await dispatch({
                                type: "notice.respond",
                                noticeId: notice.id,
                                childId: id,
                                answer: "confirmed",
                              })
                            )
                              setDialog({
                                title: "Resposta registrada",
                                body: `A escola recebeu sua confirmação para ${child.name}.`,
                              });
                          }}
                        >
                          {notice.type === "authorization"
                            ? "Autorizar"
                            : "Confirmar"}{" "}
                          para {child.name}
                        </Button>
                        {notice.type === "authorization" && (
                          <Button
                            outline
                            disabled={busy}
                            onPress={() =>
                              dispatch({
                                type: "notice.respond",
                                noticeId: notice.id,
                                childId: id,
                                answer: "declined",
                              })
                            }
                          >
                            Não autorizar para {child.name}
                          </Button>
                        )}
                      </>
                    )}
                  </Card>
                );
              })}
            <Copy size={12} color={C.muted}>
              As respostas são individuais por criança.
            </Copy>
            <Button
              outline
              onPress={() => {
                setChatId(notice.childIds[0]);
                go("chat");
              }}
            >
              Conversar com a escola
            </Button>
          </>
        ) : null;
      case "finance": {
        const bills = data.invoices.filter((i) =>
          scope.some((c) => c.id === i.childId),
        );
        const status = filter === "paid" ? "paid" : "open";
        return (
          <>
            <Heading>Mensalidades{"\n"}em um lugar.</Heading>
            {selector}
            <Chips
              items={[
                { id: "all", label: "Em aberto" },
                { id: "paid", label: "Pagos" },
              ]}
              value={filter}
              onChange={setFilter}
            />
            <Card tone="sky" style={{ marginTop: 20 }}>
              <Copy bold size={10} color={C.muted}>
                {status === "open" ? "TOTAL EM ABERTO" : "TOTAL PAGO"}
              </Copy>
              <Text style={s.amount}>
                {money(
                  bills
                    .filter((i) => i.status === status)
                    .reduce((v, i) => v + i.amount, 0),
                )}
              </Text>
            </Card>
            {bills
              .filter((i) => i.status === status)
              .map((i) => (
                <Card key={i.id}>
                  <ChildTag child={children.find((c) => c.id === i.childId)!} />
                  <Copy size={12} color={C.muted}>
                    Mensalidade · {i.reference}
                  </Copy>
                  <Copy bold size={24}>
                    {money(i.amount)}
                  </Copy>
                  <Copy
                    size={11}
                    color={i.status === "paid" ? C.green : C.muted}
                  >
                    {i.status === "paid"
                      ? "Pago"
                      : `Vence em ${dateLabel(i.due)}`}
                  </Copy>
                  <Button
                    onPress={() => {
                      setInvoiceId(i.id);
                      go("invoice");
                    }}
                  >
                    {i.status === "paid"
                      ? "Ver comprovante ilustrativo"
                      : "Ver cobrança"}
                  </Button>
                </Card>
              ))}
            <Copy size={11} color={C.muted}>
              Acesso do responsável financeiro · valores ilustrativos
            </Copy>
          </>
        );
      }
      case "invoice":
        return invoice ? (
          <>
            <ChildTag child={children.find((c) => c.id === invoice.childId)!} />
            <Heading sub={invoice.reference}>Mensalidade.</Heading>
            <Card tone="sky">
              <Copy size={11} bold>
                ESCOLA SEMENTE
              </Copy>
              <Text style={s.amount}>{money(invoice.amount)}</Text>
              <Copy color={invoice.status === "paid" ? C.green : C.muted}>
                {invoice.status === "paid" ? "Pago" : "Em aberto"} ·{" "}
                {dateLabel(invoice.due)}
              </Copy>
            </Card>
            {[
              ["Aluno", children.find((c) => c.id === invoice.childId)?.name],
              ["Referência", invoice.reference],
              ["Valor", money(invoice.amount)],
              ["Juros e multa", "R$ 0,00"],
              ["Total", money(invoice.amount)],
            ].map(([label, value]) => (
              <View key={label} style={[s.row, s.detailRow]}>
                <Copy color={C.muted}>{label}</Copy>
                <Copy bold>{value}</Copy>
              </View>
            ))}
            {invoice.status === "open" ? (
              <>
                <Copy bold size={18} style={{ marginTop: 20 }}>
                  Como prefere pagar?
                </Copy>
                <Row
                  title="Pix"
                  sub="Confirmação após processamento"
                  icon="grid"
                  onPress={() =>
                    setDialog({
                      title: "Pagamento demonstrativo",
                      body: "A integração com o provedor de pagamentos será configurada na próxima etapa. Nenhum Pix real é gerado ou cobrado nesta demonstração.",
                    })
                  }
                />
                <Row
                  title="Boleto"
                  sub="Copiar código ou baixar"
                  icon="file-text"
                  onPress={() =>
                    setDialog({
                      title: "Boleto demonstrativo",
                      body: "A cobrança real depende da integração financeira da escola. Não há boleto válido nesta versão.",
                    })
                  }
                />
              </>
            ) : (
              <Card tone="sky">
                <Copy>
                  Pagamento ilustrativo de setembro. A emissão de comprovantes
                  reais depende do provedor financeiro.
                </Copy>
              </Card>
            )}
            <Button
              outline
              onPress={() =>
                setDialog({
                  title: "Atendimento financeiro",
                  body: "Na versão conectada, este canal será encaminhado à secretaria. Esta demonstração usa dados fictícios.",
                })
              }
            >
              Falar com o financeiro
            </Button>
          </>
        ) : null;
      case "calendar":
        return (
          <>
            <Heading>Organize os{"\n"}próximos dias.</Heading>
            {selector}
            <View
              style={[
                s.row,
                { justifyContent: "space-between", marginBottom: 16 },
              ]}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Mês anterior"
                onPress={() => dateMove(-1)}
                style={s.circle}
              >
                <Icon name="chevron-left" />
              </Pressable>
              <Copy bold>{monthLabel(calendar.year, calendar.month)}</Copy>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Próximo mês"
                onPress={() => dateMove(1)}
                style={s.circle}
              >
                <Icon name="chevron-right" />
              </Pressable>
            </View>
            <View style={s.calendar}>
              {["S", "T", "Q", "Q", "S", "S", "D"].map((d, i) => (
                <View key={`day-${i}`} style={s.calendarCell}>
                  <Copy size={11} color={C.muted}>
                    {d}
                  </Copy>
                </View>
              ))}
              {calendarCells(calendar.year, calendar.month).map((d, i) => {
                const date = d
                  ? `${calendar.year}-${String(calendar.month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`
                  : "";
                const event = data.events.some(
                  (e) =>
                    e.date === date &&
                    e.childIds.some((id) => scope.some((c) => c.id === id)),
                );
                return (
                  <View key={i} style={s.calendarCell}>
                    <View
                      style={[
                        s.calendarDay,
                        event && { backgroundColor: C.blue },
                      ]}
                    >
                      <Copy size={12} color={event ? C.white : C.ink}>
                        {d || ""}
                      </Copy>
                    </View>
                  </View>
                );
              })}
            </View>
            {data.events
              .filter(
                (e) =>
                  e.date.startsWith(
                    `${calendar.year}-${String(calendar.month + 1).padStart(2, "0")}`,
                  ) && e.childIds.some((id) => scope.some((c) => c.id === id)),
              )
              .sort((a, b) => a.date.localeCompare(b.date))
              .map((e) => (
                <Card key={e.id} tone={e.tone === "lime" ? "lime" : "sky"}>
                  <Copy bold size={11}>
                    {e.childIds
                      .map((id) => children.find((c) => c.id === id)?.name)
                      .filter(Boolean)
                      .join(" · ")}
                  </Copy>
                  <Copy bold size={18}>
                    {e.title}
                  </Copy>
                  <Copy size={12}>
                    {dateLabel(e.date)} · {e.time}
                  </Copy>
                  <Copy size={12}>{e.place}</Copy>
                  {e.noticeId && (
                    <Button outline onPress={() => openNotice(e.noticeId!)}>
                      Ver comunicado
                    </Button>
                  )}
                </Card>
              ))}
            {!family && (
              <Button
                onPress={() => {
                  setTitle("");
                  setRecipients(scope.map((c) => c.id));
                  go("event");
                }}
              >
                Criar evento
              </Button>
            )}
          </>
        );
      case "profile":
        return (
          <>
            <Heading>Do seu jeito.</Heading>
            <Card tone="blue">
              <Copy color={C.white} size={24} bold>
                {actor.name}
              </Copy>
              <Copy color={C.white}>
                {family
                  ? "Responsável · Lia e Bento"
                  : "Educadora · Escola Semente"}
              </Copy>
            </Card>
            {family && (
              <Row
                title="Financeiro"
                sub="Mensalidades e cobranças"
                icon="credit-card"
                onPress={() => go("finance")}
              />
            )}
            <Row
              title={family ? "Seus filhos" : "Seus alunos"}
              icon="users"
              onPress={() => setSheet(true)}
            />
            <Row
              title="Privacidade"
              icon="shield"
              onPress={() =>
                setDialog({
                  title: "Privacidade na demonstração",
                  body: "Todos os dados e a fotografia são fictícios. As alterações locais ficam neste dispositivo. Produção exigirá convites verificados, consentimentos, política de retenção e autenticação real.",
                })
              }
            />
            <Row
              title="Sobre thinkEdu"
              icon="info"
              onPress={() =>
                setDialog({
                  title: "thinkEdu · ThinkSystems",
                  body: "Projeto de Educação. Versão 0.1.0 — primeira entrega funcional para validar as jornadas de famílias e educadoras.",
                })
              }
            />
            <Copy size={11} color={C.muted}>
              Demonstração · sem cobranças ou notificações reais.
            </Copy>
          </>
        );
      case "classroom":
        return (
          <>
            <Heading>Bom dia, {actor.name}!</Heading>
            {selector}
            <View style={[s.row, { marginBottom: 16 }]}>
              <Card tone="sky" style={{ flex: 1, marginBottom: 0 }}>
                <Copy size={26} bold>
                  {scope.length}
                </Copy>
                <Copy size={11}>alunos na demonstração</Copy>
              </Card>
              <Card tone="peach" style={{ flex: 1, marginBottom: 0 }}>
                <Copy size={26} bold>
                  {
                    scope.filter((c) =>
                      data.routines.some(
                        (r) => r.childId === c.id && r.published,
                      ),
                    ).length
                  }
                </Copy>
                <Copy size={11}>rotinas publicadas</Copy>
              </Card>
            </View>
            <Card tone="blue">
              <Copy bold size={25} color={C.white}>
                O dia da turma
              </Copy>
              <Copy color={C.white}>
                Registre uma vez. Ajuste cada criança.
              </Copy>
              <Button
                outline
                tone="orange"
                onPress={() => openRoutine(scope[0])}
              >
                Continuar rotina
              </Button>
            </Card>
            <Row
              title="Conversar com as famílias"
              icon="message-circle"
              onPress={() => tab("inbox")}
            />
            <Row
              title="Materiais e necessidades"
              icon="package"
              onPress={() => go("materials")}
            />
            <Copy bold size={18} style={{ marginVertical: 16 }}>
              Alunos
            </Copy>
            {scope.map((c) => (
              <Pressable
                accessibilityRole="button"
                key={c.id}
                onPress={() => openRoutine(c)}
                style={s.studentRow}
              >
                <Avatar child={c} />
                <View style={{ flex: 1 }}>
                  <Copy bold>{c.name}</Copy>
                  <Copy size={11} color={C.muted}>
                    {c.group}
                  </Copy>
                </View>
                <Copy
                  size={11}
                  color={
                    data.routines.some((r) => r.childId === c.id && r.published)
                      ? C.green
                      : C.orange
                  }
                >
                  {data.routines.some((r) => r.childId === c.id && r.published)
                    ? "Rotina pronta"
                    : "Registrar"}
                </Copy>
                <Icon name="chevron-right" size={17} />
              </Pressable>
            ))}
            <Button tone="orange" icon="plus" onPress={() => openCompose()}>
              Novo comunicado
            </Button>
          </>
        );
      case "routine":
        return (
          <>
            {selector}
            <Heading sub="Sexta, 9 de outubro">
              Cada detalhe{"\n"}conta.
            </Heading>
            <Card tone="sky">
              <Copy bold>Alimentação</Copy>
              <Chips
                items={["Bem", "Pouco", "Não comeu"].map((v) => ({
                  id: v,
                  label: v,
                }))}
                value={meal}
                onChange={setMeal}
              />
              <Field
                label="Descanso em minutos"
                value={sleep}
                onChange={setSleep}
                keyboardType="numeric"
              />
              <Copy bold>Higiene</Copy>
              <Chips
                items={["Registrada", "Não registrado"].map((v) => ({
                  id: v,
                  label: v,
                }))}
                value={hygiene}
                onChange={setHygiene}
              />
              <Copy bold>Disposição</Copy>
              <Chips
                items={["Animada", "Tranquilo", "Cansada"].map((v) => ({
                  id: v,
                  label: v,
                }))}
                value={mood}
                onChange={setMood}
              />
            </Card>
            <Field
              label="Observação para a família"
              value={note}
              onChange={setNote}
              multiline
              placeholder="Registre o que observou, de forma clara."
            />
            <Copy size={11} color={C.muted} style={{ marginVertical: 12 }}>
              A família só recebe após a publicação.
            </Copy>
            <Button
              disabled={busy}
              outline
              onPress={async () => {
                if (
                  await dispatch({
                    type: "routine.save",
                    childId: current.id,
                    date: DEMO_DATE,
                    meal,
                    sleep: Number(sleep),
                    mood,
                    hygiene,
                    note,
                    published: false,
                  })
                )
                  setDialog({
                    title: "Rascunho salvo",
                    body: "O registro ficou salvo e ainda não está visível para a família.",
                  });
              }}
            >
              Salvar rascunho
            </Button>
            <Button disabled={busy} onPress={() => setReview(true)}>
              Revisar e publicar
            </Button>
          </>
        );
      case "inbox":
        return (
          <>
            <Heading>Perto das{"\n"}famílias.</Heading>
            {selector}
            {scope.map((c) => {
              const last = data.messages
                .filter((m) => m.childId === c.id)
                .at(-1);
              return (
                <Pressable
                  key={c.id}
                  accessibilityRole="button"
                  onPress={() => {
                    setChatId(c.id);
                    go("chat");
                  }}
                  style={s.studentRow}
                >
                  <Avatar child={c} />
                  <View style={{ flex: 1 }}>
                    <Copy bold>{c.name} · responsáveis</Copy>
                    <Copy size={12} color={C.muted}>
                      {last?.body.slice(0, 65) ||
                        "Iniciar conversa sobre este aluno"}
                    </Copy>
                  </View>
                  <Icon name="chevron-right" />
                </Pressable>
              );
            })}
            <Card tone="sky" style={{ marginTop: 20 }}>
              <Copy bold>Cada conversa tem seu aluno.</Copy>
              <Copy size={12}>
                As mensagens ficam vinculadas à criança, com histórico
                compartilhado com os responsáveis autorizados.
              </Copy>
            </Card>
            <Button icon="plus" onPress={() => openCompose()}>
              Novo comunicado
            </Button>
            <Copy bold size={18} style={{ marginTop: 20 }}>
              Comunicados enviados
            </Copy>
            {notices.map((n) => (
              <Row
                key={n.id}
                title={n.title}
                sub={`${n.readBy.length} responsável(s) leram`}
                onPress={() => {
                  setNoticeId(n.id);
                  go("notice");
                }}
              />
            ))}
          </>
        );
      case "chat": {
        const c = children.find((c) => c.id === chatId) || current;
        return (
          <>
            <ChildTag child={c} />
            <Heading flower={false} sub="Conversa vinculada ao aluno">
              Sobre {c.name}.
            </Heading>
            <View style={{ gap: 12, marginBottom: 24 }}>
              {data.messages
                .filter((m) => m.childId === c.id)
                .map((m) => (
                  <View
                    key={m.id}
                    style={[
                      s.bubble,
                      {
                        backgroundColor:
                          m.senderId === actor.id ? C.blue : C.sky,
                        alignSelf:
                          m.senderId === actor.id ? "flex-end" : "flex-start",
                      },
                    ]}
                  >
                    <Copy
                      size={10}
                      bold
                      color={m.senderId === actor.id ? C.white : C.blue}
                    >
                      {data.actors.find((a) => a.id === m.senderId)?.name ||
                        "Responsável"}
                    </Copy>
                    <Copy color={m.senderId === actor.id ? C.white : C.ink}>
                      {m.body}
                    </Copy>
                  </View>
                ))}
            </View>
            <Field
              label={`Mensagem sobre ${c.name}`}
              value={message}
              onChange={setMessage}
              multiline
              placeholder="Escreva sua mensagem"
            />
            <Button
              disabled={busy || !message.trim()}
              icon="send"
              onPress={async () => {
                if (
                  await dispatch({
                    type: "message.send",
                    childId: c.id,
                    body: message,
                  })
                )
                  setMessage("");
              }}
            >
              Enviar mensagem
            </Button>
          </>
        );
      }
      case "compose":
        return (
          <>
            <Heading>Uma mensagem.{"\n"}O destino certo.</Heading>
            <Copy bold size={12}>
              Destinatários
            </Copy>
            <View style={{ gap: 8, marginVertical: 12 }}>
              {children.map((c) => (
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: recipients.includes(c.id) }}
                  key={c.id}
                  onPress={() =>
                    setRecipients((r) =>
                      r.includes(c.id)
                        ? r.filter((id) => id !== c.id)
                        : [...r, c.id],
                    )
                  }
                  style={[s.row, s.recipient]}
                >
                  <Icon
                    name={recipients.includes(c.id) ? "check-square" : "square"}
                    color={C.blue}
                  />
                  <ChildTag child={c} />
                </Pressable>
              ))}
            </View>
            <Copy size={11} color={C.muted}>
              Cada família recebe somente o contexto do seu filho.
            </Copy>
            <Chips
              items={[
                { id: "update", label: "Atualização" },
                { id: "request", label: "Solicitação" },
                { id: "authorization", label: "Autorização" },
              ]}
              value={kind}
              onChange={setKind}
            />
            <View style={{ gap: 16, marginVertical: 20 }}>
              <Field
                label="Título"
                value={title}
                onChange={setTitle}
                placeholder="Assunto do comunicado"
              />
              <Field
                label="Mensagem"
                value={body}
                onChange={setBody}
                multiline
                placeholder="O que as famílias precisam saber?"
              />
              {kind !== "update" && (
                <Field
                  label="Prazo (AAAA-MM-DD)"
                  value={due}
                  onChange={setDue}
                />
              )}
            </View>
            <Button
              disabled={
                busy || !title.trim() || !body.trim() || !recipients.length
              }
              onPress={() => setReview(true)}
            >
              Revisar envio
            </Button>
          </>
        );
      case "materials":
        return (
          <>
            <Heading>Pedir, acompanhar,{"\n"}resolver.</Heading>
            {selector}
            {notices
              .filter((n) => n.type !== "update")
              .map((n) => (
                <Card
                  key={n.id}
                  tone={n.type === "authorization" ? "lime" : "sky"}
                >
                  <Copy size={11} bold>
                    {n.type === "authorization" ? "AUTORIZAÇÃO" : "SOLICITAÇÃO"}
                  </Copy>
                  <Copy bold size={20}>
                    {n.title}
                  </Copy>
                  <Copy>{n.body}</Copy>
                  <Copy size={12}>
                    Prazo: {n.due ? dateLabel(n.due) : "Sem prazo"}
                  </Copy>
                  <View style={s.row}>
                    <Copy bold color={C.green}>
                      {
                        n.responses.filter((r) => r.answer === "confirmed")
                          .length
                      }{" "}
                      confirmaram
                    </Copy>
                    <Copy bold color={C.orange}>
                      {
                        n.childIds.filter(
                          (id) => !n.responses.some((r) => r.childId === id),
                        ).length
                      }{" "}
                      pendentes
                    </Copy>
                  </View>
                  {n.childIds.map((id) => (
                    <View
                      key={id}
                      style={[s.row, { justifyContent: "space-between" }]}
                    >
                      <Copy>{children.find((c) => c.id === id)?.name}</Copy>
                      <Copy
                        size={11}
                        color={
                          n.responses.some((r) => r.childId === id)
                            ? C.green
                            : C.muted
                        }
                      >
                        {n.responses.some((r) => r.childId === id)
                          ? "Respondido"
                          : "Aguardando família"}
                      </Copy>
                    </View>
                  ))}
                </Card>
              ))}
            <Button icon="plus" onPress={() => openCompose("request")}>
              Nova solicitação
            </Button>
          </>
        );
      case "event":
        return (
          <>
            <Heading>Um encontro{"\n"}para lembrar.</Heading>
            <View style={{ gap: 16 }}>
              <Field label="Nome do evento" value={title} onChange={setTitle} />
              <Field
                label="Data (AAAA-MM-DD)"
                value={eventDate}
                onChange={setEventDate}
              />
              <Field
                label="Horário (HH:MM)"
                value={eventTime}
                onChange={setEventTime}
              />
              <Field label="Local" value={place} onChange={setPlace} />
              <Copy bold>Alunos e famílias</Copy>
              {children.map((c) => (
                <Pressable
                  key={c.id}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: recipients.includes(c.id) }}
                  onPress={() =>
                    setRecipients((r) =>
                      r.includes(c.id)
                        ? r.filter((id) => id !== c.id)
                        : [...r, c.id],
                    )
                  }
                  style={s.row}
                >
                  <Icon
                    name={recipients.includes(c.id) ? "check-square" : "square"}
                    color={C.blue}
                  />
                  <ChildTag child={c} />
                </Pressable>
              ))}
            </View>
            <Button
              disabled={busy}
              onPress={async () => {
                if (
                  await dispatch({
                    type: "event.create",
                    title,
                    date: eventDate,
                    time: eventTime,
                    place,
                    childIds: recipients,
                  })
                ) {
                  setCalendar({
                    year: Number(eventDate.slice(0, 4)),
                    month: Number(eventDate.slice(5, 7)) - 1,
                  });
                  back();
                }
              }}
            >
              Criar evento
            </Button>
          </>
        );
    }
  };
  const tabs: { label: string; icon: IconName; page: Page; active: boolean }[] =
    family
      ? [
          {
            label: "Hoje",
            icon: "home",
            page: "home",
            active: ["home", "day", "moments"].includes(page),
          },
          {
            label: "Agenda",
            icon: "calendar",
            page: "calendar",
            active: ["calendar", "notice"].includes(page),
          },
          {
            label: "Conversas",
            icon: "message-circle",
            page: "notices",
            active: ["notices", "chat"].includes(page),
          },
          {
            label: "Perfil",
            icon: "user",
            page: "profile",
            active: ["profile", "finance", "invoice"].includes(page),
          },
        ]
      : [
          {
            label: "Turma",
            icon: "users",
            page: "classroom",
            active: ["classroom", "routine"].includes(page),
          },
          {
            label: "Mensagens",
            icon: "message-circle",
            page: "inbox",
            active: ["inbox", "chat", "compose", "notice"].includes(page),
          },
          {
            label: "Agenda",
            icon: "calendar",
            page: "calendar",
            active: ["calendar", "materials", "event"].includes(page),
          },
          {
            label: "Mais",
            icon: "more-horizontal",
            page: "profile",
            active: page === "profile",
          },
        ];
  return (
    <View style={s.stage}>
      {Platform.OS === "web" && width > 1000 && (
        <View style={s.desktopIntro}>
          <Text style={[s.wordmark, { fontSize: 44 }]}>
            think<Text style={{ color: C.blue }}>Edu</Text>
            <Text style={{ color: C.orange }}>·</Text>
          </Text>
          <Copy size={12} bold color={C.muted} style={{ letterSpacing: 2 }}>
            THINKSYSTEMS · PROJETO DE EDUCAÇÃO
          </Copy>
          <Text style={s.desktopTitle}>Perto de cada{"\n"}descoberta.</Text>
          <Copy color={C.muted} size={17}>
            A rotina da escola e da família,{"\n"}com mais clareza e conexão.
          </Copy>
          <View style={{ marginTop: 36, gap: 12 }}>
            <Copy bold>Explore a demonstração</Copy>
            <Button outline onPress={() => role("rafael")}>
              Visão da família
            </Button>
            <Button outline onPress={() => role("ana")}>
              Visão da educadora
            </Button>
          </View>
          <Copy size={11} color={C.muted} style={{ marginTop: 24 }}>
            Dados fictícios · Outubro de 2026
          </Copy>
        </View>
      )}
      <View
        style={[
          s.phone,
          Platform.OS === "web" && width > 700 && s.phoneDesktop,
        ]}
      >
        <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
          <View style={s.demoBar}>
            <Copy size={10} color={C.muted}>
              DEMO ·{" "}
              {school.connected ? "API conectada" : "salvo neste dispositivo"}
            </Copy>
            <Pressable
              accessibilityRole="button"
              onPress={() => role(family ? "ana" : "rafael")}
            >
              <Copy bold color={C.blue} size={10}>
                {family ? "Ver educadora" : "Ver família"} ⇄
              </Copy>
            </Pressable>
          </View>
          {school.ready ? (
            <>
              <ScrollView
                key={page}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={s.content}
              >
                {screenHeader}
                {content()}
              </ScrollView>
              <View style={s.dockWrap}>
                <View style={s.dock}>
                  {tabs.map((t) => (
                    <Pressable
                      accessibilityRole="tab"
                      accessibilityState={{ selected: t.active }}
                      accessibilityLabel={t.label}
                      key={t.label}
                      onPress={() => tab(t.page)}
                      style={[
                        s.navItem,
                        t.active && { backgroundColor: C.blue },
                      ]}
                    >
                      <Icon name={t.icon} color={t.active ? C.white : C.ink} />
                      <Copy size={10} bold color={t.active ? C.white : C.ink}>
                        {t.label}
                      </Copy>
                    </Pressable>
                  ))}
                </View>
              </View>
            </>
          ) : (
            <View style={s.loading}>
              <ActivityIndicator color={C.blue} />
              <Copy>Preparando sua escola…</Copy>
            </View>
          )}
          {!!school.error && (
            <View accessibilityRole="alert" style={s.error}>
              <Copy color={C.white} size={12} style={{ flex: 1 }}>
                {school.error}
              </Copy>
              <Pressable
                accessibilityLabel="Fechar aviso"
                onPress={school.clearError}
              >
                <Icon name="x" color={C.white} />
              </Pressable>
            </View>
          )}
        </SafeAreaView>
      </View>
      <Modal
        visible={sheet}
        transparent
        animationType="slide"
        onRequestClose={() => setSheet(false)}
      >
        <View style={s.overlay}>
          <Pressable
            accessibilityLabel="Fechar seleção"
            style={{ flex: 1 }}
            onPress={() => setSheet(false)}
          />
          <View style={s.sheet}>
            <View style={s.handle} />
            <Heading flower={false}>Quem vamos{"\n"}acompanhar?</Heading>
            <ScrollView style={{ maxHeight: 340 }}>
              <Row
                title={family ? "Todos os filhos" : "Toda a turma"}
                icon="users"
                onPress={() => {
                  if (page !== "routine") setChildId("all");
                  setSheet(false);
                }}
                right={
                  childId === "all" ? (
                    <Icon name="check-circle" color={C.blue} />
                  ) : undefined
                }
              />
              {children.map((c) => (
                <Pressable
                  accessibilityRole="button"
                  key={c.id}
                  onPress={() => {
                    if (page === "routine") openRoutine(c);
                    else setChildId(c.id);
                    setSheet(false);
                  }}
                  style={s.studentRow}
                >
                  <Avatar child={c} />
                  <View style={{ flex: 1 }}>
                    <Copy bold>{c.name}</Copy>
                    <Copy size={11} color={C.muted}>
                      {c.group} · {data.school.name}
                    </Copy>
                  </View>
                  {childId === c.id && (
                    <Icon name="check-circle" color={C.blue} />
                  )}
                </Pressable>
              ))}
            </ScrollView>
            <Button outline onPress={() => setSheet(false)}>
              Concluir
            </Button>
          </View>
        </View>
      </Modal>
      <Modal
        visible={review}
        transparent
        animationType="fade"
        onRequestClose={() => setReview(false)}
      >
        <View style={s.centerOverlay}>
          <Card style={{ width: "100%", maxWidth: 420 }}>
            <Heading flower={false}>Revisar antes{"\n"}de enviar.</Heading>
            {page === "routine" ? (
              <>
                <ChildTag child={current} />
                <Copy>
                  Alimentação: {meal} · Descanso: {sleep} min
                </Copy>
                <Copy>{note || "Sem observação adicional."}</Copy>
              </>
            ) : (
              <>
                <Copy bold>{title}</Copy>
                <Copy>{body}</Copy>
                <Copy size={12} color={C.muted}>
                  Destinatários:{" "}
                  {children
                    .filter((c) => recipients.includes(c.id))
                    .map((c) => c.name)
                    .join(", ")}
                </Copy>
              </>
            )}
            <Button
              disabled={busy}
              onPress={async () => {
                const ok = await dispatch(
                  page === "routine"
                    ? {
                        type: "routine.save",
                        childId: current.id,
                        date: DEMO_DATE,
                        meal,
                        sleep: Number(sleep),
                        mood,
                        hygiene,
                        note,
                        published: true,
                      }
                    : {
                        type: "notice.create",
                        title,
                        body,
                        kind,
                        childIds: recipients,
                        due: kind === "update" ? null : due,
                      },
                );
                if (ok) {
                  setReview(false);
                  back();
                  setDialog({
                    title: "Publicado com sucesso",
                    body: "O conteúdo agora está disponível para os responsáveis dos alunos selecionados.",
                  });
                }
              }}
            >
              {busy ? "Publicando…" : "Confirmar publicação"}
            </Button>
            <Button outline onPress={() => setReview(false)}>
              Voltar e editar
            </Button>
          </Card>
        </View>
      </Modal>
      <Modal
        visible={!!dialog}
        transparent
        animationType="fade"
        onRequestClose={() => setDialog(null)}
      >
        <View style={s.centerOverlay}>
          <Card style={{ width: "100%", maxWidth: 420 }}>
            <Copy bold size={24}>
              {dialog?.title}
            </Copy>
            <Copy>{dialog?.body}</Copy>
            <Button onPress={() => setDialog(null)}>Entendi</Button>
          </Card>
        </View>
      </Modal>
    </View>
  );
}
export default function App() {
  const [loaded, error] = useFonts({
    JakartaRegular: PlusJakartaSans_400Regular,
    JakartaMedium: PlusJakartaSans_500Medium,
    JakartaBold: PlusJakartaSans_700Bold,
    JakartaExtraBold: PlusJakartaSans_800ExtraBold,
  });
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {loaded ? (
        <SchoolApp />
      ) : (
        <View style={s.loading}>
          <ActivityIndicator color={C.blue} />
          <Text>
            {error
              ? "Não foi possível carregar as fontes. Reabra o app."
              : "Carregando thinkEdu…"}
          </Text>
        </View>
      )}
    </SafeAreaProvider>
  );
}
const s = StyleSheet.create({
  stage: {
    flex: 1,
    backgroundColor: C.canvas,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 80,
  },
  phone: { flex: 1, maxWidth: 480, backgroundColor: C.white, height: "100%" },
  phoneDesktop: {
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: "auto",
    width: 410,
    height: "92%",
    maxHeight: 920,
    borderRadius: 36,
    borderWidth: 7,
    borderColor: C.ink,
    overflow: "hidden",
    boxShadow: "0 24px 80px #14203D18",
  },
  desktopIntro: { width: 380, padding: 12 },
  desktopTitle: {
    fontFamily: T.extraBold,
    fontSize: 48,
    lineHeight: 56,
    letterSpacing: -2,
    color: C.ink,
    marginTop: 52,
    marginBottom: 24,
  },
  demoBar: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  content: { padding: 22, paddingBottom: 24 },
  row: { flexDirection: "row", gap: 10, alignItems: "center" },
  wordmark: {
    fontFamily: T.extraBold,
    fontSize: 26,
    letterSpacing: -1.1,
    color: C.ink,
  },
  heading: {
    fontFamily: T.extraBold,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -1.3,
    color: C.ink,
    flex: 1,
  },
  heroTitle: {
    fontFamily: T.extraBold,
    fontSize: 29,
    lineHeight: 35,
    letterSpacing: -1,
    flex: 1,
  },
  flower: { width: 37, height: 37, marginTop: 5 },
  circle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.sky,
    alignItems: "center",
    justifyContent: "center",
  },
  unread: {
    position: "absolute",
    right: 6,
    top: 5,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.orange,
  },
  selector: {
    backgroundColor: C.sky,
    borderRadius: 19,
    padding: 12,
    marginBottom: 18,
  },
  avatar: { alignItems: "center", justifyContent: "center" },
  card: {
    borderRadius: 24,
    padding: 20,
    gap: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.line,
  },
  button: {
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 15,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginTop: 8,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
    minHeight: 68,
  },
  iconBox: {
    width: 39,
    height: 39,
    borderRadius: 14,
    backgroundColor: C.sky,
    alignItems: "center",
    justifyContent: "center",
  },
  photo: {
    width: "100%",
    borderRadius: 22,
    resizeMode: "cover",
    marginBottom: 16,
  },
  chip: {
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 15,
    minHeight: 42,
  },
  input: {
    fontFamily: T.regular,
    fontSize: 14,
    color: C.ink,
    padding: 14,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.white,
  },
  amount: {
    fontFamily: T.extraBold,
    fontSize: 31,
    letterSpacing: -1,
    color: C.ink,
  },
  detailRow: {
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  calendar: { flexDirection: "row", flexWrap: "wrap", marginBottom: 24 },
  calendarCell: {
    width: "14.285714%",
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  calendarDay: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  studentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
    minHeight: 64,
  },
  recipient: { padding: 12, backgroundColor: C.sky, borderRadius: 14 },
  bubble: { padding: 16, borderRadius: 19, maxWidth: "90%", gap: 6 },
  dockWrap: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 4,
    backgroundColor: C.white,
  },
  dock: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderWidth: 1.5,
    borderColor: C.blue,
    borderRadius: 28,
    padding: 6,
    gap: 4,
    boxShadow: "0 4px 14px #254BFF18",
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    flex: 1,
    minHeight: 54,
    borderRadius: 20,
    paddingVertical: 7,
  },
  overlay: {
    flex: 1,
    backgroundColor: "#14203D66",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: C.white,
    padding: 24,
    paddingBottom: 36,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    maxHeight: "85%",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.line,
    alignSelf: "center",
    marginBottom: 22,
  },
  centerOverlay: {
    flex: 1,
    backgroundColor: "#14203D88",
    padding: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  loading: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  error: {
    position: "absolute",
    bottom: 95,
    left: 18,
    right: 18,
    padding: 16,
    borderRadius: 16,
    backgroundColor: C.ink,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
});
