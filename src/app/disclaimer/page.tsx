"use client";

import React from "react";
import { PageTransition } from "@/components/ui/PageTransition";
import { AlertTriangle, Info, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function DisclaimerPage() {
  return (
    <PageTransition>
      <div className="container mx-auto p-4 py-12 max-w-3xl space-y-8">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 text-destructive mb-4">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight">Legal Disclaimer</h1>
          <p className="text-muted-foreground">Important information regarding the use of this system.</p>
        </div>

        <div className="space-y-6">
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2 text-destructive font-bold text-lg">
                <AlertTriangle className="w-5 h-5" />
                CRITICAL NOTICE
              </div>
              <p className="text-sm leading-relaxed">
                <strong>Crime Location Reporting System is NOT an emergency response tool.</strong><br />
                If you are in immediate danger, witnessing a crime in progress, or require urgent medical assistance, 
                do NOT use this app. Please contact your local emergency services (e.g., 911, 112, 999) immediately.
              </p>
            </CardContent>
          </Card>

          <div className="space-y-6 text-muted-foreground leading-relaxed">
            <section className="space-y-3">
              <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <Info className="w-5 h-5" /> Accuracy of Data
              </h3>
              <p>
                The reports displayed on the Public Safety Map are crowdsourced. While we implement verification 
                processes and "Community Alerts" to signal high-volume reports, we cannot guarantee the 
                absolute accuracy, timeliness, or authenticity of any specific report.
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <ShieldCheck className="w-5 h-5" /> Limitation of Liability
              </h3>
              <p>
                The developers and administrators of this system shall not be held liable for any losses, 
                damages, or injuries resulting from the use of the information provided by this application, 
                including but not limited to decisions made based on map hotspots or community warnings.
              </p>
            </section>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
