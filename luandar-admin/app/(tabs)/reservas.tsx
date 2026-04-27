import { useEffect, useState, useCallback } from "react"
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Alert, Modal, ScrollView,
  TextInput
} from "react-native"
import { getEvents, updateStatus, deleteEvent } from "../../libs/api"

type Event = {
  id: string
  created_at: string
  nome: string
  email: string
  telefone: string
  tipo_evento: string
  data_evento: string
  turno: string
  hora_inicio: string
  hora_fim: string
  num_convidados: number
  decoracao: boolean
  catering: boolean
  dj: boolean
  som: boolean
  preco_base: number
  total: number
  deposito_pago: boolean
  forma_pagamento: string
  pedidos: string
  status: string
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  pending:      { label: "Pendente",      color: "#f59e0b", bg: "rgba(245,158,11,0.1)"  },
  confirmed:    { label: "Confirmado",    color: "#10b981", bg: "rgba(16,185,129,0.1)"  },
  deposit_paid: { label: "Depósito Pago", color: "#60a5fa", bg: "rgba(96,165,250,0.1)"  },
  completed:    { label: "Concluído",     color: "#d4bcc9", bg: "rgba(212,188,201,0.1)" },
  cancelled:    { label: "Cancelado",     color: "#f87171", bg: "rgba(248,113,113,0.1)" },
}

const STATUS_FLOW = ["pending", "confirmed", "deposit_paid", "completed", "cancelled"]
const FILTERS = ["todos", ...STATUS_FLOW]

export default function Reservas() {
  const [events, setEvents]       = useState<Event[]>([])
  const [loading, setLoading]     = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selected, setSelected]   = useState<Event | null>(null)
  const [updating, setUpdating]   = useState(false)
  const [search, setSearch]       = useState("")
  const [filter, setFilter]       = useState("todos")

  const fetchEvents = useCallback(async () => {
    try {
      const data = await getEvents()
      setEvents(data)
    } catch {
      Alert.alert("Erro", "Não foi possível carregar os eventos.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  const filtered = events.filter(e => {
    const matchSearch =
      e.nome.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase()) ||
      e.tipo_evento.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === "todos" || e.status === filter
    return matchSearch && matchFilter
  })

  const handleUpdateStatus = async (id: string, status: string) => {
    setUpdating(true)
    try {
      const updated = await updateStatus(id, status)
      setEvents(prev => prev.map(e => e.id === id ? updated : e))
      setSelected(updated)
    } catch {
      Alert.alert("Erro", "Não foi possível atualizar o estado.")
    } finally {
      setUpdating(false)
    }
  }

  const handleDelete = (id: string) => {
    Alert.alert(
      "Eliminar evento",
      "Tens a certeza? Esta ação não pode ser revertida.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteEvent(id)
              setEvents(prev => prev.filter(e => e.id !== id))
              setSelected(null)
            } catch {
              Alert.alert("Erro", "Não foi possível eliminar.")
            }
          }
        }
      ]
    )
  }

  const renderEvent = ({ item }: { item: Event }) => {
    const s = STATUS_LABELS[item.status]
    return (
      <TouchableOpacity style={styles.card} onPress={() => setSelected(item)}>
        <View style={styles.cardTop}>
          <Text style={styles.cardName} numberOfLines={1}>{item.nome}</Text>
          <View style={[styles.badge, { backgroundColor: s.bg }]}>
            <Text style={[styles.badgeText, { color: s.color }]}>{s.label}</Text>
          </View>
        </View>
        <Text style={styles.cardSub}>
          {item.tipo_evento} · {new Date(item.data_evento).toLocaleDateString("pt-PT")}
        </Text>
        <Text style={styles.cardSub}>{item.num_convidados} convidados</Text>
      </TouchableOpacity>
    )
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
        <Text style={styles.headerTitle}>Reservas</Text>
        <Text style={styles.headerCount}>{filtered.length} evento{filtered.length !== 1 ? "s" : ""}</Text>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Pesquisar nome, email, evento..."
          placeholderTextColor="rgba(240,235,232,0.25)"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")} style={styles.clearBtn}>
            <Text style={styles.clearBtnText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Status filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {FILTERS.map(f => {
          const isActive = filter === f
          const sl = f !== "todos" ? STATUS_LABELS[f] : null
          return (
            <TouchableOpacity
              key={f}
              onPress={() => setFilter(f)}
              style={[
                styles.filterChip,
                isActive && {
                  backgroundColor: sl ? sl.bg : "rgba(212,188,201,0.1)",
                  borderColor: sl ? sl.color + "60" : "rgba(212,188,201,0.4)",
                }
              ]}
            >
              <Text style={[
                styles.filterChipText,
                { color: isActive ? (sl ? sl.color : "#d4bcc9") : "rgba(240,235,232,0.35)" }
              ]}>
                {f === "todos" ? "Todos" : STATUS_LABELS[f].label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={e => e.id}
        renderItem={renderEvent}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchEvents() }}
            tintColor="#d4bcc9"
          />
        }
        ListEmptyComponent={
          <Text style={styles.empty}>
            {search || filter !== "todos" ? "Nenhum resultado encontrado." : "Nenhum evento ainda."}
          </Text>
        }
      />

      {/* Detail modal */}
      <Modal
        visible={!!selected}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelected(null)}
      >
        {selected && (
          <ScrollView style={styles.modal}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>{selected.nome}</Text>
                <View style={[styles.badge, { backgroundColor: STATUS_LABELS[selected.status].bg, alignSelf: "flex-start", marginTop: 6 }]}>
                  <Text style={[styles.badgeText, { color: STATUS_LABELS[selected.status].color }]}>
                    {STATUS_LABELS[selected.status].label}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setSelected(null)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Details */}
            <View style={styles.detailBlock}>
              {[
                { label: "Email",      value: selected.email },
                { label: "Telefone",   value: selected.telefone },
                { label: "Evento",     value: selected.tipo_evento },
                { label: "Data",       value: new Date(selected.data_evento).toLocaleDateString("pt-PT") },
                { label: "Turno",      value: selected.turno },
                { label: "Convidados", value: `${selected.num_convidados}` },
                { label: "Decoração",  value: selected.decoracao ? "Sim" : "Não" },
                { label: "Catering",   value: selected.catering  ? "Sim" : "Não" },
                { label: "DJ",         value: selected.dj        ? "Sim" : "Não" },
                { label: "Pagamento",  value: selected.forma_pagamento },
                { label: "Pedidos",    value: selected.pedidos || "Nenhum" },
              ].map(({ label, value }) => (
                <View key={label} style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{label}</Text>
                  <Text style={styles.detailValue}>{value}</Text>
                </View>
              ))}
            </View>

            {/* Quick actions */}
            <Text style={styles.sectionTitle}>Ação Rápida</Text>
            <View style={styles.quickActions}>
              {selected.status === "pending" && (
                <TouchableOpacity
                  style={[styles.actionBtn, { borderColor: "rgba(16,185,129,0.4)", backgroundColor: "rgba(16,185,129,0.06)" }]}
                  onPress={() => handleUpdateStatus(selected.id, "confirmed")}
                  disabled={updating}
                >
                  <Text style={[styles.actionBtnText, { color: "#10b981" }]}>✓ Confirmar Reserva</Text>
                </TouchableOpacity>
              )}
              {selected.status === "confirmed" && (
                <TouchableOpacity
                  style={[styles.actionBtn, { borderColor: "rgba(96,165,250,0.4)", backgroundColor: "rgba(96,165,250,0.06)" }]}
                  onPress={() => handleUpdateStatus(selected.id, "deposit_paid")}
                  disabled={updating}
                >
                  <Text style={[styles.actionBtnText, { color: "#60a5fa" }]}>$ Marcar Depósito Pago</Text>
                </TouchableOpacity>
              )}
              {selected.status === "deposit_paid" && (
                <TouchableOpacity
                  style={[styles.actionBtn, { borderColor: "rgba(212,188,201,0.4)", backgroundColor: "rgba(212,188,201,0.06)" }]}
                  onPress={() => handleUpdateStatus(selected.id, "completed")}
                  disabled={updating}
                >
                  <Text style={[styles.actionBtnText, { color: "#d4bcc9" }]}>◆ Marcar Concluído</Text>
                </TouchableOpacity>
              )}
              {selected.status !== "cancelled" && selected.status !== "completed" && (
                <TouchableOpacity
                  style={[styles.actionBtn, { borderColor: "rgba(248,113,113,0.3)", backgroundColor: "rgba(248,113,113,0.04)" }]}
                  onPress={() => handleUpdateStatus(selected.id, "cancelled")}
                  disabled={updating}
                >
                  <Text style={[styles.actionBtnText, { color: "#f87171" }]}>✕ Cancelar Reserva</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* All statuses */}
            <Text style={styles.sectionTitle}>Alterar Estado</Text>
            <View style={styles.statusBtns}>
              {STATUS_FLOW.map(s => {
                const sl = STATUS_LABELS[s]
                const isActive = selected.status === s
                return (
                  <TouchableOpacity
                    key={s}
                    disabled={isActive || updating}
                    onPress={() => handleUpdateStatus(selected.id, s)}
                    style={[
                      styles.statusBtn,
                      isActive && { backgroundColor: sl.bg, borderColor: sl.color + "60" }
                    ]}
                  >
                    <Text style={[styles.statusBtnText, { color: isActive ? sl.color : "rgba(240,235,232,0.4)" }]}>
                      {isActive ? "✓ " : ""}{sl.label}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            {/* Delete */}
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => handleDelete(selected.id)}
            >
              <Text style={styles.deleteBtnText}>Eliminar Evento</Text>
            </TouchableOpacity>

          </ScrollView>
        )}
      </Modal>

    </View>
  )
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: "#18191d" },
  center:          { flex: 1, backgroundColor: "#18191d", alignItems: "center", justifyContent: "center" },
  header:          { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", padding: 24, paddingTop: 60, borderBottomWidth: 1, borderBottomColor: "rgba(212,188,201,0.08)" },
  headerTitle:     { fontFamily: "serif", fontSize: 26, fontWeight: "700", color: "#f0ebe8", letterSpacing: 1 },
  headerCount:     { fontSize: 11, color: "rgba(240,235,232,0.3)", letterSpacing: 1, paddingBottom: 3 },
  searchRow:       { flexDirection: "row", alignItems: "center", margin: 16, marginBottom: 0, borderWidth: 1, borderColor: "rgba(212,188,201,0.12)", backgroundColor: "rgba(212,188,201,0.03)" },
  searchInput:     { flex: 1, color: "#f0ebe8", fontSize: 13, fontWeight: "300", padding: 14 },
  clearBtn:        { padding: 14 },
  clearBtnText:    { color: "rgba(240,235,232,0.3)", fontSize: 13 },
  filterRow:       { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  filterChip:      { paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: "rgba(212,188,201,0.1)", backgroundColor: "rgba(212,188,201,0.02)" },
  filterChipText:  { fontSize: 10, fontWeight: "600", letterSpacing: 1.5, textTransform: "uppercase" },
  list:            { padding: 16, gap: 10 },
  card:            { backgroundColor: "rgba(212,188,201,0.04)", borderWidth: 1, borderColor: "rgba(212,188,201,0.1)", padding: 18 },
  cardTop:         { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 12 },
  cardName:        { fontFamily: "serif", fontSize: 17, fontWeight: "700", color: "#f0ebe8", flex: 1 },
  cardSub:         { fontSize: 12, fontWeight: "300", color: "rgba(240,235,232,0.4)", marginTop: 2 },
  badge:           { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 },
  badgeText:       { fontSize: 10, fontWeight: "600", letterSpacing: 1 },
  empty:           { textAlign: "center", color: "rgba(240,235,232,0.3)", fontSize: 13, marginTop: 60 },
  modal:           { flex: 1, backgroundColor: "#18191d" },
  modalHeader:     { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", padding: 24, paddingTop: 60, borderBottomWidth: 1, borderBottomColor: "rgba(212,188,201,0.08)" },
  modalTitle:      { fontFamily: "serif", fontSize: 22, fontWeight: "700", color: "#f0ebe8" },
  modalClose:      { fontSize: 18, color: "rgba(240,235,232,0.4)", paddingLeft: 16, paddingTop: 4 },
  detailBlock:     { padding: 24, gap: 0 },
  detailRow:       { flexDirection: "row", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "rgba(212,188,201,0.06)" },
  detailLabel:     { fontSize: 12, color: "rgba(240,235,232,0.4)", fontWeight: "300" },
  detailValue:     { fontSize: 12, color: "#f0ebe8", fontWeight: "400", textAlign: "right", flex: 1, paddingLeft: 16 },
  sectionTitle:    { fontSize: 10, letterSpacing: 3, textTransform: "uppercase", color: "rgba(212,188,201,0.5)", paddingHorizontal: 24, marginBottom: 12, marginTop: 8 },
  quickActions:    { paddingHorizontal: 24, gap: 10, marginBottom: 24 },
  actionBtn:       { padding: 16, borderWidth: 1, alignItems: "center" },
  actionBtnText:   { fontSize: 13, fontWeight: "600", letterSpacing: 1 },
  statusBtns:      { paddingHorizontal: 24, gap: 8, marginBottom: 32 },
  statusBtn:       { padding: 14, borderWidth: 1, borderColor: "rgba(212,188,201,0.1)", backgroundColor: "rgba(255,255,255,0.02)" },
  statusBtnText:   { fontSize: 13, letterSpacing: 1 },
  deleteBtn:       { margin: 24, padding: 16, borderWidth: 1, borderColor: "rgba(248,113,113,0.3)", alignItems: "center", marginBottom: 60 },
  deleteBtnText:   { fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: "rgba(248,113,113,0.6)" },
})