"use client";

import React from "react";
import { PageTransition } from "@/components/ui/PageTransition";

export default function TermsPage() {
  return (
    <PageTransition>
      <div className="container mx-auto p-4 py-12 max-w-3xl space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Terms of Use</h1>
          <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        <div className="prose prose-slate max-w-none space-y-6 text-muted-foreground leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">1. Disclaimer of Liability</h2>
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive-foreground font-medium">
              IMPORTANT: This application is a community-driven tool. It is NOT a replacement for 
              emergency services. In case of an active crime or emergency, please contact your 
              local police or emergency services (e.g., 911, 112) immediately.
            </div>
            <p>
              We do not guarantee the accuracy, completeness, or timeliness of the reports provided 
              by users. Use the information on the safety map at your own risk.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">2. User Conduct</h2>
            <p>
              By using this system, you agree to report only truthful incidents. The submission of 
              false reports, spam, or malicious content is strictly prohibited.
            </p>
            <p>
              We reserve the right to block IP addresses or user accounts that are found to be 
              abusing the system or attempting to manipulate safety hotspots.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">3. Content Ownership</h2>
            <p>
              By submitting a report, you grant the platform a non-exclusive, royalty-free license 
              to display that information publicly for the purpose of community safety.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">4. Modifications</h2>
            <p>
              We reserve the right to modify these terms at any time. Continued use of the service 
              constitutes acceptance of the updated terms.
            </p>
          </section>
        </div>
      </div>
    </PageTransition>
  );
}
