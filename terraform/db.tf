resource "docker_image" "postgres" {
  name         = "postgres:15-alpine"
  keep_locally = true
}

resource "docker_volume" "postgres_data" {
  name = "corpconnect_postgres_data"
}

resource "docker_container" "postgres" {
  image   = docker_image.postgres.image_id
  name    = "corpconnect-db-local"
  restart = "always"

  env = [
    "POSTGRES_DB=${var.postgres_db}",
    "POSTGRES_USER=${var.postgres_user}",
    "POSTGRES_PASSWORD=${var.postgres_password}"
  ]

  networks_advanced {
    name = docker_network.corpconnect_net.name
  }

  ports {
    internal = 5432
    external = var.postgres_port
  }

  volumes {
    volume_name    = docker_volume.postgres_data.name
    container_path = "/var/lib/postgresql/data"
  }
}
