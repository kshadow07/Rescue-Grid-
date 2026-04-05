-- Seed data for 50 volunteers for testing map clustering
-- Run this after migration 014_volunteer_skills_normalized.sql

-- First, ensure skill categories and definitions exist (from migration 014)
INSERT INTO skill_categories (id, code, name) VALUES
  (1, 'MEDICAL', 'Medical'),
  (2, 'RESCUE', 'Search & Rescue'),
  (3, 'LOGISTICS', 'Logistics'),
  (4, 'COMMUNICATION', 'Communication'),
  (5, 'SPECIAL', 'Special Skills')
ON CONFLICT (id) DO NOTHING;

INSERT INTO skill_definitions (id, category_id, code, name) VALUES
  (1, 1, 'first_aid', 'First Aid'),
  (2, 1, 'paramedic', 'Paramedic'),
  (3, 1, 'doctor', 'Doctor'),
  (4, 1, 'nurse', 'Nurse'),
  (5, 2, 'swimmer', 'Open Water Swimmer'),
  (6, 2, 'rope_rescue', 'Rope Rescue'),
  (7, 2, 'structural_search', 'Structural Search'),
  (8, 3, 'driver', 'Driver (LMV)'),
  (9, 3, 'heavy_vehicle', 'Heavy Vehicle'),
  (10, 3, 'drone_operator', 'Drone Operator'),
  (11, 4, 'ham_radio', 'Ham Radio'),
  (12, 4, 'translator', 'Translator'),
  (13, 5, 'psychologist', 'Psychologist'),
  (14, 5, 'civil_engineer', 'Civil Engineer'),
  (15, 5, 'firefighter', 'Firefighter')
ON CONFLICT (id) DO NOTHING;

-- Create 50 volunteers around Kolkata/Bengal region (23.79, 86.43)
-- Mix of tiers, status, and clustered/sparse distribution
INSERT INTO volunteer (id, name, mobile_no, type, latitude, longitude, status, tier, last_seen, skills, equipment) VALUES
-- Cluster 1: Dense cluster near center (Kolkata area)
(gen_random_uuid(), 'Amit Kumar', '+919999990001', 'Individual', 23.8050, 88.4700, 'active', 4, NOW() - INTERVAL '5 minutes', 'first_aid,paramedic', 'Medical Kit,Oxygen'),
(gen_random_uuid(), 'Priya Singh', '+919999990002', 'Individual', 23.8020, 88.4650, 'active', 3, NOW() - INTERVAL '10 minutes', 'nurse,first_aid', 'First Aid Kit'),
(gen_random_uuid(), 'Raj Patel', '+919999990003', 'Individual', 23.8080, 88.4750, 'active', 3, NOW() - INTERVAL '15 minutes', 'driver', 'Ambulance'),
(gen_random_uuid(), 'Anita Sharma', '+919999990004', 'Individual', 23.8000, 88.4680, 'active', 2, NOW() - INTERVAL '30 minutes', 'first_aid', 'Basic Kit'),
(gen_random_uuid(), 'Vikram Reddy', '+919999990005', 'Individual', 23.8060, 88.4720, 'standby', 2, NOW() - INTERVAL '2 hours', 'paramedic', 'Medical Kit'),

-- Cluster 2: Another dense cluster (Howrah area)
(gen_random_uuid(), 'Mohan Das', '+919999990006', 'Individual', 22.5950, 88.3100, 'active', 4, NOW() - INTERVAL '3 minutes', 'doctor,first_aid', 'Medical Kit,Stretcher'),
(gen_random_uuid(), 'Sunita Devi', '+919999990007', 'Individual', 22.5900, 88.3150, 'active', 3, NOW() - INTERVAL '20 minutes', 'nurse', 'First Aid'),
(gen_random_uuid(), 'Krishna Ghosh', '+919999990008', 'Individual', 22.5920, 88.3080, 'active', 3, NOW() - INTERVAL '45 minutes', 'driver', ' ambulance'),
(gen_random_uuid(), 'Gita Mukherjee', '+919999990009', 'Individual', 22.5980, 88.3200, 'active', 2, NOW() - INTERVAL '1 hour', 'first_aid', 'Basic Kit'),
(gen_random_uuid(), 'Arjun Chatterjee', '+919999990010', 'Individual', 22.5930, 88.3120, 'on-mission', 2, NOW() - INTERVAL '10 minutes', 'paramedic', 'Oxygen'),

-- Cluster 3: Medium cluster (Durgapur area)
(gen_random_uuid(), 'Sanjay Roy', '+919999990011', 'Individual', 23.5500, 87.0500, 'active', 3, NOW() - INTERVAL '8 minutes', 'firefighter,rope_rescue', 'Fire Extinguisher,Ropes'),
(gen_random_uuid(), 'Pooja Agarwal', '+919999990012', 'Individual', 23.5450, 87.0550, 'active', 2, NOW() - INTERVAL '25 minutes', 'first_aid', 'Basic Kit'),
(gen_random_uuid(), 'Deepak Verma', '+919999990013', 'Individual', 23.5520, 87.0480, 'active', 2, NOW() - INTERVAL '1 hour', 'driver', 'Truck'),
(gen_random_uuid(), 'Neha Kumari', '+919999990014', 'Individual', 23.5480, 87.0520, 'standby', 1, NOW() - INTERVAL '3 hours', 'translator', 'Radio'),

-- Cluster 4: Sparse cluster (Asansol area)
(gen_random_uuid(), 'Ramesh Singh', '+919999990015', 'Individual', 23.6800, 86.9500, 'active', 3, NOW() - INTERVAL '12 minutes', 'swimmer,rope_rescue', 'Life Jackets,Ropes'),
(gen_random_uuid(), 'Meena Devi', '+919999990016', 'Individual', 23.6750, 86.9450, 'active', 2, NOW() - INTERVAL '40 minutes', 'first_aid', 'Basic Kit'),
(gen_random_uuid(), 'Babulal Mandal', '+919999990017', 'Individual', 23.6820, 86.9550, 'active', 1, NOW() - INTERVAL '2 hours', 'driver', 'Jeep'),

-- Isolated volunteers - spread across the map
(gen_random_uuid(), 'Ahmed Khan', '+919999990018', 'Individual', 24.1000, 88.8500, 'active', 4, NOW() - INTERVAL '5 minutes', 'doctor,civil_engineer', 'Medical Kit,Survey Equipment'),
(gen_random_uuid(), 'Fatima Begum', '+919999990019', 'Individual', 24.0900, 88.8600, 'active', 3, NOW() - INTERVAL '30 minutes', 'psychologist', 'Counseling Kit'),
(gen_random_uuid(), 'Tariq Hussain', '+919999990020', 'Individual', 23.2000, 87.5000, 'active', 2, NOW() - INTERVAL '1 hour', 'ham_radio', 'Radio Set'),
(gen_random_uuid(), 'Samir Das', '+919999990021', 'Individual', 22.9000, 88.6000, 'active', 3, NOW() - INTERVAL '15 minutes', 'drone_operator', 'Drone'),
(gen_random_uuid(), 'Riya Mondal', '+919999990022', 'Individual', 22.8500, 88.5500, 'standby', 2, NOW() - INTERVAL '4 hours', 'first_aid', 'Kit'),
(gen_random_uuid(), 'Nilotpal Sen', '+919999990023', 'Individual', 23.4000, 87.8000, 'active', 2, NOW() - INTERVAL '20 minutes', 'heavy_vehicle', 'Truck'),
(gen_random_uuid(), 'Debashis Paul', '+919999990024', 'Individual', 23.3500, 87.7500, 'active', 1, NOW() - INTERVAL '5 hours', 'driver', 'Van'),
(gen_random_uuid(), 'Sarmila Roy', '+919999990025', 'Individual', 24.3000, 88.0000, 'on-mission', 4, NOW() - INTERVAL '10 minutes', 'doctor,paramedic', 'Medical Kit'),
(gen_random_uuid(), 'Uttam Kumar', '+919999990026', 'Individual', 24.2800, 88.0100, 'active', 3, NOW() - INTERVAL '25 minutes', 'nurse', 'First Aid'),
(gen_random_uuid(), 'Jatin Sarkar', '+919999990027', 'Individual', 23.1000, 88.2000, 'active', 2, NOW() - INTERVAL '50 minutes', 'rope_rescue', 'Ropes'),
(gen_random_uuid(), 'Bidhan Chandra', '+919999990028', 'Individual', 23.0500, 88.1500, 'standby', 1, NOW() - INTERVAL '6 hours', 'first_aid', 'Basic Kit'),

-- More spread volunteers
(gen_random_uuid(), 'Partha Pratim', '+919999990029', 'Individual', 24.5000, 87.5000, 'active', 4, NOW() - INTERVAL '8 minutes', 'firefighter,structural_search', 'Equipment'),
(gen_random_uuid(), 'Mithun Chakraborty', '+919999990030', 'Individual', 24.4800, 87.5200, 'active', 3, NOW() - INTERVAL '35 minutes', 'swimmer', 'Boat'),
(gen_random_uuid(), 'Soumen Nandi', '+919999990031', 'Individual', 22.4000, 88.4000, 'active', 3, NOW() - INTERVAL '18 minutes', 'ham_radio', 'Radio'),
(gen_random_uuid(), 'Sujata Bose', '+919999990032', 'Individual', 22.4200, 88.3800, 'active', 2, NOW() - INTERVAL '2 hours', 'translator', 'None'),
(gen_random_uuid(), 'Avijit Lahiri', '+919999990033', 'Individual', 23.9000, 86.8000, 'active', 2, NOW() - INTERVAL '45 minutes', 'driver', 'Ambulance'),
(gen_random_uuid(), 'Madhuri莲花', '+919999990034', 'Individual', 23.8500, 86.7500, 'on-mission', 4, NOW() - INTERVAL '12 minutes', 'doctor', 'Medical Kit'),
(gen_random_uuid(), 'Subrata Das', '+919999990035', 'Individual', 24.1500, 87.2000, 'active', 2, NOW() - INTERVAL '1 hour', 'first_aid', 'Kit'),
(gen_random_uuid(), 'Anjan Chatterjee', '+919999990036', 'Individual', 24.1300, 87.1800, 'standby', 1, NOW() - INTERVAL '8 hours', 'none', 'None'),

-- Near borders - edge cases
(gen_random_uuid(), 'Shreya Ghosh', '+919999990037', 'Individual', 23.0100, 89.0000, 'active', 3, NOW() - INTERVAL '22 minutes', 'drone_operator', 'Drone'),
(gen_random_uuid(), 'Koushik Roy', '+919999990038', 'Individual', 25.0000, 88.0000, 'active', 2, NOW() - INTERVAL '55 minutes', 'heavy_vehicle', 'Truck'),
(gen_random_uuid(), 'Bablu Sardar', '+919999990039', 'Individual', 22.5000, 87.0000, 'active', 2, NOW() - INTERVAL '30 minutes', 'rope_rescue', 'Ropes'),
(gen_random_uuid(), 'Chhaya Shaw', '+919999990040', 'Individual', 22.5500, 87.0500, 'active', 1, NOW() - INTERVAL '4 hours', 'driver', 'Bike'),

-- Near DMA center (23.79, 86.43) with varying distances
(gen_random_uuid(), 'Shankar Mahato', '+919999990041', 'Individual', 23.8500, 86.5000, 'active', 3, NOW() - INTERVAL '15 minutes', 'paramedic', 'Medical Kit'),
(gen_random_uuid(), 'Rashmika Sen', '+919999990042', 'Individual', 23.7500, 86.4000, 'active', 2, NOW() - INTERVAL '40 minutes', 'first_aid', 'Kit'),
(gen_random_uuid(), 'Dhanraj Patel', '+919999990043', 'Individual', 23.9000, 86.6000, 'on-mission', 4, NOW() - INTERVAL '8 minutes', 'doctor,first_aid', 'Full Med Kit'),
(gen_random_uuid(), 'Kamala Devi', '+919999990044', 'Individual', 23.7000, 86.3500, 'standby', 1, NOW() - INTERVAL '10 hours', 'none', 'None'),
(gen_random_uuid(), 'Lakshman Murmu', '+919999990045', 'Individual', 23.9500, 86.7000, 'active', 2, NOW() - INTERVAL '1 hour', 'swimmer', 'Life Jacket'),

-- Few more spread out
(gen_random_uuid(), 'Dinesh Tudu', '+919999990046', 'Individual', 24.8000, 87.8000, 'active', 3, NOW() - INTERVAL '25 minutes', 'civil_engineer', 'Survey'),
(gen_random_uuid(), 'Aloka Santal', '+919999990047', 'Individual', 24.7500, 87.8500, 'active', 2, NOW() - INTERVAL '2 hours', 'firefighter', 'Extinguisher'),
(gen_random_uuid(), 'Biswajit Hembram', '+919999990048', 'Individual', 22.2000, 87.5000, 'active', 2, NOW() - INTERVAL '35 minutes', 'driver', 'Truck'),
(gen_random_uuid(), 'Suchitra Murmu', '+919999990049', 'Individual', 22.2500, 87.4500, 'standby', 1, NOW() - INTERVAL '12 hours', 'first_aid', 'Basic'),
(gen_random_uuid(), 'Prasenjit Mahanti', '+919999990050', 'Individual', 23.6000, 87.9000, 'active', 3, NOW() - INTERVAL '18 minutes', 'psychologist', 'Counseling')
ON CONFLICT DO NOTHING;

-- Now insert volunteer_skills for each volunteer based on their skills column
-- This parses the skills text and creates entries in the volunteer_skills table

-- Get all inserted volunteers and create skill associations
-- We'll do this in a more manual way since we need to map skill names to IDs

-- Volunteers with first_aid (skill_id = 1)
INSERT INTO volunteer_skills (volunteer_id, skill_id)
SELECT v.id, 1 FROM volunteer v WHERE v.skills LIKE '%first_aid%'
ON CONFLICT DO NOTHING;

-- Volunteers with paramedic (skill_id = 2)
INSERT INTO volunteer_skills (volunteer_id, skill_id)
SELECT v.id, 2 FROM volunteer v WHERE v.skills LIKE '%paramedic%'
ON CONFLICT DO NOTHING;

-- Volunteers with doctor (skill_id = 3)
INSERT INTO volunteer_skills (volunteer_id, skill_id)
SELECT v.id, 3 FROM volunteer v WHERE v.skills LIKE '%doctor%'
ON CONFLICT DO NOTHING;

-- Volunteers with nurse (skill_id = 4)
INSERT INTO volunteer_skills (volunteer_id, skill_id)
SELECT v.id, 4 FROM volunteer v WHERE v.skills LIKE '%nurse%'
ON CONFLICT DO NOTHING;

-- Volunteers with swimmer (skill_id = 5)
INSERT INTO volunteer_skills (volunteer_id, skill_id)
SELECT v.id, 5 FROM volunteer v WHERE v.skills LIKE '%swimmer%'
ON CONFLICT DO NOTHING;

-- Volunteers with rope_rescue (skill_id = 6)
INSERT INTO volunteer_skills (volunteer_id, skill_id)
SELECT v.id, 6 FROM volunteer v WHERE v.skills LIKE '%rope_rescue%'
ON CONFLICT DO NOTHING;

-- Volunteers with structural_search (skill_id = 7)
INSERT INTO volunteer_skills (volunteer_id, skill_id)
SELECT v.id, 7 FROM volunteer v WHERE v.skills LIKE '%structural_search%'
ON CONFLICT DO NOTHING;

-- Volunteers with driver (skill_id = 8)
INSERT INTO volunteer_skills (volunteer_id, skill_id)
SELECT v.id, 8 FROM volunteer v WHERE v.skills LIKE '%driver%'
ON CONFLICT DO NOTHING;

-- Volunteers with heavy_vehicle (skill_id = 9)
INSERT INTO volunteer_skills (volunteer_id, skill_id)
SELECT v.id, 9 FROM volunteer v WHERE v.skills LIKE '%heavy_vehicle%'
ON CONFLICT DO NOTHING;

-- Volunteers with drone_operator (skill_id = 10)
INSERT INTO volunteer_skills (volunteer_id, skill_id)
SELECT v.id, 10 FROM volunteer v WHERE v.skills LIKE '%drone_operator%'
ON CONFLICT DO NOTHING;

-- Volunteers with ham_radio (skill_id = 11)
INSERT INTO volunteer_skills (volunteer_id, skill_id)
SELECT v.id, 11 FROM volunteer v WHERE v.skills LIKE '%ham_radio%'
ON CONFLICT DO NOTHING;

-- Volunteers with translator (skill_id = 12)
INSERT INTO volunteer_skills (volunteer_id, skill_id)
SELECT v.id, 12 FROM volunteer v WHERE v.skills LIKE '%translator%'
ON CONFLICT DO NOTHING;

-- Volunteers with psychologist (skill_id = 13)
INSERT INTO volunteer_skills (volunteer_id, skill_id)
SELECT v.id, 13 FROM volunteer v WHERE v.skills LIKE '%psychologist%'
ON CONFLICT DO NOTHING;

-- Volunteers with civil_engineer (skill_id = 14)
INSERT INTO volunteer_skills (volunteer_id, skill_id)
SELECT v.id, 14 FROM volunteer v WHERE v.skills LIKE '%civil_engineer%'
ON CONFLICT DO NOTHING;

-- Volunteers with firefighter (skill_id = 15)
INSERT INTO volunteer_skills (volunteer_id, skill_id)
SELECT v.id, 15 FROM volunteer v WHERE v.skills LIKE '%firefighter%'
ON CONFLICT DO NOTHING;

-- Verify count
SELECT COUNT(*) as total_volunteers FROM volunteer;
SELECT status, COUNT(*) FROM volunteer GROUP BY status;
SELECT tier, COUNT(*) FROM volunteer GROUP BY tier;