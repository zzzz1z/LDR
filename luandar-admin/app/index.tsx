import { useState } from "react"
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform
} from "react-native"
import { useRouter } from "expo-router"
import { login } from "@/libs/api"

export default function LoginScreen() {
  const router = useRouter()
  const [email, setEmail]       = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState("")

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Preencha todos os campos")
      return
    }
    setLoading(true)
    setError("")
    try {
      await login(email, password)
      router.replace("/dashboard")
    } catch {
      setError("Credenciais inválidas")
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.inner}>
        <Text style={styles.logo}>◆</Text>
        <Text style={styles.title}>Salão Luandar</Text>
        <Text style={styles.subtitle}>Painel de Administração</Text>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="rgba(240,235,232,0.3)"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="rgba(240,235,232,0.3)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={styles.btn}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#18191d" />
              : <Text style={styles.btnText}>Entrar</Text>
            }
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#18191d",
  },
  inner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  logo: {
    fontSize: 32,
    color: "#d4bcc9",
    marginBottom: 12,
  },
  title: {
    fontFamily: "serif",
    fontSize: 28,
    fontWeight: "700",
    color: "#f0ebe8",
    letterSpacing: 2,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 4,
    textTransform: "uppercase",
    color: "rgba(240,235,232,0.4)",
    marginBottom: 48,
  },
  form: {
    width: "100%",
    gap: 12,
  },
  input: {
    backgroundColor: "rgba(212,188,201,0.06)",
    borderWidth: 1,
    borderColor: "rgba(212,188,201,0.15)",
    color: "#f0ebe8",
    padding: 16,
    fontSize: 14,
    fontWeight: "300",
  },
  error: {
    color: "rgba(212,80,80,0.8)",
    fontSize: 12,
    textAlign: "center",
  },
  btn: {
    backgroundColor: "#d4bcc9",
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  btnText: {
    color: "#18191d",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 3,
    textTransform: "uppercase",
  },
})