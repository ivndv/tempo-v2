-- Billing Polar: estados del proveedor, orden de eventos y procesamiento idempotente.

alter table public.subscriptions
	add column if not exists last_event_at timestamptz;

alter table public.billing_events
	add column if not exists event_at timestamptz not null default now();

alter table public.subscriptions
	drop constraint if exists subscriptions_status_check;

alter table public.subscriptions
	add constraint subscriptions_status_check
	check (
		status in (
			'active',
			'trialing',
			'past_due',
			'canceled',
			'paused',
			'incomplete',
			'incomplete_expired',
			'unpaid'
		)
	);

-- Guarda un evento sin tocar la suscripción.
create or replace function public.record_billing_event(
	p_event_id text,
	p_event_type text,
	p_event_at timestamptz,
	p_payload jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
	v_insertado text;
begin
	insert into public.billing_events (id, type, payload, event_at)
	values (p_event_id, p_event_type, p_payload, coalesce(p_event_at, now()))
	on conflict (id) do nothing
	returning id into v_insertado;

	return v_insertado is not null;
end;
$$;

-- Guarda el evento y aplica la suscripción de Polar.
-- Si el evento es duplicado, no hace nada.
-- Si el evento es más viejo que el último aplicado, lo guarda pero no pisa el estado.
create or replace function public.apply_polar_subscription_event(
	p_event_id text,
	p_event_type text,
	p_event_at timestamptz,
	p_payload jsonb,
	p_user_id uuid,
	p_status text,
	p_customer_id text default null,
	p_subscription_id text default null,
	p_current_period_end timestamptz default null,
	p_cancel_at_period_end boolean default false
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
	v_insertado text;
	v_ultimo_evento timestamptz;
begin
	insert into public.billing_events (id, type, payload, event_at)
	values (p_event_id, p_event_type, p_payload, coalesce(p_event_at, now()))
	on conflict (id) do nothing
	returning id into v_insertado;

	if v_insertado is null then
		return false;
	end if;

	if p_user_id is null then
		return true;
	end if;

	select last_event_at into v_ultimo_evento
	from public.subscriptions
	where user_id = p_user_id;

	if v_ultimo_evento is not null and coalesce(p_event_at, now()) < v_ultimo_evento then
		return true;
	end if;

	insert into public.subscriptions (
		user_id,
		plan,
		status,
		provider,
		provider_customer_id,
		provider_subscription_id,
		current_period_end,
		cancel_at_period_end,
		last_event_at
	) values (
		p_user_id,
		'pro',
		p_status,
		'polar',
		p_customer_id,
		p_subscription_id,
		p_current_period_end,
		coalesce(p_cancel_at_period_end, false),
		coalesce(p_event_at, now())
	)
	on conflict (user_id) do update set
		plan = 'pro',
		status = excluded.status,
		provider = 'polar',
		provider_customer_id = coalesce(
			excluded.provider_customer_id,
			public.subscriptions.provider_customer_id
		),
		provider_subscription_id = coalesce(
			excluded.provider_subscription_id,
			public.subscriptions.provider_subscription_id
		),
		current_period_end = excluded.current_period_end,
		cancel_at_period_end = excluded.cancel_at_period_end,
		last_event_at = excluded.last_event_at;

	return true;
end;
$$;

revoke all on function public.record_billing_event(text, text, timestamptz, jsonb) from public;
revoke all on function public.record_billing_event(text, text, timestamptz, jsonb) from anon;
revoke all on function public.record_billing_event(text, text, timestamptz, jsonb) from authenticated;
grant execute on function public.record_billing_event(text, text, timestamptz, jsonb) to service_role;

revoke all on function public.apply_polar_subscription_event(
	text, text, timestamptz, jsonb, uuid, text, text, text, timestamptz, boolean
) from public;
revoke all on function public.apply_polar_subscription_event(
	text, text, timestamptz, jsonb, uuid, text, text, text, timestamptz, boolean
) from anon;
revoke all on function public.apply_polar_subscription_event(
	text, text, timestamptz, jsonb, uuid, text, text, text, timestamptz, boolean
) from authenticated;
grant execute on function public.apply_polar_subscription_event(
	text, text, timestamptz, jsonb, uuid, text, text, text, timestamptz, boolean
) to service_role;

notify pgrst, 'reload schema';
