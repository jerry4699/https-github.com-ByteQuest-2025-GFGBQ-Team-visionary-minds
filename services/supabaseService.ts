
import { createClient } from '@supabase/supabase-js';

// Configuration
// Derived from your connection string: db.bvcbqrldefvyonhvipjm.supabase.co
const SUPABASE_URL = 'https://bvcbqrldefvyonhvipjm.supabase.co';

// IMPORTANT: Do NOT use the postgres connection string password here.
// You must use the "anon" / "public" key from your Supabase Dashboard > Project Settings > API.
const SUPABASE_KEY = process.env.SUPABASE_KEY || ''; 

// Initialize Client
const supabase = SUPABASE_KEY 
  ? createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        persistSession: false // Optimization: No need to persist session for a public waitlist form
      }
    }) 
  : null;

export const addToWaitlist = async (email: string) => {
  if (!supabase) {
    console.warn("Supabase key missing. Using simulation mode.");
    // Simulate network delay
    await new Promise(r => setTimeout(r, 1500));
    return { success: true, message: "Simulation: Email registered successfully!" };
  }

  try {
    const { error } = await supabase
      .from('waitlist')
      .insert({ email });

    if (error) {
      // Postgres error code 23505 is for unique constraint violations
      if (error.code === '23505') { 
        return { success: false, message: "You are already on the waitlist!" };
      }
      console.error("Supabase Insert Error:", error);
      return { success: false, message: "Unable to join at the moment. Please try again." };
    }

    return { success: true, message: "Welcome aboard! You've been added to the pilot waitlist." };
  } catch (err: any) {
    console.error("Unexpected Error:", err);
    return { success: false, message: "Something went wrong. Please check your connection." };
  }
};
