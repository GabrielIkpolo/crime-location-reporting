"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Phone, Mail, X, CheckCircle2, Smartphone, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface SosContact {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  isPrimary?: boolean;
}

/**
 * Format a phone number for WhatsApp deep link.
 * WhatsApp requires international format without +, -, or spaces.
 */
function formatPhoneForWhatsApp(phone: string): string {
  let cleaned = phone.replace(/\D/g, "");
  
  if (cleaned.startsWith("0")) {
    if (cleaned.length >= 10 && cleaned[1] !== "9") {
      cleaned = "234" + cleaned.slice(1);
    } else if (!cleaned.startsWith("1") && !cleaned.startsWith("44")) {
      cleaned = "234" + cleaned.slice(1);
    }
  }
  
  return cleaned;
}

/**
 * Build the emergency message with location.
 */
function buildEmergencyMessage(locationUrl: string): string {
  return `🚨 EMERGENCY ALERT - I NEED HELP NOW! 🚨\n\n` +
    `My current location:\n${locationUrl}\n\n` +
    `Please contact me immediately or call emergency services if needed.\n\n` +
    `- Sent via CrimeReport SOS`;
}

export function SOSButton() {
  const [isActive, setIsActive] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showContactsModal, setShowContactsModal] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [contacts, setContacts] = useState<SosContact[]>([]);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [sendingAlert, setSendingAlert] = useState(false);

  // Load SOS contacts from the API (database) instead of localStorage
  useEffect(() => {
    async function loadContacts() {
      try {
        const response = await fetch("/api/sos-contacts");
        if (response.ok) {
          const data: SosContact[] = await response.json();
          setContacts(data);
        }
      } catch (error) {
        console.error("[SOS] Failed to load contacts:", error);
      }
    }

    // Get initial location
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        setLocation(null);
      },
      { enableHighAccuracy: true }
    );

    loadContacts();
  }, []);

  const startSOS = useCallback(() => {
    setIsActive(true);
    setShowModal(false);
    setShowContactsModal(false);
    setCountdown(5);
  }, []);

  useEffect(() => {
    if (!isActive || countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [isActive, countdown]);

  useEffect(() => {
    if (countdown === 0 && isActive) {
      sendEmergencyAlert();
    }
  }, [countdown, isActive]);

  const sendEmergencyAlert = async () => {
    setIsActive(false);
    setShowModal(true);
    setCountdown(5);

    const locationUrl = location
      ? `https://maps.google.com/?q=${location.lat},${location.lng}`
      : "Location unavailable";

    const message = buildEmergencyMessage(locationUrl);

    // Check if we have contacts from the database
    if (contacts.length === 0) {
      setShowModal(false);
      setShowContactsModal(true);
      return;
    }

    let alertSent = false;
    let emailSuccessCount = 0;
    const primaryContact = contacts.find((c) => c.isPrimary) ?? contacts[0];

    // ========================================================================
    // ORDERED FALLBACK CHAIN: Email → WhatsApp → SMS
    // ========================================================================

    // STEP 1: Send backend email alerts to ALL contacts (PRIMARY METHOD)
    setSendingAlert(true);
    try {
      const response = await fetch("/api/sos/alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: location?.lat || 0,
          longitude: location?.lng || 0,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        emailSuccessCount = data.contacts?.filter((c: any) => c.status === "sent").length || 0;
        alertSent = true;
        console.log("[SOS] Email alerts sent successfully to", emailSuccessCount, "contacts");
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error("[SOS] Backend email failed:", errorData);
      }
    } catch (error) {
      console.error("[SOS] Backend email exception:", error);
    } finally {
      setSendingAlert(false);
    }

    // STEP 2: WhatsApp for primary contact with phone number
    if (primaryContact?.phone && !alertSent) {
      const formattedPhone = formatPhoneForWhatsApp(primaryContact.phone);
      
      try {
        const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, "_blank", "noopener,noreferrer");
        alertSent = true;
        console.log("[SOS] WhatsApp link opened for:", primaryContact.name);
      } catch {
        console.error("[SOS] WhatsApp failed");
      }
    }

    // STEP 3: SMS fallback (works on mobile devices)
    if (primaryContact?.phone && !alertSent) {
      const formattedPhone = primaryContact.phone.replace(/\D/g, "");
      window.open(`sms:${formattedPhone}?body=${encodeURIComponent(message)}`, "_blank");
      alertSent = true;
      console.log("[SOS] SMS link opened for:", primaryContact.name);
    }

    // Show success modal if any method succeeded
    if (alertSent || emailSuccessCount > 0) {
      setShowModal(true);
    } else {
      toast.warning("Could not send alerts automatically", {
        description: "Please manually contact your emergency contacts.",
      });
    }
  };

  const cancelSOS = () => {
    setIsActive(false);
    setCountdown(5);
  };

  return (
    <>
      {/* Floating SOS Button */}
      <motion.div
        className="fixed bottom-6 right-6 z-[9999] flex flex-col items-center gap-2"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 1, type: "spring", stiffness: 200 }}
      >
        <AnimatePresence>
          {isActive && (
            <motion.div
              className="absolute -top-4 px-3 py-1 bg-destructive text-white text-xs font-bold rounded-full shadow-lg"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {countdown}s
            </motion.div>
          )}
        </AnimatePresence>

        <Button
          onClick={isActive ? cancelSOS : startSOS}
          className={`w-16 h-16 rounded-full shadow-2xl text-lg font-extrabold transition-all ${
            isActive
              ? "bg-destructive hover:bg-destructive/90 animate-pulse ring-4 ring-red-300"
              : "bg-gradient-to-br from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 hover:scale-110 active:scale-95"
          }`}
          aria-label="Emergency SOS Button"
        >
          <AlertTriangle className={`w-8 h-8 ${isActive ? "text-white" : "text-white"}`} />
        </Button>

        {!isActive && (
          <span className="text-[10px] font-bold text-muted-foreground bg-background/90 px-2 py-0.5 rounded-full shadow-sm backdrop-blur-sm">
            SOS
          </span>
        )}
      </motion.div>

      {/* Confirmation Modal — Emergency Alert Sent */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-background rounded-2xl p-8 max-w-sm w-full shadow-2xl border"
            >
              <div className="flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full mx-auto mb-4">
                {sendingAlert ? (
                  <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                )}
              </div>

              <h3 className="text-xl font-bold text-center mb-2">Emergency Alert Sent</h3>
              <p className="text-sm text-muted-foreground text-center mb-4">
                {sendingAlert
                  ? "Sending email alerts to your contacts..."
                  : "Your location and emergency alert have been sent to your trusted contacts."}
              </p>

              {location && (
                <a
                  href={`https://maps.google.com/?q=${location.lat},${location.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center text-sm text-primary underline mb-4 hover:no-underline py-2 px-3 rounded-lg bg-muted/50"
                >
                  📍 View Location on Google Maps
                </a>
              )}

              <Button onClick={() => setShowModal(false)} className="w-full">
                Close
              </Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Contacts Info Modal (shown when no contacts) */}
      <AnimatePresence>
        {showContactsModal && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-background rounded-2xl p-8 max-w-sm w-full shadow-2xl border"
            >
              <div className="flex items-center justify-center w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full mx-auto mb-4">
                <Smartphone className="w-8 h-8 text-yellow-600" />
              </div>

              <h3 className="text-xl font-bold text-center mb-2">No Emergency Contacts</h3>
              <p className="text-sm text-muted-foreground text-center mb-4">
                Add trusted contacts in Settings → Emergency to receive SOS alerts.
              </p>

              <div className="space-y-2 text-sm text-muted-foreground mb-6">
                <p>📧 Email — Sends detailed alert with location</p>
                <p>💬 WhatsApp — Sends a message via WhatsApp</p>
                <p>📱 SMS — Opens your default messaging app</p>
              </div>

              <Button onClick={() => setShowContactsModal(false)} className="w-full">
                Got it
              </Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
