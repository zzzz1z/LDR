import axios from 'axios'
import * as SecureStore from "expo-secure-store"
import { API_URL } from "../constants/config"

const api = axios.create({ baseURL: API_URL })

// Attach token to every request automatically
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync("token")
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export const login = async (email: string, password: string) => {
  const res = await api.post("/auth/login", { email, password })
  await SecureStore.setItemAsync("token", res.data.token)
  return res.data
}

export const getEvents = async () => {
  const res = await api.get("/events")
  return res.data
}

export const updateStatus = async (id: string, status: string) => {
  const res = await api.patch(`/events/${id}/status`, { status })
  return res.data
}

export const deleteEvent = async (id: string) => {
  await api.delete(`/events/${id}`)
}

export const logout = async () => {
  await SecureStore.deleteItemAsync("token")
}