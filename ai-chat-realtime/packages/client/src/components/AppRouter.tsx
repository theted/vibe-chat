/**
 * App Router - Main routing component
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import App from '../App';
import Dashboard from './Dashboard';

const AppRouter = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/chat" element={<App />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default AppRouter;
