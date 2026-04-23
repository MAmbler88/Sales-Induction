-- ============================================================
-- SALES INDUCTION PLATFORM — SUPABASE SCHEMA
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- 1. PROFILES (extends auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  full_name text,
  role text not null default 'agent' check (role in ('admin', 'agent')),
  created_at timestamptz default now()
);

-- 2. MODULES (training units)
create table public.modules (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  youtube_url text,
  order_index int not null default 0,
  published boolean default false,
  created_at timestamptz default now()
);

-- 3. QUIZZES (one quiz per module)
create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  module_id uuid references public.modules(id) on delete cascade,
  title text not null,
  pass_score int not null default 70,
  created_at timestamptz default now()
);

-- 4. QUIZ QUESTIONS
create table public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid references public.quizzes(id) on delete cascade,
  question_text text not null,
  options jsonb not null,  -- array of {id, text, correct: bool}
  order_index int default 0
);

-- 5. PROGRESS (per agent per module)
create table public.progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  module_id uuid references public.modules(id) on delete cascade,
  video_watched boolean default false,
  quiz_completed boolean default false,
  quiz_score int,
  completed_at timestamptz,
  unique(user_id, module_id)
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles enable row level security;
alter table public.modules enable row level security;
alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.progress enable row level security;

-- PROFILES
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Admins can view all profiles" on public.profiles
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
create policy "Admins can insert profiles" on public.profiles
  for insert with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
create policy "Admins can update profiles" on public.profiles
  for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- MODULES
create policy "Anyone authenticated can view published modules" on public.modules
  for select using (auth.uid() is not null and (published = true or
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  ));
create policy "Admins can manage modules" on public.modules
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- QUIZZES
create policy "Authenticated users can view quizzes" on public.quizzes
  for select using (auth.uid() is not null);
create policy "Admins can manage quizzes" on public.quizzes
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- QUIZ QUESTIONS
create policy "Authenticated users can view questions" on public.quiz_questions
  for select using (auth.uid() is not null);
create policy "Admins can manage questions" on public.quiz_questions
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- PROGRESS
create policy "Users view own progress" on public.progress
  for select using (auth.uid() = user_id);
create policy "Users upsert own progress" on public.progress
  for all using (auth.uid() = user_id);
create policy "Admins view all progress" on public.progress
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ============================================================
-- TRIGGER: auto-create profile on signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    coalesce(new.raw_user_meta_data->>'role', 'agent')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- SEED: Create first admin user
-- After running this schema, go to Supabase Auth > Users,
-- create a user manually, then run:
--
-- update public.profiles set role = 'admin' where email = 'your@email.com';
-- ============================================================
