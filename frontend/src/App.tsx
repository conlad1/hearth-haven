import { Routes, Route } from 'react-router-dom';

import Header from './components/Header';
import Footer from './components/Footer';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import CasePage from './pages/CasePage';
import DonatePage from "./pages/DonatePage";

function App() {
  return (
    <>
      <Header />

      <main>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/cases" element={<CasePage />} />
          <Route path="/donate" element={<DonatePage />} />

        </Routes>
      </main>

      <Footer />
    </>
  );
}

export default App;
