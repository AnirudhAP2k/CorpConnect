variable "docker_host" {
  description = "Docker daemon socket. Windows: npipe:////./pipe/docker_engine, Linux/macOS: unix:///var/run/docker.sock"
  type        = string
  default     = "npipe:////./pipe/docker_engine"
}

variable "postgres_db" {
  description = "Local PostgreSQL database name"
  type        = string
  default     = "corpconnect_local"
}

variable "postgres_user" {
  description = "Local PostgreSQL user"
  type        = string
  default     = "corpconnect_user"
}

variable "postgres_password" {
  description = "Local PostgreSQL password"
  type        = string
  sensitive   = true
}

variable "postgres_port" {
  description = "Host port for local PostgreSQL (avoids conflict with system installs)"
  type        = number
  default     = 5435
}
