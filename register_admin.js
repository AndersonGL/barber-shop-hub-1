import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://wjktlktslzfdelzavash.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indqa3Rsa3RzbHpmZGVsemF2YXNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNzM4NjksImV4cCI6MjA4Njk0OTg2OX0.TLbcQEvomeGR8padyfrW62OVVtPXgkeIBTYaWg-PvdE";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function registerAdmin() {
  console.log("Attempting to register admin@barber.shop...");

  const { data, error } = await supabase.auth.signUp({
    email: "admin@barber.shop",
    password: "password123",
  });

  if (error) {
    console.error("Error registering:", error.message);
    return;
  }

  if (data.user) {
    console.log("User registered successfully:", data.user.id);

    // Create profile
    const { error: profileError } = await supabase.from("profiles").insert({
      user_id: data.user.id,
      cnpj: "12.345.678/0001-95", // valid format
      company_name: "Admin Barber",
      phone: "11999999999",
      email: "admin@barber.shop",
    });

    if (profileError) {
      console.error("Error creating profile:", profileError.message);
    } else {
      console.log("Profile created successfully.");
    }
  } else {
    console.log(
      "Registration successful but no user returned (maybe email confirmation needed or already exists).",
    );
  }
}

registerAdmin();
