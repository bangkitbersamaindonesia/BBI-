#!/bin/sh
set -eu
backup_file="/var/backups/bbi/bbi-$(date -u +%Y%m%dT%H%M%SZ).sqlite"
/usr/bin/node /opt/bbi/server/manage.mjs backup "$backup_file"
/usr/bin/node /opt/bbi/server/manage.mjs verify "$backup_file"
# Copy encrypted backups to separate storage using the operator's backup system.
# Retention/deletion is intentionally managed by the operator, not this script.
