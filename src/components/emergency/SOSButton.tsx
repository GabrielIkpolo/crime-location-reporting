"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Phone, Mail, X, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface SosContact {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
}

export function SOSButton(): JSX.Element {
  const [isActive, setIsActive] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [contacts, setContacts] = useState<SosContact[]>([]);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        setLocation(null);
      },
      { enableHighAccuracy: true }
    );

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

    const locationString = location
      ? `https://maps.google.com/?q=${location.lat},${location.lng}`
      : "Location unavailable";

    const message = encodeURIComponent(
      `EMERGENCY ALERT: I need help now.\n\nLocation: ${locationString}\n\nPlease contact me immediately.`
    );

    if (contacts.length === 0) {
      toast.error("No emergency contacts configured", {
        description: "Add trusted contacts in Settings > Emergency.",
      });
      return;
    }

    const primaryContact = contacts.find((c) => c.isPrimary) ?? contacts[0];

    if (primaryContact.phone) {
      window.open(`sms:${primaryContact.phone}?body=${message}`, "_blank");
    }

    if (primaryContact.email) {
      window.open(
        `mailto:${encodeURIComponent(primaryContact.email)}?subject=${encodeURIComponent("EMERGENCY ALERT - Need Help Now!")}&body=${message}`,
        "_blank"
      );
    }

    toast.success("Emergency alert sent!", {
      description: `Alert sent to ${primaryContact.name}.`,
      duration: 5000,
    });
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
              className="absolute -top-4 px-3 py-1 bg-destructive text-white text-xs font-bold rounded-full"
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
              ? "bg-destructive hover:bg-destructive/90 animate-pulse"
              : "bg-red-600 hover:bg-red-700 hover:scale-110"
          }`}
          aria-label="Emergency SOS Button"
        >
          <AlertTriangle className={`w-8 h-8 ${isActive ? "text-white" : "text-white"}`} />
        </Button>

        {!isActive && (
          <span className="text-[10px] font-bold text-muted-foreground bg-background/90 px-2 py-0.5 rounded-full shadow-sm">
            SOS
          </span>
        )}
      </motion.div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-background rounded-2xl p-8 max-w-sm mx-4 shadow-2xl border"
            >
              <div className="flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>

              <h3 className="text-xl font-bold text-center mb-2">Emergency Alert Sent</h3>
              <p className="text-sm text-muted-foreground text-center mb-6">
                Your location and emergency alert have been sent to your trusted contacts.
              </p>

              {location && (
                <a
                  href={`https://maps.google.com/?q=${location.lat},${location.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center text-sm text-primary underline mb-4 hover:no-underline"
                >
                  View Location on Google Maps
                </a>
              )}

              <Button onClick={() => setShowModal(false)} className="w-full">
                Close
              </Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
