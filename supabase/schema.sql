-- Brew Buds database bootstrap for Supabase/PostgreSQL
-- This schema models beverages, venues, events, and personal cellar entries
-- so the app can migrate away from mock JSON/localStorage data.

-- Enable extensions used for UUID generation and timestamp helpers.
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- Helper enum for beverage categories used across the experience.
create type beverage_category as enum (
  'beer',
  'wine',
  'spirits',
  'cider',
  'mead',
  'fermented'
);

-- Profiles extend the Supabase auth.users table with UI metadata.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  account_type text default 'General User' not null,
  bio text,
  default_beverage_category beverage_category default 'beer'::beverage_category not null,
  avatar_url text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

-- Master catalogue of beverages showcased on the home screen.
create table if not exists public.beverages (
  id bigserial primary key,
  name text not null,
  producer text,
  beverage_type beverage_category not null,
  category text,
  style text,
  rating numeric(3,2) check (rating between 0 and 5),
  image_url text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create trigger beverages_updated_at
  before update on public.beverages
  for each row
  execute function public.set_updated_at();

-- Brick-and-mortar locations highlighted within the venues experience.
create table if not exists public.venues (
  id bigserial primary key,
  name text not null,
  venue_type text,
  address text,
  city text,
  state text,
  country text,
  postal_code text,
  phone text,
  website text,
  price_range text,
  description text,
  total_ratings integer default 0,
  average_rating numeric(3,2) check (average_rating between 0 and 5),
  beverage_count integer default 0,
  added_date date,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create trigger venues_updated_at
  before update on public.venues
  for each row
  execute function public.set_updated_at();

-- Structured opening hours per venue and day of week.
create table if not exists public.venue_hours (
  id bigserial primary key,
  venue_id bigint references public.venues (id) on delete cascade,
  day_of_week text not null check (day_of_week in (
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
  )),
  open_time time,
  close_time time,
  is_closed boolean default false not null,
  unique (venue_id, day_of_week)
);

-- Multi-value specialties chip list for each venue.
create table if not exists public.venue_specialties (
  venue_id bigint references public.venues (id) on delete cascade,
  specialty text not null,
  primary key (venue_id, specialty)
);

-- Events surfaced in the Explore and detail views.
create table if not exists public.events (
  id bigserial primary key,
  name text not null,
  event_type text,
  description text,
  start_date date not null,
  end_date date not null,
  start_time time,
  end_time time,
  organizer text,
  ticket_price numeric(10,2),
  max_attendees integer,
  current_attendees integer,
  image_url text,
  website text,
  beverage_category beverage_category,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create trigger events_updated_at
  before update on public.events
  for each row
  execute function public.set_updated_at();

-- Associate events with one or more physical venues.
create table if not exists public.event_venues (
  event_id bigint references public.events (id) on delete cascade,
  venue_id bigint references public.venues (id) on delete restrict,
  display_name text,
  address_override text,
  position integer default 0,
  primary key (event_id, venue_id)
);

-- Tags to power filters such as "outdoor" or "premium".
create table if not exists public.event_tags (
  event_id bigint references public.events (id) on delete cascade,
  tag text not null,
  primary key (event_id, tag)
);

-- Highlighted beverages associated with a particular event agenda.
create table if not exists public.event_featured_beverages (
  id bigserial primary key,
  event_id bigint references public.events (id) on delete cascade,
  beverage_id bigint references public.beverages (id) on delete set null,
  display_name text not null,
  producer text,
  abv numeric(5,2)
);

-- Personal cellar tracking per authenticated profile.
create table if not exists public.cellar_entries (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid references public.profiles (id) on delete cascade not null,
  beverage_id bigint references public.beverages (id) on delete set null,
  beverage_name text not null,
  producer text,
  style text,
  beverage_type beverage_category not null,
  purchase_location text,
  purchase_date date,
  container_type text,
  container_size numeric(10,2) check (container_size >= 0),
  container_unit text check (container_unit in ('ml', 'fl oz')),
  purchase_price numeric(10,2) check (purchase_price is null or purchase_price >= 0),
  retail_price numeric(10,2) check (retail_price is null or retail_price >= 0),
  source text,
  series text,
  custom_series text,
  notes text,
  is_hidden boolean default false not null,
  quantity integer default 1 check (quantity >= 0),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create trigger cellar_entries_updated_at
  before update on public.cellar_entries
  for each row
  execute function public.set_updated_at();

-- Convenience view to join events with venues for quick lookups.
create or replace view public.event_details as
select
  e.id,
  e.name,
  e.event_type,
  e.description,
  e.start_date,
  e.end_date,
  e.start_time,
  e.end_time,
  e.organizer,
  e.ticket_price,
  e.max_attendees,
  e.current_attendees,
  e.image_url,
  e.website,
  e.beverage_category,
  json_agg(
    jsonb_build_object(
      'venueId', v.id,
      'name', coalesce(ev.display_name, v.name),
      'address', coalesce(ev.address_override, v.address)
    )
    order by ev.position
  ) filter (where ev.venue_id is not null) as venues,
  array_agg(distinct et.tag) filter (where et.tag is not null) as tags
from public.events e
left join public.event_venues ev on ev.event_id = e.id
left join public.venues v on v.id = ev.venue_id
left join public.event_tags et on et.event_id = e.id
group by e.id;

-- Seed data mirroring the previous mock JSON so the UI has content immediately.
insert into public.beverages (id, name, producer, beverage_type, category, rating, image_url)
values
  (1, 'IPA Delight', 'Brewery X', 'beer', 'IPA', 4.50, 'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=300&h=300&fit=crop'),
  (2, 'Golden Wheat', 'Sunset Brewing', 'beer', 'Wheat Beer', 4.20, 'https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=300&h=300&fit=crop'),
  (3, 'Dark Stout', 'Mountain Brewery', 'beer', 'Stout', 4.70, 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=300&h=300&fit=crop'),
  (11, 'Chardonnay Reserve', 'Valley Vineyard', 'wine', 'White Wine', 4.30, 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=300&h=300&fit=crop'),
  (12, 'Cabernet Sauvignon', 'Hill Estate', 'wine', 'Red Wine', 4.60, 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=300&h=300&fit=crop'),
  (13, 'Rosé Selection', 'Coastal Winery', 'wine', 'Rosé', 4.10, 'https://images.unsplash.com/photo-1547595628-c61a29f496f0?w=300&h=300&fit=crop'),
  (21, 'Single Malt 18yr', 'Highland Distillery', 'spirits', 'Whiskey', 4.80, 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=300&h=300&fit=crop'),
  (22, 'Artisan Gin', 'Botanical Co.', 'spirits', 'Gin', 4.40, 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=300&h=300&fit=crop'),
  (31, 'Dry Apple Cider', 'Orchard House', 'cider', 'Traditional Cider', 4.20, 'https://images.unsplash.com/photo-1567696911980-2eed69a46042?w=300&h=300&fit=crop'),
  (32, 'Pear & Ginger', 'Craft Cidery', 'cider', 'Fruit Cider', 4.00, 'https://images.unsplash.com/photo-1596328546171-77e37b5e8b3d?w=300&h=300&fit=crop'),
  (41, 'Wildflower Honey', 'Ancient Meadery', 'mead', 'Traditional Mead', 4.50, 'https://images.unsplash.com/photo-1618183479302-1e0aa382c36b?w=300&h=300&fit=crop'),
  (51, 'Ginger Kombucha', 'Living Cultures', 'fermented', 'Kombucha', 4.10, 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=300&h=300&fit=crop'),
  (52, 'Pineapple Tepache', 'Ferment Co.', 'fermented', 'Tepache', 4.30, 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=300&h=300&fit=crop')
on conflict (id) do nothing;

insert into public.venues (id, name, venue_type, address, city, state, country, phone, website, price_range, description, total_ratings, average_rating, beverage_count, added_date)
values
  (1, 'The Crafty Pint', 'Brewery', '123 Brew Street', 'Portland', 'OR', 'USA', '(503) 555-0123', 'https://craftypint.com', '$$', 'Local brewery with rotating taps and live music on weekends.', 24, 4.30, 12, '2024-01-15'),
  (2, 'Bottle & Cork', 'Bottle Shop', '456 Wine Ave', 'San Francisco', 'CA', 'USA', '(415) 555-0456', 'https://bottleandcork.com', '$$$', 'Premium bottle shop with rare finds and knowledgeable staff.', 18, 4.60, 8, '2024-01-10'),
  (3, 'The Gentleman''s Club', 'Lounge', '456 Oak Ave', 'Denver', 'CO', 'USA', '(303) 555-0678', 'https://gentlemansclub.com', '$$$', 'Exclusive lounge offering curated whiskey and cigar pairings.', 9, 4.70, 6, '2024-01-05')
on conflict (id) do nothing;

insert into public.venue_specialties (venue_id, specialty)
values
  (1, 'Craft Beer'),
  (1, 'Local Brews'),
  (1, 'IPAs'),
  (1, 'Live Music'),
  (2, 'Rare Bottles'),
  (2, 'Wine Selection'),
  (2, 'Craft Beer'),
  (2, 'Import Beers'),
  (3, 'Premium Whiskey'),
  (3, 'Cigar Lounge'),
  (3, 'Members Events')
on conflict do nothing;

insert into public.venue_hours (venue_id, day_of_week, open_time, close_time, is_closed)
values
  (1, 'monday', '15:00', '22:00', false),
  (1, 'tuesday', '15:00', '22:00', false),
  (1, 'wednesday', '15:00', '22:00', false),
  (1, 'thursday', '15:00', '23:00', false),
  (1, 'friday', '12:00', '23:59', false),
  (1, 'saturday', '12:00', '23:59', false),
  (1, 'sunday', '12:00', '21:00', false),
  (2, 'monday', '10:00', '20:00', false),
  (2, 'tuesday', '10:00', '20:00', false),
  (2, 'wednesday', '10:00', '20:00', false),
  (2, 'thursday', '10:00', '21:00', false),
  (2, 'friday', '10:00', '22:00', false),
  (2, 'saturday', '09:00', '22:00', false),
  (2, 'sunday', '11:00', '19:00', false),
  (3, 'monday', '17:00', '23:00', false),
  (3, 'tuesday', '17:00', '23:00', false),
  (3, 'wednesday', '17:00', '23:00', false),
  (3, 'thursday', '17:00', '00:00', false),
  (3, 'friday', '17:00', '01:00', false),
  (3, 'saturday', '17:00', '01:00', false),
  (3, 'sunday', '17:00', '22:00', false)
on conflict (venue_id, day_of_week) do nothing;

insert into public.events (id, name, event_type, description, start_date, end_date, start_time, end_time, organizer, ticket_price, max_attendees, current_attendees, image_url, website, beverage_category)
values
  (1, 'Portland Beer Festival', 'Festival', 'Annual celebration featuring 50+ local breweries with live music and food trucks.', '2024-06-15', '2024-06-17', '12:00', '22:00', 'Portland Beer Society', 25, 5000, 3200, 'https://images.unsplash.com/photo-1436076863939-06870fe779c2?w=600&h=300&fit=crop', 'https://portlandbeer.festival', 'beer'),
  (2, 'Wine Tasting Evening', 'Tasting', 'Intimate wine tasting featuring selections from Napa Valley wineries.', '2024-05-20', '2024-05-20', '18:00', '21:00', 'Valley Vineyard Estate', 75, 40, 32, 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&h=300&fit=crop', 'https://valleyvineyards.com/events', 'wine'),
  (3, 'Whiskey & Cigars Night', 'Pairing', 'Premium whiskey tasting paired with artisanal cigars in an exclusive setting.', '2024-06-08', '2024-06-08', '19:00', '23:00', 'Highland Distillery', 150, 25, 18, 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=600&h=300&fit=crop', 'https://highland-distillery.com/events', 'spirits')
on conflict (id) do nothing;

insert into public.event_venues (event_id, venue_id, display_name, address_override, position)
values
  (1, 1, 'Tom McCall Waterfront Park', '98 SE Naito Pkwy, Portland, OR', 0),
  (2, 2, 'The Wine Bar', '123 Main St, San Francisco, CA', 0),
  (3, 3, 'The Gentleman''s Club', '456 Oak Ave, Denver, CO', 0)
on conflict do nothing;

insert into public.event_tags (event_id, tag)
values
  (1, 'outdoor'),
  (1, 'family-friendly'),
  (1, 'food-trucks'),
  (2, 'indoor'),
  (2, 'premium'),
  (2, 'educational'),
  (3, 'premium'),
  (3, 'indoor'),
  (3, 'adults-only'),
  (3, 'limited')
on conflict do nothing;

insert into public.event_featured_beverages (event_id, beverage_id, display_name, producer, abv)
values
  (1, 1, 'Festival IPA', 'Local Brewing Co.', 6.20),
  (1, 2, 'Summer Wheat', 'Craft Beer Works', 5.10),
  (2, 11, 'Reserve Chardonnay 2021', 'Valley Vineyard', 13.50),
  (2, 12, 'Cabernet Sauvignon 2019', 'Valley Vineyard', 14.20),
  (3, 21, '18-Year Single Malt', 'Highland Distillery', 43.00),
  (3, null, 'Cask Strength Reserve', 'Highland Distillery', 57.20)
on conflict do nothing;
