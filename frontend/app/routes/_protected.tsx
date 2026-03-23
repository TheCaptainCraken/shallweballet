import { useAuth, useClerk } from "@clerk/react-router"
import { Navigate, Outlet, useMatches, useNavigate } from "react-router"
import { Button } from "~/components/ui/button"

export default function ProtectedLayout() {
  const { isSignedIn, isLoaded } = useAuth()
  const { signOut } = useClerk()
  const navigate = useNavigate()
  const matches = useMatches()
  const isRacePage = matches.some((m) => m.id === "routes/race")
  if (!isLoaded) return null
  if (!isSignedIn) return <Navigate to="/sign-in" replace />
  return (
    <>
      {!isRacePage && (
        <header className="fixed top-0 right-0 p-3 z-50 flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/orgs")}>
            Orgs
          </Button>
          <Button variant="outline" size="sm" onClick={() => signOut({ redirectUrl: "/sign-in" })}>
            Sign Out
          </Button>
        </header>
      )}
      <Outlet />
    </>
  )
}
