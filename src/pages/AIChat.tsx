import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, FileText, Mic, MicOff, Paperclip, X, Image, File, Loader2, Plus, MessageSquare, Trash2, MoreHorizontal, PanelLeftClose, PanelLeft } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useDocuments } from "@/hooks/useDocuments";
import { isValidExtractedText } from "@/hooks/useDocuments";
import { useTeachingAssistant } from "@/hooks/useTeachingAssistant";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { useIsMobile } from "@/hooks/use-mobile";
import { useChatConversations, useChatMessages, useCreateConversation, useDeleteConversation, useSaveMessage } from "@/hooks/useChatHistory";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

interface Attachment {
  id: string;
  type: "image" | "pdf" | "docx";
  name: string;
  file: File;
  preview?: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  attachments?: Attachment[];
}

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content: "Hello! I'm your AI Teaching Assistant. 👋\n\nI can help you answer questions, explain concepts, and assist with homework — but only using the syllabus content you've uploaded.\n\n📎 You can also attach images, PDFs, or documents to your questions!\n🎤 Use voice input to speak your questions.\n\nPlease select a syllabus document first, then ask me anything!",
  timestamp: new Date(),
};

export default function AIChat() {
  const { data: documents = [], isLoading: docsLoading } = useDocuments();
  const { generate, isLoading, content: streamContent, reset } = useTeachingAssistant();
  const { isRecording, isTranscribing, startRecording, stopRecording } = useVoiceRecorder();
  const isMobile = useIsMobile();
  const { language, t } = useLanguage();
  
  // Chat history hooks
  const { data: conversations = [], isLoading: conversationsLoading } = useChatConversations();
  const createConversation = useCreateConversation();
  const deleteConversation = useDeleteConversation();
  const saveMessage = useSaveMessage();
  
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const { data: savedMessages = [] } = useChatMessages(currentConversationId);
  
  const [selectedDocId, setSelectedDocId] = useState("");
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [currentAssistantId, setCurrentAssistantId] = useState<string | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const readyDocs = documents.filter((doc) => isValidExtractedText(doc.extracted_content?.content));
  const pendingDocs = documents.filter(
    (doc) => !!doc.extracted_content && !isValidExtractedText(doc.extracted_content?.content)
  );

  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [isMobile]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamContent]);

  // Load saved messages when conversation changes
  useEffect(() => {
    if (savedMessages.length > 0) {
      const loadedMessages: Message[] = savedMessages.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.created_at),
        attachments: msg.attachments || undefined,
      }));
      setMessages([WELCOME_MESSAGE, ...loadedMessages]);
    } else if (currentConversationId) {
      setMessages([WELCOME_MESSAGE]);
    }
  }, [savedMessages, currentConversationId]);

  // Update assistant message as content streams in
  useEffect(() => {
    if (currentAssistantId && streamContent) {
      setMessages(prev => 
        prev.map(msg => 
          msg.id === currentAssistantId 
            ? { ...msg, content: streamContent }
            : msg
        )
      );
    }
  }, [streamContent, currentAssistantId]);

  const handleNewChat = async () => {
    try {
      const doc = documents.find(d => d.id === selectedDocId);
      const title = doc ? `Chat - ${doc.file_name}` : "New Chat";
      const result = await createConversation.mutateAsync({ 
        title, 
        document_id: selectedDocId || null 
      });
      setCurrentConversationId(result.id);
      setMessages([WELCOME_MESSAGE]);
      reset();
    } catch (err) {
      toast.error("Failed to create new chat");
    }
  };

  const handleSelectConversation = (conv: any) => {
    setCurrentConversationId(conv.id);
    if (conv.document_id) {
      setSelectedDocId(conv.document_id);
    }
  };

  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteConversation.mutateAsync(id);
    if (currentConversationId === id) {
      setCurrentConversationId(null);
      setMessages([WELCOME_MESSAGE]);
    }
  };

  const handleVoiceToggle = async () => {
    if (isRecording) {
      try {
        const text = await stopRecording();
        if (text) {
          setInput(prev => prev ? `${prev} ${text}` : text);
          toast.success("Voice transcribed successfully!");
        }
      } catch {
        toast.error("Failed to transcribe voice");
      }
    } else {
      try {
        await startRecording();
        toast.info("🎤 Recording... Speak now!");
      } catch {
        toast.error("Failed to start recording");
      }
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newAttachments: Attachment[] = [];

    for (const file of Array.from(files)) {
      const fileType = file.type;
      const fileName = file.name.toLowerCase();
      
      let type: "image" | "pdf" | "docx";
      
      if (fileType.startsWith("image/")) {
        type = "image";
      } else if (fileType === "application/pdf" || fileName.endsWith(".pdf")) {
        type = "pdf";
      } else if (
        fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        fileName.endsWith(".docx") ||
        fileName.endsWith(".doc")
      ) {
        type = "docx";
      } else {
        toast.error(`Unsupported file type: ${file.name}`);
        continue;
      }

      const attachment: Attachment = {
        id: crypto.randomUUID(),
        type,
        name: file.name,
        file,
      };

      if (type === "image") {
        attachment.preview = URL.createObjectURL(file);
      }

      newAttachments.push(attachment);
    }

    setAttachments(prev => [...prev, ...newAttachments]);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => {
      const att = prev.find(a => a.id === id);
      if (att?.preview) {
        URL.revokeObjectURL(att.preview);
      }
      return prev.filter(a => a.id !== id);
    });
  };

  const extractTextFromAttachments = async (): Promise<string> => {
    if (attachments.length === 0) return "";

    setIsProcessingFile(true);
    let extractedText = "";

    try {
      for (const att of attachments) {
        const arrayBuffer = await att.file.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
        );

        const { data, error } = await supabase.functions.invoke("extract-chat-file", {
          body: {
            fileBase64: base64,
            fileType: att.type,
            fileName: att.name,
            mimeType: att.file.type,
          },
        });

        if (error) {
          console.error("File extraction error:", error);
          toast.error(`Failed to process ${att.name}`);
          continue;
        }

        if (data?.text) {
          extractedText += `\n\n[Content from ${att.name}]:\n${data.text}`;
        }
      }
    } catch (err) {
      console.error("Error extracting text:", err);
    } finally {
      setIsProcessingFile(false);
    }

    return extractedText;
  };

  const handleSend = async () => {
    if (!input.trim() && attachments.length === 0) return;
    if (!selectedDocId) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: "assistant",
        content: "⚠️ Please select a syllabus document first before asking questions.",
        timestamp: new Date(),
      }]);
      return;
    }

    // Create conversation if not exists
    let conversationId = currentConversationId;
    if (!conversationId) {
      try {
        const doc = documents.find(d => d.id === selectedDocId);
        const title = doc ? `Chat - ${doc.file_name}` : "New Chat";
        const result = await createConversation.mutateAsync({ 
          title, 
          document_id: selectedDocId 
        });
        conversationId = result.id;
        setCurrentConversationId(conversationId);
      } catch {
        toast.error("Failed to create conversation");
        return;
      }
    }

    let fullMessage = input.trim();
    if (attachments.length > 0) {
      const extractedText = await extractTextFromAttachments();
      if (extractedText) {
        fullMessage = `${fullMessage}\n\n${extractedText}`;
      }
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim() || `[Sent ${attachments.length} file(s)]`,
      timestamp: new Date(),
      attachments: [...attachments],
    };

    const assistantId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage, assistantMessage]);
    setCurrentAssistantId(assistantId);
    setInput("");
    setAttachments([]);
    reset();

    // Save user message
    await saveMessage.mutateAsync({
      conversation_id: conversationId,
      role: "user",
      content: userMessage.content,
      attachments: userMessage.attachments?.map(a => ({ name: a.name, type: a.type })),
    });

    const languageInstruction = language === "urdu" 
      ? "\n\n[IMPORTANT: Respond in Roman Urdu (Urdu written in English letters). Use simple language suitable for students.]"
      : "";
    
    const result = await generate({
      type: "qa",
      documentId: selectedDocId,
      userMessage: fullMessage + languageInstruction,
    });

    // Save assistant response
    if (result) {
      await saveMessage.mutateAsync({
        conversation_id: conversationId,
        role: "assistant",
        content: result,
      });
    }

    setCurrentAssistantId(null);
  };

  const selectedDoc = documents.find(d => d.id === selectedDocId);

  // Group conversations by date
  const groupConversationsByDate = () => {
    const groups: { label: string; items: typeof conversations }[] = [];
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const todayItems = conversations.filter(c => {
      const date = new Date(c.updated_at);
      return date.toDateString() === today.toDateString();
    });
    const yesterdayItems = conversations.filter(c => {
      const date = new Date(c.updated_at);
      return date.toDateString() === yesterday.toDateString();
    });
    const weekItems = conversations.filter(c => {
      const date = new Date(c.updated_at);
      return date > weekAgo && date.toDateString() !== today.toDateString() && date.toDateString() !== yesterday.toDateString();
    });
    const olderItems = conversations.filter(c => new Date(c.updated_at) <= weekAgo);

    if (todayItems.length) groups.push({ label: language === "urdu" ? "آج" : "Today", items: todayItems });
    if (yesterdayItems.length) groups.push({ label: language === "urdu" ? "کل" : "Yesterday", items: yesterdayItems });
    if (weekItems.length) groups.push({ label: language === "urdu" ? "7 دن" : "7 Days", items: weekItems });
    if (olderItems.length) groups.push({ label: language === "urdu" ? "پرانے" : "Older", items: olderItems });

    return groups;
  };

  const SidebarPanel = () => (
    <div className="flex-1 flex flex-col bg-card border-r border-border">
      {/* Sidebar Header */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">{t("chat.history")}</h2>
          <Button
            size="sm"
            onClick={handleNewChat}
            disabled={createConversation.isPending}
            className="h-8 gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            {t("chat.newChat")}
          </Button>
        </div>
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {conversationsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : conversations.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">
              {t("chat.noChats")}
            </p>
          ) : (
            groupConversationsByDate().map((group) => (
              <div key={group.label} className="mb-4">
                <p className="text-xs font-medium text-muted-foreground px-2 py-1.5">{group.label}</p>
                <div className="space-y-0.5">
                  {group.items.map((conv) => (
                    <div
                      key={conv.id}
                      onClick={() => handleSelectConversation(conv)}
                      className={cn(
                        "flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer group transition-colors",
                        currentConversationId === conv.id
                          ? "bg-primary/10"
                          : "hover:bg-muted/50"
                      )}
                    >
                      <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className={cn(
                        "flex-1 text-sm truncate",
                        currentConversationId === conv.id ? "text-primary font-medium" : "text-foreground"
                      )}>
                        {conv.title}
                      </span>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t("common.delete")} Chat</AlertDialogTitle>
                            <AlertDialogDescription>
                              {t("chat.deleteConfirm")}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={(e) => handleDeleteConversation(conv.id, e)}
                            >
                              {t("common.delete")}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );

  const getFileIcon = (type: Attachment["type"]) => {
    switch (type) {
      case "image":
        return <Image className="h-4 w-4" />;
      case "pdf":
        return <FileText className="h-4 w-4 text-red-500" />;
      case "docx":
        return <File className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <MainLayout>
      <div className="relative flex h-[calc(100svh-7rem)] lg:h-[calc(100vh-6rem)] gap-4">
        {/* Sidebar (Desktop) */}
        <div className={cn(
          "hidden lg:flex transition-all duration-300 flex-col shrink-0",
          sidebarOpen ? "w-72" : "w-0 overflow-hidden"
        )}>
          <SidebarPanel />
        </div>

        {/* Sidebar (Mobile overlay) */}
        {isMobile && sidebarOpen && (
          <div className="fixed inset-0 z-50">
            <button
              type="button"
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close chat history"
            />
            <div className="absolute inset-y-0 left-0 w-[85vw] max-w-sm p-4">
              <SidebarPanel />
            </div>
          </div>
        )}

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="mb-3 animate-fade-in shrink-0">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h1 className="font-display text-xl lg:text-2xl font-bold text-foreground">{t("chat.title")}</h1>
                <p className="mt-0.5 text-muted-foreground text-xs hidden sm:block">
                  {language === "urdu" ? "اپنے نصاب سے سوالات پوچھیں" : "Ask questions from your syllabus"}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="lg:hidden border-primary/20"
                  onClick={() => setSidebarOpen(true)}
                >
                  {t("chat.history")}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="hidden lg:inline-flex border-primary/20 h-9 w-9"
                  onClick={() => setSidebarOpen((v) => !v)}
                  title={sidebarOpen ? "Hide history" : "Show history"}
                >
                  {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>

          {/* Document Selection */}
          <Card className="mb-3 animate-slide-up border-primary/10 shrink-0">
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                  {docsLoading ? (
                    <Loader2 className="h-4 w-4 text-primary animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <Select value={selectedDocId} onValueChange={setSelectedDocId} disabled={docsLoading}>
                    <SelectTrigger className="border-primary/20 h-9">
                      <SelectValue placeholder={docsLoading ? "Loading documents..." : "Select syllabus document"} />
                    </SelectTrigger>
                    <SelectContent>
                      {readyDocs.length === 0 ? (
                        <SelectItem value="_none" disabled>
                          {pendingDocs.length > 0
                            ? "Documents processing…"
                            : "No documents. Upload syllabus first."}
                        </SelectItem>
                      ) : (
                        <>
                          {readyDocs.map((doc) => (
                            <SelectItem key={doc.id} value={doc.id}>
                              {doc.file_name}
                            </SelectItem>
                          ))}
                          {pendingDocs.map((doc) => (
                            <SelectItem key={doc.id} value={`pending-${doc.id}`} disabled>
                              {doc.file_name} (processing…)
                            </SelectItem>
                          ))}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                {selectedDoc && (
                  <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">
                    {selectedDoc.subject && <span className="capitalize">{selectedDoc.subject}</span>}
                    {selectedDoc.class_level && <span> • Class {selectedDoc.class_level}</span>}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Chat Container */}
          <Card className="flex-1 flex flex-col min-h-0 animate-slide-up border-primary/10 shadow-sm overflow-hidden">
            <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-accent/5 py-2.5 px-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent shadow-md">
                  <Bot className="h-4 w-4 text-primary-foreground" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold">TeachAI Assistant</CardTitle>
                  <CardDescription className="text-xs">
                    {language === "urdu" ? "آپ کے syllabus سے جواب دے رہا ہوں" : "Answering from your syllabus only"}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <ScrollArea className="flex-1 min-h-0">
              <div className="p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3 animate-fade-in",
                    message.role === "user" ? "flex-row-reverse" : ""
                  )}
                >
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground"
                    )}
                  >
                    {message.role === "user" ? (
                      <User className="h-4 w-4" />
                    ) : (
                      <Bot className="h-4 w-4" />
                    )}
                  </div>
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-4 py-3",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground rounded-tr-sm"
                        : "bg-secondary text-secondary-foreground rounded-tl-sm"
                    )}
                  >
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {message.attachments.map((att) => (
                          <div
                            key={att.id}
                            className="flex items-center gap-1 bg-background/20 rounded px-2 py-1 text-xs"
                          >
                            {att.preview ? (
                              <img src={att.preview} alt={att.name} className="h-8 w-8 rounded object-cover" />
                            ) : (
                              getFileIcon(att.type)
                            )}
                            <span className="max-w-[100px] truncate">{att.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-sm whitespace-pre-wrap">{message.content || "..."}</p>
                  </div>
                </div>
              ))}

              {isLoading && !streamContent && (
                <div className="flex gap-3 animate-fade-in">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="bg-secondary rounded-2xl rounded-tl-sm px-4 py-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}

                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Attachments Preview */}
            {attachments.length > 0 && (
              <div className="border-t px-4 py-2 bg-secondary/20">
                <div className="flex flex-wrap gap-2">
                  {attachments.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center gap-2 bg-background rounded-lg px-3 py-2 border"
                    >
                      {att.preview ? (
                        <img src={att.preview} alt={att.name} className="h-10 w-10 rounded object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded bg-secondary flex items-center justify-center">
                          {getFileIcon(att.type)}
                        </div>
                      )}
                      <span className="text-sm max-w-[120px] truncate">{att.name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => removeAttachment(att.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Input Area - Modern Design */}
            <div className="border-t p-3 bg-background/80 backdrop-blur-sm shrink-0">
              <div className="flex items-center gap-2 p-2 bg-secondary/50 rounded-xl border border-border">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf,.doc,.docx"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                />
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading || isProcessingFile}
                  title="Attach file"
                  className="h-9 w-9 rounded-lg hover:bg-background"
                >
                  <Paperclip className="h-4 w-4 text-muted-foreground" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleVoiceToggle}
                  disabled={isLoading || isTranscribing || isProcessingFile}
                  title={isRecording ? "Stop recording" : "Voice input"}
                  className={cn(
                    "h-9 w-9 rounded-lg",
                    isRecording ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : "hover:bg-background"
                  )}
                >
                  {isTranscribing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isRecording ? (
                    <MicOff className="h-4 w-4" />
                  ) : (
                    <Mic className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>

                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={isRecording ? "🎤 Listening..." : (language === "urdu" ? "اپنا سوال لکھیں..." : "Message TeachAI...")}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                  className="flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/60"
                  disabled={isLoading || isRecording || isProcessingFile}
                />

                <Button 
                  onClick={handleSend} 
                  disabled={(!input.trim() && attachments.length === 0) || isLoading || isRecording || isProcessingFile}
                  size="icon"
                  className="h-9 w-9 rounded-lg bg-primary hover:bg-primary/90 shrink-0"
                >
                  {isProcessingFile ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
