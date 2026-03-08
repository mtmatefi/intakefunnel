import type { UserRole } from "@/types/intake";

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  targetSelector?: string;
  placement?: "top" | "bottom" | "left" | "right";
  action?: string;
  route?: string; // Navigate to this route before highlighting
}

export interface Tutorial {
  id: string;
  title: string;
  description: string;
  icon: string; // emoji
  roles: UserRole[];
  category: "getting-started" | "features" | "advanced" | "admin";
  estimatedMinutes: number;
  steps: TutorialStep[];
}

export const tutorials: Tutorial[] = [
  // ── REQUESTER TUTORIALS ──
  {
    id: "requester-first-intake",
    title: "Ersten Intake erstellen",
    description: "Lernen Sie Schritt für Schritt, wie Sie einen neuen Intake einreichen – vom Interview bis zur Spec-Generierung.",
    icon: "🚀",
    roles: ["requester", "architect", "admin"],
    category: "getting-started",
    estimatedMinutes: 5,
    steps: [
      {
        id: "r1-welcome",
        title: "Willkommen beim Intake Funnel",
        description: "Der Intake Funnel hilft Ihnen, Ihre Anforderungen strukturiert zu erfassen. Eine KI führt Sie durch ein Interview und erstellt automatisch eine technische Spezifikation.",
      },
      {
        id: "r1-nav-new",
        title: "Neuen Intake starten",
        description: "Klicken Sie auf 'New Intake' in der Navigation, um einen neuen Intake zu beginnen.",
        targetSelector: 'a[href="/intake/new"]',
        placement: "bottom",
        action: "Klicken Sie auf 'New Intake'",
      },
      {
        id: "r1-title",
        title: "Titel eingeben",
        description: "Geben Sie einen aussagekräftigen Titel für Ihren Intake ein. Die KI verwendet diesen als Ausgangspunkt für das Interview.",
        targetSelector: 'input[placeholder*="Titel"]',
        placement: "bottom",
      },
      {
        id: "r1-interview",
        title: "KI-Interview durchlaufen",
        description: "Die KI stellt Ihnen Fragen zu Ihrem Vorhaben. Beantworten Sie diese so detailliert wie möglich. Die KI erkennt automatisch, ob es sich um eine Initiative, ein Epic oder ein Feature handelt.",
        targetSelector: '[data-tutorial="intake-chat"]',
        placement: "right",
      },
      {
        id: "r1-classification",
        title: "KI-Klassifizierung prüfen",
        description: "Die KI schlägt automatisch eine Kategorie vor (Initiative, Value Stream Epic, Epic oder Feature). Sie können den Vorschlag bestätigen oder überschreiben.",
        targetSelector: '[data-tutorial="classification"]',
        placement: "left",
      },
      {
        id: "r1-matching",
        title: "Initiative-Matching",
        description: "Die KI sucht live nach passenden Initiativen aus Strategy Sculptor und zeigt Matches mit Relevanz-Score an. Verknüpfen Sie passende Initiativen direkt.",
        targetSelector: '[data-tutorial="matching"]',
        placement: "left",
      },
      {
        id: "r1-spec",
        title: "Spec generieren",
        description: "Nach dem Interview klicken Sie auf 'Spec generieren'. Die KI erstellt eine vollständige technische Spezifikation basierend auf Ihren Antworten.",
        targetSelector: '[data-tutorial="generate-spec"]',
        placement: "top",
      },
      {
        id: "r1-done",
        title: "Geschafft! 🎉",
        description: "Ihr Intake wird nun von einem Architekten geprüft. Sie können den Status jederzeit im Dashboard verfolgen.",
      },
    ],
  },
  {
    id: "requester-dashboard",
    title: "Dashboard verstehen",
    description: "Übersicht über alle Ihre Intakes, Status-Tracking und wichtige Kennzahlen auf einen Blick.",
    icon: "📊",
    roles: ["requester", "architect", "admin"],
    category: "getting-started",
    estimatedMinutes: 3,
    steps: [
      {
        id: "rd-overview",
        title: "Ihr Dashboard",
        description: "Das Dashboard zeigt alle Ihre Intakes mit aktuellem Status. Hier sehen Sie auf einen Blick, was genehmigt, in Bearbeitung oder offen ist.",
        targetSelector: '[data-tutorial="dashboard-table"]',
        placement: "bottom",
      },
      {
        id: "rd-status",
        title: "Status verstehen",
        description: "Jeder Intake durchläuft Phasen: Draft → Gathering Info → Spec Generated → Pending Approval → Approved/Rejected → Exported. Farben zeigen den aktuellen Status.",
      },
      {
        id: "rd-detail",
        title: "Details einsehen",
        description: "Klicken Sie auf einen Intake, um die vollständige Spezifikation, das Transcript, Routing-Empfehlungen und Compliance-Checks einzusehen.",
      },
      {
        id: "rd-done",
        title: "Alles klar! ✅",
        description: "Sie können jederzeit zum Dashboard zurückkehren, um den Fortschritt Ihrer Intakes zu verfolgen.",
      },
    ],
  },

  // ── ARCHITECT TUTORIALS ──
  {
    id: "architect-review",
    title: "Intakes prüfen & genehmigen",
    description: "Lernen Sie den Architect-Workflow: Queue bearbeiten, Specs reviewen, Guardrails setzen und Intakes genehmigen oder ablehnen.",
    icon: "🏗️",
    roles: ["architect", "admin"],
    category: "getting-started",
    estimatedMinutes: 7,
    steps: [
      {
        id: "ar-queue",
        title: "Architect Queue",
        description: "Die Queue zeigt alle Intakes, die auf Ihre Prüfung warten. Sortiert nach Priorität und WSJF-Score.",
        targetSelector: 'a[href="/architect"]',
        placement: "bottom",
        action: "Öffnen Sie die Architect Queue",
      },
      {
        id: "ar-review",
        title: "Intake im Detail prüfen",
        description: "Öffnen Sie einen Intake, um die generierte Spec, das Interview-Transcript und die KI-Klassifizierung zu prüfen.",
      },
      {
        id: "ar-spec-tab",
        title: "Spezifikation prüfen",
        description: "Im Tab 'Spezifikation' sehen Sie die von der KI generierte Spec. Prüfen Sie Vollständigkeit, technische Machbarkeit und Compliance.",
      },
      {
        id: "ar-routing",
        title: "Routing-Empfehlung",
        description: "Die KI empfiehlt einen Delivery-Pfad (Buy, Config, AI Disposable, Product Grade, Critical). Prüfen und bestätigen Sie die Empfehlung.",
      },
      {
        id: "ar-impact",
        title: "Impact Score vergeben",
        description: "Bewerten Sie Business Value, Time Criticality, Risk Reduction, Strategic Fit und Effort. Der WSJF-Score wird automatisch berechnet.",
      },
      {
        id: "ar-followup",
        title: "Rückfragen stellen",
        description: "Fehlen Informationen? Stellen Sie Rückfragen direkt an den Requester. Der Intake wird erst fortgefahren, wenn alle Fragen beantwortet sind.",
      },
      {
        id: "ar-approve",
        title: "Genehmigen oder Ablehnen",
        description: "Setzen Sie Guardrails, fügen Sie Kommentare hinzu und treffen Sie Ihre Entscheidung: Approve oder Reject.",
      },
      {
        id: "ar-done",
        title: "Review abgeschlossen! 🎯",
        description: "Nach der Genehmigung kann der Intake nach Jira exportiert werden. Abgelehnte Intakes können vom Requester überarbeitet werden.",
      },
    ],
  },
  {
    id: "architect-compliance",
    title: "Compliance & Guidelines verwalten",
    description: "Guidelines erstellen, Compliance-Frameworks konfigurieren und Richtlinien für die KI-gestützte Prüfung pflegen.",
    icon: "🛡️",
    roles: ["architect", "admin"],
    category: "features",
    estimatedMinutes: 5,
    steps: [
      {
        id: "ac-nav",
        title: "Compliance-Bereich öffnen",
        description: "Navigieren Sie zu 'Compliance' in der Seitenleiste. Hier verwalten Sie alle Guidelines und Frameworks.",
        targetSelector: 'a[href="/admin/policies"]',
        placement: "bottom",
      },
      {
        id: "ac-frameworks",
        title: "Frameworks verstehen",
        description: "Guidelines sind nach Frameworks organisiert (z.B. SOC2, GDPR, ISO27001). Jedes Framework hat eigene Anforderungen.",
      },
      {
        id: "ac-create",
        title: "Guideline erstellen",
        description: "Erstellen Sie neue Guidelines mit Markdown-Content, Severity-Level und Risiko-Kategorien. Die KI nutzt diese bei der Intake-Prüfung.",
      },
      {
        id: "ac-versioning",
        title: "Versionierung",
        description: "Jede Änderung an einer Guideline wird versioniert. Sie können den Verlauf einsehen und Änderungen nachvollziehen.",
      },
      {
        id: "ac-done",
        title: "Compliance konfiguriert! ✅",
        description: "Die KI prüft jeden neuen Intake automatisch gegen Ihre Guidelines und zeigt Compliance-Flags an.",
      },
    ],
  },

  // ── ADMIN TUTORIALS ──
  {
    id: "admin-users",
    title: "Benutzer & Rollen verwalten",
    description: "Neue Benutzer einladen, Rollen zuweisen und Zugriffsrechte konfigurieren.",
    icon: "👥",
    roles: ["admin"],
    category: "admin",
    estimatedMinutes: 4,
    steps: [
      {
        id: "au-nav",
        title: "Benutzerverwaltung öffnen",
        description: "Navigieren Sie zu 'Benutzer' in der Admin-Navigation.",
        targetSelector: 'a[href="/admin/users"]',
        placement: "bottom",
      },
      {
        id: "au-roles",
        title: "Rollen verstehen",
        description: "Es gibt 4 Rollen: Requester (erstellt Intakes), Architect (prüft & genehmigt), Engineer Lead (technische Übersicht), Admin (voller Zugriff).",
      },
      {
        id: "au-assign",
        title: "Rollen zuweisen",
        description: "Ändern Sie die Rolle eines Benutzers über das Dropdown in der Benutzerliste. Die Änderung wird sofort wirksam.",
      },
      {
        id: "au-impersonate",
        title: "Rollen-Wechsel (Impersonation)",
        description: "Als Admin können Sie die App aus Sicht jeder Rolle betrachten. Nutzen Sie den Rollen-Switcher in der Header-Leiste.",
        targetSelector: '[data-tutorial="role-switcher"]',
        placement: "bottom",
      },
      {
        id: "au-done",
        title: "Benutzerverwaltung verstanden! 👍",
        description: "Tipp: Nutzen Sie den Rollen-Wechsel regelmäßig, um die Erfahrung für verschiedene Nutzergruppen zu testen.",
      },
    ],
  },
  {
    id: "admin-integrations",
    title: "Jira & Integrationen einrichten",
    description: "Konfigurieren Sie die Jira-Anbindung für den automatischen Export von genehmigten Intakes.",
    icon: "🔗",
    roles: ["admin"],
    category: "admin",
    estimatedMinutes: 5,
    steps: [
      {
        id: "ai-nav",
        title: "Integrationen öffnen",
        description: "Navigieren Sie zu 'Integrations' in der Admin-Navigation.",
        targetSelector: 'a[href="/admin/integrations"]',
        placement: "bottom",
      },
      {
        id: "ai-jira",
        title: "Jira konfigurieren",
        description: "Geben Sie Ihre Jira Base URL, API Token und User Email ein. Die Verbindung wird automatisch getestet.",
      },
      {
        id: "ai-export",
        title: "Auto-Export verstehen",
        description: "Genehmigte Intakes können automatisch als Jira Epics exportiert werden – inklusive Spec, Guardrails und Impact Score.",
      },
      {
        id: "ai-jpd",
        title: "Jira Product Discovery",
        description: "Optional: Verknüpfen Sie Intakes mit JPD Issues für ein durchgängiges Portfolio-Management.",
      },
      {
        id: "ai-done",
        title: "Integration bereit! 🔌",
        description: "Genehmigte Intakes werden nun automatisch nach Jira synchronisiert.",
      },
    ],
  },
  {
    id: "admin-audit",
    title: "Audit Log & Metriken nutzen",
    description: "Alle Aktionen nachverfolgen und Prozess-Metriken für kontinuierliche Verbesserung nutzen.",
    icon: "📋",
    roles: ["admin"],
    category: "advanced",
    estimatedMinutes: 3,
    steps: [
      {
        id: "aa-audit",
        title: "Audit Log einsehen",
        description: "Das Audit Log zeigt alle Aktionen im System: Wer hat wann was gemacht? Nutzen Sie Filter für gezielte Suche.",
        targetSelector: 'a[href="/audit"]',
        placement: "bottom",
      },
      {
        id: "aa-metrics",
        title: "Metriken verstehen",
        description: "Die Metriken-Seite zeigt Durchlaufzeiten, Genehmigungs-Raten, häufige Kategorien und Trend-Analysen.",
        targetSelector: 'a[href="/metrics"]',
        placement: "bottom",
      },
      {
        id: "aa-done",
        title: "Übersicht komplett! 📈",
        description: "Nutzen Sie diese Daten, um den Intake-Prozess kontinuierlich zu optimieren.",
      },
    ],
  },

  // ── ENGINEER LEAD TUTORIALS ──
  {
    id: "engineer-overview",
    title: "Engineer Lead Übersicht",
    description: "Verstehen Sie Ihre Rolle: Genehmigte Intakes einsehen, technische Details prüfen und Delivery vorbereiten.",
    icon: "⚙️",
    roles: ["engineer_lead", "admin"],
    category: "getting-started",
    estimatedMinutes: 4,
    steps: [
      {
        id: "eo-dashboard",
        title: "Dashboard als Engineer Lead",
        description: "Ihr Dashboard zeigt genehmigte und exportierte Intakes, die für die Umsetzung bereitstehen.",
      },
      {
        id: "eo-spec",
        title: "Specs verstehen",
        description: "Jeder Intake hat eine detaillierte technische Spezifikation mit Architektur-Entscheidungen, Guardrails und Compliance-Anforderungen.",
      },
      {
        id: "eo-routing",
        title: "Delivery-Pfad beachten",
        description: "Der empfohlene Delivery-Pfad (Buy/Config/AI Disposable/Product Grade/Critical) gibt Ihnen Orientierung für die Ressourcenplanung.",
      },
      {
        id: "eo-done",
        title: "Bereit für Delivery! 🚀",
        description: "Nutzen Sie die Spec als Grundlage für Ihre Sprint-Planung und technische Umsetzung.",
      },
    ],
  },
];

export function getTutorialsForRole(role: UserRole): Tutorial[] {
  return tutorials.filter((t) => t.roles.includes(role));
}

export function getTutorialsByCategory(role: UserRole, category: Tutorial["category"]): Tutorial[] {
  return tutorials.filter((t) => t.roles.includes(role) && t.category === category);
}
