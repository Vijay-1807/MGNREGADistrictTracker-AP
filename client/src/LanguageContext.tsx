import React, { createContext, useContext, useState } from 'react';

interface LanguageContextType {
  language: 'en' | 'te';
  setLanguage: (lang: 'en' | 'te') => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations = {
  en: {
    title: 'Our District MGNREGA',
    subtitle: 'Andhra Pradesh',
    selectDistrict: 'Select Your District',
    totalHouseholds: 'Total Households',
    familiesBenefited: 'Families benefited',
    personDays: 'Person Days',
    workDaysCreated: 'Work days created',
    amountSpent: 'Amount Spent',
    totalExpenditure: 'Total expenditure',
    avgDaysPerHousehold: 'Avg Days/Household',
    workDaysPerFamily: 'Work days per family',
    performanceSummary: 'Performance Summary',
    avgAmountPerHousehold: 'Average Amount per Household',
    performanceScore: 'Performance Score',
    dataSource: 'Data Source',
    officialGovernmentData: 'Official Government Data',
    ministry: 'Ministry',
    department: 'Department',
    description: 'Description',
    lastUpdated: 'Last Updated',
    visualPerformanceIndicators: 'Visual Performance Indicators',
    householdCoverage: 'Household Coverage',
    workDaysAchievement: 'Work Days Achievement',
    overallPerformance: 'Overall Performance',
    detectingLocation: 'Detecting your location to show your district\'s performance...',
    selectDistrictManually: 'Please select your district manually:',
    loadingPerformanceData: 'Loading performance data...',
    tryAgain: 'Try Again',
    developedBy: 'Developed by Vijay Bontha',
    copyright: '© 2024 MGNREGA District Tracker - Andhra Pradesh'
  },
  te: {
    title: 'అప్ లోగోమా జిల్లా MGNREGA',
    subtitle: 'ఆంధ్ర ప్రదేశ్',
    selectDistrict: 'మీ జిల్లాను ఎంచుకోండి',
    totalHouseholds: 'మొత్తం కుటుంబాలు',
    familiesBenefited: 'లబ్ధి పొందిన కుటుంబాలు',
    personDays: 'వ్యక్తి రోజులు',
    workDaysCreated: 'సృష్టించిన పని రోజులు',
    amountSpent: 'ఖర్చు చేసిన మొత్తం',
    totalExpenditure: 'మొత్తం వ్యయం',
    avgDaysPerHousehold: 'సగటు రోజులు/కుటుంబం',
    workDaysPerFamily: 'కుటుంబానికి పని రోజులు',
    performanceSummary: 'ప్రదర్శన సారాంశం',
    avgAmountPerHousehold: 'కుటుంబానికి సగటు మొత్తం',
    performanceScore: 'ప్రదర్శన స్కోరు',
    dataSource: 'డేటా మూలం',
    officialGovernmentData: 'అధికారిక ప్రభుత్వ డేటా',
    ministry: 'మంత్రిత్వ శాఖ',
    department: 'విభాగం',
    description: 'వివరణ',
    lastUpdated: 'చివరిగా నవీకరించబడింది',
    visualPerformanceIndicators: 'దృశ్య ప్రదర్శన సూచికలు',
    householdCoverage: 'కుటుంబ కవరేజ్',
    workDaysAchievement: 'పని రోజుల సాధన',
    overallPerformance: 'మొత్తం ప్రదర్శన',
    detectingLocation: 'మీ జిల్లా ప్రదర్శనను చూపించడానికి మీ స్థానాన్ని గుర్తిస్తున్నాము...',
    selectDistrictManually: 'దయచేసి మీ జిల్లాను మాన్యువల్గా ఎంచుకోండి:',
    loadingPerformanceData: 'ప్రదర్శన డేటాను లోడ్ చేస్తున్నాము...',
    tryAgain: 'మళ్లీ ప్రయత్నించండి',
    developedBy: 'విజయ్ బోంతా అభివృద్ధి చేశారు',
    copyright: '© 2024 MGNREGA జిల్లా ట్రాకర్ - ఆంధ్రప్రదేశ్'
  }
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<'en' | 'te'>('en');

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations.en] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
