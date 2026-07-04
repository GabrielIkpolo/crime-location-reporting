"use client";

import React from "react";
import { PageTransition } from "@/components/ui/PageTransition";
import { Card, CardContent } from "@/components/ui/card";

export default function PrivacyPage() {
  return (
    <PageTransition>
      <div className="container mx-auto p-4 py-12 max-w-3xl space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Privacy Policy</h1>
          <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        <div className="prose prose-slate max-w-none space-y-6 text-muted-foreground leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">1. Data Collection</h2>
            <p>
              To prevent system abuse and ensure the integrity of safety reports, we collect minimal 
              technical metadata from every submission, including:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>IP Address:</strong> Used to identify and block malicious users or spam bots.</li>
              <li><strong>Device Fingerprint:</strong> Basic browser and device information (User-Agent).</li>
              <li><strong>Location Data:</strong> GPS coordinates provided by you to accurately mark incidents.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">2. Anonymous Reporting</h2>
            <p>
              When you choose to report anonymously, your name and email are not associated with the report. 
              However, our system still retains your IP and device metadata for security auditing purposes.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">3. Data Usage</h2>
            <p>
              Your data is used solely for the purpose of improving community safety. We do not sell 
              your personal data to third parties. Data may be shared with official security agencies 
              upon legal request.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">4. Data Retention</h2>
            <p>
              Reports are kept in our archives for audit and historical analysis. Publicly visible 
              reports are automatically filtered to only show those from the last 30 days to ensure 
              the map remains relevant.
            </p>
          </section>
        </div>
      </div>
    </PageTransition>
  );
}
