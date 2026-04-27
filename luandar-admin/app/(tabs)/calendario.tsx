import { useEffect, useState, useCallback } from "react"
import {
  View, Text, StyleSheet, ActivityIndicator,
  TouchableOpacity, Modal, ScrollView, RefreshControl
} from "react-native"
import { getEvents } from "../../libs/api"

type Event = {
  id: string
  nome: string
  tipo_evento: string
  data_evento: string
  num_convidados: number
  status: string
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  pending:      { label: "Pendente",      color: "#f59e0b", bg: "rgba(245,158,11,0.1)"  },
  confirmed:    { label: "Confirmado",    color: "#10b981", bg: "rgba(16,185,129,0.1)"  },
  deposit_paid: { label: "Depósito Pago", color: "#60a5fa", bg: "rgba(96,165,250,0.1)"  },
  completed:    { label: "Concluído",     color: "#d4bcc9", bg: "rgba(212,188,201,0.1)" },
  cancelled:    { label: "Cancelado",     color: "#f87171", bg: "rgba(248,113,113,0.1)" },
}

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
const MONTHS = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"
]

export default function Calendario() {
  const [events, setEvents]       = useState<Event[]>([])
  const [loading, setLoading]     = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [year, setYear]           = useState(new Date().getFullYear())
  const [month, setMonth]         = useState(new Date().getMonth())
  const [selected, setSelected]   = useState<Event[] | null>(null)
  const [selectedDate, setSelectedDate] = useState("")

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

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1)
  ]

  // Map events to day numbers for this month
  const eventsByDay: Record<number, Event[]> = {}
  events.forEach(e => {
    const d = new Date(e.data_evento)
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate()
      if (!eventsByDay[day]) eventsByDay[day] = []
      eventsByDay[day].push(e)
    }
  })

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }

  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const today = new Date()
  const isToday = (day: number) =>
    day === today.getDate() &&
    month === today.getMonth() &&
    year === today.getFullYear()

  const handleDayPress = (day: number) => {
    const dayEvents = eventsByDay[day]
    if (!dayEvents) return
    const dateStr = new Date(year, month, day).toLocaleDateString("pt-PT")
    setSelectedDate(dateStr)
    setSelected(dayEvents)
  }

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator color="#d4bcc9" size="large" />
    </View>
  )

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Calendário</Text>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchEvents() }} tintColor="#d4bcc9" />
        }
      >
        {/* Month nav */}
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
            <Text style={styles.navBtnText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{MONTHS[month]} {year}</Text>
          <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
            <Text style={styles.navBtnText}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Day labels */}
        <View style={styles.dayLabels}>
          {DAYS.map(d => (
            <Text key={d} style={styles.dayLabel}>{d}</Text>
          ))}
        </View>

        {/* Grid */}
        <View style={styles.grid}>
          {cells.map((day, i) => {
            if (day === null) return <View key={`empty-${i}`} style={styles.cell} />
            const dayEvents = eventsByDay[day] || []
            const hasEvents = dayEvents.length > 0
            const todayCell = isToday(day)
            return (
              <TouchableOpacity
                key={day}
                style={[
                  styles.cell,
                  todayCell && styles.cellToday,
                  hasEvents && styles.cellHasEvent,
                ]}
                onPress={() => handleDayPress(day)}
                disabled={!hasEvents}
              >
                <Text style={[
                  styles.cellText,
                  todayCell && styles.cellTextToday,
                  hasEvents && styles.cellTextEvent,
                ]}>
                  {day}
                </Text>
                {hasEvents && (
                  <View style={styles.dotRow}>
                    {dayEvents.slice(0, 3).map((e, idx) => (
                      <View
                        key={idx}
                        style={[styles.dot, { backgroundColor: STATUS_LABELS[e.status]?.color || "#d4bcc9" }]}
                      />
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          {Object.entries(STATUS_LABELS).map(([key, val]) => (
            <View key={key} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: val.color }]} />
              <Text style={styles.legendText}>{val.label}</Text>
            </View>
          ))}
        </View>

        {/* This month summary */}
        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>Este Mês</Text>
          {Object.keys(eventsByDay).length === 0 ? (
            <Text style={styles.summaryEmpty}>Sem eventos este mês.</Text>
          ) : (
            Object.entries(eventsByDay)
              .sort((a, b) => Number(a[0]) - Number(b[0]))
              .map(([day, evs]) => (
                <TouchableOpacity
                  key={day}
                  style={styles.summaryRow}
                  onPress={() => {
                    setSelectedDate(new Date(year, month, Number(day)).toLocaleDateString("pt-PT"))
                    setSelected(evs)
                  }}
                >
                  <Text style={styles.summaryDay}>
                    {String(day).padStart(2, "0")} {MONTHS[month].slice(0, 3)}
                  </Text>
                  <View style={styles.summaryEvents}>
                    {evs.map(e => (
                      <View key={e.id} style={[styles.summaryBadge, { backgroundColor: STATUS_LABELS[e.status]?.bg }]}>
                        <Text style={[styles.summaryBadgeText, { color: STATUS_LABELS[e.status]?.color }]}>
                          {e.nome}
                        </Text>
                      </View>
                    ))}
                  </View>
                </TouchableOpacity>
              ))
          )}
        </View>

      </ScrollView>

      {/* Day detail modal */}
      <Modal
        visible={!!selected}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelected(null)}
      >
        {selected && (
          <ScrollView style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedDate}</Text>
              <TouchableOpacity onPress={() => setSelected(null)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={{ padding: 24, gap: 12 }}>
              {selected.map(e => (
                <View key={e.id} style={styles.modalCard}>
                  <View style={styles.modalCardTop}>
                    <Text style={styles.modalCardName}>{e.nome}</Text>
                    <View style={[styles.badge, { backgroundColor: STATUS_LABELS[e.status]?.bg }]}>
                      <Text style={[styles.badgeText, { color: STATUS_LABELS[e.status]?.color }]}>
                        {STATUS_LABELS[e.status]?.label}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.modalCardSub}>{e.tipo_evento} · {e.num_convidados} convidados</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        )}
      </Modal>

    </View>
  )
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: "#18191d" },
  center:           { flex: 1, backgroundColor: "#18191d", alignItems: "center", justifyContent: "center" },
  header:           { padding: 24, paddingTop: 60, borderBottomWidth: 1, borderBottomColor: "rgba(212,188,201,0.08)" },
  headerTitle:      { fontFamily: "serif", fontSize: 26, fontWeight: "700", color: "#f0ebe8", letterSpacing: 1 },
  monthNav:         { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, paddingVertical: 20 },
  navBtn:           { padding: 8 },
  navBtnText:       { fontSize: 28, color: "#d4bcc9", lineHeight: 28 },
  monthLabel:       { fontFamily: "serif", fontSize: 18, fontWeight: "700", color: "#f0ebe8", letterSpacing: 1 },
  dayLabels:        { flexDirection: "row", paddingHorizontal: 16, marginBottom: 4 },
  dayLabel:         { flex: 1, textAlign: "center", fontSize: 9, fontWeight: "600", letterSpacing: 2, textTransform: "uppercase", color: "rgba(240,235,232,0.3)" },
  grid:             { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 16, gap: 4 },
  cell:             { width: "13.28%", aspectRatio: 1, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "transparent" },
  cellToday:        { borderColor: "rgba(212,188,201,0.3)" },
  cellHasEvent:     { backgroundColor: "rgba(212,188,201,0.05)" },
  cellText:         { fontSize: 13, color: "rgba(240,235,232,0.4)", fontWeight: "300" },
  cellTextToday:    { color: "#d4bcc9", fontWeight: "700" },
  cellTextEvent:    { color: "#f0ebe8", fontWeight: "600" },
  dotRow:           { flexDirection: "row", gap: 2, marginTop: 2 },
  dot:              { width: 4, height: 4, borderRadius: 2 },
  legend:           { flexDirection: "row", flexWrap: "wrap", gap: 12, paddingHorizontal: 20, paddingVertical: 20, borderTopWidth: 1, borderTopColor: "rgba(212,188,201,0.06)", marginTop: 8 },
  legendItem:       { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot:        { width: 6, height: 6, borderRadius: 3 },
  legendText:       { fontSize: 10, color: "rgba(240,235,232,0.4)", letterSpacing: 1 },
  summary:          { padding: 24, paddingTop: 0, gap: 0 },
  summaryTitle:     { fontSize: 10, letterSpacing: 3, textTransform: "uppercase", color: "rgba(212,188,201,0.5)", marginBottom: 16 },
  summaryEmpty:     { fontSize: 13, color: "rgba(240,235,232,0.3)", fontWeight: "300" },
  summaryRow:       { flexDirection: "row", alignItems: "center", gap: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "rgba(212,188,201,0.06)" },
  summaryDay:       { fontFamily: "serif", fontSize: 15, fontWeight: "700", color: "#d4bcc9", minWidth: 54 },
  summaryEvents:    { flex: 1, flexDirection: "row", flexWrap: "wrap", gap: 6 },
  summaryBadge:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 },
  summaryBadgeText: { fontSize: 11, fontWeight: "500" },
  modal:            { flex: 1, backgroundColor: "#18191d" },
  modalHeader:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 24, paddingTop: 60, borderBottomWidth: 1, borderBottomColor: "rgba(212,188,201,0.08)" },
  modalTitle:       { fontFamily: "serif", fontSize: 22, fontWeight: "700", color: "#f0ebe8" },
  modalClose:       { fontSize: 18, color: "rgba(240,235,232,0.4)", paddingLeft: 16 },
  modalCard:        { backgroundColor: "rgba(212,188,201,0.04)", borderWidth: 1, borderColor: "rgba(212,188,201,0.1)", padding: 18, gap: 6 },
  modalCardTop:     { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  modalCardName:    { fontFamily: "serif", fontSize: 17, fontWeight: "700", color: "#f0ebe8", flex: 1 },
  modalCardSub:     { fontSize: 12, fontWeight: "300", color: "rgba(240,235,232,0.4)" },
  badge:            { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 },
  badgeText:        { fontSize: 10, fontWeight: "600", letterSpacing: 1 },
  summaryBadge2:    { paddingHorizontal: 10, paddingVertical: 4 },
})