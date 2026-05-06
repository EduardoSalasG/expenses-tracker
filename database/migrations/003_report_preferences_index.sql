create index if not exists users_report_preferences_gin_idx
  on users using gin (report_preferences);
