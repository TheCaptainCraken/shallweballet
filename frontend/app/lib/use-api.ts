import { useAuth } from "@clerk/react-router"

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:3000"

export function useApi() {
  const { getToken } = useAuth()
  return async (path: string, init: RequestInit = {}) => {
    const token = await getToken()
    return fetch(`${BACKEND_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...init.headers,
        Authorization: `Bearer ${token}`,
      },
    })
  }
}
