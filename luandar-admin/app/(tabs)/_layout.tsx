import { Tabs } from "expo-router"
import { View, Text } from "react-native"

const icon = (symbol: string, focused: boolean) => (
  <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.35, color: "#d4bcc9" }}>
    {symbol}
  </Text>
)

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#18191d",
          borderTopColor: "rgba(212,188,201,0.1)",
          borderTopWidth: 1,
          height: 80,
          paddingBottom: 20,
          paddingTop: 10,
        },
        tabBarActiveTintColor: "#d4bcc9",
        tabBarInactiveTintColor: "rgba(240,235,232,0.3)",
        tabBarLabelStyle: {
          fontSize: 9,
          letterSpacing: 2,
          textTransform: "uppercase",
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="reservas"
        options={{
          title: "Reservas",
          tabBarIcon: ({ focused }) => icon("◆", focused),
        }}
      />
      <Tabs.Screen
        name="calendario"
        options={{
          title: "Calendário",
          tabBarIcon: ({ focused }) => icon("◇", focused),
        }}
      />
      <Tabs.Screen
        name="receitas"
        options={{
          title: "Receitas",
          tabBarIcon: ({ focused }) => icon("◈", focused),
        }}
      />
      <Tabs.Screen
        name="notificacoes"
        options={{
          title: "Notificações",
          tabBarIcon: ({ focused }) => icon("○", focused),
        }}
      />
    </Tabs>
  )
}