import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface Props {
  requiredRole?: string
}

export const ProtectedRoute: React.FC<Props> = ({ requiredRole }) => {
  const { isAuthenticated, role } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (requiredRole && role !== requiredRole) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
