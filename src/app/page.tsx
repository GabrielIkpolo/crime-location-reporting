"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ShieldAlert, MapPin, Eye, ArrowRight } from "lucide-react";
import { PageTransition } from "@/components/ui/PageTransition";

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="p-8 bg-card rounded-2xl border shadow-sm hover:shadow-md transition-shadow space-y-4">
      <div className="w-14 h-14 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
        {icon}
      </div>
      <h3 className="text-xl font-semibold">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

export default function Home() {
  return (
    <PageTransition>
      <div className="flex flex-col min-h-screen">
        <section className="relative overflow-hidden py-24 lg:py-32 bg-background">
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-4xl mx-auto text-center space-y-8">
              <motion.div 
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Public Safety First</span>
              </motion.div>

              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-5xl lg:text-7xl font-extrabold tracking-tight"
              >
                Keeping Our Community <br />
                <span className="text-primary">Safe and Secure</span>
              </motion.h1>

              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="text-lg text-muted-foreground max-w-2xl mx-auto"
              >
                Real-time crime reporting and hotspot visualization. Report incidents 
                instantly or view high-risk areas to navigate your city safely.
              </motion.p>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
                className="flex flex-col sm:flex-row items-center justify-center gap-4"
              >
                <Link href="/report">
                  <Button size="lg" className="w-full sm:w-auto gap-2 px-8 py-6 text-lg">
                    <MapPin className="w-5 h-5" />
                    Report a Crime
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link href="/map">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto gap-2 px-8 py-6 text-lg">
                    <Eye className="w-5 h-5" />
                    View Safety Map
                  </Button>
                </Link>
              </motion.div>
            </div>
          </div>
          
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 opacity-20 pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500 rounded-full blur-[120px]" />
          </div>
        </section>

        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-3xl font-bold">How It Works</h2>
              <p className="text-muted-foreground">A simple process to improve community security</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <FeatureCard 
                icon={<MapPin className="w-8 h-8" />}
                title="Pinpoint Location"
                description="Use GPS to mark the exact location of an incident. Anonymous reporting is available."
              />
              <FeatureCard 
                icon={<ShieldAlert className="w-8 h-8" />}
                title="Official Verification"
                description="Security agencies verify reports to ensure data accuracy and prevent false alarms."
              />
              <FeatureCard 
                icon={<Eye className="w-8 h-8" />}
                title="Avoid Hotspots"
                description="View real-time heatmaps of crime-prone areas and plan your routes safely."
              />
            </div>
          </div>
        </section>
      </div>
    </PageTransition>
  );
}
