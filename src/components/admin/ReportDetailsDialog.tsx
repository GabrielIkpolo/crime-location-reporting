"use client";

import React from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MapPin, Calendar, AlertCircle, Info } from "lucide-react";
import { Report } from "@/types";

interface ReportDetailsDialogProps {
  report: Report | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ReportDetailsDialog({
  report,
  isOpen,
  onClose,
}: ReportDetailsDialogProps) {
  if (!report) return null;

  const isVideo = (url: string) => {
    if (!url) return false;
    return /\.(mp4|webm|ogg|mov|quicktime|m4v)$/i.test(url) || url.includes('/video/');
  };

  const isImage = (url: string) => {
    if (!url) return false;
    return /\.(jpg|jpeg|png|webp|gif|svg|avif)$/i.test(url) || url.includes('/image/');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <DialogTitle className="text-2xl font-bold uppercase tracking-tight">
                {report.type} Report
              </DialogTitle>
              <DialogDescription className="text-base">
                Report ID: <span className="font-mono text-xs">{report.id}</span>
              </DialogDescription>
            </div >
            <Badge 
              variant={report.status === "VERIFIED" ? "default" : "secondary"}
              className="text-sm"
            >
              {report.status}
            </Badge>
          </div >
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-2">
          <div className="space-y-6 pb-6">
            {/* Risk Level Section */}
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold">Incident Details</h3>
            </div >
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase font-medium">Risk Level</p>
                <Badge variant="outline" className={
                  report.riskLevel === "HIGH" ? "text-red-600 border-red-200 bg-red-50" :
                  report.riskLevel === "MEDIUM" ? "text-amber-600 border-amber-200 bg-amber-50" :
                  "text-green-600 border-green-200 bg-green-50"
                }>
                  {report.riskLevel}
                </Badge>
              </div >
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase font-medium">Reported At</p>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  {new Date(report.createdAt).toLocaleString()}
                </div >
              </div >
            </div >

            <Separator />

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase font-medium">Description</p>
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                {report.description}
              </p>
            </div >

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase font-medium">Location</p>
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span>{report.location.coordinates[1].toFixed(6)}, {report.location.coordinates[0].toFixed(6)}</span >
              </div >
            </div >

            <Separator />

            {/* Media Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold">Attached Media</h3>
              </div >
              
              {report.mediaUrls && report.mediaUrls.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {report.mediaUrls.map((url, index) => (
                    <div key={index} className="rounded-lg overflow-hidden border bg-muted/30 aspect-video flex items-center justify-center relative">
                      {isVideo(url) ? (
                        <video 
                          src={url} 
                          controls 
                          className="w-full h-full object-cover"
                        />
                      ) : isImage(url) ? (
                        <Image 
                          src={url} 
                          alt={`Report media ${index + 1}`} 
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="text-xs text-muted-foreground">Unsupported media type</div >
                      )}
                    </div >
                  ))}
                </div >
              ) : (
                <p className="text-sm text-muted-foreground italic">No media attached to this report.</p>
              )}
            </div >
          </div >
        </div >
      </DialogContent>
    </Dialog>
  );
}
