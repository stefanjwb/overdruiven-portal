import { Routes, Route, Navigate } from 'react-router-dom';
import PublicLayout from './components/PublicLayout/PublicLayout';
import AdminLayout from './components/AdminLayout/AdminLayout';
import OrganizerLayout from './components/OrganizerLayout/OrganizerLayout';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';
import Home from './pages/Home';
import ActivityDetail from './pages/ActivityDetail';
import Login from './pages/Login';
import MagicLogin from './pages/MagicLogin';
import Profile from './pages/Profile';
import AdminUsers from './pages/admin/Users';
import AdminActivities from './pages/admin/Activities';
import AdminPayments from './pages/admin/Payments';
import AdminPaymentsHistory from './pages/admin/PaymentsHistory';
import AdminInventory from './pages/admin/Inventory';
import AdminWineLibrary from './pages/admin/WineLibrary';
import OrganizerActivities from './pages/organizer/Activities';
import Library from './pages/Library';
import Declarations from './pages/Declarations';
import AdminDeclarations from './pages/admin/Declarations';
import AdminStatistics from './pages/admin/Statistics';
import AdminBlog from './pages/admin/Blog';
import Blog from './pages/Blog';
import BlogPostDetail from './pages/BlogPostDetail';

export default function App() {
  return (
    <Routes>
      {/* Publieke layout met topbalk */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/activiteiten/:id" element={<ActivityDetail />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:id" element={<BlogPostDetail />} />
        <Route path="/bibliotheek" element={<Library />} />
        <Route path="/profiel" element={<Profile />} />
        <Route path="/declaraties" element={<Declarations />} />
      </Route>

      {/* Login */}
      <Route path="/login" element={<Login />} />

      {/* Magic link callback */}
      <Route path="/magic-login" element={<MagicLogin />} />

      {/* Admin panel — sidebar layout */}
      <Route element={<AdminLayout />}>
        <Route path="/admin/gebruikers" element={<ProtectedRoute role="admin"><AdminUsers /></ProtectedRoute>} />
<Route path="/admin/activiteiten" element={<ProtectedRoute role="admin"><AdminActivities /></ProtectedRoute>} />
        <Route path="/admin/betalingen" element={<ProtectedRoute role="admin"><AdminPayments /></ProtectedRoute>} />
        <Route path="/admin/betalingen/historie" element={<ProtectedRoute role="admin"><AdminPaymentsHistory /></ProtectedRoute>} />
        <Route path="/admin/inventaris" element={<ProtectedRoute role="admin"><AdminInventory /></ProtectedRoute>} />
        <Route path="/admin/wijnbibliotheek" element={<ProtectedRoute role="admin"><AdminWineLibrary /></ProtectedRoute>} />
        <Route path="/admin/declaraties" element={<ProtectedRoute role="admin"><AdminDeclarations /></ProtectedRoute>} />
        <Route path="/admin/statistieken" element={<ProtectedRoute role="admin"><AdminStatistics /></ProtectedRoute>} />
        <Route path="/admin/blog" element={<ProtectedRoute role="admin"><AdminBlog /></ProtectedRoute>} />
      </Route>

      {/* Organisator panel — sidebar layout met alleen activiteiten */}
      <Route element={<OrganizerLayout />}>
        <Route path="/organisator/activiteiten" element={<ProtectedRoute role="organizer"><OrganizerActivities /></ProtectedRoute>} />
        <Route path="/organisator/blog" element={<ProtectedRoute role="organizer"><AdminBlog /></ProtectedRoute>} />
      </Route>

      {/* Default */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
