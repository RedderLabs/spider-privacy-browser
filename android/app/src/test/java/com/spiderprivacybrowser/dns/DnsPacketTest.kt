package com.spiderprivacybrowser.dns

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Pure-JVM tests for [DnsPacket]: field round-trips and — the fragile part —
 * IPv4 header + transport (UDP/TCP, IPv4/IPv6) checksums. A checksum is valid
 * when the folded ones-complement sum over its covered bytes equals 0xFFFF.
 */
class DnsPacketTest {
  private fun ip4(a: Int, b: Int, c: Int, d: Int) =
    byteArrayOf(a.toByte(), b.toByte(), c.toByte(), d.toByte())

  private fun ip6(vararg words: Int): ByteArray {
    val out = ByteArray(16)
    for (i in words.indices) {
      out[i * 2] = ((words[i] ushr 8) and 0xff).toByte()
      out[i * 2 + 1] = (words[i] and 0xff).toByte()
    }
    return out
  }

  // Folded ones-complement sum over the given byte runs plus an initial value.
  private fun fold(extra: Long, vararg parts: ByteArray): Int {
    var sum = extra
    for (d in parts) {
      var i = 0
      while (i + 1 < d.size) {
        sum += (((d[i].toInt() and 0xff) shl 8) or (d[i + 1].toInt() and 0xff)).toLong()
        i += 2
      }
      if (i < d.size) sum += ((d[i].toInt() and 0xff) shl 8).toLong()
    }
    while ((sum shr 16) != 0L) sum = (sum and 0xffff) + (sum shr 16)
    return (sum and 0xffff).toInt()
  }

  private fun assertTransportValid(proto: Int, src: ByteArray, dst: ByteArray, seg: ByteArray) {
    // pseudo-header (src + dst + proto + segLen) + segment must fold to 0xFFFF.
    assertEquals(0xffff, fold((proto + seg.size).toLong(), src, dst, seg))
  }

  @Test
  fun ipv4UdpRoundTripAndChecksums() {
    val src = ip4(10, 111, 222, 3)
    val dst = ip4(10, 111, 222, 2)
    val payload = byteArrayOf(0xAB.toByte(), 0xCD.toByte(), 0x01, 0x02, 0x03)
    val pkt = DnsPacket.buildUdp(false, src, dst, 53, 40000, payload)

    val p = DnsPacket.parse(pkt, pkt.size)
    assertTrue(p is DnsPacket.Udp)
    p as DnsPacket.Udp
    assertEquals(false, p.ipv6)
    assertEquals(53, p.srcPort)
    assertEquals(40000, p.dstPort)
    assertEquals(payload.toList(), p.payload.toList())

    // IPv4 header checksum covers the first 20 bytes.
    assertEquals(0xffff, fold(0, pkt.copyOfRange(0, 20)))
    // UDP checksum covers the pseudo-header + UDP segment.
    assertTransportValid(DnsPacket.PROTO_UDP, src, dst, pkt.copyOfRange(20, pkt.size))
  }

  @Test
  fun ipv6UdpRoundTripAndChecksum() {
    val src = ip6(0xfd00, 0x111, 0x222, 0, 0, 0, 0, 3)
    val dst = ip6(0xfd00, 0x111, 0x222, 0, 0, 0, 0, 2)
    val payload = byteArrayOf(0x10, 0x20, 0x30, 0x40)
    val pkt = DnsPacket.buildUdp(true, src, dst, 53, 12345, payload)

    val p = DnsPacket.parse(pkt, pkt.size)
    assertTrue(p is DnsPacket.Udp)
    p as DnsPacket.Udp
    assertEquals(true, p.ipv6)
    assertEquals(53, p.srcPort)
    assertEquals(12345, p.dstPort)
    assertEquals(payload.toList(), p.payload.toList())
    // IPv6 has no header checksum; the UDP checksum is mandatory here.
    assertTransportValid(DnsPacket.PROTO_UDP, src, dst, pkt.copyOfRange(40, pkt.size))
  }

  @Test
  fun tcpRoundTripAndChecksum() {
    val src = ip4(10, 111, 222, 3)
    val dst = ip4(10, 111, 222, 2)
    val body = byteArrayOf(0x00, 0x03, 0x11, 0x22, 0x33) // [len=3][3 bytes]
    val pkt = DnsPacket.buildTcp(
      false, src, dst, 53, 55000,
      seq = 4096L, ack = 9L,
      flags = DnsPacket.PSH or DnsPacket.ACK,
      payload = body,
    )
    val p = DnsPacket.parse(pkt, pkt.size)
    assertTrue(p is DnsPacket.Tcp)
    p as DnsPacket.Tcp
    assertEquals(53, p.srcPort)
    assertEquals(55000, p.dstPort)
    assertEquals(4096L, p.seq)
    assertEquals(9L, p.ack)
    assertEquals(DnsPacket.PSH or DnsPacket.ACK, p.flags)
    assertEquals(body.toList(), p.payload.toList())

    assertEquals(0xffff, fold(0, pkt.copyOfRange(0, 20))) // IPv4 header
    assertTransportValid(DnsPacket.PROTO_TCP, src, dst, pkt.copyOfRange(20, pkt.size))
  }

  @Test
  fun fragmentedIpv4IsDropped() {
    val src = ip4(10, 0, 0, 1)
    val dst = ip4(10, 0, 0, 2)
    val pkt = DnsPacket.buildUdp(false, src, dst, 53, 5300, byteArrayOf(1, 2, 3, 4))
    pkt[6] = 0x20 // set the More-Fragments bit
    // Header checksum is now stale, but the fragment flag alone must reject it.
    assertEquals(null, DnsPacket.parse(pkt, pkt.size))
  }

  @Test
  fun dnsQuestionEndCountsHeaderNameAndType() {
    // Header(12) + "a.com" (1 'a' 3 'c''o''m' 0 = 7) + QTYPE/QCLASS(4) = 23.
    val q = byteArrayOf(
      0x12, 0x34, 0x01, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x01, 'a'.code.toByte(),
      0x03, 'c'.code.toByte(), 'o'.code.toByte(), 'm'.code.toByte(),
      0x00,
      0x00, 0x01, 0x00, 0x01,
    )
    assertEquals(23, DnsPacket.dnsQuestionEnd(q))
  }

  @Test
  fun truncatedResponseSetsTcAndZeroesAnswers() {
    val query = byteArrayOf(
      0x12, 0x34, 0x01, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x01, 'a'.code.toByte(),
      0x03, 'c'.code.toByte(), 'o'.code.toByte(), 'm'.code.toByte(),
      0x00,
      0x00, 0x01, 0x00, 0x01,
    )
    // A "full" answer with QR=1, RA + 5 answers — the counts we must zero out.
    val full = ByteArray(64)
    full[0] = 0x12; full[1] = 0x34
    full[2] = 0x81.toByte() // QR=1, RD=1
    full[3] = 0x80.toByte() // RA=1, rcode 0
    full[6] = 0x00; full[7] = 0x05 // ANCOUNT = 5

    val out = DnsPacket.truncatedResponse(query, full)
    assertEquals(23, out.size) // header + question only
    assertEquals(0x02, out[2].toInt() and 0x02) // TC bit set
    assertEquals(0x83.toByte(), out[2]) // QR/RD preserved (0x81), TC added (0x02)
    assertEquals(1, (out[4].toInt() shl 8) or out[5].toInt()) // QDCOUNT = 1
    assertEquals(0, (out[6].toInt() shl 8) or out[7].toInt()) // ANCOUNT = 0
  }
}
