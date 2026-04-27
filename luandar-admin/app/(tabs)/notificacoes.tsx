import { useEffect, useState, useCallback, useRef } from "react"
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, Platform, Alert
} from "react-native"
import * as Notifications from "expo-notifications"
import * as Device from "expo-device"
import { getEvents } from "../../libs/api"

type Event = {
  id: string
  nome: string
  tipo_evento: string
  data_evento: string
  status: string
  created_at: string
}

type NotifItem = {
  id: string
  title: string
  body: string
  time: string
  read: boolean
  status: string
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

async function registerForPushNotifications() {
  if (!Device.isDevice) return null

  const { status: existing } = await Notifications.getPermissionsAsync()
  let finalStatus = existing

  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== "granted") return null

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("reservas", {
      name: "Reservas",
      importance: Notifications.AndroidImportance.MAX,
      sound: "default",
    })
  }

  const token = await Notifications.getExpoPushTokenAsync()
  console.log("Push token:", token.data)
  return token.data
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  pending:      { label: "Pendente",      color: "#f59e0b", bg: "rgba(245,158,11,0.1)"  },
  confirmed:    { label: "Confirmado",    color: "#10b981", bg: "rgba(16,185,129,0.1)"  },
  deposit_paid: { label: "Depósito Pago", color: "#60a5fa", bg: "rgba(96,165,250,0.1)"  },
  completed:    { label: "Concluído",     color: "#d4bcc9", bg: "rgba(212,188,201,0.1)" },
  cancelled:    { label: "Cancelado",     color: "#f87171", bg: "rgba(248,113,113,0.1)" },
}

export default function Notificacoes() {
  const [events, setEvents]         = useState<Event[]>([])
  const [notifs, setNotifs]         = useState<NotifItem[]>([])
  const [loading, setLoading]       = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [permitted, setPermitted]   = useState(false)
  const prevIdsRef                  = useRef<Set<string>>(new Set())
  const isFirstLoad                 = useRef(true)

  // Register for push on mount
  useEffect(() => {
    registerForPushNotifications().then(result => {
      setPermitted(!!result)
      if (!result) {
        Alert.alert(
          "Notificações desativadas",
          "Ativa as notificações nas definições do teu iPhone para receber alertas de novas reservas.",
          [{ text: "OK" }]
        )
      }
    })
  }, [])

  const buildNotifs = useCallback((data: Event[]) => {
    return data
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map(e => ({
        id: e.id,
        title: e.status === "pending" ? "Nova Reserva" : `Reserva ${STATUS_LABELS[e.status]?.label}`,
        body: `${e.nome} · ${e.tipo_evento} · ${new Date(e.data_evento).toLocaleDateString("pt-PT")}`,
        time: new Date(e.created_at).toLocaleString("pt-PT", {
          day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
        }),
        read: false,
        status: e.status,
      }))
  }, [])

  const fetchEvents = useCallback(async () => {
    try {
      const data: Event[] = await getEvents()
      setEvents(data)

      // Detect new events since last fetch and fire local notification
      if (!isFirstLoad.current && permitted) {
        const newEvents = data.filter(e => !prevIdsRef.current.has(e.id))
        for (const e of newEvents) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: "Nova Reserva ◆",
              body: `${e.nome} fez uma reserva para ${new Date(e.data_evento).toLocaleDateString("pt-PT")}`,
              sound: "default",
            },
            trigger: null,
          })
        }
      }

      // Update known IDs
      prevIdsRef.current = new Set(data.map(e => e.id))
      isFirstLoad.current = false

      setNotifs(buildNotifs(data))
    } catch {
      // silent
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [permitted, buildNotifs])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  // Poll every 30 seconds for new bookings
  useEffect(() => {
    const interval = setInterval(() => {
      fetchEvents()
    }, 30000)
    return () => clearInterval(interval)
  }, [fetchEvents])

  const unreadCount = notifs.filter(n => !n.read).length

  const markAllRead = () => {
    setNotifs(prev => prev.map(n => ({ ...n, read: true })))
  }

  const markRead = (id: string) => {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  const renderNotif = ({ item }: { item: NotifItem }) => {
    const sl = STATUS_LABELS[item.status]
    return (
      <TouchableOpacity
        style={[styles.notifCard, !item.read && styles.notifCardUnread]}
        onPress={() => markRead(item.id)}
      >
        <View style={styles.notifLeft}>
          <View style={[styles.notifDot, { backgroundColor: sl?.color || "#d4bcc9" }]} />
        </View>
        <View style={styles.notifContent}>
          <View style={styles.notifTop}>
            <Text style={[styles.notifTitle, !item.read && styles.notifTitleUnread]}>
              {item.title}
            </Text>
            <Text style={styles.notifTime}>{item.time}</Text>
          </View>
          <Text style={styles.notifBody} numberOfLines={2}>{item.body}</Text>
          <View style={[styles.badge, { backgroundColor: sl?.bg, alignSelf: "flex-start", marginTop: 8 }]}>
            <Text style={[styles.badgeText, { color: sl?.color }]}>{sl?.label}</Text>
          </View>
        </View>
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
        <View>
          <Text style={styles.headerTitle}>Notificações</Text>
          {unreadCount > 0 && (
            <Text style={styles.headerSub}>{unreadCount} não lida{unreadCount !== 1 ? "s" : ""}</Text>
          )}
        </View>
        <View style={styles.headerRight}>
          {!permitted && (
            <View style={styles.permBadge}>
              <Text style={styles.permBadgeText}>Desativadas</Text>
            </View>
          )}
          {unreadCount > 0 && (
            <TouchableOpacity onPress={markAllRead}>
              <Text style={styles.markAllBtn}>Marcar todas lidas</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Permission warning */}
      {!permitted && (
        <View style={styles.permWarning}>
          <Text style={styles.permWarningText}>
            ◆ Ativa as notificações nas Definições para receber alertas em tempo real de novas reservas.
          </Text>
        </View>
      )}

      {/* Poll indicator */}
      <View style={styles.pollBar}>
        <View style={styles.pollDot} />
        <Text style={styles.pollText}>A verificar novas reservas a cada 30 segundos</Text>
      </View>

      {/* List */}
      <FlatList
        data={notifs}
        keyExtractor={n => n.id}
        renderItem={renderNotif}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchEvents() }}
            tintColor="#d4bcc9"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>○</Text>
            <Text style={styles.emptyTitle}>Sem notificações</Text>
            <Text style={styles.emptyText}>As novas reservas aparecerão aqui.</Text>
          </View>
        }
      />

    </View>
  )
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: "#18191d" },
  center:           { flex: 1, backgroundColor: "#18191d", alignItems: "center", justifyContent: "center" },
  header:           { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", padding: 24, paddingTop: 60, borderBottomWidth: 1, borderBottomColor: "rgba(212,188,201,0.08)" },
  headerTitle:      { fontFamily: "serif", fontSize: 26, fontWeight: "700", color: "#f0ebe8", letterSpacing: 1 },
  headerSub:        { fontSize: 11, color: "#f59e0b", letterSpacing: 1, marginTop: 4 },
  headerRight:      { alignItems: "flex-end", gap: 8 },
  markAllBtn:       { fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "rgba(212,188,201,0.5)" },
  permBadge:        { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: "rgba(248,113,113,0.1)", borderWidth: 1, borderColor: "rgba(248,113,113,0.2)" },
  permBadgeText:    { fontSize: 9, fontWeight: "600", letterSpacing: 1, color: "#f87171" },
  permWarning:      { margin: 16, marginBottom: 0, padding: 16, backgroundColor: "rgba(248,113,113,0.05)", borderWidth: 1, borderColor: "rgba(248,113,113,0.15)" },
  permWarningText:  { fontSize: 12, fontWeight: "300", color: "rgba(248,113,113,0.8)", lineHeight: 18 },
  pollBar:          { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "rgba(212,188,201,0.06)" },
  pollDot:          { width: 6, height: 6, borderRadius: 3, backgroundColor: "#10b981" },
  pollText:         { fontSize: 10, color: "rgba(240,235,232,0.3)", letterSpacing: 1 },
  list:             { padding: 16, gap: 10 },
  notifCard:        { flexDirection: "row", backgroundColor: "rgba(212,188,201,0.03)", borderWidth: 1, borderColor: "rgba(212,188,201,0.08)", padding: 16, gap: 14 },
  notifCardUnread:  { backgroundColor: "rgba(212,188,201,0.06)", borderColor: "rgba(212,188,201,0.18)" },
  notifLeft:        { paddingTop: 4 },
  notifDot:         { width: 8, height: 8, borderRadius: 4 },
  notifContent:     { flex: 1 },
  notifTop:         { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 4 },
  notifTitle:       { fontSize: 13, fontWeight: "400", color: "rgba(240,235,232,0.6)", flex: 1 },
  notifTitleUnread: { fontWeight: "700", color: "#f0ebe8" },
  notifTime:        { fontSize: 10, color: "rgba(240,235,232,0.3)", letterSpacing: 0.5 },
  notifBody:        { fontSize: 12, fontWeight: "300", color: "rgba(240,235,232,0.4)", lineHeight: 18 },
  badge:            { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 },
  badgeText:        { fontSize: 10, fontWeight: "600", letterSpacing: 1 },
  emptyState:       { alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 12 },
  emptyIcon:        { fontSize: 32, color: "rgba(212,188,201,0.2)" },
  emptyTitle:       { fontFamily: "serif", fontSize: 20, fontWeight: "700", color: "rgba(240,235,232,0.3)" },
  emptyText:        { fontSize: 13, fontWeight: "300", color: "rgba(240,235,232,0.2)", textAlign: "center" },
})