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

variable "cnames" {}
variable "api_key" {
  sensitive = true
} #"NJTB8N3Y3DNRF6A9"
variable "relay_ip" {
  description = "IP address of the nostr relay"
}

resource "dreamhost_dns_record" "cnames" {
  for_each = var.cnames

  record = "${each.key}.kcbitcoiners.com"
  type   = "CNAME"
  value  = each.value
}

resource "dreamhost_dns_record" "relay" {
  record = "relay.kcbitcoiners.com"
  type   = "A"
  value  = var.relay_ip
}
