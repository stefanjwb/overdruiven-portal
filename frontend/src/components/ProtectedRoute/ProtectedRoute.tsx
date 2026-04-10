import { Navigate } from 'react-router-dom';
import { Center, Loader } from '@mantine/core';
import { useAuth } from '../../context/AuthContext';

interface Props {
  children: React.ReactNode;
  role?: 'admin' | 'organizer';
}

export default function ProtectedRoute({ children, role }: Props) {
  const { isLoggedIn, isAdmin, isOrganizer, loading } = useAuth();

  if (loading) {
    return <Center h="80vh"><Loader color="brand" type="dots" /></Center>;
  }

  if (!isLoggedIn) return <Navigate to="/login" replace />;
  if (role === 'admin' && !isAdmin) return <Navigate to="/" replace />;
  if (role === 'organizer' && !isOrganizer) return <Navigate to="/" replace />;

  return <>{children}</>;
}
