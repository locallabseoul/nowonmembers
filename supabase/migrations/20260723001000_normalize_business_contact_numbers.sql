update public.business_profiles
set contact = regexp_replace(contact, '[^0-9]', '', 'g')
where contact is not null
  and contact <> regexp_replace(contact, '[^0-9]', '', 'g');

update public.profiles
set business_registration_number = regexp_replace(business_registration_number, '[^0-9]', '', 'g')
where business_registration_number is not null
  and business_registration_number <> regexp_replace(business_registration_number, '[^0-9]', '', 'g');
