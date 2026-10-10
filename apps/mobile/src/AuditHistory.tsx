import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import type { AuditEntry } from "../../../packages/core/model.mjs";
import { auditLabels, auditTime } from "../../../packages/core/audit.mjs";
export function AuditHistory({
  load,
}: {
  load: (
    filters: Record<string, string>,
    page: number,
  ) => Promise<{ entries: AuditEntry[]; total: number }>;
}) {
  const [search, setSearch] = useState(""),
    [outcome, setOutcome] = useState(""),
    [page, setPage] = useState(1),
    [entries, setEntries] = useState<AuditEntry[]>([]),
    [total, setTotal] = useState(0),
    [error, setError] = useState(""),
    [selected, setSelected] = useState<AuditEntry | null>(null),
    [busy, setBusy] = useState(false),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setBusy(true);
    const timer = setTimeout(() => {
      load({ search, outcome }, page)
        .then((r) => {
          if (active) {
            setEntries(r.entries);
            setTotal(r.total);
            setError("");
          }
        })
        .catch((e) => {
          if (active) setError(e.message);
        })
        .finally(() => {
          if (active) setBusy(false);
        });
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [search, outcome, page, revision]);
  const button = (title: string, action: () => void, disabled = false) => (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={action}
      style={[s.button, disabled && { opacity: 0.4 }]}
    >
      <Text style={s.buttonText}>{title}</Text>
    </Pressable>
  );
  return (
    <View>
      <Text style={s.title}>Histórico da escola.</Text>
      <Text style={s.copy}>
        Todas as unidades · Quem fez, quando e o que mudou.
      </Text>
      <TextInput
        accessibilityLabel="Buscar na auditoria"
        placeholder="Buscar pessoa, ação ou registro"
        style={s.input}
        value={search}
        onChangeText={(v) => {
          setSearch(v);
          setPage(1);
        }}
      />
      <View style={s.row}>
        {[
          ["", "Todos"],
          ["succeeded", "Concluídos"],
          ["denied", "Negados"],
          ["failed", "Falhas"],
        ].map(([id, label]) => (
          <Pressable
            key={id}
            accessibilityRole="button"
            onPress={() => {
              setOutcome(id);
              setPage(1);
            }}
            style={[s.chip, outcome === id && { backgroundColor: "#254BFF" }]}
          >
            <Text style={{ color: outcome === id ? "white" : "#14203D" }}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>
      {button("Atualizar histórico", () => setRevision((r) => r + 1), busy)}
      {!!error && (
        <Text accessibilityRole="alert" style={s.copy}>
          {error}
        </Text>
      )}
      {busy && <Text style={s.copy}>Consultando…</Text>}
      <Text style={s.copy}>
        {total} registros · Página {page}
      </Text>
      {entries.map((e) => (
        <Pressable
          key={e.id}
          accessibilityRole="button"
          style={s.card}
          onPress={() => setSelected(selected?.id === e.id ? null : e)}
        >
          <Text style={s.heading}>{auditLabels[e.type] || e.type}</Text>
          <Text style={s.copy}>
            {e.actorName || "Nome não registrado"} · {auditTime(e.at)}
          </Text>
          <Text style={s.copy}>
            {e.outcome === "denied"
              ? "Acesso negado"
              : e.outcome === "failed"
                ? "Falha"
                : "Concluído"}{" "}
            ·{" "}
            {e.source === "web"
              ? "Administrativo"
              : e.source === "app"
                ? "Aplicativo"
                : e.source || "Anterior"}
          </Text>
          {selected?.id === e.id && (
            <View>
              <Text style={s.copy}>Registro: {e.subject || "Escola"}</Text>
              {e.error && <Text style={s.copy}>{e.error}</Text>}
              <Text style={s.copy}>
                {e.changes?.length || 0} alterações · Solicitação{" "}
                {e.requestId || "não registrada"}
              </Text>
              {e.changes?.slice(0, 10).map((c, i) => (
                <View key={i} style={s.detail}>
                  <Text style={s.heading}>
                    {c.collection} · {c.operation}
                  </Text>
                  <Text style={s.copy}>Antes: {JSON.stringify(c.before)}</Text>
                  <Text style={s.copy}>Depois: {JSON.stringify(c.after)}</Text>
                </View>
              ))}
              {(e.changes?.length || 0) > 10 && (
                <Text style={s.copy}>
                  Consulte o administrativo para ver todas as alterações deste
                  registro.
                </Text>
              )}
              {e.legacy && (
                <Text style={s.copy}>
                  Registro anterior à auditoria detalhada.
                </Text>
              )}
            </View>
          )}
        </Pressable>
      ))}
      <View style={s.row}>
        {button("Anterior", () => setPage((p) => p - 1), page === 1 || busy)}
        {button(
          "Próxima",
          () => setPage((p) => p + 1),
          page * 25 >= total || busy,
        )}
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#14203D",
    marginBottom: 12,
  },
  copy: { fontSize: 12, color: "#65718B", lineHeight: 19, marginVertical: 6 },
  heading: { fontSize: 14, fontWeight: "700", color: "#14203D" },
  input: {
    backgroundColor: "#F2F5FB",
    borderRadius: 14,
    padding: 14,
    marginVertical: 16,
    color: "#14203D",
  },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginVertical: 8 },
  chip: { padding: 8, borderRadius: 12, backgroundColor: "#EAF0FF" },
  card: {
    backgroundColor: "#F4F6FC",
    borderRadius: 18,
    padding: 16,
    marginVertical: 6,
  },
  button: {
    backgroundColor: "#EAF0FF",
    padding: 12,
    borderRadius: 12,
    marginVertical: 5,
  },
  buttonText: { color: "#254BFF", fontWeight: "700" },
  detail: {
    borderTopWidth: 1,
    borderTopColor: "#DCE4F4",
    paddingTop: 10,
    marginTop: 10,
  },
});
