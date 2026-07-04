"use client";

import React, { useState } from "react";
import { PageTransition } from "@/components/ui/PageTransition";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Mail, Phone, MapPin, Send } from "lucide-react";

export default function ContactPage() {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success("Message sent successfully!");
    } catch (err: any) {
      toast.error("Failed to send message");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition>
      <div className="container mx-auto p-4 py-12 max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="space-y-8">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">Get in Touch</h1>
            <p className="text-muted-foreground text-lg">
              Have questions or feedback? We&apos;d love to hear from you.
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Mail className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold">Email Us</h3>
                <p className="text-muted-foreground">support@crimereport.gov</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Phone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold">Call Us</h3>
                <p className="text-muted-foreground">+1 (555) 123-4567</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold">Headquarters</h3>
                <p className="text-muted-foreground">123 Public Safety Plaza, Capital City</p>
              </div>
            </div>
          </div>
        </div>

        <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Send a Message</CardTitle>
            <CardDescription>We typically respond within 24-48 hours.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" placeholder="Your Name" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="your@email.com" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input id="subject" placeholder="How can we help?" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea 
                  id="message" 
                  placeholder="Your message..." 
                  className="min-h-[150px]" 
                  required 
                />
              </div>
              <Button type="submit" className="w-full gap-2 py-6" disabled={loading}>
                {loading ? "Sending..." : (
                  <>
                    Send Message <Send className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}
