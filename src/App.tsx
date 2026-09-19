import { Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import EventDetail from "./pages/EventDetail";
import Login from "./pages/Login";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/event/:id" element={<EventDetail />} />
      <Route path="/login" element={<Login />} />
    </Routes>
  );
}
