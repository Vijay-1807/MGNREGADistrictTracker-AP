import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { LanguageProvider } from './LanguageContext';
import { NavBarDemo } from './components/ui/navbar-demo';
import { HomeSection } from './components/sections/HomeSection';
import { HistoricalPerformanceSection } from './components/sections/HistoricalPerformanceSection';
import { CompareSection } from './components/sections/CompareSection';
import './App.css';

const App: React.FC = () => {
  return (
    <LanguageProvider>
      <Router>
        <div className="app">
          <NavBarDemo />
          <Routes>
            <Route path="/" element={<HomeSection />} />
            <Route path="/historical" element={<HistoricalPerformanceSection />} />
            <Route path="/compare" element={<CompareSection />} />
          </Routes>
        </div>
      </Router>
    </LanguageProvider>
  );
};

export default App;