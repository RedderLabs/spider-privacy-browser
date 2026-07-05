package com.spiderprivacybrowser.dns

import java.util.concurrent.ConcurrentHashMap

/**
 * Minimal TCP responder for DNS-over-TCP inside the tunnel.
 *
 * A DNS/TCP exchange is short and predictable: the client opens a connection,
 * sends `[2-byte length][query]`, and expects `[2-byte length][response]`, then
 * both sides close. We implement just enough of TCP to service that — the
 * handshake, a single request, one framed reply, and a graceful FIN — which is
 * exactly what a resolver does after our UDP answer comes back truncated (TC=1).
 *
 * We are the DNS server end (port 53). Sequence numbers are tracked per flow and
 * masked to 32 bits. This is not a general TCP stack: no windowing, no reassembly
 * beyond concatenating in-order segments, no retransmission timers (the client
 * retransmits; we just re-ACK). Good enough for a 100-ish byte query/response.
 */
class DnsTcp(
  private val resolve: (ByteArray) -> ByteArray?,
  private val write: (ByteArray) -> Unit,
) {
  private class Conn {
    var serverSeq = INITIAL_SEQ
    var clientSeq = 0L
    val buf = ArrayList<Byte>()
    var answered = false
  }

  private val conns = ConcurrentHashMap<String, Conn>()

  fun handle(seg: DnsPacket.Tcp) {
    val key = keyOf(seg)

    if (seg.flags and DnsPacket.RST != 0) {
      conns.remove(key)
      return
    }

    // SYN (not SYN-ACK): open a fresh connection and answer with SYN-ACK.
    if (seg.flags and DnsPacket.SYN != 0 && seg.flags and DnsPacket.ACK == 0) {
      val c = Conn()
      c.clientSeq = (seg.seq + 1) and MASK32
      conns[key] = c
      synchronized(c) {
        send(seg, c, DnsPacket.SYN or DnsPacket.ACK, EMPTY)
        c.serverSeq = (c.serverSeq + 1) and MASK32 // SYN consumes one sequence number
      }
      return
    }

    val c = conns[key] ?: return
    synchronized(c) {
      if (seg.payload.isNotEmpty()) {
        if (seg.seq == c.clientSeq) {
          for (b in seg.payload) c.buf.add(b)
          c.clientSeq = (c.clientSeq + seg.payload.size) and MASK32
          send(seg, c, DnsPacket.ACK, EMPTY) // acknowledge the received data
          maybeAnswer(seg, c, key)
        } else {
          // Out of order or a retransmit we already consumed: re-ACK our position.
          send(seg, c, DnsPacket.ACK, EMPTY)
        }
      }
      if (seg.flags and DnsPacket.FIN != 0) {
        c.clientSeq = (c.clientSeq + 1) and MASK32 // FIN consumes one sequence number
        send(seg, c, DnsPacket.ACK, EMPTY)
        conns.remove(key)
      }
    }
  }

  private fun maybeAnswer(seg: DnsPacket.Tcp, c: Conn, key: String) {
    if (c.answered || c.buf.size < 2) return
    val msgLen = ((c.buf[0].toInt() and 0xff) shl 8) or (c.buf[1].toInt() and 0xff)
    if (c.buf.size < 2 + msgLen) return // query still arriving

    val query = ByteArray(msgLen) { c.buf[2 + it] }
    c.answered = true
    val resp = resolve(query)
    if (resp == null) {
      send(seg, c, DnsPacket.RST, EMPTY)
      conns.remove(key)
      return
    }

    val framed = ByteArray(2 + resp.size)
    framed[0] = ((resp.size ushr 8) and 0xff).toByte()
    framed[1] = (resp.size and 0xff).toByte()
    System.arraycopy(resp, 0, framed, 2, resp.size)

    send(seg, c, DnsPacket.PSH or DnsPacket.ACK, framed)
    c.serverSeq = (c.serverSeq + framed.size) and MASK32
    send(seg, c, DnsPacket.FIN or DnsPacket.ACK, EMPTY)
    c.serverSeq = (c.serverSeq + 1) and MASK32 // our FIN consumes one
  }

  // Emit a segment from the server (port 53) back to the client, swapping endpoints.
  private fun send(seg: DnsPacket.Tcp, c: Conn, flags: Int, payload: ByteArray) {
    write(
      DnsPacket.buildTcp(
        ipv6 = seg.ipv6,
        srcIp = seg.dstIp, // server = the DNS address the client dialed
        dstIp = seg.srcIp, // client
        srcPort = seg.dstPort, // 53
        dstPort = seg.srcPort,
        seq = c.serverSeq,
        ack = c.clientSeq,
        flags = flags,
        payload = payload,
      ),
    )
  }

  private fun keyOf(seg: DnsPacket.Tcp): String {
    val sb = StringBuilder()
    for (b in seg.srcIp) sb.append(b.toInt() and 0xff).append('.')
    return sb.append(seg.srcPort).append(':').append(seg.dstPort).toString()
  }

  companion object {
    private const val MASK32 = 0xffffffffL
    private const val INITIAL_SEQ = 4096L // fixed ISN; no security concern on a loopback tun
    private val EMPTY = ByteArray(0)
  }
}
