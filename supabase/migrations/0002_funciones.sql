-- 0002_funciones.sql — resúmenes para gráficos.
-- Todas con security invoker (respetan RLS). Los rangos son de fechas de Lima,
-- ambos extremos incluidos. Las semanas empiezan en lunes (date_trunc 'week' es ISO).
-- Nota: en funciones SQL, si un parámetro se llama igual que una columna gana la
-- columna, por eso se califican como <funcion>.<parametro>.

create or replace function resumen_por_categoria(
  desde date,
  hasta date,
  incluir_tarjeta boolean default true,
  medio text default null
)
returns table (categoria_id text, nombre text, color text, icono text, total numeric, cantidad int)
language sql
stable
security invoker
set search_path = public
as $$
  select c.id, c.nombre, c.color, c.icono, sum(g.monto) as total, count(*)::int as cantidad
  from gastos g
  join categorias c on c.id = g.categoria_id
  where g.fecha >= (resumen_por_categoria.desde::timestamp at time zone 'America/Lima')
    and g.fecha <  ((resumen_por_categoria.hasta + 1)::timestamp at time zone 'America/Lima')
    and (resumen_por_categoria.incluir_tarjeta or not c.es_pago_deuda)
    and (resumen_por_categoria.medio is null or g.medio = resumen_por_categoria.medio)
  group by c.id, c.nombre, c.color, c.icono, c.orden
  order by total desc, c.orden;
$$;

create or replace function resumen_por_periodo(
  desde date,
  hasta date,
  granularidad text,          -- 'dia' | 'semana' | 'mes'
  incluir_tarjeta boolean default true,
  medio text default null
)
returns table (periodo date, categoria_id text, total numeric)
language sql
stable
security invoker
set search_path = public
as $$
  select
    date_trunc(
      case resumen_por_periodo.granularidad
        when 'semana' then 'week'
        when 'mes'    then 'month'
        else 'day'
      end,
      g.fecha at time zone 'America/Lima'
    )::date as periodo,
    g.categoria_id,
    sum(g.monto) as total
  from gastos g
  join categorias c on c.id = g.categoria_id
  where g.fecha >= (resumen_por_periodo.desde::timestamp at time zone 'America/Lima')
    and g.fecha <  ((resumen_por_periodo.hasta + 1)::timestamp at time zone 'America/Lima')
    and (resumen_por_periodo.incluir_tarjeta or not c.es_pago_deuda)
    and (resumen_por_periodo.medio is null or g.medio = resumen_por_periodo.medio)
  group by 1, 2
  order by 1, 2;
$$;

create or replace function total_periodo(
  desde date,
  hasta date,
  incluir_tarjeta boolean default true
)
returns table (total numeric, cantidad int)
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(sum(g.monto), 0) as total, count(*)::int as cantidad
  from gastos g
  join categorias c on c.id = g.categoria_id
  where g.fecha >= (total_periodo.desde::timestamp at time zone 'America/Lima')
    and g.fecha <  ((total_periodo.hasta + 1)::timestamp at time zone 'America/Lima')
    and (total_periodo.incluir_tarjeta or not c.es_pago_deuda);
$$;

revoke execute on function resumen_por_categoria(date, date, boolean, text) from public, anon;
revoke execute on function resumen_por_periodo(date, date, text, boolean, text) from public, anon;
revoke execute on function total_periodo(date, date, boolean) from public, anon;
grant execute on function resumen_por_categoria(date, date, boolean, text) to authenticated;
grant execute on function resumen_por_periodo(date, date, text, boolean, text) to authenticated;
grant execute on function total_periodo(date, date, boolean) to authenticated;
