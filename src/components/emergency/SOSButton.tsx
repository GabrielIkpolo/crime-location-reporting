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
 * Examples: "+2348012345678" → "2348012345678", "1-555-123-4567" → "15551234567"
 */
function formatPhoneForWhatsApp(phone: string): string {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, "");
  
  // If starts with 0, replace with country code prefix handling
  // For Nigerian numbers starting with 0, prepend 234
  if (cleaned.startsWith("0")) {
    const countryCodeMap: Record<string, string> = {
      "01": "234",   // Nigeria mobile
      "02": "234",   // Nigeria landline area code
      "03": "234",   // etc.
    };
    
    // Common Nigerian prefix mapping (simplified)
    if (cleaned.length >= 10 && cleaned[1] !== "9") {
      cleaned = "234" + cleaned.slice(1);
    } else if (!cleaned.startsWith("1") && !cleaned.startsWith("44")) {
      // Assume Nigerian number if it doesn't look like US/UK
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

  useEffect(() => {
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

    // Load SOS contacts from localStorage
    const stored = localStorage.getItem("crimereport-sos-contacts");
    if (stored) {
      try {
        setContacts(JSON.parse(stored));
      } catch {
        setContacts([]);
      }
    }
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

    if (contacts.length === 0) {
      toast.error("No emergency contacts configured", {
        description: "Add trusted contacts in Settings > Emergency.",
      });
      return;
    }

    // ========================================================================
    // FALLBACK CHAIN: Web Share API → WhatsApp → SMS → Email (Backend)
    // ========================================================================

    let alertSent = false;

    // 1. PRIMARY: Try Web Share API (user picks their preferred app)
    if (navigator.share) {
      try {
        await navigator.share({
          title: "🚨 Emergency SOS Alert",
          text: message,
          url: locationUrl,
        });
        alertSent = true;
        console.log("[SOS] Web Share API succeeded");
      } catch (err) {
        // User cancelled or share failed — continue to fallbacks
        console.log("[SOS] Web Share API skipped/failed:", err);
      }
    }

    // 2. SECONDARY: Send backend email alerts to ALL contacts
    if (!alertSent && location) {
      setSendingAlert(true);
      try {
        await fetch("/api/sos/alert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            latitude: location.lat,
            longitude: location.lng,
          }),
        });
        alertSent = true;
        toast.success("Email alerts sent to all contacts!", {
          description: "Your SOS email alerts have been delivered.",
        });
      } catch (error) {
        console.error("[SOS] Backend email failed:", error);
        // Continue with client-side fallbacks even if backend fails
      } finally {
        setSendingAlert(false);
      }
    }

    // 3. TERTIARY: WhatsApp for primary contact with phone number
    const primaryContact = contacts.find((c) => c.isPrimary) ?? contacts[0];
    
    if (primaryContact?.phone && !alertSent) {
      const formattedPhone = formatPhoneForWhatsApp(primaryContact.phone);
      
      // Try WhatsApp first (works on both mobile and desktop with web.whatsapp.com)
      try {
        const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, "_blank", "noopener,noreferrer");
        alertSent = true;
        console.log("[SOS] WhatsApp link opened for:", primaryContact.name);
      } catch {
        console.error("[SOS] WhatsApp failed");
      }
    }

    // 4. QUATERNARY: SMS fallback (works on mobile devices)
    if (primaryContact?.phone && !alertSent) {
      const formattedPhone = primaryContact.phone.replace(/\D/g, "");
      window.open(`sms:${formattedPhone}?body=${encodeURIComponent(message)}`, "_blank");
      alertSent = true;
      console.log("[SOS] SMS link opened for:", primaryContact.name);
    }

    // Show success modal
    if (alertSent) {
      toast.success("Emergency alert sent!", {
        description: `Alert sent to ${primaryContact?.name || "your contacts"}.`,
        duration: 5000,
      });
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

      {/* Confirmation Modal */}
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
                <p>📱 SMS — Opens your default messaging app</p>
                <p>💬 WhatsApp — Sends a message via WhatsApp</p>
                <p>📧 Email — Sends detailed alert with location</p>
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
