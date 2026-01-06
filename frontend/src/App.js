import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Talents from "./pages/Talents";
import TalentDetail from "./pages/TalentDetail";
import Personas from "./pages/Personas";
import Consents from "./pages/Consents";
import Revenue from "./pages/Revenue";
import Incidents from "./pages/Incidents";
import Tasks from "./pages/Tasks";
import Layout from "./components/Layout";
import "./App.css";

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <Layout>{children}</Layout>;
};

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/talents" element={<ProtectedRoute><Talents /></ProtectedRoute>} />
      <Route path="/talents/:id" element={<ProtectedRoute><TalentDetail /></ProtectedRoute>} />
      <Route path="/personas" element={<ProtectedRoute><Personas /></ProtectedRoute>} />
      <Route path="/consents" element={<ProtectedRoute><Consents /></ProtectedRoute>} />
      <Route path="/revenue" element={<ProtectedRoute><Revenue /></ProtectedRoute>} />
      <Route path="/incidents" element={<ProtectedRoute><Incidents /></ProtectedRoute>} />
      <Route path="/tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="App noise-overlay">
          <AppRoutes />
          <Toaster richColors position="top-right" />
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
