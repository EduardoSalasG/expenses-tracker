alter table categories add column if not exists name_es text;
alter table categories add column if not exists name_en text;
alter table categories add column if not exists translation_source text
  check (translation_source in ('system', 'automatic', 'manual'));

with translations(name, name_es, name_en) as (
  values
    ('Food', 'Comida', 'Food'),
    ('Groceries', 'Supermercado', 'Groceries'),
    ('Restaurants', 'Restaurantes', 'Restaurants'),
    ('Transport', 'Transporte', 'Transport'),
    ('Public Transport', 'Transporte público', 'Public Transport'),
    ('Uber', 'Uber', 'Uber'),
    ('Housing', 'Vivienda', 'Housing'),
    ('Rent', 'Arriendo', 'Rent'),
    ('Health', 'Salud', 'Health'),
    ('Appointments', 'Consultas médicas', 'Appointments'),
    ('Medicines', 'Medicamentos', 'Medicines'),
    ('Procedures', 'Procedimientos', 'Procedures'),
    ('Sports', 'Deportes', 'Sports'),
    ('Education', 'Educación', 'Education'),
    ('Work', 'Trabajo', 'Work'),
    ('Services', 'Servicios', 'Services'),
    ('Phone', 'Telefonía', 'Phone'),
    ('Entertainment', 'Entretenimiento', 'Entertainment'),
    ('Theater', 'Teatro', 'Theater'),
    ('Other', 'Otros', 'Other'),
    ('Gifts', 'Regalos', 'Gifts')
)
update categories category
set name_es = translations.name_es,
    name_en = translations.name_en,
    translation_source = 'system',
    updated_at = now()
from translations
where category.is_default = true
  and category.name = translations.name;
