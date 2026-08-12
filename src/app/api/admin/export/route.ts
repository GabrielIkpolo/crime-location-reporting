import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

/**
 * GET /api/admin/export?format=csv&status=&riskLevel=&type=&startDate=&endDate=&page=&limit=
 * 
 * Export reports as CSV file for offline analysis.
 * Supports filtering by status, risk level, type, and date range.
 */

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "csv";
    
    // Only CSV supported for now (no external deps needed)
    if (format !== "csv") {
      return NextResponse.json(
        { error: "Only CSV format is currently supported" },
        { status: 400 }
      );
    }

    // Build filter query params
    const status = searchParams.get("status");
    const riskLevel = searchParams.get("riskLevel");
    const type = searchParams.get("type");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    
    // Pagination for large exports
    let page = parseInt(searchParams.get("page") || "1");
    let limit = parseInt(searchParams.get("limit") || "1000");
    limit = Math.min(limit, 10000); // Max 10k records per export

    // Build where clause
    const whereClause: any = {};

    if (status) {
      whereClause.status = status;
    }

    if (riskLevel) {
      whereClause.riskLevel = riskLevel;
    }

    if (type) {
      whereClause.type = type;
    }

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        whereClause.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        whereClause.createdAt.lte = new Date(endDate);
      }
    }

    // Fetch reports with reporter info
    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where: whereClause,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          reporter: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.report.count({ where: whereClause }),
    ]);

    // Generate CSV content
    const csvContent = generateCSV(reports);

    // Create response with proper headers for file download
    const filename = `crime-reports-export-${new Date().toISOString().split("T")[0]}.csv`;
    
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-cache",
      },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[Export] Error:", errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

/**
 * Generate CSV string from reports array.
 */
function generateCSV(reports: any[]): string {
  // CSV headers
  const headers = [
    "ID",
    "Type",
    "Description",
    "Status",
    "Risk Level",
    "Latitude",
    "Longitude",
    "Anonymous",
    "Reporter Name",
    "Reporter Email",
    "Media URLs",
    "Confirmation Count",
    "Created At",
    "Updated At",
  ];

  // Escape CSV values (handle commas, quotes, newlines)
  const escapeCSV = (value: any): string => {
    if (value === null || value === undefined) return "";
    
    const str = String(value);
    
    // If contains comma, quote, or newline, wrap in quotes and escape internal quotes
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    
    return str;
  };

  // Build CSV rows
  const rows = reports.map((report) => [
    escapeCSV(report.id),
    escapeCSV(report.type),
    escapeCSV(report.description),
    escapeCSV(report.status),
    escapeCSV(report.riskLevel),
    escapeCSV(report.location?.coordinates?.[1] || ""), // Latitude
    escapeCSV(report.location?.coordinates?.[0] || ""), // Longitude
    escapeCSV(report.isAnonymous ? "Yes" : "No"),
    escapeCSV(report.reporter?.name || "N/A"),
    escapeCSV(report.reporter?.email || "N/A"),
    escapeCSV(report.mediaUrls?.join("; ") || ""),
    escapeCSV(report.confirmationCount),
    escapeCSV(new Date(report.createdAt).toISOString()),
    escapeCSV(new Date(report.updatedAt).toISOString()),
  ]);

  // Combine headers and rows with proper line endings (CRLF for CSV standard)
  const csvLines = [headers.join(","), ...rows.map((row) => row.join(","))];
  
  return "\r\n" + csvLines.join("\r\n");
}
