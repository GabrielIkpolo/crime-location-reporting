"use client";

import React, { useState, useEffect, useCallback } from "react";
import { PageTransition } from "@/components/ui/PageTransition";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  User,
  Mail,
  Bell,
  Lock,
  Phone,
  Plus,
  Trash2,
  Star,
  AlertTriangle,
  ShieldCheck,
  Globe,
  CheckCircle2,
  Loader2,
} from "lucide-react";

type TabKey = "profile" | "notifications" | "sos" | "security";

interface SosContact {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  isPrimary: boolean;
  createdAt: string;
}

interface NotificationPreferences {
  id: string;
  hotspotAlerts: boolean;
  statusChanges: boolean;
  communityWarnings: boolean;
  sosResponses: boolean;
  emailEnabled: boolean;
  pushEnabled: boolean;
  radiusKm: number;
}

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "profile", label: "Profile", icon: <User className="w-4 h-4" /> },
  { key: "notifications", label: "Notifications", icon: <Bell className="w-4 h-4" /> },
  { key: "sos", label: "Emergency Contacts", icon: <Phone className="w-4 h-4" /> },
  { key: "security", label: "Security", icon: <Lock className="w-4 h-4" /> },
];

export default function SettingsPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<TabKey>("profile");
  const [loading, setLoading] = useState(false);

  // Profile state
  const [profileData, setProfileData] = useState({
    name: session?.user?.name || "",
    email: session?.user?.email || "",
  });

  // SOS Contacts state
  const [sosContacts, setSosContacts] = useState<SosContact[]>([]);
  const [sosLoading, setSosLoading] = useState(true);
  const [newContact, setNewContact] = useState({ name: "", phone: "", email: "" });
  const [addingContact, setAddingContact] = useState(false);

  // Notification Preferences state
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [prefsLoading, setPrefsLoading] = useState(true);
  const [savingPrefs, setSavingPrefs] = useState(false);

  const fetchSosContacts = useCallback(async () => {
    try {
      const response = await fetch("/api/sos-contacts");
      if (response.ok) {
        const data: SosContact[] = await response.json();
        setSosContacts(data);
      }
    } catch (error) {
      console.error("Failed to fetch SOS contacts:", error);
    } finally {
      setSosLoading(false);
    }
  }, []);

  const fetchPreferences = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications/preferences");
      if (response.ok) {
        const data: NotificationPreferences = await response.json();
        setPreferences(data);
      }
    } catch (error) {
      console.error("Failed to fetch notification preferences:", error);
    } finally {
      setPrefsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "sos") fetchSosContacts();
    if (activeTab === "notifications") fetchPreferences();
  }, [activeTab, fetchSosContacts, fetchPreferences]);

  // Profile handler
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: profileData.name }),
      });

      if (response.ok) {
        toast.success("Profile updated successfully!");
      } else {
        const data = await response.json();
        throw new Error(data.error || "Failed to update profile");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred";
      console.error("[Settings] Unexpected error:", err);
      toast.error("Failed to update profile", { description: message });
    } finally {
      setLoading(false);
    }
  };

  // SOS Contact handlers
  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContact.name.trim()) return;

    setAddingContact(true);
    try {
      const response = await fetch("/api/sos-contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newContact.name.trim(),
          phone: newContact.phone.trim() || undefined,
          email: newContact.email.trim() || undefined,
          isPrimary: sosContacts.length === 0, // First contact is primary
        }),
      });

      if (response.ok) {
        const contact: SosContact = await response.json();
        setSosContacts((prev) => [contact, ...prev]);
        setNewContact({ name: "", phone: "", email: "" });
        toast.success("Emergency contact added!");
      } else {
        const data = await response.json();
        throw new Error(data.error || "Failed to add contact");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to add contact";
      toast.error("Failed to add contact", { description: message });
    } finally {
      setAddingContact(false);
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    try {
      const response = await fetch(`/api/sos-contacts/${contactId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setSosContacts((prev) => prev.filter((c) => c.id !== contactId));
        toast.success("Contact removed");
      } else {
        const data = await response.json();
        throw new Error(data.error || "Failed to remove contact");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to remove contact";
      toast.error("Failed to remove contact", { description: message });
    }
  };

  const handleSetPrimary = async (contactId: string) => {
    try {
      const response = await fetch(`/api/sos-contacts/${contactId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPrimary: true }),
      });

      if (response.ok) {
        setSosContacts((prev) =>
          prev.map((c) => ({ ...c, isPrimary: c.id === contactId }))
        );
        toast.success("Primary contact updated");
      } else {
        const data = await response.json();
        throw new Error(data.error || "Failed to update contact");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update contact";
      toast.error("Failed to update contact", { description: message });
    }
  };

  // Change Password handler
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [changePasswordData, setChangePasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handleChangePassword = async () => {
    if (
      !changePasswordData.currentPassword ||
      !changePasswordData.newPassword ||
      changePasswordData.newPassword.length < 8
    ) {
      toast.error("Invalid input", { description: "Please fill in all fields. New password must be at least 8 characters." });
      return;
    }
    if (changePasswordData.newPassword !== changePasswordData.confirmPassword) {
      toast.error("Passwords don't match", { description: "New password and confirmation must match." });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/user/change-password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: changePasswordData.currentPassword,
          newPassword: changePasswordData.newPassword,
        }),
      });

      if (response.ok) {
        toast.success("Password changed successfully!");
        setShowChangePassword(false);
        setChangePasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        const data = await response.json();
        throw new Error(data.error || "Failed to change password");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred";
      console.error("[Settings] Change password error:", err);
      toast.error("Failed to change password", { description: message });
    } finally {
      setLoading(false);
    }
  };

  // Delete Account handler
  const handleDeleteAccount = async () => {
    if (!window.confirm("⚠️ Are you absolutely sure? This action CANNOT be undone. All your data will be permanently deleted.")) {
      return;
    }

    const password = prompt("Please enter your password to confirm account deletion:");
    if (password === null) return; // User cancelled

    setLoading(true);
    try {
      const response = await fetch("/api/user/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmDelete: true, password }),
      });

      if (response.ok) {
        toast.success("Account deleted successfully.");
        // Sign out and redirect to home
        await fetch("/api/auth/signout", { method: "POST" });
        window.location.href = "/";
      } else {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete account");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred";
      console.error("[Settings] Delete account error:", err);
      toast.error("Failed to delete account", { description: message });
    } finally {
      setLoading(false);
    }
  };

  // Notification Preferences handlers
  const handleSavePreferences = async () => {
    if (!preferences) return;

    setSavingPrefs(true);
    try {
      const response = await fetch("/api/notifications/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotspotAlerts: preferences.hotspotAlerts,
          statusChanges: preferences.statusChanges,
          communityWarnings: preferences.communityWarnings,
          sosResponses: preferences.sosResponses,
          emailEnabled: preferences.emailEnabled,
          pushEnabled: preferences.pushEnabled,
          radiusKm: preferences.radiusKm,
        }),
      });

      if (response.ok) {
        toast.success("Notification preferences saved!");
      } else {
        const data = await response.json();
        throw new Error(data.error || "Failed to save preferences");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save preferences";
      toast.error("Failed to save preferences", { description: message });
    } finally {
      setSavingPrefs(false);
    }
  };

  return (
    <PageTransition>
      <div className="container mx-auto p-4 py-12 max-w-5xl space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your profile, notifications, and emergency contacts.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <Card className="shadow-sm">
              <CardContent className="flex flex-col gap-1 p-2">
                {TABS.map((tab) => (
                  <Button
                    key={tab.key}
                    variant={activeTab === tab.key ? "secondary" : "ghost"}
                    className={`justify-start gap-3 ${
                      activeTab === tab.key ? "font-medium" : ""
                    }`}
                    onClick={() => setActiveTab(tab.key)}
                  >
                    {tab.icon}
                    {tab.label}
                  </Button>
                ))}
              </CardContent>
            </Card>

            {/* SOS Quick Info Card */}
            <Card className="mt-4 border-orange-200 dark:border-orange-900/50 bg-orange-50 dark:bg-orange-950/20">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="font-semibold text-sm">Emergency Mode</span>
                </div>
                <p className="text-xs text-orange-600/80 dark:text-orange-400/70">
                  When you trigger SOS, alerts will be sent to your emergency contacts with your live location.
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                  <span>{sosContacts.length} contact{sosContacts.length !== 1 ? "s" : ""} configured</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Profile Tab */}
            {activeTab === "profile" && (
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>Update your public profile details.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleUpdateProfile} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="name"
                          value={profileData.name}
                          onChange={(e) =>
                            setProfileData({ ...profileData, name: e.target.value })
                          }
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          value={profileData.email}
                          disabled
                          className="pl-10 bg-muted"
                        />
                      </div>
                    </div>
                    <Button type="submit" disabled={loading}>
                      {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                      {loading ? "Saving..." : "Save Changes"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Notifications Tab */}
            {activeTab === "notifications" && (
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="w-5 h-5" />
                    Notification Preferences
                  </CardTitle>
                  <CardDescription>
                    Choose what notifications you want to receive and how.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                  {prefsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : preferences ? (
                    <>
                      {/* Notification Types */}
                      <div className="space-y-4">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                          Notification Types
                        </h3>
                        <div className="space-y-3">
                          {[
                            {
                              key: "hotspotAlerts" as const,
                              title: "Crime Hotspot Alerts",
                              desc: "Get notified when new crime hotspots are detected near you",
                            },
                            {
                              key: "statusChanges" as const,
                              title: "Report Status Updates",
                              desc: "Receive updates when your reports are verified or rejected",
                            },
                            {
                              key: "communityWarnings" as const,
                              title: "Community Warnings",
                              desc: "Alerts about dangerous areas reported by other users",
                            },
                            {
                              key: "sosResponses" as const,
                              title: "SOS Response Alerts",
                              desc: "Notifications about SOS emergency responses in your area",
                            },
                          ].map(({ key, title, desc }) => (
                            <div
                              key={key}
                              className="flex items-center justify-between p-4 rounded-xl border bg-card"
                            >
                              <div className="space-y-0.5">
                                <p className="text-sm font-medium">{title}</p>
                                <p className="text-xs text-muted-foreground">{desc}</p>
                              </div>
                              <Switch
                                checked={preferences[key]}
                                onCheckedChange={(val) =>
                                  setPreferences((prev) =>
                                    prev ? { ...prev, [key]: val } : prev
                                  )
                                }
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      <Separator />

                      {/* Delivery Method */}
                      <div className="space-y-4">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                          Delivery Method
                        </h3>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-4 rounded-xl border bg-card">
                            <div className="space-y-0.5">
                              <p className="text-sm font-medium">Push Notifications</p>
                              <p className="text-xs text-muted-foreground">
                                Receive notifications on your device
                              </p>
                            </div>
                            <Switch
                              checked={preferences.pushEnabled}
                              onCheckedChange={(val) =>
                                setPreferences((prev) =>
                                  prev ? { ...prev, pushEnabled: val } : prev
                                )
                              }
                            />
                          </div>
                          <div className="flex items-center justify-between p-4 rounded-xl border bg-card">
                            <div className="space-y-0.5">
                              <p className="text-sm font-medium">Email Notifications</p>
                              <p className="text-xs text-muted-foreground">
                                Receive important alerts via email
                              </p>
                            </div>
                            <Switch
                              checked={preferences.emailEnabled}
                              onCheckedChange={(val) =>
                                setPreferences((prev) =>
                                  prev ? { ...prev, emailEnabled: val } : prev
                                )
                              }
                            />
                          </div>
                        </div>
                      </div>

                      <Separator />

                      {/* Alert Radius */}
                      <div className="space-y-4">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                          Alert Radius
                        </h3>
                        <div className="p-4 rounded-xl border bg-card space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <p className="text-sm font-medium flex items-center gap-2">
                                <Globe className="w-4 h-4 text-primary" />
                                Distance Radius
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Notifications will only trigger for events within this radius
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                min={1}
                                max={50}
                                value={preferences.radiusKm}
                                onChange={(e) =>
                                  setPreferences((prev) =>
                                    prev
                                      ? {
                                          ...prev,
                                          radiusKm: Math.min(
                                            50,
                                            Math.max(1, parseInt(e.target.value) || 1)
                                          ),
                                        }
                                      : prev
                                  )
                                }
                                className="w-20 text-center"
                              />
                              <span className="text-sm text-muted-foreground">km</span>
                            </div>
                          </div>
                          <input
                            type="range"
                            min={1}
                            max={50}
                            value={preferences.radiusKm}
                            onChange={(e) =>
                              setPreferences((prev) =>
                                prev
                                  ? { ...prev, radiusKm: parseInt(e.target.value) }
                                  : prev
                              )
                            }
                            className="w-full accent-primary"
                          />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>1 km</span>
                            <span>50 km</span>
                          </div>
                        </div>
                      </div>

                      {/* Save Button */}
                      <div className="flex justify-end pt-2">
                        <Button onClick={handleSavePreferences} disabled={savingPrefs}>
                          {savingPrefs ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                          )}
                          {savingPrefs ? "Saving..." : "Save Preferences"}
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      Failed to load notification preferences
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* SOS Emergency Contacts Tab */}
            {activeTab === "sos" && (
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="w-5 h-5 text-destructive" />
                    SOS Emergency Contacts
                  </CardTitle>
                  <CardDescription>
                    Trusted contacts who will receive your location during an SOS emergency.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Add Contact Form */}
                  <div className="p-4 rounded-xl border-2 border-dashed border-muted-foreground/20 bg-muted/20">
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      Add Emergency Contact
                    </h3>
                    <form onSubmit={handleAddContact} className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="contact-name" className="text-xs">
                            Name *
                          </Label>
                          <Input
                            id="contact-name"
                            placeholder="John Doe"
                            value={newContact.name}
                            onChange={(e) =>
                              setNewContact({ ...newContact, name: e.target.value })
                            }
                            required
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="contact-phone" className="text-xs">
                            Phone
                          </Label>
                          <Input
                            id="contact-phone"
                            placeholder="+234 800 000 0000"
                            value={newContact.phone}
                            onChange={(e) =>
                              setNewContact({ ...newContact, phone: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="contact-email" className="text-xs">
                            Email
                          </Label>
                          <Input
                            id="contact-email"
                            type="email"
                            placeholder="john@example.com"
                            value={newContact.email}
                            onChange={(e) =>
                              setNewContact({ ...newContact, email: e.target.value })
                            }
                          />
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <Button
                          type="submit"
                          disabled={addingContact || !newContact.name.trim()}
                          size="sm"
                        >
                          {addingContact ? (
                            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                          ) : (
                            <Plus className="w-3.5 h-3.5 mr-1.5" />
                          )}
                          {addingContact ? "Adding..." : "Add Contact"}
                        </Button>
                      </div>
                    </form>
                  </div>

                  {/* Contacts List */}
                  {sosLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : sosContacts.length === 0 ? (
                    <div className="text-center py-8 space-y-2">
                      <Phone className="w-10 h-10 mx-auto text-muted-foreground/40" />
                      <p className="text-sm text-muted-foreground">
                        No emergency contacts added yet
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Add at least one contact to receive SOS alerts
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {sosContacts.map((contact) => (
                        <div
                          key={contact.id}
                          className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${
                            contact.isPrimary
                              ? "border-primary/30 bg-primary/5 dark:bg-primary/10"
                              : "hover:bg-muted/30"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {/* Primary Badge */}
                            {contact.isPrimary && (
                              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                                <Star className="w-4 h-4 fill-current" />
                              </div>
                            )}
                            <div className="space-y-0.5">
                              <p className="text-sm font-medium flex items-center gap-2">
                                {contact.name}
                                {contact.isPrimary && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                                    PRIMARY
                                  </span>
                                )}
                              </p>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                {contact.phone && (
                                  <span className="flex items-center gap-1">
                                    <Phone className="w-3 h-3" />
                                    {contact.phone}
                                  </span>
                                )}
                                {contact.email && (
                                  <span className="flex items-center gap-1">
                                    <Mail className="w-3 h-3" />
                                    {contact.email}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            {!contact.isPrimary && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSetPrimary(contact.id)}
                                className="h-8 px-2 text-xs gap-1"
                                title="Set as primary"
                              >
                                <Star className="w-3.5 h-3.5" />
                                Primary
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteContact(contact.id)}
                              title="Remove contact"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}

                      {/* Info */}
                      <div className="p-3 rounded-lg bg-muted/30 text-xs text-muted-foreground space-y-1">
                        <p className="font-medium">How SOS works:</p>
                        <ul className="list-disc list-inside space-y-0.5 ml-1">
                          <li>Trigger the SOS button in an emergency</li>
                          <li>Your live location will be shared with all contacts</li>
                          <li>Primary contact receives priority alerts</li>
                          <li>Messages include GPS coordinates and a map link</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Security Tab */}
            {activeTab === "security" && (
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="w-5 h-5" />
                    Security
                  </CardTitle>
                  <CardDescription>
                    Manage your account security settings.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Password Change */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                      Password
                    </h3>
                    {!showChangePassword ? (
                      <div className="p-4 rounded-xl border bg-card space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">Change Password</p>
                            <p className="text-xs text-muted-foreground">
                              Update your password regularly for better security
                            </p>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => setShowChangePassword(true)}>
                            Change Password
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl border bg-card space-y-3">
                        <div className="space-y-2">
                          <Label htmlFor="currentPassword">Current Password</Label>
                          <Input
                            id="currentPassword"
                            type="password"
                            value={changePasswordData.currentPassword}
                            onChange={(e) => setChangePasswordData({ ...changePasswordData, currentPassword: e.target.value })}
                            placeholder="Enter current password"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="newPassword">New Password</Label>
                          <Input
                            id="newPassword"
                            type="password"
                            value={changePasswordData.newPassword}
                            onChange={(e) => setChangePasswordData({ ...changePasswordData, newPassword: e.target.value })}
                            placeholder="Enter new password (min 8 characters)"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
                          <Input
                            id="confirmNewPassword"
                            type="password"
                            value={changePasswordData.confirmPassword}
                            onChange={(e) => setChangePasswordData({ ...changePasswordData, confirmPassword: e.target.value })}
                            placeholder="Confirm new password"
                          />
                        </div>
                        <div className="flex gap-2 pt-2">
                          <Button size="sm" onClick={handleChangePassword} disabled={loading}>
                            {loading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />}
                            Update Password
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => { setShowChangePassword(false); setChangePasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" }); }}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Two-Factor Auth */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                      Two-Factor Authentication
                    </h3>
                    <div className="p-4 rounded-xl border bg-card space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">2FA (Coming Soon)</p>
                          <p className="text-xs text-muted-foreground">
                            Add an extra layer of security to your account
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          Coming Soon
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Account Actions */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                      Account Actions
                    </h3>
                    <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-destructive">Delete Account</p>
                          <p className="text-xs text-muted-foreground">
                            Permanently delete your account and all associated data
                          </p>
                        </div>
                        <Button variant="destructive" size="sm" onClick={handleDeleteAccount} disabled={loading}>
                          {loading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5 mr-1.5" />}
                          Delete Account
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}

// Badge component (inline to avoid import issues)
function Badge({
  variant = "default",
  className = "",
  children,
}: {
  variant?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const baseClasses =
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors";
  const variantClasses: Record<string, string> = {
    default: "bg-primary text-primary-foreground",
    outline: "border border-input bg-background",
    secondary: "bg-secondary text-secondary-foreground",
    destructive: "bg-destructive text-destructive-foreground",
  };

  return (
    <span className={`${baseClasses} ${variantClasses[variant] || variantClasses.default} ${className}`}>
      {children}
    </span>
  );
}
