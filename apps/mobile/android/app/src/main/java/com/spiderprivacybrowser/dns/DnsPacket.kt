package com.spiderprivacybrowser.dns

/**
 * IPv4/IPv6 + UDP/TCP parsing and building for the DNS-only tunnel.
 *
 * v2 scope: both IP versions and both transports on port 53. Transport checksums
 * are computed with the proper pseudo-header (mandatory for IPv6 and for TCP; for
 * IPv4 UDP it is optional but we compute it anyway — it's cheap and correct).
 *
 * We intentionally only understand a *bare* UDP/TCP next-header (no IPv6 extension
 * headers, no IPv4 options beyond a standard 20-byte header padded via IHL). DNS
 * traffic on a phone never carries those, so anything exotic is simply dropped.
 */
object DnsPacket {
  const val PROTO_TCP = 6
  const val PROTO_UDP = 17

  // TCP control-bit flags.
  const val FIN = 0x01
  const val SYN = 0x02
  const val RST = 0x04
  const val PSH = 0x08
  const val ACK = 0x10

  sealed class Packet

  class Udp(
    val ipv6: Boolean,
    val srcIp: ByteArray,
    val dstIp: ByteArray,
    val srcPort: Int,
    val dstPort: Int,
    val payload: ByteArray,
  ) : Packet()

  class Tcp(
    val ipv6: Boolean,
    val srcIp: ByteArray,
    val dstIp: ByteArray,
    val srcPort: Int,
    val dstPort: Int,
    val seq: Long,
    val ack: Long,
    val flags: Int,
    val payload: ByteArray,
  ) : Packet()

  /** Parse one IP datagram off the tun; null if it isn't UDP/TCP we can handle. */
  fun parse(packet: ByteArray, length: Int): Packet? {
    if (length < 1) return null
    return when ((packet[0].toInt() and 0xff) ushr 4) {
      4 -> parseIpv4(packet, length)
      6 -> parseIpv6(packet, length)
      else -> null
    }
  }

  private fun parseIpv4(p: ByteArray, len: Int): Packet? {
    if (len < 20) return null
    val ihl = (p[0].toInt() and 0x0f) * 4
    if (ihl < 20 || len < ihl) return null
    // Drop fragments (MF flag set or non-zero offset) — DNS never fragments here.
    val flagsAndOffset = ((p[6].toInt() and 0xff) shl 8) or (p[7].toInt() and 0xff)
    if ((flagsAndOffset and 0x2000) != 0 || (flagsAndOffset and 0x1fff) != 0) return null
    val proto = p[9].toInt() and 0xff
    val srcIp = p.copyOfRange(12, 16)
    val dstIp = p.copyOfRange(16, 20)
    val totalLen = u16(p, 2)
    val end = if (totalLen in (ihl + 1)..len) totalLen else len
    return parseL4(false, proto, srcIp, dstIp, p, ihl, end)
  }

  private fun parseIpv6(p: ByteArray, len: Int): Packet? {
    if (len < 40) return null
    val next = p[6].toInt() and 0xff
    val payloadLen = u16(p, 4)
    val srcIp = p.copyOfRange(8, 24)
    val dstIp = p.copyOfRange(24, 40)
    val end = if (40 + payloadLen <= len) 40 + payloadLen else len
    return parseL4(true, next, srcIp, dstIp, p, 40, end)
  }

  private fun parseL4(
    ipv6: Boolean,
    proto: Int,
    srcIp: ByteArray,
    dstIp: ByteArray,
    p: ByteArray,
    off: Int,
    end: Int,
  ): Packet? {
    when (proto) {
      PROTO_UDP -> {
        if (end < off + 8) return null
        val srcPort = u16(p, off)
        val dstPort = u16(p, off + 2)
        val udpLen = u16(p, off + 4)
        val dataStart = off + 8
        val avail = end - dataStart
        if (avail <= 0) return null
        val declared = udpLen - 8
        val n = if (declared in 1..avail) declared else avail
        return Udp(ipv6, srcIp, dstIp, srcPort, dstPort, p.copyOfRange(dataStart, dataStart + n))
      }
      PROTO_TCP -> {
        if (end < off + 20) return null
        val srcPort = u16(p, off)
        val dstPort = u16(p, off + 2)
        val seq = u32(p, off + 4)
        val ack = u32(p, off + 8)
        val dataOff = ((p[off + 12].toInt() and 0xf0) ushr 4) * 4
        val flags = p[off + 13].toInt() and 0x3f
        val dataStart = off + dataOff
        if (dataOff < 20 || dataStart > end) return null
        val payload = if (dataStart < end) p.copyOfRange(dataStart, end) else ByteArray(0)
        return Tcp(ipv6, srcIp, dstIp, srcPort, dstPort, seq, ack, flags, payload)
      }
      else -> return null
    }
  }

  /** Build an IP/UDP datagram carrying [payload] from src→dst. */
  fun buildUdp(
    ipv6: Boolean,
    srcIp: ByteArray,
    dstIp: ByteArray,
    srcPort: Int,
    dstPort: Int,
    payload: ByteArray,
  ): ByteArray {
    val udpLen = 8 + payload.size
    val seg = ByteArray(udpLen)
    putU16(seg, 0, srcPort)
    putU16(seg, 2, dstPort)
    putU16(seg, 4, udpLen)
    System.arraycopy(payload, 0, seg, 8, payload.size)
    val ck = transportChecksum(srcIp, dstIp, PROTO_UDP, seg)
    // A zero UDP checksum means "not computed"; over IPv6 that's illegal, so the
    // spec says transmit it as 0xffff instead.
    putU16(seg, 6, if (ck == 0) 0xffff else ck)
    return wrap(ipv6, srcIp, dstIp, PROTO_UDP, seg)
  }

  /** Build an IP/TCP segment (20-byte header, no options) from src→dst. */
  fun buildTcp(
    ipv6: Boolean,
    srcIp: ByteArray,
    dstIp: ByteArray,
    srcPort: Int,
    dstPort: Int,
    seq: Long,
    ack: Long,
    flags: Int,
    payload: ByteArray,
  ): ByteArray {
    val tcpLen = 20 + payload.size
    val seg = ByteArray(tcpLen)
    putU16(seg, 0, srcPort)
    putU16(seg, 2, dstPort)
    putU32(seg, 4, seq)
    putU32(seg, 8, ack)
    seg[12] = 0x50 // data offset = 5 words (20 bytes), no options
    seg[13] = (flags and 0xff).toByte()
    putU16(seg, 14, 0xffff) // advertised window
    System.arraycopy(payload, 0, seg, 20, payload.size)
    val ck = transportChecksum(srcIp, dstIp, PROTO_TCP, seg)
    putU16(seg, 16, ck)
    return wrap(ipv6, srcIp, dstIp, PROTO_TCP, seg)
  }

  /**
   * Length (bytes) of a single-question DNS message: header (12) + QNAME + QTYPE +
   * QCLASS. Clamped to the buffer so a malformed name can't run off the end.
   */
  fun dnsQuestionEnd(dns: ByteArray): Int {
    var i = 12
    while (i < dns.size) {
      val l = dns[i].toInt() and 0xff
      if (l == 0) { i += 1; break }
      if (l and 0xc0 == 0xc0) { i += 2; return (i + 4).coerceAtMost(dns.size) } // pointer (unexpected in a question)
      i += l + 1
    }
    return (i + 4).coerceAtMost(dns.size) // + QTYPE(2) + QCLASS(2)
  }

  /**
   * A UDP-safe truncated reply (header + question, TC=1, zero answers) built from
   * [query], so the client re-asks over TCP where we can return [full]. Flags QR/
   * opcode/RA/rcode are copied from the real answer.
   */
  fun truncatedResponse(query: ByteArray, full: ByteArray): ByteArray {
    if (query.size < 12 || full.size < 12) return full
    val qEnd = dnsQuestionEnd(query).coerceAtMost(query.size)
    val out = ByteArray(qEnd)
    System.arraycopy(query, 0, out, 0, qEnd) // ID + question come from the query
    out[2] = (full[2].toInt() or 0x02).toByte() // keep QR/opcode/AA, force TC=1
    out[3] = full[3] // RA + rcode from the real answer
    putU16(out, 4, 1) // QDCOUNT = 1
    putU16(out, 6, 0) // ANCOUNT
    putU16(out, 8, 0) // NSCOUNT
    putU16(out, 10, 0) // ARCOUNT
    return out
  }

  private fun wrap(ipv6: Boolean, srcIp: ByteArray, dstIp: ByteArray, proto: Int, seg: ByteArray): ByteArray {
    return if (ipv6) {
      val out = ByteArray(40 + seg.size)
      out[0] = 0x60 // version 6, no traffic class / flow label
      putU16(out, 4, seg.size) // payload length
      out[6] = proto.toByte() // next header
      out[7] = 64 // hop limit
      System.arraycopy(srcIp, 0, out, 8, 16)
      System.arraycopy(dstIp, 0, out, 24, 16)
      System.arraycopy(seg, 0, out, 40, seg.size)
      out
    } else {
      val total = 20 + seg.size
      val out = ByteArray(total)
      out[0] = 0x45 // version 4, IHL 5
      putU16(out, 2, total)
      out[6] = 0x40 // don't fragment
      out[8] = 64 // TTL
      out[9] = proto.toByte()
      System.arraycopy(srcIp, 0, out, 12, 4)
      System.arraycopy(dstIp, 0, out, 16, 4)
      putU16(out, 10, finalize(sumBytes(out, 0, 20)))
      System.arraycopy(seg, 0, out, 20, seg.size)
      out
    }
  }

  // 16-bit ones-complement checksum over the pseudo-header + transport segment.
  // The IPv4 (src+dst+zero+proto+len) and IPv6 (src+dst+len+zeros+nextHdr)
  // pseudo-headers both reduce to sum(src)+sum(dst)+proto+len once folded.
  private fun transportChecksum(srcIp: ByteArray, dstIp: ByteArray, proto: Int, seg: ByteArray): Int {
    var sum = 0L
    sum += sumBytes(srcIp, 0, srcIp.size)
    sum += sumBytes(dstIp, 0, dstIp.size)
    sum += proto.toLong()
    sum += seg.size.toLong()
    sum += sumBytes(seg, 0, seg.size)
    return finalize(sum)
  }

  private fun sumBytes(data: ByteArray, offset: Int, len: Int): Long {
    var sum = 0L
    var i = offset
    var remaining = len
    while (remaining > 1) {
      sum += (((data[i].toInt() and 0xff) shl 8) or (data[i + 1].toInt() and 0xff)).toLong()
      i += 2
      remaining -= 2
    }
    if (remaining > 0) sum += ((data[i].toInt() and 0xff) shl 8).toLong()
    return sum
  }

  private fun finalize(sum0: Long): Int {
    var sum = sum0
    while ((sum shr 16) != 0L) sum = (sum and 0xffff) + (sum shr 16)
    return (sum.inv() and 0xffff).toInt()
  }

  private fun u16(p: ByteArray, i: Int) = ((p[i].toInt() and 0xff) shl 8) or (p[i + 1].toInt() and 0xff)

  private fun u32(p: ByteArray, i: Int): Long =
    ((p[i].toInt() and 0xff).toLong() shl 24) or
      ((p[i + 1].toInt() and 0xff).toLong() shl 16) or
      ((p[i + 2].toInt() and 0xff).toLong() shl 8) or
      (p[i + 3].toInt() and 0xff).toLong()

  private fun putU16(b: ByteArray, i: Int, v: Int) {
    b[i] = ((v ushr 8) and 0xff).toByte()
    b[i + 1] = (v and 0xff).toByte()
  }

  private fun putU32(b: ByteArray, i: Int, v: Long) {
    b[i] = ((v ushr 24) and 0xff).toByte()
    b[i + 1] = ((v ushr 16) and 0xff).toByte()
    b[i + 2] = ((v ushr 8) and 0xff).toByte()
    b[i + 3] = (v and 0xff).toByte()
  }
}
