UPDATE monitors
SET alert_email = (SELECT email FROM users WHERE users.id = monitors.user_id),
    alert_email_verified_at = created_at
WHERE alert_email IS NULL;
