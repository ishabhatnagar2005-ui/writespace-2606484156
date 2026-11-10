/** Compose the guest route and a genuine fallback for unknown destinations. */
import { Link, Route, Routes } from 'react-router-dom';
import { PublicNavbar } from './components/PublicNavbar.jsx';
import LandingPage from './pages/LandingPage.jsx';

/** Render only routes owned by guest discovery; account wiring belongs to its slice. */
export default function App() {
  return (
    <>
      <PublicNavbar />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route
          path="*"
          element={
            <main id="main-content" className="page-container py-24">
              <h1 className="text-4xl">Page not found</h1>
              <p className="mb-8 mt-4 text-foreground-muted">There is no page at this address.</p>
              <Link className="button-secondary" to="/">Back to WriteSpace</Link>
            </main>
          }
        />
      </Routes>
    </>
  );
}
