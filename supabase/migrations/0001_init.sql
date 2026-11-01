-- 0001_init.sql — tablas, índices y RLS

create table categorias (
  id             text primary key,   -- transporte, educacion, bebidas, comidas, casa, servicios, tarjeta, otros
  nombre         text not null,
  color          text not null,      -- hex
  icono          text,               -- emoji
  orden          int  not null default 0,
  es_pago_deuda  boolean not null default false,   -- true solo para 'tarjeta'
  activa         boolean not null default true
);

create table gastos (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users(id),
  monto           numeric(12,2) not null check (monto > 0),
  categoria_id    text not null references categorias(id),
  fecha           timestamptz not null,
  medio           text not null check (medio in ('yape','bcp','efectivo','otro')),
  fuente          text not null check (fuente in ('atajo','app')),
  descripcion     text,
  id_cliente      text,       -- id único generado por el atajo/app para evitar duplicados
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now()
);

create unique index gastos_id_cliente_uniq on gastos(user_id, id_cliente) where id_cliente is not null;
create index gastos_fecha_idx on gastos(user_id, fecha desc);

-- actualizado_en automático
create or replace function tocar_actualizado_en()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.actualizado_en := now();
  return new;
end;
$$;

create trigger gastos_actualizado_en
  before update on gastos
  for each row execute function tocar_actualizado_en();

alter table gastos     enable row level security;
alter table categorias enable row level security;

create policy "propios gastos" on gastos for all
  to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "categorias lectura" on categorias for select
  to authenticated
  using (true);
create policy "categorias edicion" on categorias for update
  to authenticated
  using (true) with check (true);

-- La anon key sin sesión no debe leer ni escribir nada.
revoke all on gastos, categorias from anon;
