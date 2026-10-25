-- Apply in order using Supabase SQL Editor or `supabase db push`.
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null check(length(display_name) between 1 and 100),
 role text not null default 'tenant' check(role in ('tenant','landlord','provider','admin')),
 state text not null default 'PA', county text not null default '', zip text not null default '',
 language text not null default 'en', notification_preferences boolean not null default true,
 created_at timestamptz not null default now()
);
create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
 insert into public.profiles(id,display_name,role,state,county,zip,language)
 values(new.id,coalesce(nullif(left(coalesce(new.raw_user_meta_data->>'display_name',new.raw_user_meta_data->>'full_name',new.raw_user_meta_data->>'name'),100),''),'New neighbor'),
 case when new.raw_user_meta_data->>'role'='landlord' then 'landlord' else 'tenant' end,
 coalesce(new.raw_user_meta_data->>'state','PA'),'',coalesce(new.raw_user_meta_data->>'zip',''),coalesce(new.raw_user_meta_data->>'language','en'));
 return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
-- Backfill existing accounts without elevating privileges.
insert into public.profiles(id,display_name) select id,coalesce(nullif(left(raw_user_meta_data->>'display_name',100),''),'New neighbor') from auth.users on conflict do nothing;
create function public.current_app_role() returns text language sql stable security definer set search_path=public as $$ select role from public.profiles where id=auth.uid() $$;
create table public.jurisdictions(id uuid primary key default gen_random_uuid(),state text not null,county text not null,notes text not null default '',source_url text not null check(source_url ~ '^https://'),verified_at timestamptz, unique(state,county));
create table public.zip_jurisdictions(zip_code text not null check(zip_code ~ '^[0-9]{5}$'),jurisdiction_id uuid not null references public.jurisdictions(id) on delete cascade,source_url text not null,verified_at timestamptz not null,primary key(zip_code,jurisdiction_id));
create table public.assistance_resources(
 id text primary key, organization text not null,description text not null,category text not null check(category in ('Rental assistance','Legal aid','Housing counseling','Mediation','Emergency housing','Utility assistance','Benefits counseling')),
 scope text not null check(scope in ('national','state','county')),state text, counties text[] not null default '{}',
 website text not null check(website ~ '^https://'),phone text,address text,application_method text not null,eligibility_notes text not null,max_income_cents bigint check(max_income_cents>=0),languages text[] not null default '{}',urgent boolean not null default false,appointment_required boolean,intake_status text not null,last_verified_at timestamptz,source_url text not null check(source_url ~ '^https://'),review_status text not null,active boolean not null default true,
 check(scope='national' or state is not null),check(scope<>'county' or cardinality(counties)>0)
);
create table public.resource_service_areas(resource_id text references public.assistance_resources(id) on delete cascade,jurisdiction_id uuid references public.jurisdictions(id) on delete cascade,primary key(resource_id,jurisdiction_id));
create table public.tenant_assessments(
 id uuid primary key default gen_random_uuid(),tenant_id uuid not null unique references public.profiles(id) on delete cascade,
 state text not null,county text not null,zip text not null check(zip ~ '^[0-9]{5}$'),county_confirmed boolean not null check(county_confirmed),stage text not null,needs text[] not null default '{}',
 rent_cents bigint not null default 0 check(rent_cents>=0),arrears_cents bigint not null default 0 check(arrears_cents>=0),income_cents bigint not null default 0 check(income_cents>=0),expenses_cents bigint not null default 0 check(expenses_cents>=0),household_size integer not null default 1 check(household_size between 1 and 30),language text not null default 'en',court_case boolean not null default false,hearing boolean not null default false,safety boolean not null default false,notice boolean not null default false,utilities boolean not null default false,communication text not null default 'email',accessibility text not null default '',updated_at timestamptz not null default now()
);
create table public.saved_resources(user_id uuid references public.profiles(id) on delete cascade,resource_id text references public.assistance_resources(id) on delete cascade,primary key(user_id,resource_id));
create table public.resource_matches(id uuid primary key default gen_random_uuid(),assessment_id uuid references public.tenant_assessments(id) on delete cascade,resource_id text references public.assistance_resources(id) on delete cascade,score integer not null check(score between 0 and 100),reasons_json jsonb not null,calculated_at timestamptz not null default now());
create table public.cases(id uuid primary key default gen_random_uuid(),creator_id uuid not null references public.profiles(id) on delete cascade,title text not null check(length(title) between 3 and 120),issue_type text not null,state text not null,county text not null,description text not null check(length(description) between 10 and 2000),status text not null default 'Discussion open' check(status in ('Discussion open','Negotiation in progress','Plan active','Resolved','Closed')),created_at timestamptz not null default now());
create table public.case_participants(case_id uuid references public.cases(id) on delete cascade,user_id uuid references public.profiles(id) on delete cascade,display_name text not null,participant_role text not null check(participant_role in ('tenant','landlord','provider')),consent_mediator boolean not null default false,accepted_at timestamptz,blocked boolean not null default false,primary key(case_id,user_id));
create function public.is_case_member(target uuid) returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.case_participants where case_id=target and user_id=auth.uid() and accepted_at is not null and not blocked) $$;
create table public.invitations(id uuid primary key default gen_random_uuid(),case_id uuid not null references public.cases(id) on delete cascade,created_by uuid not null references public.profiles(id) on delete cascade,invitee_email text not null,invitation_token_hash text not null unique,expires_at timestamptz not null,accepted_at timestamptz,created_at timestamptz not null default now());
create table public.messages(id uuid primary key default gen_random_uuid(),case_id uuid not null references public.cases(id) on delete cascade,sender_id uuid not null references public.profiles(id) on delete cascade,content text not null check(length(content) between 1 and 4000),created_at timestamptz not null default now());
create table public.message_reads(message_id uuid references public.messages(id) on delete cascade,user_id uuid references public.profiles(id) on delete cascade,read_at timestamptz not null default now(),primary key(message_id,user_id));
create function public.valid_plan(terms jsonb) returns boolean language plpgsql immutable as $$
begin
 return coalesce((terms->>'total_cents')::bigint between 0 and 10000000000 and (terms->>'initial_cents')::bigint between 0 and (terms->>'total_cents')::bigint and (terms->>'count')::int between 1 and 120 and terms->>'interval' in ('monthly','weekly','biweekly') and (terms->>'start_date')::date is not null,false);
exception when others then return false;
end $$;
create table public.proposals(id uuid primary key default gen_random_uuid(),case_id uuid not null references public.cases(id) on delete cascade,created_by uuid not null references public.profiles(id) on delete cascade,version integer not null check(version>0),terms jsonb not null check(public.valid_plan(terms)),status text not null default 'proposed' check(status in ('proposed','discussion','rejected','changes_requested')),responses jsonb not null default '{}',created_at timestamptz not null default now(),unique(case_id,version));
create table public.documents(id uuid primary key default gen_random_uuid(),owner_id uuid not null references public.profiles(id) on delete cascade,filename text not null check(length(filename) between 1 and 200),category text not null,storage_path text not null unique,size_bytes integer not null check(size_bytes between 1 and 10485760),mime_type text not null check(mime_type in ('application/pdf','image/png','image/jpeg')),uploaded_at timestamptz not null default now(), check(storage_path like owner_id::text || '/%'));
create table public.document_permissions(document_id uuid references public.documents(id) on delete cascade,authorized_user_id uuid references public.profiles(id) on delete cascade,primary key(document_id,authorized_user_id));
create table public.action_items(id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id) on delete cascade,title text not null check(length(title) between 1 and 200),description text not null default '',due_date date,date_source text not null default 'User-entered',status text not null default 'todo' check(status in ('todo','done')));
create table public.appointments(id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id) on delete cascade,case_id uuid references public.cases(id) on delete cascade,title text not null check(length(title) between 1 and 120),scheduled_at date not null,timezone text not null default 'America/New_York',confirmation_status text not null default 'User-entered' check(confirmation_status in ('User-entered','Simulated appointment')));
create table public.benefit_support_logs(id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id) on delete cascade,support_type text not null,description text not null default '',value_cents bigint check(value_cents>=0),recorded_date date not null,notes text not null default '');
create table public.notifications(id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id) on delete cascade,title text not null,description text not null,destination text not null check(destination ~ '^/[a-z]'),created_at timestamptz not null default now(),read_at timestamptz);
create table public.user_activity(id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id) on delete cascade,description text not null,created_at timestamptz not null default now());
create table public.case_events(id uuid primary key default gen_random_uuid(),case_id uuid not null references public.cases(id) on delete cascade,actor_id uuid references public.profiles(id) on delete set null,event_type text not null,metadata_json jsonb not null default '{}',created_at timestamptz not null default now());
create table public.moderation_reports(id uuid primary key default gen_random_uuid(),case_id uuid not null references public.cases(id) on delete cascade,reporter_id uuid not null references public.profiles(id) on delete cascade,reason text not null check(length(reason) between 10 and 2000),created_at timestamptz not null default now(),status text not null default 'Open');
create table public.administrative_audit_logs(id uuid primary key default gen_random_uuid(),actor_id uuid references public.profiles(id) on delete set null,action text not null,resource_type text not null,resource_id text not null,created_at timestamptz not null default now());
create table public.provider_requests(user_id uuid primary key references public.profiles(id) on delete cascade,organization text not null,credential_reference text not null,status text not null default 'Pending',created_at timestamptz not null default now());
create index messages_case_date on public.messages(case_id,created_at);
create index participants_user on public.case_participants(user_id,case_id);
create index proposals_case on public.proposals(case_id,version);
create index tasks_user on public.action_items(user_id);
create index documents_owner on public.documents(owner_id);
create index notifications_user on public.notifications(user_id,created_at);
create index assessments_tenant on public.tenant_assessments(tenant_id);
create index permissions_user on public.document_permissions(authorized_user_id);
create index appointments_user on public.appointments(user_id,scheduled_at);
create index resources_area on public.assistance_resources(state,scope,category);

-- RLS: user-private tables never grant a landlord/provider/admin blanket access.
do $$ declare t text; begin
 foreach t in array array['profiles','jurisdictions','zip_jurisdictions','assistance_resources','resource_service_areas','tenant_assessments','saved_resources','resource_matches','cases','case_participants','invitations','messages','message_reads','proposals','documents','document_permissions','action_items','appointments','benefit_support_logs','notifications','user_activity','case_events','moderation_reports','administrative_audit_logs','provider_requests'] loop execute format('alter table public.%I enable row level security',t); end loop;
end $$;
create policy profile_read on public.profiles for select to authenticated using(id=auth.uid() or (role='provider' and public.current_app_role()='admin'));
create policy profile_update on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
create policy assessment_private on public.tenant_assessments for all to authenticated using(tenant_id=auth.uid() and public.current_app_role()='tenant') with check(tenant_id=auth.uid() and public.current_app_role()='tenant');
create policy matches_private on public.resource_matches for all to authenticated using(exists(select 1 from public.tenant_assessments a where a.id=assessment_id and a.tenant_id=auth.uid())) with check(exists(select 1 from public.tenant_assessments a where a.id=assessment_id and a.tenant_id=auth.uid()));
create policy resources_public on public.assistance_resources for select using(active or public.current_app_role()='admin');
create policy resources_admin on public.assistance_resources for all to authenticated using(public.current_app_role()='admin') with check(public.current_app_role()='admin');
create policy jurisdictions_public on public.jurisdictions for select using(true);
create policy jurisdictions_admin on public.jurisdictions for all to authenticated using(public.current_app_role()='admin') with check(public.current_app_role()='admin');
create policy zip_public on public.zip_jurisdictions for select using(true);
create policy zip_admin on public.zip_jurisdictions for all to authenticated using(public.current_app_role()='admin') with check(public.current_app_role()='admin');
create policy service_areas_public on public.resource_service_areas for select using(true);
create policy service_areas_admin on public.resource_service_areas for all to authenticated using(public.current_app_role()='admin') with check(public.current_app_role()='admin');
do $$ declare t text; begin
 foreach t in array array['saved_resources','action_items','appointments','benefit_support_logs','user_activity'] loop execute format('create policy own_rows on public.%I for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid())',t); end loop;
end $$;
create policy notifications_read on public.notifications for select to authenticated using(user_id=auth.uid());
create policy notifications_update on public.notifications for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy case_read on public.cases for select to authenticated using(public.is_case_member(id));
create policy participants_read on public.case_participants for select to authenticated using(public.is_case_member(case_id));
create policy invitations_read on public.invitations for select to authenticated using(public.is_case_member(case_id));
create policy messages_read on public.messages for select to authenticated using(public.is_case_member(case_id) or sender_id=auth.uid());
create policy message_reads_own on public.message_reads for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid() and exists(select 1 from public.messages where id=message_id and public.is_case_member(case_id)));
create policy proposals_read on public.proposals for select to authenticated using(public.is_case_member(case_id) or created_by=auth.uid());
create policy documents_read on public.documents for select to authenticated using(owner_id=auth.uid() or exists(select 1 from public.document_permissions p where p.document_id=id and p.authorized_user_id=auth.uid()));
create policy documents_insert on public.documents for insert to authenticated with check(owner_id=auth.uid());
create policy documents_update on public.documents for update to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());
create policy documents_delete on public.documents for delete to authenticated using(owner_id=auth.uid());
-- Helper prevents recursive policies between document metadata and sharing rows.
create function public.owns_document(target uuid) returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.documents where id=target and owner_id=auth.uid()) $$;
create policy sharing_read on public.document_permissions for select to authenticated using(authorized_user_id=auth.uid() or public.owns_document(document_id));
create policy sharing_insert on public.document_permissions for insert to authenticated with check(public.owns_document(document_id) and exists(select 1 from public.case_participants a join public.case_participants b on a.case_id=b.case_id where a.user_id=auth.uid() and b.user_id=authorized_user_id and a.accepted_at is not null and b.accepted_at is not null and not a.blocked and not b.blocked));
create policy sharing_delete on public.document_permissions for delete to authenticated using(public.owns_document(document_id));
create policy events_member on public.case_events for select to authenticated using(public.is_case_member(case_id));
create policy reports_read on public.moderation_reports for select to authenticated using(reporter_id=auth.uid() or public.current_app_role()='admin');
create policy reports_insert on public.moderation_reports for insert to authenticated with check(reporter_id=auth.uid() and public.is_case_member(case_id));
create policy reports_admin_update on public.moderation_reports for update to authenticated using(public.current_app_role()='admin') with check(public.current_app_role()='admin');
create policy audit_admin on public.administrative_audit_logs for select to authenticated using(public.current_app_role()='admin');
create policy provider_request_read on public.provider_requests for select to authenticated using(user_id=auth.uid() or public.current_app_role()='admin');
create policy provider_request_insert on public.provider_requests for insert to authenticated with check(user_id=auth.uid() and status='Pending');

-- Limit columns even if a client calls PostgREST directly.
revoke all on all tables in schema public from anon, authenticated;
grant select on public.assistance_resources,public.jurisdictions,public.zip_jurisdictions,public.resource_service_areas to anon,authenticated;
grant select on all tables in schema public to authenticated;
grant update(display_name,state,county,zip,language,notification_preferences) on public.profiles to authenticated;
grant insert,update,delete on public.tenant_assessments,public.saved_resources,public.resource_matches,public.action_items,public.appointments,public.benefit_support_logs,public.user_activity to authenticated;
grant insert,update,delete on public.assistance_resources,public.jurisdictions,public.zip_jurisdictions,public.resource_service_areas to authenticated;
grant insert,delete on public.documents,public.document_permissions to authenticated;
grant update(filename,category) on public.documents to authenticated;
grant update(read_at) on public.notifications to authenticated;
grant insert,update,delete on public.message_reads to authenticated;
grant insert on public.moderation_reports,public.provider_requests to authenticated;
grant update(status) on public.moderation_reports to authenticated;

-- Shared database quotas also cover direct authenticated PostgREST/RPC calls.
create table public.action_quotas(actor_id uuid references public.profiles(id) on delete cascade,action text not null,bucket timestamptz not null,requests integer not null,primary key(actor_id,action,bucket));
alter table public.action_quotas enable row level security;
create function public.consume_action_quota(p_action text,p_limit integer,p_window integer) returns void language plpgsql security definer set search_path=public as $$
declare hits integer; b timestamptz; begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 b=to_timestamp(floor(extract(epoch from now())/p_window)*p_window);
 delete from public.action_quotas where actor_id=auth.uid() and bucket<now()-interval '2 days';
 insert into public.action_quotas values(auth.uid(),p_action,b,1) on conflict(actor_id,action,bucket) do update set requests=action_quotas.requests+1 returning requests into hits;
 if hits>p_limit then raise exception 'Too many requests. Please try again later.'; end if;
end $$;

-- Accepted participation is established only through these guarded procedures.
create function public.create_discussion(p_title text,p_issue text,p_state text,p_county text,p_description text) returns uuid language plpgsql security definer set search_path=public as $$
declare cid uuid; p public.profiles; begin
 select * into p from public.profiles where id=auth.uid();
 if p.role not in ('tenant','landlord') or p.id is null then raise exception 'Only tenants and landlords can create a discussion'; end if;
 perform public.consume_action_quota('discussion',10,3600);
 insert into public.cases(creator_id,title,issue_type,state,county,description) values(p.id,p_title,p_issue,p_state,p_county,p_description) returning id into cid;
 insert into public.case_participants(case_id,user_id,display_name,participant_role,accepted_at) values(cid,p.id,p.display_name,p.role,now());
 insert into public.case_events(case_id,actor_id,event_type) values(cid,p.id,'Voluntary discussion created'); return cid;
end $$;
create function public.invite_participant(p_case uuid,p_email text,p_hash text) returns uuid language plpgsql security definer set search_path=public as $$
declare iid uuid; begin
 if not public.is_case_member(p_case) or public.current_app_role() not in ('tenant','landlord') then raise exception 'Not authorized'; end if;
 if length(p_email)>254 or p_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' or p_hash !~ '^[a-f0-9]{64}$' then raise exception 'Invalid invitation'; end if;
 perform public.consume_action_quota('invitation',10,3600);
 insert into public.invitations(case_id,created_by,invitee_email,invitation_token_hash,expires_at) values(p_case,auth.uid(),lower(p_email),p_hash,now()+interval '72 hours') returning id into iid;return iid;
end $$;
create function public.accept_invitation(p_hash text) returns uuid language plpgsql security definer set search_path=public as $$
declare inv public.invitations; p public.profiles; begin
 select * into inv from public.invitations where invitation_token_hash=p_hash for update;
 if inv.id is null or inv.expires_at<=now() or inv.accepted_at is not null then raise exception 'Invitation is invalid, expired, or already used'; end if;
 if lower(coalesce(auth.jwt()->>'email',''))<>lower(inv.invitee_email) then raise exception 'Sign in with the invited email address'; end if;
 select * into p from public.profiles where id=auth.uid();
 if p.role='admin' or p.id is null then raise exception 'This role cannot join discussions'; end if;
 if p.role='provider' and (select count(distinct participant_role) from public.case_participants where case_id=inv.case_id and participant_role in ('tenant','landlord') and consent_mediator and not blocked and accepted_at is not null)<2 then raise exception 'Both tenant and landlord must consent before a provider joins'; end if;
 insert into public.case_participants(case_id,user_id,display_name,participant_role,accepted_at) values(inv.case_id,p.id,p.display_name,p.role,now()) on conflict(case_id,user_id) do nothing;
 if exists(select 1 from public.case_participants where case_id=inv.case_id and user_id=p.id and blocked) then raise exception 'Participation has ended'; end if;
 update public.invitations set accepted_at=now() where id=inv.id;
 insert into public.case_events(case_id,actor_id,event_type) values(inv.case_id,p.id,'Invitation accepted'); return inv.case_id;
end $$;
create function public.notify_case(p_case uuid,p_title text,p_description text) returns void language sql security definer set search_path=public as $$
 insert into public.notifications(user_id,title,description,destination) select cp.user_id,p_title,p_description,'/mediation/'||p_case::text from public.case_participants cp join public.profiles p on p.id=cp.user_id where cp.case_id=p_case and cp.user_id<>auth.uid() and cp.accepted_at is not null and not cp.blocked and p.notification_preferences
$$;
create function public.post_message(p_case uuid,p_content text) returns uuid language plpgsql security definer set search_path=public as $$
declare mid uuid; begin
 if not public.is_case_member(p_case) then raise exception 'Not authorized'; end if;
 if exists(select 1 from public.cases where id=p_case and status in ('Closed','Resolved')) then raise exception 'This discussion is closed'; end if;
 perform public.consume_action_quota('message',60,60);
 insert into public.messages(case_id,sender_id,content) values(p_case,auth.uid(),p_content) returning id into mid;
 perform public.notify_case(p_case,'New discussion message','A participant sent a message in your private discussion.');return mid;
end $$;
create function public.create_proposal(p_case uuid,p_terms jsonb) returns uuid language plpgsql security definer set search_path=public as $$
declare pid uuid; v integer; begin
 if not public.is_case_member(p_case) or public.current_app_role() not in ('tenant','landlord') then raise exception 'Not authorized'; end if;
 if exists(select 1 from public.cases where id=p_case and status in ('Closed','Resolved')) then raise exception 'This discussion is closed'; end if;
 perform public.consume_action_quota('proposal',20,3600);
 perform pg_advisory_xact_lock(hashtext(p_case::text));
 select coalesce(max(version),0)+1 into v from public.proposals where case_id=p_case;
 insert into public.proposals(case_id,created_by,version,terms) values(p_case,auth.uid(),v,p_terms) returning id into pid;
 update public.cases set status='Negotiation in progress' where id=p_case;
 insert into public.case_events(case_id,actor_id,event_type) values(p_case,auth.uid(),'Proposal version '||v||' created');
 perform public.notify_case(p_case,'Proposal updated','Review the new proposal version.');return pid;
end $$;
create function public.respond_proposal(p_proposal uuid,p_response text) returns void language plpgsql security definer set search_path=public as $$
declare p public.proposals; begin
 select * into p from public.proposals where id=p_proposal for update;
 if p.id is null or not public.is_case_member(p.case_id) or p.created_by=auth.uid() or public.current_app_role() not in ('tenant','landlord') or p_response not in ('discussion','rejected','changes_requested') then raise exception 'Not authorized'; end if;
 if p.version<>(select max(version) from public.proposals where case_id=p.case_id) then raise exception 'Review the latest proposal version'; end if;
 update public.proposals set status=p_response,responses=responses||jsonb_build_object(auth.uid()::text,p_response) where id=p.id;
 insert into public.case_events(case_id,actor_id,event_type) values(p.case_id,auth.uid(),'Proposal version '||p.version||' reviewed: '||p_response);
 perform public.notify_case(p.case_id,'Proposal response recorded','Review the discussion for the participant response.');
end $$;
create function public.set_mediator_consent(p_case uuid,p_consent boolean) returns void language plpgsql security definer set search_path=public as $$ begin
 if not public.is_case_member(p_case) or public.current_app_role() not in ('tenant','landlord') then raise exception 'Not authorized'; end if;
 update public.case_participants set consent_mediator=p_consent where case_id=p_case and user_id=auth.uid();
 if not p_consent then update public.case_participants set blocked=true where case_id=p_case and participant_role='provider'; end if;
 insert into public.case_events(case_id,actor_id,event_type) values(p_case,auth.uid(),case when p_consent then 'Mediator consent given' else 'Mediator consent withdrawn' end);
end $$;
create function public.leave_discussion(p_case uuid) returns void language plpgsql security definer set search_path=public as $$ begin
 if not public.is_case_member(p_case) then raise exception 'Not authorized'; end if;
 update public.case_participants set blocked=true where case_id=p_case and user_id=auth.uid();
 if public.current_app_role() in ('tenant','landlord') then update public.case_participants set blocked=true where case_id=p_case and participant_role='provider'; end if;
 insert into public.case_events(case_id,actor_id,event_type) values(p_case,auth.uid(),'Participant left discussion');
end $$;
create function public.set_case_status(p_case uuid,p_status text) returns void language plpgsql security definer set search_path=public as $$
declare p public.proposals; begin
 if not public.is_case_member(p_case) or public.current_app_role() not in ('tenant','landlord') then raise exception 'Not authorized'; end if;
 if p_status not in ('Plan active','Resolved','Closed') then raise exception 'Invalid status'; end if;
 if p_status='Plan active' then
 select * into p from public.proposals where case_id=p_case order by version desc limit 1;
 if p.id is null or p.status<>'discussion' then raise exception 'Another participant must review the latest proposal for further discussion first'; end if;
 end if;
 update public.cases set status=p_status where id=p_case;
 insert into public.case_events(case_id,actor_id,event_type) values(p_case,auth.uid(),'Participant recorded status: '||p_status);
end $$;
create function public.verify_provider(p_user uuid) returns void language plpgsql security definer set search_path=public as $$ begin
 if public.current_app_role() is distinct from 'admin' then raise exception 'Not authorized'; end if;
 if not exists(select 1 from public.provider_requests where user_id=p_user and status='Pending') then raise exception 'No pending verification request'; end if;
 update public.profiles set role='provider' where id=p_user and role<>'admin';
 update public.provider_requests set status='Approved' where user_id=p_user;
 insert into public.administrative_audit_logs(actor_id,action,resource_type,resource_id) values(auth.uid(),'Provider approved after manual credential review','profile',p_user::text);
end $$;
create function public.audit_resource_change() returns trigger language plpgsql security definer set search_path=public as $$ begin
 if auth.uid() is not null then insert into public.administrative_audit_logs(actor_id,action,resource_type,resource_id) values(auth.uid(),tg_op,tg_table_name,coalesce(new.id::text,old.id::text)); end if; return coalesce(new,old);
end $$;
create trigger resource_audit after insert or update or delete on public.assistance_resources for each row execute function public.audit_resource_change();
create trigger jurisdiction_audit after insert or update or delete on public.jurisdictions for each row execute function public.audit_resource_change();
create function public.delete_my_account() returns void language plpgsql security definer set search_path=public,auth as $$ begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 delete from auth.users where id=auth.uid();
end $$;
create function public.aggregate_metrics() returns jsonb language plpgsql security definer set search_path=public as $$
declare a int; c int; p int; begin
 if public.current_app_role() is distinct from 'admin' then raise exception 'Not authorized'; end if;
 select count(*) into a from public.tenant_assessments; select count(*) into c from public.cases; select count(*) into p from public.proposals;
 return jsonb_build_object('assessments',case when a<5 then null else a end,'discussions',case when c<5 then null else c end,'proposals',case when p<5 then null else p end);
end $$;
-- Revoke implicit PUBLIC execution, including internal notification/audit helpers.
revoke execute on all functions in schema public from public,anon,authenticated;
grant execute on function public.current_app_role(),public.is_case_member(uuid),public.owns_document(uuid),public.valid_plan(jsonb) to authenticated;
grant execute on function public.create_discussion(text,text,text,text,text),public.invite_participant(uuid,text,text),public.accept_invitation(text),public.post_message(uuid,text),public.create_proposal(uuid,jsonb),public.respond_proposal(uuid,text),public.set_mediator_consent(uuid,boolean),public.leave_discussion(uuid),public.set_case_status(uuid,text),public.verify_provider(uuid),public.delete_my_account(),public.aggregate_metrics() to authenticated;
-- Public resource policies call role helper for inactive rows.
grant execute on function public.current_app_role() to anon;
alter table public.tenant_assessments add column renting boolean not null default true, add column behind_rent boolean not null default false, add column future_income_change text not null default '' check(length(future_income_change)<=300);
alter table public.action_items add column origin text not null default 'manual' check(origin in ('manual','assessment'));
create function public.save_housing_assessment(p_answers jsonb,p_tasks jsonb) returns void language plpgsql security definer set search_path=public as $$
declare a public.tenant_assessments; item jsonb; begin
 if public.current_app_role() is distinct from 'tenant' then raise exception 'Only tenants may save assessments'; end if;
 select * into a from jsonb_populate_record(null::public.tenant_assessments,jsonb_build_object('renting',true,'behind_rent',false,'future_income_change','')||p_answers||jsonb_build_object('id',gen_random_uuid(),'tenant_id',auth.uid(),'updated_at',now()));
 insert into public.tenant_assessments select a.* on conflict(tenant_id) do update set renting=a.renting,behind_rent=a.behind_rent,future_income_change=a.future_income_change,state=a.state,county=a.county,zip=a.zip,county_confirmed=a.county_confirmed,stage=a.stage,needs=a.needs,rent_cents=a.rent_cents,arrears_cents=a.arrears_cents,income_cents=a.income_cents,expenses_cents=a.expenses_cents,household_size=a.household_size,language=a.language,court_case=a.court_case,hearing=a.hearing,safety=a.safety,notice=a.notice,utilities=a.utilities,communication=a.communication,accessibility=a.accessibility,updated_at=now();
 update public.profiles set state=a.state,county=a.county,zip=a.zip,language=a.language where id=auth.uid();
 delete from public.action_items where user_id=auth.uid() and origin='assessment';
 for item in select * from jsonb_array_elements(p_tasks) loop
 insert into public.action_items(user_id,title,description,origin) values(auth.uid(),item->>'title',item->>'description','assessment');
 end loop;
 insert into public.user_activity(user_id,description) values(auth.uid(),'Housing assessment updated');
end $$;
revoke all on function public.save_housing_assessment(jsonb,jsonb) from public,anon;
grant execute on function public.save_housing_assessment(jsonb,jsonb) to authenticated;
