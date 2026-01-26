import { NextRequest, NextResponse } from "next/server"
import { db, promptLibrary } from "@/lib/db"
import { eq, asc } from "drizzle-orm"

// GET /api/prompts - Get all public prompts (for plugin)
export async function GET(request: NextRequest) {
  try {
    const prompts = await db
      .select()
      .from(promptLibrary)
      .where(eq(promptLibrary.isPublic, true))
      .orderBy(asc(promptLibrary.sortOrder), asc(promptLibrary.name))

    return NextResponse.json({
      prompts: prompts.map((p) => ({
        id: p.id,
        name: p.name,
        prompt: p.prompt,
        category: p.category,
        previewImageUrl: p.previewImageUrl,
      })),
    })
  } catch (error: any) {
    console.error("Prompts API error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
