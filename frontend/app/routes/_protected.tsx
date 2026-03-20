import { useAuth } from "@clerk/react-router"
import { Navigate, Outlet } from "react-router"

export default function ProtectedLayout() {
  const { isSignedIn, isLoaded } = useAuth()
  if (!isLoaded) return null
  if (!isSignedIn) return <Navigate to="/sign-in" replace />
  return <Outlet />
}
