import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Language = "english" | "urdu";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<string, Record<Language, string>> = {
  // Navigation
  "nav.dashboard": { english: "Dashboard", urdu: "ڈیش بورڈ" },
  "nav.syllabus": { english: "Syllabus", urdu: "نصاب" },
  "nav.lessonPlans": { english: "Lesson Plans", urdu: "سبق کے منصوبے" },
  "nav.quizGenerator": { english: "Quiz Generator", urdu: "کوئز بنائیں" },
  "nav.aiChat": { english: "AI Chat", urdu: "AI چیٹ" },
  "nav.homeworkHelp": { english: "Homework Help", urdu: "ہوم ورک مدد" },
  "nav.history": { english: "History", urdu: "تاریخ" },
  "nav.settings": { english: "Settings", urdu: "ترتیبات" },
  "nav.logout": { english: "Logout", urdu: "لاگ آؤٹ" },
  
  // Common
  "common.loading": { english: "Loading...", urdu: "لوڈ ہو رہا ہے..." },
  "common.save": { english: "Save", urdu: "محفوظ کریں" },
  "common.saveChanges": { english: "Save Changes", urdu: "تبدیلیاں محفوظ کریں" },
  "common.cancel": { english: "Cancel", urdu: "منسوخ" },
  "common.delete": { english: "Delete", urdu: "حذف کریں" },
  "common.edit": { english: "Edit", urdu: "ترمیم" },
  "common.copy": { english: "Copy", urdu: "کاپی" },
  "common.download": { english: "Download", urdu: "ڈاؤن لوڈ" },
  "common.preview": { english: "Preview", urdu: "پیش نظارہ" },
  "common.generate": { english: "Generate", urdu: "بنائیں" },
  "common.select": { english: "Select", urdu: "منتخب کریں" },
  "common.search": { english: "Search", urdu: "تلاش" },
  "common.selectClass": { english: "Select class", urdu: "کلاس منتخب کریں" },
  "common.selectSubject": { english: "Select subject", urdu: "مضمون منتخب کریں" },
  "common.selectDocument": { english: "Select document", urdu: "دستاویز منتخب کریں" },
  "common.noDocuments": { english: "No documents ready. Upload syllabus first.", urdu: "کوئی دستاویز تیار نہیں۔ پہلے نصاب اپ لوڈ کریں۔" },
  "common.optional": { english: "Optional", urdu: "اختیاری" },
  "common.required": { english: "Required", urdu: "ضروری" },
  
  // Chat
  "chat.title": { english: "AI Chat Assistant", urdu: "AI چیٹ اسسٹنٹ" },
  "chat.history": { english: "Chat History", urdu: "چیٹ ہسٹری" },
  "chat.newChat": { english: "New Chat", urdu: "نئی چیٹ" },
  "chat.selectDocument": { english: "Select syllabus document", urdu: "نصاب دستاویز منتخب کریں" },
  "chat.askQuestion": { english: "Ask a question about your syllabus...", urdu: "اپنے نصاب کے بارے میں سوال پوچھیں..." },
  "chat.assistant": { english: "TeachAI Assistant", urdu: "ٹیچ AI اسسٹنٹ" },
  "chat.answeringFrom": { english: "Answering from your syllabus only", urdu: "صرف آپ کے نصاب سے جواب دے رہا ہوں" },
  "chat.noChats": { english: "No chats yet. Start a new conversation!", urdu: "ابھی کوئی چیٹ نہیں۔ نئی بات چیت شروع کریں!" },
  "chat.deleteConfirm": { english: "Are you sure you want to delete this chat?", urdu: "کیا آپ واقعی اس چیٹ کو حذف کرنا چاہتے ہیں؟" },
  
  // Language
  "language.english": { english: "English", urdu: "انگریزی" },
  "language.urdu": { english: "اردو (Urdu)", urdu: "اردو" },
  "language.select": { english: "Language", urdu: "زبان" },
  
  // Dashboard
  "dashboard.welcome": { english: "Welcome back!", urdu: "خوش آمدید!" },
  "dashboard.welcomeTeacher": { english: "Welcome back, Teacher!", urdu: "خوش آمدید، استاد!" },
  "dashboard.stats": { english: "Your Statistics", urdu: "آپ کے اعدادوشمار" },
  "dashboard.quickActions": { english: "Quick Actions", urdu: "فوری اعمال" },
  "dashboard.recentActivity": { english: "Recent Activity", urdu: "حالیہ سرگرمی" },
  "dashboard.noActivity": { english: "No activity yet. Upload a syllabus to get started!", urdu: "ابھی تک کوئی سرگرمی نہیں۔ شروع کرنے کے لیے نصاب اپ لوڈ کریں!" },
  "dashboard.aiPowered": { english: "AI-Powered Teaching Assistant", urdu: "AI سے چلنے والا ٹیچنگ اسسٹنٹ" },
  "dashboard.welcomeDesc": { english: "Your intelligent assistant is ready to help create lesson plans, generate quizzes, and answer questions using your uploaded syllabus.", urdu: "آپ کا ذہین اسسٹنٹ سبق کے منصوبے بنانے، کوئز بنانے اور آپ کے اپ لوڈ کردہ نصاب کا استعمال کرتے ہوئے سوالات کے جوابات دینے میں مدد کے لیے تیار ہے۔" },
  "dashboard.createLessonPlan": { english: "Create Lesson Plan", urdu: "سبق کا منصوبہ بنائیں" },
  "dashboard.uploadSyllabus": { english: "Upload Syllabus", urdu: "نصاب اپ لوڈ کریں" },
  
  // Feature Cards
  "feature.uploadSyllabus": { english: "Upload Syllabus", urdu: "نصاب اپ لوڈ کریں" },
  "feature.uploadDesc": { english: "Upload course materials via documents, images, text, or voice.", urdu: "دستاویزات، تصاویر، متن یا آواز کے ذریعے کورس مواد اپ لوڈ کریں۔" },
  "feature.lessonPlans": { english: "Lesson Plans", urdu: "سبق کے منصوبے" },
  "feature.lessonDesc": { english: "Generate detailed lesson plans based on your curriculum.", urdu: "اپنے نصاب کی بنیاد پر تفصیلی سبق کے منصوبے بنائیں۔" },
  "feature.quizGenerator": { english: "Quiz Generator", urdu: "کوئز بنانے والا" },
  "feature.quizDesc": { english: "Create MCQs, short questions, and long questions instantly.", urdu: "فوری طور پر MCQs، مختصر سوالات اور طویل سوالات بنائیں۔" },
  "feature.aiChat": { english: "AI Chat", urdu: "AI چیٹ" },
  "feature.aiChatDesc": { english: "Ask questions and get answers from your syllabus content.", urdu: "سوالات پوچھیں اور اپنے نصاب کے مواد سے جوابات حاصل کریں۔" },
  "feature.homeworkHelp": { english: "Homework Help", urdu: "ہوم ورک مدد" },
  "feature.homeworkDesc": { english: "Get step-by-step explanations for homework questions.", urdu: "ہوم ورک کے سوالات کے لیے قدم بہ قدم وضاحت حاصل کریں۔" },
  
  // Stats Cards
  "stats.documentsUploaded": { english: "Documents Uploaded", urdu: "اپ لوڈ شدہ دستاویزات" },
  "stats.syllabusFiles": { english: "Syllabus files", urdu: "نصاب فائلیں" },
  "stats.lessonPlans": { english: "Lesson Plans", urdu: "سبق کے منصوبے" },
  "stats.generated": { english: "Generated", urdu: "بنائے گئے" },
  "stats.quizzesGenerated": { english: "Quizzes Generated", urdu: "بنائے گئے کوئز" },
  "stats.totalQuizzes": { english: "Total quizzes", urdu: "کل کوئز" },
  "stats.chaptersExtracted": { english: "Chapters Extracted", urdu: "نکالے گئے ابواب" },
  "stats.fromDocuments": { english: "From documents", urdu: "دستاویزات سے" },
  
  // Syllabus Page
  "syllabus.title": { english: "Syllabus Management", urdu: "نصاب کا انتظام" },
  "syllabus.subtitle": { english: "Upload course materials or generate syllabus with AI", urdu: "کورس مواد اپ لوڈ کریں یا AI سے نصاب بنائیں" },
  "syllabus.uploadTab": { english: "Upload Syllabus", urdu: "نصاب اپ لوڈ کریں" },
  "syllabus.generateTab": { english: "Generate with AI", urdu: "AI سے بنائیں" },
  "syllabus.uploadContent": { english: "Upload Content", urdu: "مواد اپ لوڈ کریں" },
  "syllabus.uploadContentDesc": { english: "Add syllabus content via documents, images, text, or voice", urdu: "دستاویزات، تصاویر، متن یا آواز کے ذریعے نصاب کا مواد شامل کریں" },
  "syllabus.classGrade": { english: "Class/Grade", urdu: "کلاس/گریڈ" },
  "syllabus.subject": { english: "Subject", urdu: "مضمون" },
  "syllabus.document": { english: "Document", urdu: "دستاویز" },
  "syllabus.image": { english: "Image", urdu: "تصویر" },
  "syllabus.text": { english: "Text", urdu: "متن" },
  "syllabus.voice": { english: "Voice", urdu: "آواز" },
  "syllabus.dropFiles": { english: "Drop PDF, DOCX, or TXT files", urdu: "PDF، DOCX یا TXT فائلیں یہاں ڈالیں" },
  "syllabus.orClickBrowse": { english: "or click to browse", urdu: "یا براؤز کرنے کے لیے کلک کریں" },
  "syllabus.generateLessonPlan": { english: "Generate Lesson Plan", urdu: "سبق کا منصوبہ بنائیں" },
  "syllabus.selectGrade": { english: "Select Grade", urdu: "گریڈ منتخب کریں" },
  "syllabus.filterByGrade": { english: "Filter by grade", urdu: "گریڈ کے لحاظ سے فلٹر کریں" },
  "syllabus.lessonPlanFormat": { english: "Lesson Plan Format", urdu: "سبق کا منصوبہ فارمیٹ" },
  "syllabus.daily": { english: "Daily", urdu: "روزانہ" },
  "syllabus.weekly": { english: "Weekly", urdu: "ہفتہ وار" },
  "syllabus.monthly": { english: "Monthly", urdu: "ماہانہ" },
  
  // Lesson Plans Page
  "lessonPlan.title": { english: "Lesson Plan Generator", urdu: "سبق کا منصوبہ بنانے والا" },
  "lessonPlan.subtitle": { english: "Create detailed lesson plans based on your uploaded syllabus content.", urdu: "اپنے اپ لوڈ کردہ نصاب کی بنیاد پر تفصیلی سبق کے منصوبے بنائیں۔" },
  "lessonPlan.details": { english: "Lesson Details", urdu: "سبق کی تفصیلات" },
  "lessonPlan.detailsDesc": { english: "Fill in the details to generate a customized lesson plan", urdu: "اپنی مرضی کا سبق کا منصوبہ بنانے کے لیے تفصیلات بھریں" },
  "lessonPlan.syllabusDocument": { english: "Syllabus Document", urdu: "نصاب کی دستاویز" },
  "lessonPlan.classLevel": { english: "Class Level", urdu: "کلاس لیول" },
  "lessonPlan.chapterTopic": { english: "Chapter / Topic", urdu: "باب / موضوع" },
  "lessonPlan.duration": { english: "Duration (minutes)", urdu: "دورانیہ (منٹ)" },
  "lessonPlan.additionalNotes": { english: "Additional Notes (Optional)", urdu: "اضافی نوٹس (اختیاری)" },
  "lessonPlan.generate": { english: "Generate Lesson Plan", urdu: "سبق کا منصوبہ بنائیں" },
  "lessonPlan.generatedTitle": { english: "Generated Lesson Plan", urdu: "بنایا گیا سبق کا منصوبہ" },
  "lessonPlan.generatedDesc": { english: "Your AI-generated lesson plan will appear here", urdu: "آپ کا AI سے بنایا گیا سبق کا منصوبہ یہاں ظاہر ہوگا" },
  "lessonPlan.selectAndFill": { english: "Select a syllabus and fill in the details", urdu: "نصاب منتخب کریں اور تفصیلات بھریں" },
  "lessonPlan.willAppear": { english: "Your lesson plan will appear here", urdu: "آپ کا سبق کا منصوبہ یہاں ظاہر ہوگا" },
  
  // Quiz Generator Page
  "quiz.title": { english: "Quiz Generator", urdu: "کوئز جنریٹر" },
  "quiz.subtitle": { english: "Generate MCQs, short questions, and long questions from your syllabus", urdu: "اپنے نصاب سے MCQs، مختصر سوالات اور طویل سوالات بنائیں" },
  "quiz.settings": { english: "Quiz Settings", urdu: "کوئز کی ترتیبات" },
  "quiz.settingsDesc": { english: "Configure your quiz parameters", urdu: "اپنے کوئز کے پیرامیٹرز ترتیب دیں" },
  "quiz.classGrade": { english: "Class/Grade", urdu: "کلاس/گریڈ" },
  "quiz.syllabusDocument": { english: "Syllabus Document", urdu: "نصاب کی دستاویز" },
  "quiz.chapters": { english: "Chapters (Optional)", urdu: "ابواب (اختیاری)" },
  "quiz.selectAll": { english: "Select All", urdu: "سب منتخب کریں" },
  "quiz.deselectAll": { english: "Deselect All", urdu: "سب غیر منتخب کریں" },
  "quiz.generateAll": { english: "Generate all question types", urdu: "تمام قسم کے سوالات بنائیں" },
  "quiz.mcqs": { english: "MCQs", urdu: "MCQs" },
  "quiz.shortQA": { english: "Short Q&A", urdu: "مختصر سوال و جواب" },
  "quiz.longQA": { english: "Long Q&A", urdu: "طویل سوال و جواب" },
  "quiz.difficulty": { english: "Difficulty", urdu: "مشکل کی سطح" },
  "quiz.easy": { english: "Easy", urdu: "آسان" },
  "quiz.medium": { english: "Medium", urdu: "درمیانہ" },
  "quiz.hard": { english: "Hard", urdu: "مشکل" },
  "quiz.generate": { english: "Generate Quiz", urdu: "کوئز بنائیں" },
  "quiz.questions": { english: "Questions", urdu: "سوالات" },
  "quiz.generatedTitle": { english: "Generated Questions", urdu: "بنائے گئے سوالات" },
  "quiz.generatedDesc": { english: "Questions generated from your syllabus", urdu: "آپ کے نصاب سے بنائے گئے سوالات" },
  "quiz.selectAndConfigure": { english: "Select a syllabus and configure quiz settings", urdu: "نصاب منتخب کریں اور کوئز کی ترتیبات کریں" },
  "quiz.willAppear": { english: "Questions will appear here", urdu: "سوالات یہاں ظاہر ہوں گے" },
  
  // History Page
  "history.title": { english: "History", urdu: "تاریخ" },
  "history.subtitle": { english: "View, edit, and download your previously generated content", urdu: "اپنے پہلے بنائے گئے مواد کو دیکھیں، ترمیم کریں اور ڈاؤن لوڈ کریں" },
  "history.lessonPlans": { english: "Lesson Plans", urdu: "سبق کے منصوبے" },
  "history.quizzes": { english: "Quizzes", urdu: "کوئز" },
  "history.noLessonPlans": { english: "No lesson plans generated yet.", urdu: "ابھی تک کوئی سبق کا منصوبہ نہیں بنا۔" },
  "history.noQuizzes": { english: "No quizzes generated yet.", urdu: "ابھی تک کوئی کوئز نہیں بنا۔" },
  
  // Settings Page
  "settings.title": { english: "Settings", urdu: "ترتیبات" },
  "settings.subtitle": { english: "Manage your account and preferences", urdu: "اپنے اکاؤنٹ اور ترجیحات کا انتظام کریں" },
  "settings.profileInfo": { english: "Profile Information", urdu: "پروفائل کی معلومات" },
  "settings.profileInfoDesc": { english: "Update your personal information", urdu: "اپنی ذاتی معلومات اپ ڈیٹ کریں" },
  "settings.email": { english: "Email", urdu: "ای میل" },
  "settings.emailCantChange": { english: "Email cannot be changed", urdu: "ای میل تبدیل نہیں ہو سکتی" },
  "settings.fullName": { english: "Full Name", urdu: "پورا نام" },
  "settings.schoolName": { english: "School Name", urdu: "اسکول کا نام" },
  "settings.account": { english: "Account", urdu: "اکاؤنٹ" },
  "settings.accountDesc": { english: "Manage your account settings", urdu: "اپنے اکاؤنٹ کی ترتیبات کا انتظام کریں" },
  "settings.accountCreated": { english: "Account Created", urdu: "اکاؤنٹ بنایا گیا" },
  "settings.signOut": { english: "Sign Out", urdu: "سائن آؤٹ" },
  
  // Homework Help
  "homework.title": { english: "Homework Help", urdu: "ہوم ورک مدد" },
  "homework.explain": { english: "Explain Step by Step", urdu: "قدم بہ قدم سمجھائیں" },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem("app-language");
    return (saved as Language) || "english";
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("app-language", lang);
  };

  const t = (key: string): string => {
    return translations[key]?.[language] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
