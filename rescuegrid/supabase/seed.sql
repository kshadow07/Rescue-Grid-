-- RescueGrid Seed Data
-- Phase 1.4 — Run after 001_initial_schema.sql

-- Volunteers (4)
INSERT INTO volunteer (id, name, mobile_no, type, status, skills, equipment) VALUES
  ('a1111111-1111-1111-1111-111111111111', 'Rajesh Kumar', '+919876543210', 'individual', 'active', 'First Aid,Search and Rescue', 'Flashlight,Rope'),
  ('a2222222-2222-2222-2222-222222222222', 'Station House Officer', '+919876543211', 'Police', 'on-mission', 'Law Enforcement,Traffic Control', 'Vehicle,Radio'),
  ('a3333333-3333-3333-3333-333333333333', 'Amit Sharma', '+919876543212', 'NGO', 'active', 'Medical,Food Distribution', 'Medical Kit,Vehicle'),
  ('a4444444-4444-4444-4444-444444444444', 'NDRF Team Alpha', '+919876543213', 'NDRF', 'standby', 'Heavy Rescue,Flood Response', 'Boat,JCB,Hydraulic Tools');

-- Task Forces (2) - assignment_id set after assignments are created
INSERT INTO task_force (id, name, dma_id, status) VALUES
  ('b1111111-1111-1111-1111-111111111111', 'Alpha Rescue', 'DMA-KL-001', 'active'),
  ('b2222222-2222-2222-2222-222222222222', 'Bravo Medical', 'DMA-KL-001', 'active');

-- Task Force Members
INSERT INTO task_force_member (task_force_id, volunteer_id, member_type, role) VALUES
  ('b1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'leader', 'Team Lead'),
  ('b1111111-1111-1111-1111-111111111111', 'a4444444-4444-4444-4444-444444444444', 'member', 'Rescue Specialist'),
  ('b2222222-2222-2222-2222-222222222222', 'a3333333-3333-3333-3333-333333333333', 'leader', 'Medical Lead'),
  ('b2222222-2222-2222-2222-222222222222', 'a2222222-2222-2222-2222-222222222222', 'member', 'Security');

-- Victim Reports (5)
INSERT INTO victim_report (id, phone_no, latitude, longitude, city, district, situation, custom_message, urgency, status) VALUES
  ('c1111111-1111-1111-1111-111111111111', '+919988776655', 11.0168, 76.0778, 'Coimbatore', 'Coimbatore', 'rescue', 'Family trapped on roof, water rising fast', 'critical', 'open'),
  ('c2222222-2222-2222-2222-222222222222', '+919988776656', 11.0255, 76.9654, 'Tirupur', 'Tirupur', 'food', '3 families without food for 2 days', 'urgent', 'open'),
  ('c3333333-3333-3333-3333-333333333333', '+919988776657', 10.9279, 76.9562, 'Erode', 'Erode', 'medical', 'Elderly woman needs insulin, power out', 'moderate', 'open'),
  ('c4444444-4444-4444-4444-444444444444', '+919988776658', 11.1085, 77.3411, 'Salem', 'Salem', 'shelter', '50 people need temporary shelter', 'open', 'open'),
  ('c5555555-5555-5555-5555-555555555555', '+919988776659', 12.2958, 76.6253, 'Mysore', 'Mysore', 'water', 'Contaminated water supply in locality', 'open', 'open');

-- Assignments (3) - 1 to volunteer, 1 to TF, 1 unassigned
INSERT INTO assignment (id, task, location_label, latitude, longitude, urgency, status, assigned_to_volunteer, assigned_to_taskforce, victim_report_id) VALUES
  ('d1111111-1111-1111-1111-111111111111', 'Rescue family from rooftop, provide evacuation', 'Coimbatore North Ward 5', 11.0168, 76.0778, 'critical', 'active', 'a1111111-1111-1111-1111-111111111111', NULL, 'c1111111-1111-1111-1111-111111111111'),
  ('d2222222-2222-2222-2222-222222222222', 'Distribute food packets to affected families', 'Tirupur Town', 11.0255, 76.9654, 'urgent', 'active', NULL, 'b2222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222222'),
  ('d3333333-3333-3333-3333-333333333333', 'Medical checkup camp at relief center', 'Erode Main Hospital', 10.9279, 76.9562, 'moderate', 'open', NULL, NULL, 'c3333333-3333-3333-3333-333333333333');

-- Update task forces with assignment references
UPDATE task_force SET assignment_id = 'd2222222-2222-2222-2222-222222222222' WHERE id = 'b2222222-2222-2222-2222-222222222222';

-- Messages (6) - victim thread, TF room, direct channel
INSERT INTO message (content, sender_type, sender_id, task_force_id, victim_report_id, receiver_id, is_flagged_for_dma) VALUES
  ('Help! Water is entering our house. Two children with us.', 'victim', NULL, NULL, 'c1111111-1111-1111-1111-111111111111', NULL, false),
  ('We have dispatched a rescue team. Stay on the roof. ETA 30 mins.', 'dma', NULL, NULL, 'c1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', false),
  ('Team assembling at base. Medical supplies loaded.', 'volunteer', 'a3333333-3333-3333-3333-333333333333', 'b2222222-2222-2222-2222-222222222222', NULL, NULL, false),
  ('All units check in once deployed.', 'dma', NULL, 'b2222222-2222-2222-2222-222222222222', NULL, NULL, false),
  ('Alpha team, be advised: water level rising in Sector 7.', 'dma', NULL, 'b1111111-1111-1111-1111-111111111111', NULL, NULL, false),
  ('Confirmed. Proceeding to extraction point.', 'volunteer', 'a1111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', NULL, NULL, false);

-- Resources (5) - one below threshold
INSERT INTO resource (name, type, quantity, low_stock_threshold, unit, owner_info, location) VALUES
  ('Food Packets', 'food', 500, 200, 'packets', 'District Relief Store', 'Coimbatore Central'),
  ('Water Cans', 'water', 45, 100, 'cans', 'Water Authority', 'Tirupur Depot'),
  ('Rescue Boats', 'equipment', 12, 5, 'boats', 'NDRF Station', 'Salem Base'),
  ('Medical Kits', 'medical', 80, 30, 'kits', 'Red Cross Chapter', 'Erode Hospital'),
  ('Thermal Blankets', 'shelter', 15, 50, 'blankets', 'NGO Consortium', 'Mysore Center');
