/** Compose public/account routes and guard genuine fallbacks for unwired destinations. */
import { useState } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import { PublicNavbar } from './components/PublicNavbar.jsx';
import { Navbar } from './components/Navbar.jsx';
import { ProtectedRoute } from './components/ProtectedRoute.jsx';
import LandingPage from './pages/LandingPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import Home from './pages/Home.jsx';
import ReadBlog from './pages/ReadBlog.jsx';
import WriteBlog from './pages/WriteBlog.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import UserManagement from './pages/UserManagement.jsx';
import { getSession } from './utils/auth.js';

/** Render the existing unknown-address content without inventing protected pages. */
function RouteFallback() {
  return (
    <main id="main-content" className="page-container py-24">
      <h1 className="text-4xl">Page not found</h1>
      <p className="mb-8 mt-4 text-foreground-muted">There is no page at this address.</p>
      <Link className="button-secondary" to="/">Back to WriteSpace</Link>
    </main>
  );
}

/** Load local identity once and propagate successful account actions to the shell. */
export default function App() {
  const [session, setSession] = useState(() => getSession());
  return (
    <>
      {session ? <Navbar session={session} onSessionChange={setSession} /> : <PublicNavbar />}
      <Routes>
        <Route path="/" element={<LandingPage session={session} />} />
        <Route
          path="/login"
          element={
            <ProtectedRoute session={session} guestOnly>
              <LoginPage onSessionChange={setSession} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/register"
          element={
            <ProtectedRoute session={session} guestOnly>
              <RegisterPage onSessionChange={setSession} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/blogs"
          element={
            <ProtectedRoute session={session}>
              <Home session={session} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/blog/:id"
          element={
            <ProtectedRoute session={session}>
              <ReadBlog session={session} />
            </ProtectedRoute>
          }
        />
        {['/write', '/edit/:id'].map((path) => (
          <Route
            key={path}
            path={path}
            element={
              <ProtectedRoute session={session}>
                <WriteBlog session={session} />
              </ProtectedRoute>
            }
          />
        ))}
        {['/admin', '/users'].map((path) => (
          <Route
            key={path}
            path={path}
            element={
              <ProtectedRoute session={session} adminOnly>
                {path === '/admin' ? <AdminDashboard session={session} /> : <UserManagement session={session} />}
              </ProtectedRoute>
            }
          />
        ))}
        <Route path="*" element={<RouteFallback />} />
      </Routes>
    </>
  );
}
