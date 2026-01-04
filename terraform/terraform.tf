
resource "dreamhost_dns_record" "dns_records" {
  for_each = var.dns_records

  record = "${each.key}.kcbitcoiners.com"
  type   = each.value.type
  value  = each.value.points_to
}
