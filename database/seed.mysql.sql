-- MySQL seed (safe to re-run with INSERT IGNORE)

INSERT IGNORE INTO service_types (slug, name, subtitle, sort_order)
VALUES
  ('companionship', 'Companionship', 'Emotional and social support', 10),
  ('personal', 'Personal Care', 'Personalized care at home', 20),
  ('medication-reminders', 'Medication Reminders', 'Timely prompts, not medical administration', 30),
  ('post-hospital', 'Post-Hospital Transition Support', 'Settling in safely after discharge', 40),
  ('escorted-transportation', 'Escorted Transportation (Appointments)', 'Safe rides, escorts home, and clarity after visits', 50),
  ('grocery-errands', 'Grocery Shopping & Errands', 'Groceries, prescriptions, and essentials handled with care', 60),
  ('nutritious-meals', 'Nutritious Meal Preparation', 'Dietary restrictions respected, from prep to cleanup', 70),
  ('disability-support', 'Disability Support & Care', 'Independence and dignity in daily routines', 80),
  ('respite-care', 'Respite Care', 'Planned breaks for family caregivers', 85),
  ('social-engagement', 'Social Engagement (Talks)', 'Conversation, stimulation, and connection at home', 90);
