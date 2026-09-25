import { Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import PastEvents from "./pages/PastEvents";
import EventDetail from "./pages/EventDetail";
import Login from "./pages/Login";
import DisclaimerModal from "./components/DisclaimerModal";

export default function App() {
  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <DisclaimerModal />

      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/past" element={<PastEvents />} />
        {/* Changed from /events/:id to /event/:id to match your navigation */}
        <Route path="/event/:id" element={<EventDetail />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </div>
  );
}