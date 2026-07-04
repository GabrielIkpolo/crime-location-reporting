"use client";

import React from "react";
import { PageTransition } from "@/components/ui/PageTransition";
import { ShieldAlert, Globe, Users, HeartHandshake } from "lucide-react";

export default function AboutPage() {
  return (
    <PageTransition>
      <div className="container mx-auto p-4 py-12 max-w-4xl space-y-12">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight">About CrimeReport</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Empowering communities through real-time safety data and official verification.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4 p-6 bg-card rounded-2xl border shadow-sm">
            <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Globe className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-semibold">Our Vision</h3>
            <p className="text-muted-foreground leading-relaxed">
              We believe that public safety is a shared responsibility. By giving citizens a direct 
              voice and providing security agencies with precise, data-driven insights, we can 
              create safer neighborhoods and faster response times.
            </p>
          </div>

          <div className="space-y-4 p-6 bg-card rounded-2xl border shadow-sm">
            <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-semibold">Community-Driven</h3>
            <p className="text-muted-foreground leading-relaxed">
              Our unique crowdsourcing mechanism allows the community to warn others about potential 
              threats instantly, while official verification ensures that the data remains 
              trustworthy and accurate.
            </p>
          </div>
        </div>

        <div className="p-8 bg-muted/50 rounded-3xl border text-center space-y-4">
          <HeartHandshake className="w-12 h-12 text-primary mx-auto" />
          <h3 className="text-2xl font-bold">Join the Mission</h3>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Every report helps build a safer environment for everyone. Together, we can turn 
            data into action and action into safety.
          </p>
        </div>
      </div>
    </PageTransition>
  );
}
