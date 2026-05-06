FROM postgres:17-alpine

COPY migrations/001_initial_schema.sql /docker-entrypoint-initdb.d/10-001-initial-schema.sql
COPY migrations/002_whatsapp_message_id_idempotency.sql /docker-entrypoint-initdb.d/11-002-whatsapp-message-id-idempotency.sql
COPY migrations/003_report_preferences_index.sql /docker-entrypoint-initdb.d/12-003-report-preferences-index.sql
COPY migrations/004_transfer_payment_method.sql /docker-entrypoint-initdb.d/13-004-transfer-payment-method.sql
COPY seeds/001_demo.sql /docker-entrypoint-initdb.d/20-001-demo-seed.sql
