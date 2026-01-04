terraform {
  required_providers {
    dreamhost = {
      source = "adamantal/dreamhost"
      version = "0.3.2"
    }
  }
}

provider "dreamhost" {
  api_key = var.api_key
}
