"use client";

import React from "react";
import Link from "next/link";
import { ShieldAlert, Globe, Share2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Footer() {
  return (
    <footer className="bg-card border-t py-12 mt-auto">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="col-span-1 md:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl">
              <ShieldAlert className="w-6 h-6 text-primary" />
              <span>CrimeReport</span>
            </Link>
            <p className="text-muted-foreground max-w-sm leading-relaxed">
              Empowering citizens to report crimes and visualize safety hotspots in real-time. 
              Working together for a safer community.
            </p>
            <div className="flex gap-4">
              <Button variant="ghost" size="icon" className="rounded-full">
                <Globe className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Share2 className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" className="rounded-full">
                <MessageCircle className="w-5 h-5" />
              </Button>
            </div>
          </div>
          
          <div className="space-y-4">
            <h4 className="font-semibold">Quick Links</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/map" className="hover:text-primary transition-colors">Safety Map</Link></li>
              <li><Link href="/report" className="hover:text-primary transition-colors">Report Incident</Link></li>
              <li><Link href="/about" className="hover:text-primary transition-colors">About Us</Link></li>
              <li><Link href="/contact" className="hover:text-primary transition-colors">Contact</Link></li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-primary transition-colors">Terms of Service</Link></li>
              <li><Link href="/disclaimer" className="hover:text-primary transition-colors">Disclaimer</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Crime Location Reporting System. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
