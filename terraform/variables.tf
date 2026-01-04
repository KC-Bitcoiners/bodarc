variable "cnames" {}

variable "api_key" {
  sensitive = true
}
variable "relay_ip" {
  description = "IP address of the nostr relay"
}
