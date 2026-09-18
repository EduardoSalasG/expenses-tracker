alter table otp_codes
  add column if not exists failed_attempts integer not null default 0,
  add constraint otp_codes_failed_attempts_nonnegative check (failed_attempts >= 0);
