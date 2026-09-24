import { Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import EventDetail from "./pages/EventDetail";
import Login from "./pages/Login";
import DisclaimerModal from "./components/DisclaimerModal";

export default function App() {
  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      {/* Splash overlay renders when app opens */}
      <DisclaimerModal />

      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/events/:id" element={<EventDetail />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </div>
  );
}