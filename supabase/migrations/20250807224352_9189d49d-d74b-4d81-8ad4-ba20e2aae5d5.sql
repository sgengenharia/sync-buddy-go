-- Prevent double bookings on the same space/date when not cancelled
CREATE UNIQUE INDEX IF NOT EXISTS reservas_unique_espaco_data_active
ON public.reservas (espaco_id, data_reserva)
WHERE status <> 'cancelada';