import { createContext, useContext, useState, ReactNode } from 'react';

export type Language = 'de' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  de: {
    // Navigation & General
    'app.title': 'Intake Portal',
    'nav.dashboard': 'Dashboard',
    'nav.newIntake': 'Neuer Intake',
    'nav.queue': 'Architekten Queue',
    'nav.auditLog': 'Audit Log',
    'nav.integrations': 'Integrationen',
    'nav.policies': 'Richtlinien',
    'common.save': 'Speichern',
    'common.cancel': 'Abbrechen',
    'common.submit': 'Absenden',
    'common.skip': 'Überspringen',
    'common.next': 'Weiter',
    'common.back': 'Zurück',
    'common.loading': 'Lädt...',
    'common.error': 'Fehler',
    'common.success': 'Erfolg',

    // Intake Wizard
    'wizard.title': 'Intake Interview',
    'wizard.progress': 'Interview Fortschritt',
    'wizard.questionsOf': 'von',
    'wizard.questions': 'Fragen',
    'wizard.aiActive': 'AI-Assistent aktiv',
    'wizard.aiDescription': 'Die AI prüft Ihre Antworten und stellt bei Bedarf Nachfragen für bessere Spezifikationen.',
    'wizard.complete': 'Interview Abgeschlossen',
    'wizard.completeDesc': 'Bereit zur Generierung Ihrer Spezifikation und Routing-Empfehlung.',
    'wizard.generateSpec': 'Spezifikation Generieren',
    'wizard.startMessage': 'Starte Ihr Intake-Interview...',
    'wizard.followUp': 'Nachfrage - Sie können antworten oder überspringen',
    'wizard.yourAnswer': 'Ihre Antwort eingeben...',
    'wizard.yourAddition': 'Ihre Ergänzung...',
    'wizard.aiChecking': 'AI prüft...',
    'wizard.aiAnalyzing': 'AI analysiert...',
    'wizard.processing': 'Verarbeite...',
    'wizard.skipped': '[Übersprungen]',
    'wizard.addition': 'Ergänzung',
    'wizard.generatingSpec': 'Generiere Spezifikation mit AI...',
    'wizard.specGenerated': 'Spezifikation erfolgreich generiert!',
    'wizard.specError': 'Fehler bei der Generierung',
    'wizard.categoryIntro': 'Gut, lassen Sie uns über {category} sprechen.',
    'wizard.allDone': 'Ausgezeichnet! Ich habe alle Informationen, die ich brauche. Ich werde jetzt eine strukturierte Spezifikation und Routing-Empfehlung für Ihre Überprüfung generieren.',

    // Quality feedback
    'quality.excellent': 'Ausgezeichnet, sehr detailliert!',
    'quality.good': 'Gut erfasst.',
    'quality.needs_improvement': 'Okay, ich habe die wichtigsten Punkte.',
    'quality.insufficient': 'Verstanden, wir können das später ergänzen.',

    // Categories
    'category.problem': 'Problem & Ziele',
    'category.users': 'Benutzer & Nutzung',
    'category.data': 'Daten & Sicherheit',
    'category.integrations': 'Integrationen',
    'category.ux': 'Benutzeroberfläche',
    'category.nfr': 'Anforderungen',

    // Questions
    'q.problem_statement': 'Welches Problem möchten Sie lösen? Beschreiben Sie die Herausforderung in Ihren eigenen Worten.',
    'q.problem_statement.help': 'Denken Sie darüber nach, was heute nicht funktioniert und warum es wichtig ist',
    'q.current_process': 'Wie handhaben Sie das heute? Führen Sie mich durch den aktuellen Prozess.',
    'q.current_process.help': 'Erwähnen Sie alle Tools, Tabellen oder Workarounds, die Sie verwenden',
    'q.pain_points': 'Was sind die Hauptprobleme oder Frustrationen?',
    'q.pain_points.help': 'Listen Sie die wichtigsten Probleme mit dem aktuellen Ansatz auf',
    'q.goals': 'Wie würde Erfolg aussehen? Welche Ergebnisse möchten Sie erreichen?',
    'q.goals.help': 'Seien Sie spezifisch - nennen Sie wenn möglich Zahlen oder Metriken',
    'q.users_primary': 'Wer werden die Hauptnutzer dieser Lösung sein?',
    'q.users_primary.help': 'Beschreiben Sie deren Rolle und die Anzahl der Personen',
    'q.users_tech_level': 'Wie ist das technische Komfortniveau Ihrer Benutzer?',
    'q.frequency': 'Wie oft wird dies genutzt? (täglich, wöchentlich, monatlich)',
    'q.data_types': 'Mit welchen Arten von Daten werden Sie arbeiten?',
    'q.data_types.help': 'z.B. Kundeninformationen, Produktdaten, Finanzunterlagen',
    'q.data_classification': 'Was ist die Sensibilitätsstufe dieser Daten?',
    'q.retention': 'Wie lange müssen Aufzeichnungen aufbewahrt werden?',
    'q.integrations': 'Mit welchen anderen Systemen muss dies verbunden werden?',
    'q.integrations.help': 'z.B. SAP, Salesforce, E-Mail-Systeme, Datenbanken',
    'q.mobile_needed': 'Benötigen Benutzer mobilen Zugriff?',
    'q.offline_needed': 'Muss es offline oder bei schlechter Verbindung funktionieren?',
    'q.availability': 'Wann muss dies verfügbar sein?',
    'q.timeline': 'Wann benötigen Sie dies? Was treibt den Zeitplan?',

    // Options
    'opt.tech_level.non_tech': 'Nicht-technisch (grundlegende Smartphone-/Computerkenntnisse)',
    'opt.tech_level.mixed': 'Gemischt (einige technisch, einige nicht)',
    'opt.tech_level.technical': 'Technisch (vertraut mit komplexer Software)',
    'opt.data.public': 'Öffentlich - Jeder kann sehen',
    'opt.data.internal': 'Intern - Nur Mitarbeiter',
    'opt.data.confidential': 'Vertraulich - Eingeschränkter Zugang erforderlich',
    'opt.data.restricted': 'Beschränkt - Höchste Sicherheit erforderlich',
    'opt.retention.less1': 'Weniger als 1 Jahr',
    'opt.retention.1-2': '1-2 Jahre',
    'opt.retention.3-5': '3-5 Jahre',
    'opt.retention.5-10': '5-10 Jahre',
    'opt.retention.10+': '10+ Jahre',
    'opt.mobile.primary': 'Ja, mobil ist primär',
    'opt.mobile.secondary': 'Ja, aber Desktop ist primär',
    'opt.mobile.no': 'Nein, nur Desktop',
    'opt.offline.must': 'Ja, muss offline funktionieren',
    'opt.offline.nice': 'Wäre schön, nicht kritisch',
    'opt.offline.no': 'Nein, immer verbunden',
    'opt.availability.business': 'Nur Geschäftszeiten',
    'opt.availability.extended': 'Erweiterte Zeiten (6-22 Uhr)',
    'opt.availability.247': '24/7 Verfügbarkeit',

    // Language selector
    'language.select': 'Sprache wählen',
    'language.de': 'Deutsch',
    'language.en': 'English',
  },
  en: {
    // Navigation & General
    'app.title': 'Intake Portal',
    'nav.dashboard': 'Dashboard',
    'nav.newIntake': 'New Intake',
    'nav.queue': 'Architect Queue',
    'nav.auditLog': 'Audit Log',
    'nav.integrations': 'Integrations',
    'nav.policies': 'Policies',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.submit': 'Submit',
    'common.skip': 'Skip',
    'common.next': 'Next',
    'common.back': 'Back',
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',

    // Intake Wizard
    'wizard.title': 'Intake Interview',
    'wizard.progress': 'Interview Progress',
    'wizard.questionsOf': 'of',
    'wizard.questions': 'questions',
    'wizard.aiActive': 'AI Assistant active',
    'wizard.aiDescription': 'The AI checks your answers and asks follow-up questions for better specifications when needed.',
    'wizard.complete': 'Interview Complete',
    'wizard.completeDesc': 'Ready to generate your specification and routing recommendation.',
    'wizard.generateSpec': 'Generate Specification',
    'wizard.startMessage': 'Starting your intake interview...',
    'wizard.followUp': 'Follow-up question - you can answer or skip',
    'wizard.yourAnswer': 'Enter your answer...',
    'wizard.yourAddition': 'Your addition...',
    'wizard.aiChecking': 'AI checking...',
    'wizard.aiAnalyzing': 'AI analyzing...',
    'wizard.processing': 'Processing...',
    'wizard.skipped': '[Skipped]',
    'wizard.addition': 'Addition',
    'wizard.generatingSpec': 'Generating specification with AI...',
    'wizard.specGenerated': 'Specification generated successfully!',
    'wizard.specError': 'Error generating specification',
    'wizard.categoryIntro': 'Great, let\'s talk about {category}.',
    'wizard.allDone': 'Excellent! I have all the information I need. I will now generate a structured specification and routing recommendation for your review.',

    // Quality feedback
    'quality.excellent': 'Excellent, very detailed!',
    'quality.good': 'Well captured.',
    'quality.needs_improvement': 'Okay, I got the main points.',
    'quality.insufficient': 'Understood, we can add more later.',

    // Categories
    'category.problem': 'Problem & Goals',
    'category.users': 'Users & Usage',
    'category.data': 'Data & Security',
    'category.integrations': 'Integrations',
    'category.ux': 'User Interface',
    'category.nfr': 'Requirements',

    // Questions
    'q.problem_statement': 'What problem are you trying to solve? Describe the challenge in your own words.',
    'q.problem_statement.help': 'Think about what\'s not working today and why it matters',
    'q.current_process': 'How do you handle this today? Walk me through the current process.',
    'q.current_process.help': 'Include any tools, spreadsheets, or workarounds you use',
    'q.pain_points': 'What are the main pain points or frustrations?',
    'q.pain_points.help': 'List the top issues you face with the current approach',
    'q.goals': 'What would success look like? What outcomes do you want to achieve?',
    'q.goals.help': 'Be specific - include numbers or metrics if possible',
    'q.users_primary': 'Who will be the main users of this solution?',
    'q.users_primary.help': 'Describe their role and how many people',
    'q.users_tech_level': 'What is the technical comfort level of your users?',
    'q.frequency': 'How often will this be used? (daily, weekly, monthly)',
    'q.data_types': 'What types of data will you be working with?',
    'q.data_types.help': 'e.g., customer info, product data, financial records',
    'q.data_classification': 'What is the sensitivity level of this data?',
    'q.retention': 'How long do records need to be kept?',
    'q.integrations': 'What other systems does this need to connect with?',
    'q.integrations.help': 'e.g., SAP, Salesforce, email systems, databases',
    'q.mobile_needed': 'Do users need mobile access?',
    'q.offline_needed': 'Does it need to work offline or with poor connectivity?',
    'q.availability': 'When does this need to be available?',
    'q.timeline': 'When do you need this? What\'s driving the timeline?',

    // Options
    'opt.tech_level.non_tech': 'Non-technical (basic smartphone/computer)',
    'opt.tech_level.mixed': 'Mixed (some technical, some not)',
    'opt.tech_level.technical': 'Technical (comfortable with complex software)',
    'opt.data.public': 'Public - Anyone can see',
    'opt.data.internal': 'Internal - Company employees only',
    'opt.data.confidential': 'Confidential - Limited access required',
    'opt.data.restricted': 'Restricted - Highest security needed',
    'opt.retention.less1': 'Less than 1 year',
    'opt.retention.1-2': '1-2 years',
    'opt.retention.3-5': '3-5 years',
    'opt.retention.5-10': '5-10 years',
    'opt.retention.10+': '10+ years',
    'opt.mobile.primary': 'Yes, mobile is primary',
    'opt.mobile.secondary': 'Yes, but desktop is primary',
    'opt.mobile.no': 'No, desktop only',
    'opt.offline.must': 'Yes, must work offline',
    'opt.offline.nice': 'Nice to have, not critical',
    'opt.offline.no': 'No, always connected',
    'opt.availability.business': 'Business hours only',
    'opt.availability.extended': 'Extended hours (6am-10pm)',
    'opt.availability.247': '24/7 availability',

    // Language selector
    'language.select': 'Select language',
    'language.de': 'Deutsch',
    'language.en': 'English',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    const stored = localStorage.getItem('app-language');
    return (stored === 'de' || stored === 'en') ? stored : 'de';
  });

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('app-language', lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
