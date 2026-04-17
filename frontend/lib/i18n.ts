import type { Language } from "@/types";

export type Strings = {
  // Header / footer
  appTitle: string;
  appSubtitle: string;
  github: string;
  footer: string;
  version: string;

  // Tabs
  tabRequest: string;
  tabInventory: string;
  tabHealth: string;

  // Tab 1 — request form
  formHeading: string;
  formSubheading: string;
  fieldName: string;
  fieldNamePlaceholder: string;
  fieldPurpose: string;
  fieldPurposePlaceholder: string;
  fieldLanguageMode: string;
  fieldDepartment: string;
  fieldDepartmentPlaceholder: string;
  fieldPriority: string;
  fieldRequesterEmail: string;
  fieldRequesterEmailPlaceholder: string;
  fieldRequesterEmailHint: string;
  fieldDepartmentOther: string;
  priorityLow: string;
  priorityMedium: string;
  priorityHigh: string;
  priorityCritical: string;
  langAuto: string;
  langTr: string;
  langEn: string;
  submit: string;
  submitting: string;
  validationMissing: string;

  // Tab 1 — results
  resultsHeading: string;
  resultsPlaceholder: string;
  recommendationDuplicate: string;
  recommendationSimilar: string;
  recommendationNew: string;
  topMatches: string;
  similarityScore: string;
  riskLevel: string;
  riskHigh: string;
  riskMedium: string;
  riskLow: string;
  matchedLanguage: string;
  showDetails: string;
  hideDetails: string;
  noMatches: string;
  detectedLanguage: string;

  // Tab 1 — score breakdown (multi-stage scoring)
  scoreBreakdown: string;
  semanticMatch: string;
  keywordMatch: string;
  rerankScore: string;
  finalScore: string;

  // Tab 1 — matched view badge
  matchedViewShort: string;
  matchedViewNormal: string;
  matchedViewEnriched: string;

  // Tab 2 — inventory
  inventoryHeading: string;
  inventorySubheading: string;
  searchPlaceholder: string;
  filterCategoryAll: string;
  colNo: string;
  colName: string;
  colCategory: string;
  colPurpose: string;
  emptyInventory: string;
  expandHint: string;
  detailsName: string;
  detailsPurpose: string;
  keywords: string;
  standards: string;
  sources: string;

  // Tab 3 — quality
  healthHeading: string;
  healthSubheading: string;
  cardTotal: string;
  cardExcellent: string;
  cardGood: string;
  cardNeedsImprovement: string;
  cardDescriptionQuality: string;
  cardFindability: string;
  cardEnrichment: string;
  qualityTableHeading: string;
  colDescriptionQuality: string;
  colFindability: string;
  colEnrichment: string;
  colKeywords: string;
  colSources: string;
  issuesHeading: string;
  noIssues: string;

  // Generic
  loading: string;
  errorTitle: string;
  errorHint: string;
  retry: string;
};

export const i18n: Record<Language, Strings> = {
  tr: {
    appTitle: "Model Envanter Yönetimi",
    appSubtitle: "Model Envanteri Tekrar Tespit ve Yeni Talep Sistemi",
    github: "GitHub",
    footer: "Kuveyt Türk Yapay Zeka Laboratuvarı — Model Envanter Yönetim Sistemi",
    version: "v0.2.17",

    tabRequest: "Yeni Model Talebi",
    tabInventory: "Model Envanteri",
    tabHealth: "Envanter Sağlığı",

    formHeading: "Yeni Model Talebi",
    formSubheading:
      "Önerdiğiniz modelin envanterdeki mevcut modellerle benzerliğini kontrol edin.",
    fieldName: "Model Adı",
    fieldNamePlaceholder: "Örn: Kurumsal Kredi Riski Skorlama Modeli",
    fieldPurpose: "Modelin Hedefi",
    fieldPurposePlaceholder:
      "Örn: KOBİ segmentindeki müşteriler için 12 aylık temerrüt olasılığını tahmin eder...",
    fieldLanguageMode: "Dil Algılama",
    fieldDepartment: "Talep Eden Birim",
    fieldDepartmentPlaceholder: "Birim seçiniz",
    fieldPriority: "Öncelik",
    fieldRequesterEmail: "Kurumsal E-posta",
    fieldRequesterEmailPlaceholder: "zahid.malkoc@kuveytturk.com.tr",
    fieldRequesterEmailHint: "",
    fieldDepartmentOther: "Birim adını yazınız",
    priorityLow: "Düşük",
    priorityMedium: "Orta",
    priorityHigh: "Yüksek",
    priorityCritical: "Acil",
    langAuto: "Otomatik",
    langTr: "Türkçe",
    langEn: "İngilizce",
    submit: "Benzerlik Kontrol Et",
    submitting: "Kontrol ediliyor...",
    validationMissing: "Lütfen model adını giriniz.",

    resultsHeading: "Sonuçlar",
    resultsPlaceholder: "Sonuçlar burada görünecek",
    recommendationDuplicate:
      "⚠️ Bu modele çok benzer mevcut model bulundu!",
    recommendationSimilar:
      "ℹ️ Benzer modeller mevcut, inceleyiniz",
    recommendationNew:
      "✅ Bu talep envanterdeki modellerden farklı",
    topMatches: "En Benzer Modeller",
    similarityScore: "Benzerlik Skoru",
    riskLevel: "Risk Seviyesi",
    riskHigh: "Yüksek",
    riskMedium: "Orta",
    riskLow: "Düşük",
    matchedLanguage: "Eşleşen Dil",
    showDetails: "Tam açıklamayı göster",
    hideDetails: "Açıklamayı gizle",
    noMatches: "Eşleşen model bulunamadı.",
    detectedLanguage: "Algılanan Dil",

    scoreBreakdown: "Skor Detayı",
    semanticMatch: "Anlamsal Eşleşme",
    keywordMatch: "Anahtar Kelime (BM25)",
    rerankScore: "Yeniden Sıralama",
    finalScore: "Final Skor",

    matchedViewShort: "Kısa Görünüm",
    matchedViewNormal: "Normal Görünüm",
    matchedViewEnriched: "Zenginleştirilmiş",

    inventoryHeading: "Model Envanteri",
    inventorySubheading: "Bankanın aktif model envanterinde 30 model bulunmaktadır.",
    searchPlaceholder: "Model adı veya amacında ara...",
    filterCategoryAll: "Tüm Kategoriler",
    colNo: "No",
    colName: "Model Adı",
    colCategory: "Kategori",
    colPurpose: "Modelin Hedefi",
    emptyInventory: "Filtreyle eşleşen model bulunamadı.",
    expandHint: "Detayları görmek için satıra tıklayın",
    detailsName: "Model Adı",
    detailsPurpose: "Modelin Hedefi",
    keywords: "Anahtar Kavramlar",
    standards: "İlgili Standartlar",
    sources: "Referans Kaynaklar",

    healthHeading: "Envanter Sağlığı",
    healthSubheading:
      "Mevcut envanterdeki her modelin açıklama kalitesi, bulunabilirlik ve zenginleştirme skorlarını değerlendirir.",
    cardTotal: "Toplam Model",
    cardExcellent: "Mükemmel (85-100)",
    cardGood: "İyi (65-84)",
    cardNeedsImprovement: "Geliştirilmeli (<65)",
    cardDescriptionQuality: "Açıklama Kalitesi",
    cardFindability: "Bulunabilirlik",
    cardEnrichment: "Zenginleştirme",
    qualityTableHeading: "Model Kalite Skorları",
    colDescriptionQuality: "Açıklama",
    colFindability: "Bulunabilirlik",
    colEnrichment: "Zenginleştirme",
    colKeywords: "Anahtar Kelime",
    colSources: "Kaynak",
    issuesHeading: "Tespit Edilen Sorunlar",
    noIssues: "Bu model için tespit edilmiş bir sorun yok.",

    loading: "Yükleniyor...",
    errorTitle: "Bir hata oluştu",
    errorHint:
      "Backend servisinin http://localhost:8000 adresinde çalıştığından emin olun.",
    retry: "Tekrar Dene",
  },
  en: {
    appTitle: "Model Inventory Management",
    appSubtitle: "Model Inventory Duplicate Detection & New Request System",
    github: "GitHub",
    footer: "Kuveyt Türk AI Laboratory — Model Inventory Management System",
    version: "v0.2.17",

    tabRequest: "New Model Request",
    tabInventory: "Model Inventory",
    tabHealth: "Inventory Health",

    formHeading: "New Model Request",
    formSubheading:
      "Check whether your proposed model is similar to any existing models in the inventory.",
    fieldName: "Model Name",
    fieldNamePlaceholder: "e.g. Corporate Credit Risk Scoring Model",
    fieldPurpose: "Model Objective",
    fieldPurposePlaceholder:
      "e.g. Predicts 12-month default probability for SME segment customers...",
    fieldLanguageMode: "Language Detection",
    fieldDepartment: "Requesting Department",
    fieldDepartmentPlaceholder: "Select department",
    fieldPriority: "Priority",
    fieldRequesterEmail: "Corporate Email",
    fieldRequesterEmailPlaceholder: "zahid.malkoc@kuveytturk.com.tr",
    fieldRequesterEmailHint: "",
    fieldDepartmentOther: "Enter department name",
    priorityLow: "Low",
    priorityMedium: "Medium",
    priorityHigh: "High",
    priorityCritical: "Critical",
    langAuto: "Auto",
    langTr: "Turkish",
    langEn: "English",
    submit: "Check Similarity",
    submitting: "Checking...",
    validationMissing: "Please provide both a model name and purpose.",

    resultsHeading: "Results",
    resultsPlaceholder: "Results will appear here",
    recommendationDuplicate:
      "⚠️ A very similar model already exists in the inventory!",
    recommendationSimilar:
      "ℹ️ Similar models exist — please review",
    recommendationNew:
      "✅ This request is distinct from existing inventory models",
    topMatches: "Top Matches",
    similarityScore: "Similarity Score",
    riskLevel: "Risk Level",
    riskHigh: "High",
    riskMedium: "Medium",
    riskLow: "Low",
    matchedLanguage: "Matched Language",
    showDetails: "Show full description",
    hideDetails: "Hide description",
    noMatches: "No matching models found.",
    detectedLanguage: "Detected Language",

    scoreBreakdown: "Score Breakdown",
    semanticMatch: "Semantic Match",
    keywordMatch: "Keyword Match (BM25)",
    rerankScore: "Reranker Score",
    finalScore: "Final Score",

    matchedViewShort: "Short View",
    matchedViewNormal: "Normal View",
    matchedViewEnriched: "Enriched View",

    inventoryHeading: "Model Inventory",
    inventorySubheading: "There are 30 active models in the bank's inventory.",
    searchPlaceholder: "Search by model name or purpose...",
    filterCategoryAll: "All Categories",
    colNo: "No",
    colName: "Model Name",
    colCategory: "Category",
    colPurpose: "Model Objective",
    emptyInventory: "No models match the filter.",
    expandHint: "Click a row to view details",
    detailsName: "Model Name",
    detailsPurpose: "Model Objective",
    keywords: "Keywords",
    standards: "Related Standards",
    sources: "Reference Sources",

    healthHeading: "Inventory Health",
    healthSubheading:
      "Evaluates description quality, findability, and enrichment scores for every model in the inventory.",
    cardTotal: "Total Models",
    cardExcellent: "Excellent (85-100)",
    cardGood: "Good (65-84)",
    cardNeedsImprovement: "Needs Improvement (<65)",
    cardDescriptionQuality: "Description Quality",
    cardFindability: "Findability",
    cardEnrichment: "Enrichment",
    qualityTableHeading: "Model Quality Scores",
    colDescriptionQuality: "Description",
    colFindability: "Findability",
    colEnrichment: "Enrichment",
    colKeywords: "Keywords",
    colSources: "Sources",
    issuesHeading: "Detected Issues",
    noIssues: "No issues detected for this model.",

    loading: "Loading...",
    errorTitle: "An error occurred",
    errorHint:
      "Make sure the backend service is running at http://localhost:8000.",
    retry: "Retry",
  },
};

export function getStrings(lang: Language): Strings {
  return i18n[lang];
}
