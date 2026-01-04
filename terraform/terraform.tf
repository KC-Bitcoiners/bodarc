
resource "dreamhost_dns_record" "dns_records" {
  for_each = var.dns_records

  record = "${each.key}.kcbitcoiners.com"
  type   = each.type
  value  = each.points_to
}

