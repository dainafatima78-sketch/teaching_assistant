import { useState, useEffect } from "react";
import { Settings as SettingsIcon, User, School, Save, Loader2, LogOut } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useTeacherProfile } from "@/hooks/useTeacherProfile";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Settings() {
  const { t } = useLanguage();
  const { data: profile, isLoading: profileLoading, refetch } = useTeacherProfile();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  
  const [fullName, setFullName] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setSchoolName(profile.school_name || "");
    }
  }, [profile]);

  const handleSave = async () => {
    if (!profile) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("teacher_profiles")
        .update({
          full_name: fullName,
          school_name: schoolName,
        })
        .eq("id", profile.id);

      if (error) throw error;
      
      await refetch();
      toast.success("Profile updated successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (profileLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="animate-fade-in">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <SettingsIcon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground">{t("settings.title")}</h1>
              <p className="text-muted-foreground">
                {t("settings.subtitle")}
              </p>
            </div>
          </div>
        </div>

        {/* Profile Settings */}
        <Card className="animate-slide-up border-primary/10">
          <CardHeader className="bg-primary/5 rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-primary">
              <User className="h-5 w-5" />
              {t("settings.profileInfo")}
            </CardTitle>
            <CardDescription>
              {t("settings.profileInfoDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2">
              <Label htmlFor="email">{t("settings.email")}</Label>
              <Input
                id="email"
                value={user?.email || ""}
                disabled
                className="bg-secondary/50"
              />
              <p className="text-xs text-muted-foreground">
                {t("settings.emailCantChange")}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName">{t("settings.fullName")}</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={t("settings.fullName")}
                className="border-primary/20 focus:border-primary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="schoolName">{t("settings.schoolName")}</Label>
              <Input
                id="schoolName"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder={t("settings.schoolName")}
                className="border-primary/20 focus:border-primary"
              />
            </div>

            <Button 
              onClick={handleSave} 
              disabled={isSaving}
              className="bg-primary hover:bg-primary/90"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {t("common.saveChanges")}
            </Button>
          </CardContent>
        </Card>

        {/* Account Settings */}
        <Card className="animate-slide-up border-primary/10" style={{ animationDelay: "100ms" }}>
          <CardHeader className="bg-primary/5 rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-primary">
              <School className="h-5 w-5" />
              {t("settings.account")}
            </CardTitle>
            <CardDescription>
              {t("settings.accountDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
                <div>
                  <p className="font-medium">{t("settings.accountCreated")}</p>
                  <p className="text-sm text-muted-foreground">
                    {profile?.created_at 
                      ? new Date(profile.created_at).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric"
                        })
                      : "N/A"
                    }
                  </p>
                </div>
              </div>

              <Separator />

              <div className="pt-2">
                <Button 
                  variant="destructive" 
                  onClick={handleSignOut}
                  className="w-full sm:w-auto"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  {t("settings.signOut")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
