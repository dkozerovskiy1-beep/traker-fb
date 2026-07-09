import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";

/**
 * One-time cleanup endpoint to remove old campaign-level insight rows
 * that are duplicated by the new ad-level rows.
 * 
 * Call: GET /api/cleanup-insights
 * DELETE THIS FILE after running it once!
 */
export async function GET() {
  try {
    // Delete all rows where adsetId="null" AND adId="null"
    // These were created when insights were fetched at level=campaign
    const result = await db.dailyInsight.deleteMany({
      where: {
        adsetId: "null",
        adId: "null"
      }
    });

    return NextResponse.json({
      success: true,
      deletedRows: result.count,
      message: `Видалено ${result.count} старих рядків з level=campaign. Тепер дані коректні (тільки level=ad).`
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
