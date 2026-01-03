
import { createClient } from '@supabase/supabase-js';

// Configuration
const SUPABASE_URL = 'https://bvcbqrldefvyonhvipjm.supabase.co';
// Note: In a real production environment, this key should be in process.env
// For this demo context, we assume the environment variable is populated
const SUPABASE_KEY = process.env.SUPABASE_KEY || ''; 

// Initialize Client
// We use a try-catch block or conditional to avoid crashing if key is missing in demo
const supabase = SUPABASE_KEY 
  ? createClient(SUPABASE_URL, SUPABASE_KEY) 
  : null;

export const addToWaitlist = async (email: string) => {
  if (!supabase) {
    console.warn("Supabase key missing. Simulating success.");
    await new Promise(r => setTimeout(r, 1000));
    return { success: true, message: "Demo mode: Email registered!" };
  }

  try {
    const { error } = await supabase
      .from('waitlist')
      .insert({ email });

    if (error) {
      if (error.code === '23505') { // Unique violation code
        return { success: false, message: "This email is already on the waitlist." };
      }
      throw error;
    }

    return { success: true, message: "You've been added to the waitlist!" };
  } catch (err: any) {
    console.error("Supabase Error:", err);
    return { success: false, message: "Something went wrong. Please try again." };
  }
};
