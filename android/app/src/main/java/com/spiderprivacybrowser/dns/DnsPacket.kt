package com.spiderprivacybrowser.dns

/**
 * Minimal IPv4 + UDP parsing/building for DNS-only tunneling.
 *
 * v1 scope: IPv4 UDP DNS (port 53). TCP-DNS and IPv6 are follow-ups. Enough to
 * cover the overwhelming majority of DNS traffic on a phone.
 */
object DnsPacket {
  class Parsed(
    val srcIp: ByteArray,
    val dstIp: ByteArray,
    val srcPort: Int,
    val dstPort: Int,
    val dnsPayload: ByteArray,
  )

  /** Parse an IPv4/UDP datagram; returns null if it isn't one. */
  fun parseIpv4Udp(packet: ByteArray, length: Int): Parsed? {
    if (length < 28) return null // 20 (min IP) + 8 (UDP)
    val versionIhl = packet[0].toInt() and 0xff
    if ((versionIhl ushr 4) != 4) return null
    val ihl = (versionIhl and 0x0f) * 4
    if (ihl < 20 || length < ihl + 8) return null
    if ((packet[9].toInt() and 0xff) != 17) return null // protocol != UDP
    val srcIp = packet.copyOfRange(12, 16)
    val dstIp = packet.copyOfRange(16, 20)
    val u = ihl
    val srcPort = ((packet[u].toInt() and 0xff) shl 8) or (packet[u + 1].toInt() and 0xff)
    val dstPort = ((packet[u + 2].toInt() and 0xff) shl 8) or (packet[u + 3].toInt() and 0xff)
    val udpLen = ((packet[u + 4].toInt() and 0xff) shl 8) or (packet[u + 5].toInt() and 0xff)
    val dataStart = u + 8
    val dataLen = udpLen - 8
    if (dataLen <= 0 || dataStart + dataLen > length) return null
    return Parsed(srcIp, dstIp, srcPort, dstPort, packet.copyOfRange(dataStart, dataStart + dataLen))
  }

  /**
   * Build an IPv4/UDP packet carrying [dnsResponse], swapping the request's
   * endpoints so the reply travels from the queried DNS server back to the app.
   * UDP checksum is left 0 (permitted over IPv4); the IPv4 header checksum is
   * computed.
   */
  fun buildResponse(req: Parsed, dnsResponse: ByteArray): ByteArray {
    val udpLen = 8 + dnsResponse.size
    val total = 20 + udpLen
    val out = ByteArray(total)

    out[0] = 0x45 // version 4, IHL 5
    out[2] = ((total ushr 8) and 0xff).toByte()
    out[3] = (total and 0xff).toByte()
    out[6] = 0x40 // don't fragment
    out[8] = 64 // TTL
    out[9] = 17 // UDP
    System.arraycopy(req.dstIp, 0, out, 12, 4) // src = queried server
    System.arraycopy(req.srcIp, 0, out, 16, 4) // dst = client
    val ipck = checksum(out, 0, 20)
    out[10] = ((ipck ushr 8) and 0xff).toByte()
    out[11] = (ipck and 0xff).toByte()

    val u = 20
    out[u] = ((req.dstPort ushr 8) and 0xff).toByte() // src port = 53
    out[u + 1] = (req.dstPort and 0xff).toByte()
    out[u + 2] = ((req.srcPort ushr 8) and 0xff).toByte() // dst port = client
    out[u + 3] = (req.srcPort and 0xff).toByte()
    out[u + 4] = ((udpLen ushr 8) and 0xff).toByte()
    out[u + 5] = (udpLen and 0xff).toByte()
    // out[u+6], out[u+7] = UDP checksum = 0 (optional for IPv4)
    System.arraycopy(dnsResponse, 0, out, u + 8, dnsResponse.size)
    return out
  }

  private fun checksum(data: ByteArray, offset: Int, len: Int): Int {
    var sum = 0L
    var i = offset
    var remaining = len
    while (remaining > 1) {
      sum += (((data[i].toInt() and 0xff) shl 8) or (data[i + 1].toInt() and 0xff)).toLong()
      i += 2
      remaining -= 2
    }
    if (remaining > 0) sum += ((data[i].toInt() and 0xff) shl 8).toLong()
    while ((sum shr 16) != 0L) sum = (sum and 0xffff) + (sum shr 16)
    return (sum.inv() and 0xffff).toInt()
  }
}
