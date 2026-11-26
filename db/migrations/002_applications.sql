-- Apply → review → pay (#2, #23, #3)
create table applications (
  id                  uuid primary key default gen_random_uuid(),
  cohort              text not null,
  name                text not null,
  email               text not null,                -- lowercased; one application per email per cohort
  phone               text not null,                -- E.164, e.g. +919876543210
  building            text not null,                -- "what you'll build in the 7 days"
  status              text not null default 'submitted'
                      check (status in ('submitted', 'waitlist', 'accepted', 'rejected', 'expired', 'paid', 'refund_needed')),
  decided_at          timestamptz,
  decided_by          text,
  pay_token           text unique,                  -- random, in the /pay/<token> link
  pay_deadline        timestamptz,
  razorpay_order_id   text unique,
  razorpay_payment_id text unique,
  paid_at             timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (cohort, email)
);
create index applications_status_idx on applications (cohort, status);

-- Audit log: decisions, emails sent, payments, webhook events.
create table application_events (
  id             bigserial primary key,
  application_id uuid not null references applications(id) on delete cascade,
  action         text not null,
  actor          text,                              -- team email, 'applicant', 'razorpay', 'system'
  detail         jsonb,
  created_at     timestamptz not null default now()
);
create index application_events_app_idx on application_events (application_id, created_at);
