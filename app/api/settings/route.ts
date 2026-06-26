import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/services/supabase";

export async function GET(req: NextRequest) {
  const supabase = getSupabase();

  if (!supabase) {
    return NextResponse.json({
      success: true,
      supabaseConfigured: false,
      value: null,
      message: "Supabase is not configured."
    }, { status: 200 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");

    if (!key) {
      return NextResponse.json({ success: false, message: "Setting key is required." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("settings")
      .select("value")
      .eq("key", key)
      .single();

    if (error) {
      // If setting is not found, return empty value rather than failing
      if (error.code === "PGRST116") {
        return NextResponse.json({ success: true, value: null });
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      value: data?.value || null
    });
  } catch (err: any) {
    console.error("GET settings error:", err);
    return NextResponse.json({
      success: false,
      message: "Database error: " + err.message
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const supabase = getSupabase();

  if (!supabase) {
    return NextResponse.json({
      success: false,
      message: "Supabase is not configured."
    }, { status: 400 });
  }

  try {
    const { key, value } = await req.json();

    if (!key) {
      return NextResponse.json({ success: false, message: "Setting key and value are required." }, { status: 400 });
    }

    // Upsert key-value pair
    const { error } = await supabase
      .from("settings")
      .upsert({
        key,
        value,
        updated_at: new Date().toISOString()
      });

    if (error) throw error;

    return NextResponse.json({
      success: true
    });
  } catch (err: any) {
    console.error("POST settings error:", err);
    return NextResponse.json({
      success: false,
      message: "Database operation failed: " + err.message
    }, { status: 500 });
  }
}
