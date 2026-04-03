-- RescueGrid Initial Schema
-- Phase 1.1 — Run in Supabase SQL Editor

-- 1. VICTIM_REPORT (no dependencies)
CREATE TABLE victim_report (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_no text NOT NULL,
  latitude float,
  longitude float,
  city text,
  district text,
  situation text NOT NULL,
  custom_message text,
  urgency text DEFAULT 'moderate',
  status text DEFAULT 'open',
  created_at timestamptz DEFAULT now()
);

-- 2. VOLUNTEER (no dependencies)
CREATE TABLE volunteer (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  mobile_no text UNIQUE NOT NULL,
  type text,
  latitude float,
  longitude float,
  skills text,
  equipment text,
  status text DEFAULT 'active',
  push_token text,
  last_seen timestamptz
);

-- 3. TASK_FORCE (assignment FK added after assignment table exists via ALTER)
CREATE TABLE task_force (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  dma_id text,
  status text DEFAULT 'active',
  assignment_id uuid,
  created_at timestamptz DEFAULT now()
);

-- 4. ASSIGNMENT (depends on volunteer, task_force, victim_report)
CREATE TABLE assignment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task text NOT NULL,
  location_label text,
  latitude float,
  longitude float,
  urgency text DEFAULT 'moderate',
  status text DEFAULT 'open',
  assigned_to_volunteer uuid REFERENCES volunteer(id),
  assigned_to_taskforce uuid REFERENCES task_force(id),
  victim_report_id uuid REFERENCES victim_report(id),
  timer timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 5. Close the circular FK: task_force → assignment
ALTER TABLE task_force
  ADD CONSTRAINT fk_tf_assignment FOREIGN KEY (assignment_id) REFERENCES assignment(id);

-- 6. TASK_FORCE_MEMBER (depends on task_force + volunteer)
CREATE TABLE task_force_member (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_force_id uuid NOT NULL REFERENCES task_force(id),
  volunteer_id uuid NOT NULL REFERENCES volunteer(id),
  member_type text,
  role text
);

-- 7. MESSAGE (depends on task_force, victim_report)
CREATE TABLE message (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  sender_type text NOT NULL,
  sender_id uuid,
  task_force_id uuid REFERENCES task_force(id),
  victim_report_id uuid REFERENCES victim_report(id),
  receiver_id uuid,
  is_flagged_for_dma boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  read_at timestamptz
);

-- 8. RESOURCE (no dependencies)
CREATE TABLE resource (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text,
  quantity float DEFAULT 0,
  low_stock_threshold float DEFAULT 0,
  unit text,
  owner_info text,
  location text,
  updated_at timestamptz DEFAULT now()
);
