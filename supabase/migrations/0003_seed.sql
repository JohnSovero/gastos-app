-- 0003_seed.sql — categorías iniciales.
-- Colores en orden fijo (paleta categórica validada para daltonismo entre vecinos).
-- Estos son los tonos para modo claro; la PWA usa la variante oscura equivalente.

insert into categorias (id, nombre, color, icono, orden, es_pago_deuda) values
  ('transporte', 'Transporte',                                '#2a78d6', '🚌', 1, false),
  ('educacion',  'Educación',                                 '#eb6834', '📚', 2, false),
  ('bebidas',    'Bebidas',                                   '#1baf7a', '🥤', 3, false),
  ('comidas',    'Comidas',                                   '#eda100', '🍽️', 4, false),
  ('casa',       'Gastos de la casa',                         '#e87ba4', '🏠', 5, false),
  ('servicios',  'Servicios (luz, agua, internet, celular)',  '#008300', '💡', 6, false),
  ('tarjeta',    'Tarjeta de crédito',                        '#6250d6', '💳', 7, true),
  ('otros',      'Otros',                                     '#e34948', '📦', 8, false)
on conflict (id) do nothing;
