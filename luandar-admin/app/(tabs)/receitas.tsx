import { useEffect, useState, useCallback } from "react"
import {
  View, Text, StyleSheet, ActivityIndicator,
  ScrollView, RefreshControl, TouchableOpacity
} from "react-native"
import { getEvents } from "../../libs/api"

type Event = {
  id: string
  nome: string
  tipo_evento: string
  data_evento: string
  preco_base: number
  total: number
  deposito_pago: boolean
  status: string
}

const MONTHS = [
  "Jan","Fev","Mar","Abr","Mai","Jun",
  "Jul","Ago","Set","Out","Nov","Dez"
]

export default function Receitas() {
  const [events, setEvents]     = useState<Event[]>([])
  const [loading, setLoading]   = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [year, setYear]         = useState(new Date().getFullYear())

  const fetchEvents = useCallback(async () => {
    try {
      const data = await getEvents()
      setEvents(data)
    } catch {
      // silent
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  const fmt = (n: number) =>
    n.toLocaleString("pt-PT") + " Kz"

  // Filter to selected year, exclude cancelled
  const active = events.filter(e =>
    new Date(e.data_evento).getFullYear() === year &&
    e.status !== "cancelled"
  )

  // Totals
  const totalRevenue  = active.reduce((s, e) => s + (e.total || 0), 0)
  const totalDeposits = active.filter(e => e.deposito_pago).reduce((s, e) => s + Math.round((e.total || 0) * 0.3), 0)
  const totalPending  = active.filter(e => !e.deposito_pago).reduce((s, e) => s + (e.total || 0), 0)
  const completed     = active.filter(e => e.status === "completed")
  const totalEarned   = completed.reduce((s, e) => s + (e.total || 0), 0)

  // By month
  const byMonth = MONTHS.map((label, i) => {
    const monthEvents = active.filter(e => new Date(e.data_evento).getMonth() === i)
    return {
      label,
      total:  monthEvents.reduce((s, e) => s + (e.total || 0), 0),
      count:  monthEvents.length,
    }
  })

  const maxMonthTotal = Math.max(...byMonth.map(m => m.total), 1)

  // By event type
  const byType: Record<string, { count: number; total: number }> = {}
  active.forEach(e => {
    if (!byType[e.tipo_evento]) byType[e.tipo_evento] = { count: 0, total: 0 }
    byType[e.tipo_evento].count++
    byType[e.tipo_evento].total += e.total || 0
  })

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator color="#d4bcc9" size="large" />
    </View>
  )

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchEvents() }} tintColor="#d4bcc9" />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Receitas</Text>
        <View style={styles.yearNav}>
          <TouchableOpacity onPress={() => setYear(y => y - 1)} style={styles.navBtn}>
            <Text style={styles.navBtnText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.yearLabel}>{year}</Text>
          <TouchableOpacity onPress={() => setYear(y => y + 1)} style={styles.navBtn}>
            <Text style={styles.navBtnText}>›</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* KPI cards */}
      <View style={styles.kpiGrid}>
        <View style={[styles.kpiCard, styles.kpiCardLarge]}>
          <Text style={styles.kpiLabel}>Receita Total Prevista</Text>
          <Text style={styles.kpiValueLarge}>{fmt(totalRevenue)}</Text>
          <Text style={styles.kpiSub}>{active.length} evento{active.length !== 1 ? "s" : ""} activo{active.length !== 1 ? "s" : ""}</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Já Recebido</Text>
          <Text style={[styles.kpiValue, { color: "#10b981" }]}>{fmt(totalEarned)}</Text>
          <Text style={styles.kpiSub}>{completed.length} concluído{completed.length !== 1 ? "s" : ""}</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Depósitos Pagos</Text>
          <Text style={[styles.kpiValue, { color: "#60a5fa" }]}>{fmt(totalDeposits)}</Text>
          <Text style={styles.kpiSub}>30% de cada reserva</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>A Receber</Text>
          <Text style={[styles.kpiValue, { color: "#f59e0b" }]}>{fmt(totalPending)}</Text>
          <Text style={styles.kpiSub}>Depósito por pagar</Text>
        </View>
      </View>

      {/* Bar chart by month */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Por Mês</Text>
        <View style={styles.barChart}>
          {byMonth.map(({ label, total, count }) => {
            const barH = total > 0 ? Math.max((total / maxMonthTotal) * 120, 4) : 0
            const isCurrentMonth =
              MONTHS.indexOf(label) === new Date().getMonth() &&
              year === new Date().getFullYear()
            return (
              <View key={label} style={styles.barCol}>
                <Text style={styles.barValue}>
                  {count > 0 ? count : ""}
                </Text>
                <View style={styles.barTrack}>
                  <View style={[
                    styles.barFill,
                    { height: barH },
                    isCurrentMonth && { backgroundColor: "#d4bcc9" }
                  ]} />
                </View>
                <Text style={[styles.barLabel, isCurrentMonth && { color: "#d4bcc9" }]}>
                  {label}
                </Text>
              </View>
            )
          })}
        </View>
      </View>

      {/* By event type */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Por Tipo de Evento</Text>
        {Object.keys(byType).length === 0 ? (
          <Text style={styles.empty}>Sem dados.</Text>
        ) : (
          Object.entries(byType)
            .sort((a, b) => b[1].total - a[1].total)
            .map(([type, { count, total }]) => (
              <View key={type} style={styles.typeRow}>
                <View style={styles.typeInfo}>
                  <Text style={styles.typeName}>{type}</Text>
                  <Text style={styles.typeSub}>{count} evento{count !== 1 ? "s" : ""}</Text>
                </View>
                <Text style={styles.typeTotal}>{fmt(total)}</Text>
              </View>
            ))
        )}
      </View>

      {/* Event list with totals */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Detalhe por Evento</Text>
        {active.length === 0 ? (
          <Text style={styles.empty}>Sem eventos em {year}.</Text>
        ) : (
          active
            .sort((a, b) => new Date(a.data_evento).getTime() - new Date(b.data_evento).getTime())
            .map(e => (
              <View key={e.id} style={styles.eventRow}>
                <View style={styles.eventInfo}>
                  <Text style={styles.eventName} numberOfLines={1}>{e.nome}</Text>
                  <Text style={styles.eventSub}>
                    {new Date(e.data_evento).toLocaleDateString("pt-PT")} · {e.tipo_evento}
                  </Text>
                </View>
                <View style={styles.eventAmounts}>
                  <Text style={styles.eventTotal}>{fmt(e.total || 0)}</Text>
                  <Text style={[
                    styles.eventDeposit,
                    { color: e.deposito_pago ? "#10b981" : "#f59e0b" }
                  ]}>
                    {e.deposito_pago ? "Depósito ✓" : "Depósito pendente"}
                  </Text>
                </View>
              </View>
            ))
        )}
      </View>

    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: "#18191d" },
  center:          { flex: 1, backgroundColor: "#18191d", alignItems: "center", justifyContent: "center" },
  header:          { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 24, paddingTop: 60, borderBottomWidth: 1, borderBottomColor: "rgba(212,188,201,0.08)" },
  headerTitle:     { fontFamily: "serif", fontSize: 26, fontWeight: "700", color: "#f0ebe8", letterSpacing: 1 },
  yearNav:         { flexDirection: "row", alignItems: "center", gap: 12 },
  navBtn:          { padding: 4 },
  navBtnText:      { fontSize: 24, color: "#d4bcc9", lineHeight: 28 },
  yearLabel:       { fontFamily: "serif", fontSize: 16, fontWeight: "700", color: "#f0ebe8", minWidth: 40, textAlign: "center" },
  kpiGrid:         { padding: 16, gap: 10 },
  kpiCard:         { backgroundColor: "rgba(212,188,201,0.04)", borderWidth: 1, borderColor: "rgba(212,188,201,0.08)", padding: 20 },
  kpiCardLarge:    { borderColor: "rgba(212,188,201,0.15)" },
  kpiLabel:        { fontSize: 9, fontWeight: "600", letterSpacing: 3, textTransform: "uppercase", color: "rgba(240,235,232,0.4)", marginBottom: 8 },
  kpiValue:        { fontFamily: "serif", fontSize: 22, fontWeight: "700", color: "#f0ebe8" },
  kpiValueLarge:   { fontFamily: "serif", fontSize: 30, fontWeight: "700", color: "#f0ebe8", marginBottom: 4 },
  kpiSub:          { fontSize: 11, fontWeight: "300", color: "rgba(240,235,232,0.3)", marginTop: 4 },
  section:         { padding: 24, paddingTop: 0, marginTop: 8 },
  sectionTitle:    { fontSize: 10, letterSpacing: 3, textTransform: "uppercase", color: "rgba(212,188,201,0.5)", marginBottom: 16 },
  barChart:        { flexDirection: "row", alignItems: "flex-end", gap: 6, height: 160 },
  barCol:          { flex: 1, alignItems: "center", gap: 4 },
  barValue:        { fontSize: 9, color: "rgba(240,235,232,0.4)", fontWeight: "600" },
  barTrack:        { width: "100%", height: 120, justifyContent: "flex-end", backgroundColor: "rgba(212,188,201,0.04)", borderWidth: 1, borderColor: "rgba(212,188,201,0.06)" },
  barFill:         { width: "100%", backgroundColor: "rgba(212,188,201,0.25)" },
  barLabel:        { fontSize: 8, color: "rgba(240,235,232,0.3)", letterSpacing: 0.5 },
  typeRow:         { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "rgba(212,188,201,0.06)" },
  typeInfo:        { gap: 3 },
  typeName:        { fontSize: 14, fontWeight: "500", color: "#f0ebe8" },
  typeSub:         { fontSize: 11, fontWeight: "300", color: "rgba(240,235,232,0.4)" },
  typeTotal:       { fontFamily: "serif", fontSize: 15, fontWeight: "700", color: "#d4bcc9" },
  eventRow:        { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "rgba(212,188,201,0.06)", gap: 12 },
  eventInfo:       { flex: 1, gap: 3 },
  eventName:       { fontSize: 13, fontWeight: "500", color: "#f0ebe8" },
  eventSub:        { fontSize: 11, fontWeight: "300", color: "rgba(240,235,232,0.4)" },
  eventAmounts:    { alignItems: "flex-end", gap: 3 },
  eventTotal:      { fontFamily: "serif", fontSize: 14, fontWeight: "700", color: "#f0ebe8" },
  eventDeposit:    { fontSize: 10, fontWeight: "500" },
  empty:           { fontSize: 13, color: "rgba(240,235,232,0.3)", fontWeight: "300" },
})