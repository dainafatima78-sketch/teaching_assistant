import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, FileText, Mic, MicOff, Paperclip, X, Image, File, Loader2, Plus, MessageSquare, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { useDocuments } from "@/hooks/useDocuments";
import { useTeachingAssistant } from "@/hooks/useTeachingAssistant";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { useChatConversations, useChatMessages, useCreateConversation, useDeleteConversation, useSaveMessage } from "@/hooks/useChatHistory";
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

  const processedDocs = documents.filter(doc => doc.extracted_content);

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

    const result = await generate({
      type: "qa",
      documentId: selectedDocId,
      userMessage: fullMessage,
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
      <div className="flex h-[calc(100vh-8rem)] gap-4">
        {/* Chat History Sidebar */}
        <div className={cn(
          "transition-all duration-300 flex flex-col",
          sidebarOpen ? "w-64" : "w-0 overflow-hidden"
        )}>
          <Card className="flex-1 flex flex-col border-primary/10">
            <CardHeader className="py-3 px-4 bg-primary/5 rounded-t-lg">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-primary">Chat History</CardTitle>
                <Button 
                  size="sm" 
                  onClick={handleNewChat}
                  disabled={createConversation.isPending}
                  className="h-8"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  New
                </Button>
              </div>
            </CardHeader>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {conversationsLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : conversations.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    No chats yet. Start a new conversation!
                  </p>
                ) : (
                  conversations.map((conv) => (
                    <div
                      key={conv.id}
                      onClick={() => handleSelectConversation(conv)}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-lg cursor-pointer group transition-colors",
                        currentConversationId === conv.id
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-secondary text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <MessageSquare className="h-4 w-4 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{conv.title}</p>
                        <p className="text-xs opacity-60">
                          {formatDistanceToNow(new Date(conv.updated_at), { addSuffix: true })}
                        </p>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Chat</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this chat? This action cannot be undone and all messages will be permanently removed.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={(e) => handleDeleteConversation(conv.id, e)}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </Card>
        </div>

        {/* Toggle Sidebar Button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-[calc(16rem+1rem)] top-24 z-10 h-6 w-6 rounded-full bg-background border shadow-sm"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{ left: sidebarOpen ? "calc(16rem + 1rem + 256px)" : "calc(16rem + 1rem)" }}
        >
          {sidebarOpen ? <ChevronLeft className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </Button>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col max-w-4xl">
          {/* Header */}
          <div className="mb-4 animate-fade-in">
            <h1 className="font-display text-3xl font-bold text-foreground">AI Chat Assistant</h1>
            <p className="mt-1 text-muted-foreground text-sm">
              Ask questions, upload files, or use voice input — answers from your syllabus only.
            </p>
          </div>

          {/* Document Selection */}
          <Card className="mb-4 animate-slide-up border-primary/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <FileText className="h-5 w-5 text-primary shrink-0" />
                <div className="flex-1">
                  <Select value={selectedDocId} onValueChange={setSelectedDocId}>
                    <SelectTrigger className="border-primary/20">
                      <SelectValue placeholder={docsLoading ? "Loading documents..." : "Select syllabus document"} />
                    </SelectTrigger>
                    <SelectContent>
                      {processedDocs.length === 0 ? (
                        <SelectItem value="_none" disabled>
                          No processed documents. Upload syllabus first.
                        </SelectItem>
                      ) : (
                        processedDocs.map((doc) => (
                          <SelectItem key={doc.id} value={doc.id}>
                            {doc.file_name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                {selectedDoc && (
                  <span className="text-sm text-muted-foreground shrink-0">
                    {selectedDoc.subject && <span className="capitalize">{selectedDoc.subject}</span>}
                    {selectedDoc.class_level && <span> • Class {selectedDoc.class_level}</span>}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Chat Container */}
          <Card className="flex-1 flex flex-col overflow-hidden animate-slide-up border-primary/10">
            <CardHeader className="border-b bg-secondary/30 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full gradient-primary">
                  <Bot className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <CardTitle className="text-base">TeachAI Assistant</CardTitle>
                  <CardDescription className="text-xs">
                    Answering from your uploaded syllabus only
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
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
            </CardContent>

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

            {/* Input Area */}
            <div className="border-t p-4 bg-background">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading || isProcessingFile}
                  title="Attach file (Image, PDF, DOCX)"
                  className="border-primary/20"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf,.doc,.docx"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                />

                <Button
                  variant={isRecording ? "destructive" : "outline"}
                  size="icon"
                  onClick={handleVoiceToggle}
                  disabled={isLoading || isTranscribing || isProcessingFile}
                  title={isRecording ? "Stop recording" : "Voice input"}
                  className={!isRecording ? "border-primary/20" : ""}
                >
                  {isTranscribing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isRecording ? (
                    <MicOff className="h-4 w-4" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </Button>

                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={isRecording ? "🎤 Listening..." : "Ask a question about your syllabus..."}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                  className="flex-1 border-primary/20"
                  disabled={isLoading || isRecording || isProcessingFile}
                />

                <Button 
                  onClick={handleSend} 
                  disabled={(!input.trim() && attachments.length === 0) || isLoading || isRecording || isProcessingFile}
                  className="bg-primary hover:bg-primary/90"
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
