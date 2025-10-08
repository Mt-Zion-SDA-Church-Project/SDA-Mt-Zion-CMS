/*
  Update offertory categories to new structure
*/

-- Insert new offertory categories
INSERT INTO public.offertory_categories (key, label, is_active) VALUES
-- Trust Fund
('tithe_10_percent', 'Tithe (10%)', true),
('camp_meeting_offering', 'Camp Meeting Offering', true),
('13th_sabbath', '13th Sabbath', true),
('prime_radio', 'Prime Radio', true),
('kireka_adventist_church', 'Kireka Adventist Church', true),
-- Combined Offerings
('sabbath_school', 'Sabbath School', true),
('thanks_giving', 'Thanks Giving', true),
('devine', 'Devine', true),
-- Other Offerings
('local_church_building', 'Local Church Building', true),
('district_project_fund', 'District Project Fund', true),
('lunch', 'Lunch', true),
('social_and_welfare', 'Social and welfare', true),
('evangelism', 'Evangelism', true),
('nbf_development_fund', 'NBF Development Fund', true)
ON CONFLICT (key) DO UPDATE SET
  label = EXCLUDED.label,
  is_active = EXCLUDED.is_active;

-- Deactivate old categories that are no longer used
UPDATE public.offertory_categories 
SET is_active = false 
WHERE key IN (
  'trust_fund',
  'ssabiti_13th',
  'hope_channel_tv_uganda',
  'ebf_development_fund',
  'ebirabo_ebyawamu',
  'essomero_lya_ssabbiti',
  'okwebaza',
  'okusinza',
  'ebirabo_ebirala',
  'okuzimba',
  'ekyemisana',
  'enjiri'
);
