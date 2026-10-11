import { readSession, saveSession, clearSession } from "./src/saved-session";
import { AssistantWorkspace } from "./src/AssistantWorkspace";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  KeyboardAvoidingView,
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
import { consolidateInvoices } from "../../packages/core/billing.mjs";
import {
  eventsForChild,
  validateAttachment,
} from "../../packages/core/mural.mjs";
import type { Attachment } from "../../packages/core/model.mjs";
import * as DocumentPicker from "expo-document-picker";
import { Directory, File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useVideoPlayer, VideoView } from "expo-video";
import { AuditHistory } from "./src/AuditHistory";
import { StaffWorkspace } from "./src/StaffWorkspace";
import { can, roleLabels } from "../../packages/core/permissions.mjs";
import { VersionNotice } from "./src/VersionNotice";
import { TeacherWorkspace, type TeacherPage } from "./src/TeacherWorkspace";
import { attendanceLabel } from "../../packages/core/teacher.mjs";
import { Child, useSchool } from "./src/session";
import {
  SchoolworkWorkspace,
  clearWorkReminders,
} from "./src/SchoolworkWorkspace";
import { LoginScreen, type LoginSession } from "./src/LoginScreen";

type IconName = React.ComponentProps<typeof Feather>["name"];
type Page =
  | "assistant"
  | "assignments"
  | "requests"
  | "audit"
  | TeacherPage
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
  | "event"
  | "mural"
  | "muralPost"
  | "muralCompose";
const photo = require("./assets/atelier.png");
const childPhotos: Record<
  string,
  React.ComponentProps<typeof Image>["source"]
> = {
  lia: require("./assets/lia-avatar.png"),
  bento: require("./assets/bento-avatar.png"),
};
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
const mediaUri = (uri: string) =>
  uri.startsWith("local:")
    ? new File(Paths.document, "thinkedu-mural", uri.slice(6)).uri
    : uri;
function MuralVideo({ uri }: { uri: string }) {
  const player = useVideoPlayer(
    uri === "demo:school-video"
      ? require("./assets/mural-demo.mp4")
      : mediaUri(uri),
  );
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const subscription = player.addListener("statusChange", (event) =>
      setFailed(event.status === "error"),
    );
    return () => subscription.remove();
  }, [player]);
  return (
    <View style={{ gap: 10 }}>
      <VideoView
        player={player}
        nativeControls
        fullscreenOptions={{ enable: true }}
        style={{ height: 220, borderRadius: 20, backgroundColor: C.ink }}
      />
      {failed && (
        <Copy color={C.orange}>
          Não foi possível carregar o vídeo. Confira a conexão ou o link com a
          escola.
        </Copy>
      )}
    </View>
  );
}
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
      {childPhotos[child.id] ? (
        <Image
          source={childPhotos[child.id]}
          accessibilityLabel={`Foto ilustrativa de ${child.name}`}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          resizeMode="cover"
        />
      ) : (
        <Copy bold size={size * 0.3} color={C.blue}>
          {child.initials}
        </Copy>
      )}
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
    <Image
      source={
        color === C.lime
          ? require("./assets/thinkedu-symbol-light.png")
          : require("./assets/thinkedu-symbol.png")
      }
      accessibilityElementsHidden
      style={{ width: 40, height: 40, marginTop: 4, resizeMode: "contain" }}
    />
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

import { filterUnitView } from "../../packages/core/units.mjs";
function SchoolApp({
  authSession,
  onLogout,
}: {
  authSession?: LoginSession;
  onLogout: () => void;
}) {
  const school = useSchool(authSession, onLogout),
    { actor, busy, dispatch } = school;
  const [workId, setWorkId] = useState("");
  const [calendarDay, setCalendarDay] = useState("");
  const [unitId, setUnitId] = useState("all");
  const data = filterUnitView(
    school.data,
    actor.role === "family" ? "all" : unitId,
  );
  useEffect(() => {
    setUnitId("all");
  }, [actor.id]);
  const [page, setPage] = useState<Page>("home"),
    [history, setHistory] = useState<Page[]>([]);
  const [childId, setChildId] = useState("all"),
    [sheet, setSheet] = useState(false);
  const [noticeId, setNoticeId] = useState("n-passeio"),
    [invoiceId, setInvoiceId] = useState("family-open");
  const [showComposition, setShowComposition] = useState(false);
  const [postId, setPostId] = useState("m-boas-vindas"),
    [wallKind, setWallKind] = useState("text"),
    [wallUrl, setWallUrl] = useState(""),
    [wallFile, setWallFile] = useState<Attachment | null>(null),
    [wallReview, setWallReview] = useState(false);
  const [picking, setPicking] = useState(false);
  const [filter, setFilter] = useState("all"),
    [chatId, setChatId] = useState("lia");
  const [message, setMessage] = useState(""),
    [title, setTitle] = useState(""),
    [body, setBody] = useState(""),
    [kind, setKind] = useState("update"),
    [recipients, setRecipients] = useState<string[]>([]),
    [due, setDue] = useState("2026-10-13");
  const [composeChannel, setComposeChannel] = useState("notice");
  const [showRecipients, setShowRecipients] = useState(false);
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
  const [profilePicker, setProfilePicker] = useState(false);
  const [profileSearch, setProfileSearch] = useState("");
  const [teacherDate, setTeacherDate] = useState(DEMO_DATE),
    [teacherClassId, setTeacherClassId] = useState("jardim"),
    [teacherStudentId, setTeacherStudentId] = useState("lia");
  const { width } = useWindowDimensions(),
    family = actor.role === "family";
  useEffect(() => {
    if (
      !family &&
      data.classes.length &&
      !data.classes.some((g) => g.id === teacherClassId)
    )
      setTeacherClassId(data.classes[0].id);
  }, [actor.id, data.classes, teacherClassId]);
  const children = data.children as Child[],
    selected = children.find((c) => c.id === childId),
    scope = selected
      ? [selected]
      : family
        ? children
        : children.filter(
            (c) =>
              c.classId ===
              (children.some((c) => c.classId === teacherClassId)
                ? teacherClassId
                : children[0]?.classId),
          );
  const attendanceRecord = (id: string, date = DEMO_DATE) =>
    data.attendance.find((a) => a.childId === id && a.date === date);
  const baseAgendaEvents = family
    ? eventsForChild(data.events, currentAgendaId())
    : data.events.filter((e) =>
        e.childIds.some((id) => scope.some((c) => c.id === id)),
      );
  const agendaEvents = [
    ...baseAgendaEvents.map((e) => ({ ...e, assignmentId: "" })),
    ...data.assignments
      .filter((w) =>
        family
          ? w.childIds.includes(currentAgendaId())
          : w.childIds.some((id) => scope.some((c) => c.id === id)),
      )
      .map((w) => ({
        id: `calendar-${w.id}`,
        assignmentId: w.id,
        title: w.title,
        date: w.due,
        time: w.time,
        place: { homework: "Para casa", project: "Trabalho", exam: "Prova" }[
          w.kind
        ],
        childIds: w.childIds,
        noticeId: null,
        tone:
          w.kind === "exam" ? "lime" : w.kind === "project" ? "peach" : "sky",
      })),
  ];
  function currentAgendaId() {
    return selected?.id || children[0]?.id;
  }
  const agendaChild = children.find((c) => c.id === currentAgendaId());
  const posts = data.posts.filter((p) =>
    p.childIds.some((id) => scope.some((c) => c.id === id)),
  );
  const post = data.posts.find((p) => p.id === postId);
  const routine = data.routines.find(
    (r) => r.childId === (selected?.id || scope[0]?.id) && r.date === dayDate,
  );
  const current = selected || scope[0],
    notice = data.notices.find((n) => n.id === noticeId);
  const familyInvoices = data.invoices.filter((i) =>
    children.some((c) => c.id === i.childId),
  );
  const charges = consolidateInvoices(familyInvoices);
  const checkoutInvoices =
    invoiceId === "family-open"
      ? familyInvoices.filter((i) => i.status === "open")
      : charges.find((c) => c.id === invoiceId)?.invoices || [];
  const checkoutAmount = checkoutInvoices.reduce(
    (total, i) => total + i.amount,
    0,
  );
  const checkoutStatus = checkoutInvoices[0]?.status;
  const checkoutDue = checkoutInvoices.map((i) => i.due).sort()[0];
  const checkoutReference = [
    ...new Set(checkoutInvoices.map((i) => i.reference)),
  ].join(" · ");
  const familyNames = children.map((c) => c.name).join(" e ");
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
  function newPost(wholeClass = false) {
    setShowRecipients(false);
    setTitle("");
    setBody("");
    setWallKind("text");
    setWallUrl("");
    setWallFile(null);
    setWallReview(false);
    setRecipients(
      (wholeClass
        ? children.filter((c) => c.classId === teacherClassId)
        : scope
      ).map((c) => c.id),
    );
    go("muralCompose");
  }
  async function pickMaterial() {
    if (picking) return;
    setPicking(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type:
          wallKind === "video"
            ? "video/*"
            : [
                "application/pdf",
                "image/*",
                "text/plain",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
              ],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if ((asset.size ?? 0) > 100 * 1024 * 1024)
        throw new Error("Escolha um arquivo de até 100 MB.");
      const directory = new Directory(Paths.document, "thinkedu-mural");
      directory.create({ idempotent: true, intermediates: true });
      const safeName = `${Date.now()}-${asset.name.replace(/[^a-zA-Z0-9_.-]/g, "_")}`;
      const destination = new File(directory, safeName);
      new File(asset.uri).copy(destination);
      setWallFile({
        name: asset.name,
        uri: `local:${safeName}`,
        mimeType: asset.mimeType || "application/octet-stream",
      });
      setWallUrl("");
    } catch (e) {
      setDialog({
        title: "Arquivo não anexado",
        body: e instanceof Error ? e.message : "Tente novamente.",
      });
    } finally {
      setPicking(false);
    }
  }
  function wallAttachment() {
    return (
      wallFile || {
        name: title.trim(),
        uri: wallUrl.trim(),
        mimeType:
          wallKind === "video" ? "video/mp4" : "application/octet-stream",
      }
    );
  }
  async function openMaterial(attachment: Attachment) {
    try {
      if (attachment.uri.startsWith("local:")) {
        if (!(await Sharing.isAvailableAsync()))
          throw new Error(
            "Não foi possível abrir o compartilhamento neste dispositivo.",
          );
        await Sharing.shareAsync(mediaUri(attachment.uri), {
          mimeType: attachment.mimeType,
        });
      } else await Linking.openURL(attachment.uri);
    } catch (e) {
      setDialog({
        title: "Não foi possível abrir",
        body: e instanceof Error ? e.message : "Confira sua conexão.",
      });
    }
  }
  function go(next: Page) {
    setHistory((h) => [...h, page]);
    setPage(next);
    setFilter("all");
  }
  useEffect(() => {
    if (Platform.OS === "web") return;
    let active = true;
    let listener: { remove: () => void } | undefined;
    void import("expo-notifications")
      .then(async (n) => {
        if (!active) return;
        const open = (
          response: import("expo-notifications").NotificationResponse,
        ) => {
          const meta = response.notification.request.content.data || {};
          if (
            !active ||
            meta.actorId !== actor.id ||
            !data.assignments.some((w) => w.id === meta.assignmentId)
          )
            return;
          setWorkId(String(meta.assignmentId));
          setPage("assignments");
          setHistory([]);
        };
        listener = n.addNotificationResponseReceivedListener(open);
        const last = await n.getLastNotificationResponseAsync();
        if (last) {
          open(last);
          await n.clearLastNotificationResponseAsync();
        }
      })
      .catch(() => {});
    return () => {
      active = false;
      listener?.remove();
    };
  }, [actor.id, data.assignments]);
  function back() {
    setPage(history.at(-1) || (family ? "home" : "classroom"));
    setHistory((h) => h.slice(0, -1));
  }
  function tab(next: Page) {
    if (!family) setChildId("all");
    setPage(next);
    setHistory([]);
    setFilter("all");
  }
  async function role(id: string) {
    if (busy) return;
    if (!(await school.switchRole(id))) return;
    setProfilePicker(false);
    setTeacherDate(DEMO_DATE);
    setChildId("all");
    setPage(
      school.profiles.find((a) => a.id === id)?.role === "family"
        ? "home"
        : "classroom",
    );
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
      (r) => r.childId === c.id && r.date === teacherDate,
    );
    setChildId(c.id);
    setMeal(r?.meal || "Bem");
    setSleep(String(r?.sleep || 0));
    setMood(r?.mood || "Animada");
    setHygiene(r?.hygiene || "Não registrado");
    setNote(r?.note || "");
    go("routine");
  }
  function goTeacher(next: TeacherPage, child?: Child) {
    if (child) {
      setTeacherStudentId(child.id);
      setTeacherClassId(child.classId);
    }
    if (
      (page === "teacherAttendanceEdit" && next === "teacherAttendance") ||
      (page === "teacherActivity" && next === "teacherPlan")
    ) {
      setPage(next);
      setHistory((h) => h.slice(0, -1));
    } else go(next);
  }
  function composeForChild(child: Child) {
    setKind("update");
    setTitle("");
    setBody("");
    setChildId(child.id);
    setRecipients([child.id]);
    setComposeChannel("notice");
    setShowRecipients(true);
    go("compose");
  }
  function openCompose(
    type = "update",
    channel = "notice",
    wholeClass = false,
  ) {
    setComposeChannel(channel);
    setShowRecipients(false);
    setKind(type);
    setTitle("");
    setBody("");
    setRecipients(
      (wholeClass
        ? children.filter((c) => c.classId === teacherClassId)
        : scope
      ).map((c) => c.id),
    );
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
            {scope.slice(0, 2).map((c) => (
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
                : `Turma ${children.find((c) => c.classId === teacherClassId)?.group || "selecionada"}`}
          </Copy>
          <Copy size={10} color={C.muted}>
            {selected
              ? data.units.find((u) => u.id === selected.unitId)?.name
              : family
                ? `${data.school.name} · ${data.units.length} unidade(s)`
                : data.school.name}
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
          <View style={[s.row, { gap: 8 }]}>
            <Text style={s.wordmark}>
              think<Text style={{ color: C.blue }}>Edu</Text>
            </Text>
            <Image
              source={require("./assets/thinkedu-symbol.png")}
              style={{ width: 30, height: 30 }}
              accessibilityElementsHidden
            />
          </View>
          <Copy size={9} bold color={C.muted} style={{ letterSpacing: 1.4 }}>
            THINKSYSTEMS · EDUCAÇÃO
          </Copy>
        </View>
      )}
      {can(actor, "audit.read") && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ver histórico de auditoria"
          style={s.circle}
          onPress={() => go("audit")}
        >
          <Icon name="shield" />
        </Pressable>
      )}
      {can(actor, "communication.read") && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            family || !can(actor, "messages.read")
              ? "Abrir comunicados"
              : "Abrir mensagens"
          }
          style={s.circle}
          onPress={() =>
            tab(family || !can(actor, "messages.read") ? "notices" : "inbox")
          }
        >
          <Icon name="bell" />
          {pending.length > 0 && <View style={s.unread} />}
        </Pressable>
      )}
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
    const permission: Partial<Record<Page, string>> = {
      routine: "routines.write",
      teacherPlan: "activities.read",
      teacherActivity: "activities.write",
      teacherAttendance: "attendance.read",
      teacherAttendanceEdit: "attendance.write",
      inbox: "messages.read",
      chat: "messages.read",
      compose: "communication.write",
      assistant: "assistant.read",
      assignments: "assignments.read",
      requests: "requests.read",
      muralCompose: "mural.write",
      finance: "finance.read",
      invoice: "finance.read",
      calendar: "calendar.read",
      event: "calendar.write",
      audit: "audit.read",
      notices: "communication.read",
      notice: "communication.read",
      materials: "communication.read",
      mural: "mural.read",
      muralPost: "mural.read",
    };
    if (permission[page] && !can(actor, permission[page]!))
      return (
        <Card>
          <Heading>Acesso restrito</Heading>
          <Copy>Seu perfil não tem permissão para esta área.</Copy>
          <Button onPress={() => tab(family ? "home" : "classroom")}>
            Voltar ao início
          </Button>
        </Card>
      );
    if (
      !family &&
      actor.role !== "teacher" &&
      ["classroom", "teacherStudents", "finance"].includes(page)
    )
      return (
        <StaffWorkspace
          data={data}
          actor={actor}
          view={
            page === "finance"
              ? "finance"
              : page === "teacherStudents"
                ? "students"
                : "home"
          }
          busy={busy}
          onCommand={dispatch}
          onGo={(p) => go(p as Page)}
        />
      );

    if (page === "audit") return <AuditHistory load={school.loadAudit} />;
    switch (page) {
      case "assistant":
        return (
          <AssistantWorkspace
            data={data}
            actor={actor}
            busy={busy}
            dispatch={dispatch}
            onRefresh={school.refreshState}
          />
        );
      case "assignments":
      case "requests":
        return (
          <SchoolworkWorkspace
            key={`${page}-${workId}`}
            mode={page}
            initialId={page === "assignments" ? workId : undefined}
            initialClassId={teacherClassId}
            data={data}
            actor={actor}
            busy={busy}
            dispatch={dispatch}
          />
        );

      case "home":
        return (
          <>
            <Heading>Oi, {actor.name}!</Heading>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Conversar com Samuca"
              onPress={() => go("assistant")}
              style={{
                backgroundColor: C.ink,
                borderRadius: 24,
                padding: 16,
                marginBottom: 16,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
              }}
            >
              <Image
                source={require("./assets/samuca.png")}
                style={{ width: 72, height: 72 }}
                resizeMode="contain"
              />
              <View style={{ flex: 1 }}>
                <Copy bold size={18} color="white">
                  Pergunte ao Samuca ↗
                </Copy>
                <Copy size={12} color="white">
                  Rotina, provas, calendário e cobranças. Seu assistente, aqui
                  pertinho.
                </Copy>
              </View>
            </Pressable>
            {selector}
            <Card tone="lime">
              <Copy bold size={18}>
                Atividades e entregas
              </Copy>
              <Copy size={12}>
                Para casa, trabalhos e provas, com prazo e orientação do
                professor.
              </Copy>
              <Button
                icon="book-open"
                onPress={() => {
                  setWorkId("");
                  go("assignments");
                }}
              >
                Ver atividades e próximas datas
              </Button>
            </Card>
            <Row
              title="Solicitações online"
              sub="Pedidos à escola, protocolos e respostas"
              icon="file-text"
              onPress={() => go("requests")}
            />
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
            <Row
              title="Mural da escola"
              sub="Recados, vídeos e materiais para a família"
              icon="book-open"
              onPress={() => go("mural")}
            />
            {family && posts.length > 0 && (
              <View style={{ marginBottom: 18 }}>
                <Copy bold size={19}>
                  Na timeline da turma
                </Copy>
                {[...posts]
                  .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                  .slice(0, 3)
                  .map((p) => (
                    <Row
                      key={p.id}
                      title={p.title}
                      sub={`${data.actors.find((a) => a.id === p.authorId)?.name || "Equipe escolar"} · ${dateLabel(p.createdAt.slice(0, 10))} · ${p.body.slice(0, 90)}`}
                      icon={
                        p.kind === "video"
                          ? "play"
                          : p.kind === "file"
                            ? "paperclip"
                            : "book-open"
                      }
                      onPress={() => {
                        setPostId(p.id);
                        go("muralPost");
                      }}
                    />
                  ))}
              </View>
            )}
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
                        ● {attendanceLabel(attendanceRecord(c.id))}
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
              {pending.length}{" "}
              {pending.length === 1 ? "pendência" : "pendências"} da família
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
                      time:
                        attendanceRecord(current.id, dayDate)?.arrival || "—",
                      icon: "log-in",
                      title: "Chamada",
                      detail: attendanceLabel(
                        attendanceRecord(current.id, dayDate),
                      ),
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
            <Row
              title="Mural da escola"
              sub="Descobertas e materiais compartilhados"
              icon="book-open"
              onPress={() => go("mural")}
            />
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
        const status = filter === "paid" ? "paid" : "open";
        const periods = charges.filter((c) => c.status === status);
        const total = periods.reduce((sum, c) => sum + c.amount, 0);
        return (
          <>
            <Heading sub="Uma visão para todos os seus filhos.">
              Financeiro da{"\n"}família.
            </Heading>
            <View style={[s.row, { marginBottom: 20 }]}>
              {children.map((c) => (
                <Avatar key={c.id} child={c} size={42} />
              ))}
              <Copy bold>{familyNames}</Copy>
            </View>
            <Chips
              items={[
                { id: "all", label: "Em aberto" },
                { id: "paid", label: "Pagos" },
              ]}
              value={filter}
              onChange={setFilter}
            />
            <Card tone="blue" style={{ marginTop: 20 }}>
              <Copy bold size={10} color={C.white}>
                {status === "open"
                  ? "TOTAL DA FAMÍLIA EM ABERTO"
                  : "TOTAL PAGO PELA FAMÍLIA"}
              </Copy>
              <Text style={[s.amount, { color: C.white }]}>{money(total)}</Text>
              <Copy color={C.white}>
                As mensalidades dos seus filhos, juntas.
              </Copy>
            </Card>
            {status === "open" && total > 0 && (
              <Button
                onPress={() => {
                  setInvoiceId("family-open");
                  setShowComposition(false);
                  go("invoice");
                }}
              >
                Pagar total da família
              </Button>
            )}
            <Copy bold size={18} style={{ marginTop: 20, marginBottom: 12 }}>
              {status === "open"
                ? "Cobranças da família"
                : "Histórico da família"}
            </Copy>
            {periods.map((charge) => (
              <Card key={charge.id} tone="sky">
                <Copy bold size={20}>
                  {charge.reference}
                </Copy>
                <Copy color={C.muted}>
                  {new Set(charge.invoices.map((i) => i.childId)).size}{" "}
                  {new Set(charge.invoices.map((i) => i.childId)).size === 1
                    ? "matrícula incluída"
                    : "matrículas incluídas"}
                </Copy>
                <Copy bold size={24}>
                  {money(charge.amount)}
                </Copy>
                <Copy size={12} color={status === "paid" ? C.green : C.muted}>
                  {status === "paid"
                    ? "Pago"
                    : `Vencimento: ${dateLabel(charge.due)}`}
                </Copy>
                <Button
                  outline
                  onPress={() => {
                    setInvoiceId(charge.id);
                    setShowComposition(false);
                    go("invoice");
                  }}
                >
                  {status === "paid" ? "Ver pagamento" : "Ver detalhes"}
                </Button>
              </Card>
            ))}
            {periods.length === 0 && (
              <Card tone="lime">
                <Copy>
                  {status === "open"
                    ? "Tudo em dia! Nenhuma cobrança em aberto."
                    : "Nenhum pagamento registrado ainda."}
                </Copy>
              </Card>
            )}
            <Copy size={11} color={C.muted}>
              Valores ilustrativos · pagamento conjunto depende da integração
              financeira.
            </Copy>
          </>
        );
      }
      case "invoice":
        return checkoutInvoices.length > 0 ? (
          <>
            <Heading sub={checkoutReference}>
              {checkoutStatus === "open"
                ? "Um pagamento.\nToda a família."
                : "Pagamento da\nfamília."}
            </Heading>
            <View style={[s.row, { marginBottom: 20 }]}>
              {children
                .filter((c) => checkoutInvoices.some((i) => i.childId === c.id))
                .map((c) => (
                  <Avatar key={c.id} child={c} size={52} />
                ))}
              <Copy bold>{actor.name} · responsável</Copy>
            </View>
            <Card tone="blue">
              <Copy bold size={11} color={C.white}>
                {data.school.name.toUpperCase()} · TOTAL DA FAMÍLIA
              </Copy>
              <Text style={[s.amount, { color: C.white }]}>
                {money(checkoutAmount)}
              </Text>
              <Copy color={C.white}>
                {checkoutStatus === "paid"
                  ? "Pago"
                  : `Vence em ${dateLabel(checkoutDue)}`}
              </Copy>
            </Card>
            {checkoutStatus === "open" ? (
              <>
                <Copy bold size={18} style={{ marginTop: 8 }}>
                  Como prefere pagar o total?
                </Copy>
                <Row
                  title="Pix único"
                  sub={`Total da família · ${money(checkoutAmount)}`}
                  icon="grid"
                  onPress={() =>
                    setDialog({
                      title: "Pix da família · demonstração",
                      body: `O pagamento conjunto de ${money(checkoutAmount)} reunirá as mensalidades incluídas. A integração com o provedor ainda está pendente; nenhum Pix real é gerado.`,
                    })
                  }
                />
                <Row
                  title="Boleto único"
                  sub="Todas as mensalidades em um boleto"
                  icon="file-text"
                  onPress={() =>
                    setDialog({
                      title: "Boleto da família · demonstração",
                      body: `O boleto conjunto terá o total de ${money(checkoutAmount)}. Esta versão ainda não emite boleto válido.`,
                    })
                  }
                />
              </>
            ) : (
              <Card tone="lime">
                <Copy>
                  Pagamento ilustrativo registrado. Comprovantes reais dependem
                  da integração financeira.
                </Copy>
              </Card>
            )}
            <Row
              title={
                showComposition
                  ? "Ocultar composição"
                  : "Ver composição do total"
              }
              sub="Confira o que está incluído"
              icon="list"
              onPress={() => setShowComposition((v) => !v)}
            />
            {showComposition && (
              <Card tone="sky">
                {checkoutInvoices.map((i) => (
                  <View key={i.id} style={[s.row, s.detailRow]}>
                    <View style={{ flex: 1 }}>
                      <Copy bold>
                        {children.find((c) => c.id === i.childId)?.name}
                      </Copy>
                      <Copy size={11} color={C.muted}>
                        {i.reference}
                      </Copy>
                    </View>
                    <Copy bold>{money(i.amount)}</Copy>
                  </View>
                ))}
                <View style={[s.row, s.detailRow]}>
                  <Copy bold>Total da família</Copy>
                  <Copy bold>{money(checkoutAmount)}</Copy>
                </View>
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
        ) : (
          <Card tone="lime">
            <Copy>Nenhuma cobrança disponível.</Copy>
          </Card>
        );
      case "mural":
        return (
          <>
            <Heading>Mural da escola.</Heading>
            <Card tone="blue">
              <View style={s.row}>
                <View style={{ flex: 1 }}>
                  <Copy bold size={24} color={C.white}>
                    Aprender também{"\n"}acontece em casa.
                  </Copy>
                  <Copy color={C.white} size={12}>
                    Recados, histórias e materiais da Escola Semente.
                  </Copy>
                </View>
                <Flower color={C.lime} />
              </View>
            </Card>
            {selector}
            {!family && (
              <Button icon="plus" onPress={() => newPost()}>
                Publicar no mural
              </Button>
            )}
            <View style={{ marginVertical: 18 }}>
              <Chips
                items={[
                  { id: "all", label: "Tudo" },
                  { id: "text", label: "Recados" },
                  { id: "video", label: "Vídeos" },
                  { id: "file", label: "Arquivos" },
                ]}
                value={filter}
                onChange={setFilter}
              />
            </View>
            {posts
              .filter((p) => filter === "all" || p.kind === filter)
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
              .map((p) => (
                <Pressable
                  key={p.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Abrir ${p.title}`}
                  onPress={() => {
                    setPostId(p.id);
                    go("muralPost");
                  }}
                >
                  <Card
                    tone={
                      p.kind === "video"
                        ? "sky"
                        : p.kind === "file"
                          ? "peach"
                          : "lime"
                    }
                  >
                    <View style={s.row}>
                      <View style={s.iconBox}>
                        <Icon
                          name={
                            p.kind === "video"
                              ? "play"
                              : p.kind === "file"
                                ? "paperclip"
                                : "align-left"
                          }
                          color={C.blue}
                        />
                      </View>
                      <Copy bold size={11}>
                        {p.kind === "video"
                          ? "VÍDEO"
                          : p.kind === "file"
                            ? "MATERIAL"
                            : "RECADO"}{" "}
                        · {dateLabel(p.createdAt.slice(0, 10))}
                      </Copy>
                    </View>
                    <Copy bold size={21}>
                      {p.title}
                    </Copy>
                    <Copy size={13}>
                      {p.body.length > 150
                        ? `${p.body.slice(0, 150)}…`
                        : p.body}
                    </Copy>
                    <Copy size={11} color={C.muted}>
                      {[
                        ...new Set(
                          p.childIds.map(
                            (id) => children.find((c) => c.id === id)?.group,
                          ),
                        ),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </Copy>
                    <View style={[s.row, { justifyContent: "space-between" }]}>
                      <Copy bold size={12} color={C.blue}>
                        {p.kind === "video"
                          ? "Assistir ao vídeo"
                          : p.kind === "file"
                            ? "Ver material"
                            : "Ler recado"}
                      </Copy>
                      <Icon name="arrow-up-right" color={C.blue} />
                    </View>
                  </Card>
                </Pressable>
              ))}
            {!posts.some((p) => filter === "all" || p.kind === filter) && (
              <Card>
                <Copy>
                  Nenhum material para esta seleção. As novas publicações da
                  escola aparecerão aqui.
                </Copy>
              </Card>
            )}
          </>
        );
      case "muralPost":
        return post ? (
          <>
            <Copy bold size={11} color={C.blue}>
              MURAL DA ESCOLA · {dateLabel(post.createdAt.slice(0, 10))}
            </Copy>
            <Heading>{post.title}</Heading>
            <Copy size={12} color={C.muted} style={{ marginBottom: 18 }}>
              Por{" "}
              {data.actors.find((a) => a.id === post.authorId)?.name ||
                "Equipe da escola"}{" "}
              ·{" "}
              {post.childIds
                .map((id) => children.find((c) => c.id === id)?.name)
                .filter(Boolean)
                .join(" e ")}
            </Copy>
            {post.kind === "video" && post.attachment && (
              <MuralVideo key={post.id} uri={post.attachment.uri} />
            )}
            <Card tone="sky" style={{ marginTop: 18 }}>
              <Copy size={15}>{post.body}</Copy>
            </Card>
            {post.kind === "file" && post.attachment && (
              <Card tone="peach">
                <View style={s.row}>
                  <Icon name="file-text" color={C.blue} />
                  <Copy bold style={{ flex: 1 }}>
                    {post.attachment.name}
                  </Copy>
                </View>
                <Button
                  icon="external-link"
                  onPress={() => openMaterial(post.attachment!)}
                >
                  Abrir arquivo
                </Button>
              </Card>
            )}
            {post.attachment?.uri.startsWith("local:") && (
              <Copy size={11} color={C.muted}>
                Arquivo da demonstração salvo neste dispositivo.
              </Copy>
            )}
            <Button outline onPress={() => back()}>
              Voltar ao mural
            </Button>
          </>
        ) : (
          <Copy>Esta publicação não está disponível para o seu perfil.</Copy>
        );
      case "muralCompose":
        return (
          <>
            <Heading>
              {wallReview
                ? "Tudo pronto para compartilhar?"
                : "Algo bom para compartilhar."}
            </Heading>
            {wallReview ? (
              <>
                <Card tone="sky">
                  <Copy bold size={21}>
                    {title}
                  </Copy>
                  <Copy>{body}</Copy>
                  {wallKind !== "text" && (
                    <Copy size={12}>{wallFile?.name || wallUrl}</Copy>
                  )}
                  <Copy bold size={12}>
                    Para:{" "}
                    {recipients
                      .map((id) => children.find((c) => c.id === id)?.name)
                      .join(" · ")}
                  </Copy>
                </Card>
                <Button
                  disabled={busy}
                  onPress={async () => {
                    if (
                      await dispatch({
                        type: "mural.create",
                        title,
                        body,
                        kind: wallKind,
                        attachment:
                          wallKind === "text" ? null : wallAttachment(),
                        childIds: recipients,
                      })
                    ) {
                      setWallReview(false);
                      tab("mural");
                      setDialog({
                        title: "Publicado no mural",
                        body: "O material já está disponível para os responsáveis selecionados.",
                      });
                    }
                  }}
                >
                  Publicar material
                </Button>
                <Button outline onPress={() => setWallReview(false)}>
                  Continuar editando
                </Button>
              </>
            ) : (
              <>
                <Copy bold size={12}>
                  Quem vai receber?
                </Copy>
                {[...new Set(children.map((c) => c.classId))].map((classId) => {
                  const group = children.filter((c) => c.classId === classId);
                  const checked = group.every((c) => recipients.includes(c.id));
                  return (
                    <Row
                      key={classId}
                      title={group[0].group}
                      sub={
                        checked
                          ? "Turma selecionada"
                          : "Selecionar turma inteira"
                      }
                      icon={checked ? "check-square" : "square"}
                      onPress={() =>
                        setRecipients((r) =>
                          checked
                            ? r.filter((id) => !group.some((c) => c.id === id))
                            : [...new Set([...r, ...group.map((c) => c.id)])],
                        )
                      }
                    />
                  );
                })}
                <Copy size={12} color={C.blue}>
                  {recipients.length} alunos selecionados · publicação na
                  timeline dos responsáveis
                </Copy>
                <Button
                  outline
                  onPress={() => setShowRecipients(!showRecipients)}
                >
                  {showRecipients
                    ? "Ocultar seleção individual"
                    : "Ajustar alunos individualmente"}
                </Button>
                <View style={{ gap: 8, marginBottom: 18 }}>
                  {showRecipients &&
                    children.map((c) => (
                      <Pressable
                        key={c.id}
                        accessibilityRole="checkbox"
                        accessibilityState={{
                          checked: recipients.includes(c.id),
                        }}
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
                          name={
                            recipients.includes(c.id)
                              ? "check-square"
                              : "square"
                          }
                          color={C.blue}
                        />
                        <ChildTag child={c} />
                      </Pressable>
                    ))}
                </View>
                <Chips
                  items={[
                    { id: "text", label: "Texto" },
                    { id: "video", label: "Vídeo" },
                    { id: "file", label: "Arquivo" },
                  ]}
                  value={wallKind}
                  onChange={(v) => {
                    setWallKind(v);
                    setWallFile(null);
                    setWallUrl("");
                  }}
                />
                <View style={{ gap: 16, marginVertical: 20 }}>
                  <Field
                    label="Título do material"
                    value={title}
                    onChange={setTitle}
                    placeholder="Uma descoberta para compartilhar"
                  />
                  <Field
                    label="Texto do mural"
                    value={body}
                    onChange={setBody}
                    multiline
                    placeholder="Escreva seu recado ou uma descrição do material"
                  />
                  {wallKind !== "text" && (
                    <>
                      {!school.connected && Platform.OS !== "web" && (
                        <Button
                          outline
                          icon="paperclip"
                          disabled={picking}
                          onPress={pickMaterial}
                        >
                          {picking ? "Anexando…" : "Escolher no dispositivo"}
                        </Button>
                      )}
                      {wallFile ? (
                        <Card tone="peach">
                          <Copy bold>{wallFile.name}</Copy>
                          <Copy size={11}>
                            Salvo no dispositivo para esta demonstração.
                          </Copy>
                          <Button outline onPress={() => setWallFile(null)}>
                            Remover anexo
                          </Button>
                        </Card>
                      ) : (
                        <Field
                          label={
                            wallKind === "video"
                              ? "Link HTTPS direto do vídeo (MP4, MOV ou WebM)"
                              : "Link HTTPS do arquivo"
                          }
                          value={wallUrl}
                          onChange={setWallUrl}
                          placeholder="https://…"
                        />
                      )}
                      <Copy size={11} color={C.muted}>
                        {school.connected || Platform.OS === "web"
                          ? "Use um link de material já hospedado pela escola."
                          : "Anexos do dispositivo ficam nesta demonstração. Para acesso entre dispositivos, use um link HTTPS hospedado pela escola."}
                      </Copy>
                    </>
                  )}
                </View>
                <Button
                  disabled={
                    busy ||
                    picking ||
                    !title.trim() ||
                    !body.trim() ||
                    !recipients.length
                  }
                  onPress={() => {
                    try {
                      validateAttachment(
                        wallAttachment(),
                        wallKind,
                        !school.connected && Platform.OS !== "web",
                      );
                      setWallReview(true);
                    } catch (e) {
                      setDialog({
                        title: "Confira o material",
                        body:
                          e instanceof Error ? e.message : "Anexo inválido.",
                      });
                    }
                  }}
                >
                  Revisar publicação
                </Button>
              </>
            )}
          </>
        );
      case "calendar":
        return (
          <>
            <Heading>Organize os{"\n"}próximos dias.</Heading>
            <Button
              outline
              onPress={() => {
                setWorkId("");
                go("assignments");
              }}
            >
              Para casa, trabalhos e provas
            </Button>
            <Copy size={11} color={C.muted}>
              Toque nas datas destacadas para ver atividades, comentários e
              conteúdo programático.
            </Copy>
            {!!calendarDay && (
              <Button outline onPress={() => setCalendarDay("")}>
                Mostrar todo o mês
              </Button>
            )}
            {family ? (
              <>
                <Copy color={C.muted} style={{ marginBottom: 12 }}>
                  Cada criança tem a sua agenda e a sua turma.
                </Copy>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 10, paddingBottom: 20 }}
                >
                  {children.map((c) => (
                    <Pressable
                      key={c.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Agenda de ${c.name}, ${c.group}`}
                      accessibilityState={{
                        selected: agendaChild?.id === c.id,
                      }}
                      onPress={() => setChildId(c.id)}
                      style={[
                        s.row,
                        {
                          padding: 12,
                          borderRadius: 22,
                          borderWidth: 2,
                          borderColor:
                            agendaChild?.id === c.id ? C.blue : C.sky,
                          backgroundColor: C.white,
                        },
                      ]}
                    >
                      <Avatar child={c} size={42} />
                      <View>
                        <Copy
                          bold
                          color={agendaChild?.id === c.id ? C.blue : C.ink}
                        >
                          {c.name}
                        </Copy>
                        <Copy size={11} color={C.muted}>
                          {c.group}
                        </Copy>
                      </View>
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            ) : (
              selector
            )}
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
                const event = agendaEvents.some((e) => e.date === date);
                const exam = agendaEvents.some(
                  (e) =>
                    e.date === date && e.assignmentId && e.place === "Prova",
                );
                return (
                  <Pressable
                    key={i}
                    accessibilityRole="button"
                    accessibilityLabel={
                      d
                        ? `Agenda de ${date}${event ? ", com atividades" : ""}`
                        : "Dia vazio"
                    }
                    disabled={!d}
                    onPress={() => setCalendarDay(date)}
                    style={s.calendarCell}
                  >
                    <View
                      style={[
                        s.calendarDay,
                        event && { backgroundColor: exam ? C.orange : C.blue },
                      ]}
                    >
                      <Copy size={12} color={event ? C.white : C.ink}>
                        {d || ""}
                      </Copy>
                    </View>
                  </Pressable>
                );
              })}
            </View>
            {agendaEvents
              .filter(
                (e) =>
                  e.date.startsWith(
                    `${calendar.year}-${String(calendar.month + 1).padStart(2, "0")}`,
                  ) &&
                  (!calendarDay || e.date === calendarDay),
              )
              .sort((a, b) => a.date.localeCompare(b.date))
              .map((e) => (
                <Card key={e.id} tone={e.tone === "lime" ? "lime" : "sky"}>
                  <Copy bold size={11}>
                    {family
                      ? `${agendaChild?.name} · ${agendaChild?.group}`
                      : e.childIds
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
                  {!!e.assignmentId && (
                    <Button
                      outline
                      onPress={() => {
                        setWorkId(e.assignmentId);
                        go("assignments");
                      }}
                    >
                      Ver orientações e conteúdo
                    </Button>
                  )}
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
                  ? `Responsável · ${familyNames}`
                  : `${roleLabels[actor.role]} · ${data.school.name}`}
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
      case "teacherAttendance":
      case "teacherAttendanceEdit":
      case "teacherPlan":
      case "teacherActivity":
      case "teacherStudents":
      case "teacherStudent":
        return (
          <TeacherWorkspace
            page={page}
            data={data}
            actor={actor}
            busy={busy}
            classId={teacherClassId}
            date={teacherDate}
            studentId={teacherStudentId}
            onClass={(id) => {
              setTeacherClassId(id);
              setChildId("all");
            }}
            onDate={setTeacherDate}
            onGo={goTeacher}
            onCommand={dispatch}
            onRoutine={openRoutine}
            onChat={(c) => {
              setChatId(c.id);
              go("chat");
            }}
            onCompose={(c) =>
              c ? composeForChild(c) : openCompose("update", "notice", true)
            }
            onAssignments={() => {
              setWorkId("");
              go("assignments");
            }}
            onClassUpdate={() => newPost(true)}
            onClassMessage={() => openCompose("update", "message", true)}
            onMural={() => {
              setChildId("all");
              go("mural");
            }}
            onMaterials={() => {
              setChildId("all");
              go("materials");
            }}
            onCalendar={() => {
              setChildId("all");
              go("calendar");
            }}
          />
        );
      case "routine":
        return (
          <>
            {selector}
            <Heading sub={fullDate(teacherDate)}>
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
                    date: teacherDate,
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
            {can(actor, "assistant.read") && (
              <Row
                title={family ? "Conversar com Samuca" : "Caixa do Samuca"}
                sub={
                  family
                    ? "Seu assistente para a vida escolar"
                    : "Responder dúvidas dos responsáveis"
                }
                icon="message-circle"
                onPress={() => go("assistant")}
              />
            )}
            {can(actor, "requests.read") && (
              <Row
                title="Solicitações online"
                sub="Acompanhar pedidos e atendimentos"
                icon="file-text"
                onPress={() => go("requests")}
              />
            )}
            <Row
              title="Atividades e entregas"
              sub="Para casa, trabalhos e provas"
              icon="book-open"
              onPress={() => {
                setWorkId("");
                go("assignments");
              }}
            />
            {!family && (
              <Card tone="lime">
                <Copy bold size={20}>
                  Uma turma. Todas as famílias.
                </Copy>
                <Copy size={12}>
                  Compartilhe o dia e os retornos gerais de uma só vez.
                </Copy>
                <Chips
                  items={data.classes.map((g) => ({
                    id: g.id,
                    label: `${g.name} · ${data.units.find((u) => u.id === g.unitId)?.name || ""}`,
                  }))}
                  value={teacherClassId}
                  onChange={setTeacherClassId}
                />
                <Row
                  title="Atualização na timeline"
                  sub="Texto, vídeo ou material para toda a turma"
                  icon="book-open"
                  onPress={() => newPost(true)}
                />
                <Row
                  title="Comunicado para a turma"
                  sub="Avisos, solicitações e autorizações"
                  icon="bell"
                  onPress={() => openCompose("update", "notice", true)}
                />
                <Row
                  title="Mensagem para todos"
                  sub="Envio coletivo; respostas em conversas privadas"
                  icon="send"
                  onPress={() => openCompose("update", "message", true)}
                />
              </Card>
            )}
            <Row
              title="Mural da escola"
              sub="Textos, vídeos e materiais"
              icon="book-open"
              onPress={() => go("mural")}
            />
            <Row
              title="Materiais e autorizações"
              icon="package"
              onPress={() => go("materials")}
            />
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
            <Heading>
              {composeChannel === "message"
                ? "Uma mensagem para a turma."
                : "Um comunicado. O destino certo."}
            </Heading>
            <Copy bold size={12}>
              Destinatários
            </Copy>
            <Copy size={12} color={C.blue}>
              {recipients.length} alunos selecionados · todos os responsáveis
              vinculados receberão
            </Copy>
            <Button outline onPress={() => setShowRecipients(!showRecipients)}>
              {showRecipients
                ? "Ocultar seleção individual"
                : "Ajustar alunos individualmente"}
            </Button>
            <View style={{ gap: 8, marginVertical: 12 }}>
              {!family &&
                data.classes.map((g) => {
                  const group = children.filter((c) => c.classId === g.id);
                  const checked =
                    group.length > 0 &&
                    group.every((c) => recipients.includes(c.id));
                  return (
                    <Row
                      key={g.id}
                      title={`Toda a turma · ${g.name}`}
                      sub={`${group.length} alunos · ${data.units.find((u) => u.id === g.unitId)?.name || ""}`}
                      icon={checked ? "check-square" : "square"}
                      onPress={() =>
                        setRecipients((r) =>
                          checked
                            ? r.filter((id) => !group.some((c) => c.id === id))
                            : [...new Set([...r, ...group.map((c) => c.id)])],
                        )
                      }
                    />
                  );
                })}
              {showRecipients &&
                children.map((c) => (
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
                      name={
                        recipients.includes(c.id) ? "check-square" : "square"
                      }
                      color={C.blue}
                    />
                    <ChildTag child={c} />
                  </Pressable>
                ))}
            </View>
            <Copy size={11} color={C.muted}>
              Cada família recebe somente o contexto do seu filho.
            </Copy>
            {composeChannel === "notice" && (
              <Chips
                items={[
                  { id: "update", label: "Atualização" },
                  { id: "request", label: "Solicitação" },
                  { id: "authorization", label: "Autorização" },
                ]}
                value={kind}
                onChange={setKind}
              />
            )}
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
            label: "Samuca",
            icon: "message-circle",
            page: "assistant",
            active: page === "assistant",
          },
          {
            label: "Escola",
            icon: "book-open",
            page: "notices",
            active: [
              "notices",
              "chat",
              "mural",
              "muralPost",
              "muralCompose",
            ].includes(page),
          },
          {
            label: "Perfil",
            icon: "user",
            page: "profile",
            active: ["profile", "finance", "invoice"].includes(page),
          },
        ]
      : actor.role !== "teacher"
        ? [
            {
              label: "Início",
              icon: "home",
              page: "classroom",
              active: page === "classroom",
            },
            {
              label: "Alunos",
              icon: "users",
              page: "teacherStudents",
              active: page === "teacherStudents",
            },
            ...(can(actor, "communication.read")
              ? [
                  {
                    label: "Recados",
                    icon: "file-text" as IconName,
                    page: "notices" as Page,
                    active: [
                      "notices",
                      "notice",
                      "mural",
                      "muralPost",
                      "muralCompose",
                      "compose",
                    ].includes(page),
                  },
                ]
              : []),
            ...(can(actor, "finance.read")
              ? [
                  {
                    label: "Financeiro",
                    icon: "credit-card" as IconName,
                    page: "finance" as Page,
                    active: page === "finance",
                  },
                ]
              : []),
          ]
        : [
            {
              label: "Hoje",
              icon: "home",
              page: "classroom",
              active: [
                "classroom",
                "teacherAttendance",
                "teacherAttendanceEdit",
              ].includes(page),
            },
            {
              label: "Turma",
              icon: "users",
              page: "teacherStudents",
              active: ["teacherStudents", "teacherStudent", "routine"].includes(
                page,
              ),
            },
            {
              label: "Agenda",
              icon: "calendar",
              page: "teacherPlan",
              active: [
                "teacherPlan",
                "teacherActivity",
                "calendar",
                "event",
              ].includes(page),
            },
            {
              label: "Famílias",
              icon: "message-circle",
              page: "inbox",
              active: [
                "inbox",
                "chat",
                "compose",
                "notice",
                "mural",
                "muralPost",
                "muralCompose",
                "materials",
              ].includes(page),
            },
          ];
  return (
    <View style={s.stage}>
      {!authSession && Platform.OS === "web" && width > 1000 && (
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
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
            {!authSession && (
              <View style={s.demoBar}>
                <Copy size={10} color={C.muted}>
                  DEMO ·{" "}
                  {school.connected
                    ? "API conectada"
                    : "salvo neste dispositivo"}
                </Copy>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setProfileSearch("");
                    setProfilePicker(true);
                    void school.refreshProfiles();
                  }}
                >
                  <Copy bold color={C.blue} size={10}>
                    {roleLabels[actor.role]} ⇄
                  </Copy>
                </Pressable>
              </View>
            )}
            {authSession && (
              <View style={s.demoBar}>
                <Copy size={11} color={C.muted}>
                  {actor.name}
                </Copy>
                <Pressable
                  accessibilityRole="button"
                  onPress={async () => {
                    try {
                      await clearWorkReminders(actor.id);
                      await school.logout();
                    } finally {
                      onLogout();
                    }
                  }}
                >
                  <Copy size={11} bold color={C.blue}>
                    Sair
                  </Copy>
                </Pressable>
              </View>
            )}
            {school.ready ? (
              <>
                <ScrollView
                  key={page}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode={
                    Platform.OS === "ios" ? "interactive" : "on-drag"
                  }
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={s.content}
                >
                  {screenHeader}
                  {!family && school.data.units.length > 0 && (
                    <View style={{ marginBottom: 18 }}>
                      <Chips
                        items={[
                          { id: "all", label: "Todas as unidades" },
                          ...school.data.units.map((u) => ({
                            id: u.id,
                            label: u.name,
                          })),
                        ]}
                        value={unitId}
                        onChange={(id) => {
                          setUnitId(id);
                          setChildId("all");
                          setTeacherClassId(
                            school.data.classes.find(
                              (g) => id === "all" || g.unitId === id,
                            )?.id || "",
                          );
                        }}
                      />
                    </View>
                  )}
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
                          t.page === "assistant" && {
                            backgroundColor: "#F0F5D5",
                          },
                          t.active && { backgroundColor: C.blue },
                        ]}
                      >
                        {t.page === "assistant" ? (
                          <Image
                            source={require("./assets/samuca.png")}
                            style={{ width: 28, height: 28 }}
                            resizeMode="contain"
                            accessible={false}
                          />
                        ) : (
                          <Icon
                            name={t.icon}
                            color={t.active ? C.white : C.ink}
                          />
                        )}
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
        </KeyboardAvoidingView>
      </View>
      <Modal
        visible={profilePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setProfilePicker(false)}
      >
        <View style={s.overlay}>
          <View style={[s.sheet, { maxHeight: "85%" }]}>
            <Heading>Entrar na demonstração</Heading>
            <Copy>
              Escolha uma pessoa. No ambiente real, o perfil será identificado
              pelo login.
            </Copy>
            <TextInput
              accessibilityLabel="Buscar perfil de demonstração"
              placeholder="Buscar pessoa ou perfil"
              style={s.input}
              value={profileSearch}
              onChangeText={setProfileSearch}
            />
            <ScrollView>
              {school.profiles
                .filter((a) =>
                  `${a.name} ${roleLabels[a.role]}`
                    .toLowerCase()
                    .includes(profileSearch.toLowerCase()),
                )
                .map((a) => (
                  <Row
                    key={a.id}
                    title={a.name}
                    sub={roleLabels[a.role]}
                    icon="user"
                    onPress={() => role(a.id)}
                  />
                ))}
            </ScrollView>
            <Button outline onPress={() => setProfilePicker(false)}>
              Cancelar
            </Button>
          </View>
        </View>
      </Modal>
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
                title={
                  family
                    ? "Todos os filhos"
                    : `Turma ${children.find((c) => c.classId === teacherClassId)?.group || "selecionada"}`
                }
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
                    if (!family) setTeacherClassId(c.classId);
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
                      {c.group} ·{" "}
                      {data.units.find((u) => u.id === c.unitId)?.name ||
                        data.school.name}
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
                        date: teacherDate,
                        meal,
                        sleep: Number(sleep),
                        mood,
                        hygiene,
                        note,
                        published: true,
                      }
                    : composeChannel === "message"
                      ? {
                          type: "message.send",
                          childIds: recipients,
                          body: `${title}\n\n${body}`,
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
  const [authSession, setAuthSession] = useState<LoginSession | undefined>();
  const [preview, setPreview] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  useEffect(() => {
    readSession()
      .then(setAuthSession)
      .catch(() => {})
      .finally(() => setSessionReady(true));
  }, []);
  const [loaded, error] = useFonts({
    JakartaRegular: PlusJakartaSans_400Regular,
    JakartaMedium: PlusJakartaSans_500Medium,
    JakartaBold: PlusJakartaSans_700Bold,
    JakartaExtraBold: PlusJakartaSans_800ExtraBold,
  });
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {loaded && sessionReady ? (
        authSession || preview ? (
          <SchoolApp
            authSession={authSession}
            onLogout={() => {
              void clearSession();
              setAuthSession(undefined);
              setPreview(false);
            }}
          />
        ) : (
          <LoginScreen
            onLogin={(session) => {
              void saveSession(session).catch(() => {});
              setAuthSession(session);
            }}
            onPreview={__DEV__ ? () => setPreview(true) : undefined}
          />
        )
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
      <VersionNotice />
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
