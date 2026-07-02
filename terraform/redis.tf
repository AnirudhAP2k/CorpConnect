resource "docker_image" "redis" {
  name         = "redis:7-alpine"
  keep_locally = true
}

resource "docker_volume" "redis_data" {
  name = "corpconnect_redis_data"
}

resource "docker_container" "redis" {
  image   = docker_image.redis.image_id
  name    = "corpconnect-redis-local"
  restart = "always"

  networks_advanced {
    name = docker_network.corpconnect_net.name
  }

  ports {
    internal = 6379
    external = 6379
  }

  volumes {
    volume_name    = docker_volume.redis_data.name
    container_path = "/data"
  }
}
