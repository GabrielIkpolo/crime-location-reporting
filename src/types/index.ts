import { UserRole as PrismaUserRole, ReportStatus as PrismaReportStatus, RiskLevel as PrismaRiskLevel } from "@prisma/client";

export type UserRoleType = PrismaUserRole;
export type UserRole = PrismaUserRole;
export type ReportStatusType = PrismaReportStatus;
export type ReportStatus = PrismaReportStatus;
export type RiskLevelType = PrismaRiskLevel;
export type RiskLevel = PrismaRiskLevel;

export interface GeoJSONPoint {
  type: "Point";
  coordinates: [number, number]; // [longitude, latitude]
}

export interface User {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: UserRoleType;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommunityAlert {
  id: string;
  type: string;
  description: string;
  location: GeoJSONPoint;
  status: ReportStatusType;
  riskLevel: RiskLevelType;
  reportCount: number;
  createdAt: Date;
}

export interface SystemSetting {
  id: string;
  key: string;
  value: string;
  updatedAt: Date;
}

export interface AdminUser {
  name: string | null;
  email: string | null;
}

export interface AdminLog {
  id: string;
  action: string;
  timestamp: Date;
  admin?: AdminUser;
  reportId?: string;
}

export interface Report {
  id: string;
  type: string;
  description: string;
  status: ReportStatusType;
  riskLevel: RiskLevelType;
  location: GeoJSONPoint;
  mediaUrls: string[];
  isAnonymous: boolean;
  confirmationCount: number;
  createdAt: Date;
  updatedAt?: Date;
}
