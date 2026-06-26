import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/services/supabase";
import { toDbTire, fromDbTire } from "@/services/tireService";
import { Tire } from "@/lib/tireData";

export async function GET(req: NextRequest) {
  const supabase = getSupabase();

  if (!supabase) {
    return NextResponse.json({
      success: true,
      supabaseConfigured: false,
      tires: [],
      message: "Supabase is not configured. Please define NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY variables in the settings panel."
    }, { status: 200 }); // Status 200 allows frontend to handle missing credentials gracefully
  }

  try {
    const { data, error } = await supabase
      .from("tires")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) throw error;

    const tires = (data || []).map(fromDbTire);

    return NextResponse.json({
      success: true,
      tires
    });
  } catch (err: any) {
    console.error("GET tires database error:", err);
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
      message: "Supabase is not configured. Please define credentials in your environment."
    }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { action } = body;

    if (action === "save") {
      const tire: Tire = body.tire;
      if (!tire || !tire.id) {
        return NextResponse.json({ success: false, message: "Invalid tire object payload." }, { status: 400 });
      }

      const dbRow = toDbTire(tire);
      const { data, error } = await supabase
        .from("tires")
        .upsert(dbRow)
        .select();

      if (error) throw error;

      const updatedTire = data && data[0] ? fromDbTire(data[0]) : tire;

      return NextResponse.json({
        success: true,
        tire: updatedTire
      });

    } else if (action === "delete") {
      const id = body.id;
      if (!id) {
        return NextResponse.json({ success: false, message: "Tire ID is required." }, { status: 400 });
      }

      const { error } = await supabase
        .from("tires")
        .delete()
        .eq("id", id);

      if (error) throw error;

      return NextResponse.json({
        success: true
      });

    } else if (action === "bulk") {
      const { tires, replaceExisting } = body as { tires: Tire[]; replaceExisting: boolean };
      
      if (!Array.isArray(tires)) {
        return NextResponse.json({ success: false, message: "Tires array is required." }, { status: 400 });
      }

      // Convert to database rows
      const dbRows = tires.map(toDbTire);

      if (replaceExisting) {
        // Delete all current tires and insert the new ones
        const { error: deleteError } = await supabase
          .from("tires")
          .delete()
          .neq("id", "0"); // Delete everything except maybe a system ID, or just delete all rows

        if (deleteError) {
          // If we can't do neq because of wildcards, we can do a general delete:
          const { error: deleteErrorAll } = await supabase
            .from("tires")
            .delete()
            .gte("created_at", "1970-01-01T00:00:00Z"); // matching all since epoch
          
          if (deleteErrorAll) throw deleteErrorAll;
        }
      }

      // Supabase insert in batches of 100 to avoid request length errors, though usually it handles large chunks
      const chunkSize = 100;
      for (let i = 0; i < dbRows.length; i += chunkSize) {
        const chunk = dbRows.slice(i, i + chunkSize);
        const { error: insertError } = await supabase
          .from("tires")
          .upsert(chunk); // upsert is safer as it handles duplicate IDs gracefully

        if (insertError) throw insertError;
      }

      // Fetch fresh list
      const { data: refreshed, error: fetchError } = await supabase
        .from("tires")
        .select("*")
        .order("created_at", { ascending: true });

      if (fetchError) throw fetchError;

      const parsedTires = (refreshed || []).map(fromDbTire);

      return NextResponse.json({
        success: true,
        tires: parsedTires
      });

    } else {
      return NextResponse.json({ success: false, message: "Invalid action." }, { status: 400 });
    }

  } catch (err: any) {
    console.error("POST tires database error:", err);
    return NextResponse.json({
      success: false,
      message: "Database operation failed: " + err.message
    }, { status: 500 });
  }
}
