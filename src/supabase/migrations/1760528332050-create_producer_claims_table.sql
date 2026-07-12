/*
# Create producer claims table for brewery ownership claims

1. New Tables
   - `producer_claims_pf2025` - Producer ownership claims
     - `id` (uuid, primary key)
     - `user_id` (uuid, references profiles)
     - `producer_id` (uuid, references producers)
     - `producer_name` (text)
     - `business_license` (text, optional)
     - `tax_id` (text, optional)
     - `contact_email` (text)
     - `contact_phone` (text, optional)
     - `status` (text, default 'pending')
     - `admin_notes` (text, optional)
     - `reviewed_by` (uuid, optional, references profiles)
     - `reviewed_at` (timestamptz, optional)
     - `created_at` (timestamptz)
     - `updated_at` (timestamptz)

2. Security
   - Enable RLS on table
   - Users can read their own claims
   - Admins can read and update all claims
   - Users can create new claims
*/

-- Create producer claims table
CREATE TABLE IF NOT EXISTS producer_claims_pf2025 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  producer_id uuid,
  producer_name text NOT NULL,
  business_license text,
  tax_id text,
  contact_email text NOT NULL,
  contact_phone text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'under_review')),
  admin_notes text,
  reviewed_by uuid REFERENCES profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE producer_claims_pf2025 ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can read own claims" ON producer_claims_pf2025
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create claims" ON producer_claims_pf2025
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can read all claims" ON producer_claims_pf2025
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.type = 'Admin User'
    )
  );

CREATE POLICY "Admins can update claims" ON producer_claims_pf2025
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.type = 'Admin User'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.type = 'Admin User'
    )
  );

-- Update trigger
CREATE TRIGGER update_producer_claims_updated_at
    BEFORE UPDATE ON producer_claims_pf2025
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();