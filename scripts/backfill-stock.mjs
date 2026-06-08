import { createClient } from "@supabase/supabase-js"

const supabaseUrl = "https://maltdmkjsrnnvwtnblvr.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hbHRkbWtqc3JubnZ3dG5ibHZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMjYyNDQsImV4cCI6MjA5NTkwMjI0NH0.hPt57tgCgxlkdhS2XqgxX-L7C5jwnBx3GqWNYP3mTXM"

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function run() {
  // 0. Sign in as admin
  const { error: authErr } = await supabase.auth.signInWithPassword({
    email: "admin@antigravity.lk",
    password: "admin123",
  })
  if (authErr) {
    console.error("Failed to sign in:", authErr.message)
    process.exit(1)
  }
  console.log("Signed in as admin")

  // 1. Get all products
  const { data: products, error } = await supabase
    .from("products")
    .select("id, code, name")

  if (error || !products) {
    console.error("Failed to fetch products:", error?.message)
    process.exit(1)
  }

  console.log(`Found ${products.length} products`)

  // 2. Delete existing starting_stock movements
  const { error: delErr } = await supabase
    .from("stock_movements")
    .delete()
    .eq("reference_type", "starting_stock")

  if (delErr) {
    console.error("Failed to delete existing starting_stock:", delErr.message)
    process.exit(1)
  }

  console.log("Deleted existing starting_stock movements")

  // 3. Insert starting_stock for all products: qty=100
  const movements = products.map((p) => ({
    product_id: p.id,
    type: "in",
    quantity: 100,
    reference_type: "starting_stock",
    notes: "Opening stock: 100 units",
    created_at: new Date().toISOString(),
  }))

  const { error: insErr } = await supabase
    .from("stock_movements")
    .insert(movements)

  if (insErr) {
    console.error("Failed to insert stock movements:", insErr.message)
    process.exit(1)
  }

  console.log(`Inserted starting_stock for ${movements.length} products`)

  // 4. Update all products: cost_price=150.00, current_stock=100
  const { error: updErr } = await supabase
    .from("products")
    .update({ cost_price: 150.00, current_stock: 100 })
    .not("id", "is", null)

  if (updErr) {
    console.error("Failed to update products:", updErr.message)
    process.exit(1)
  }

  console.log("Updated all products: cost_price=150.00, current_stock=100")
  console.log("Done!")
}

run()
