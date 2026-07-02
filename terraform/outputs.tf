output "postgres_connection_string" {
  description = "DATABASE_URL for local Prisma usage"
  value       = "postgresql://${var.postgres_user}:${var.postgres_password}@localhost:${var.postgres_port}/${var.postgres_db}"
  sensitive   = true
}
