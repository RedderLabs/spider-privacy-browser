package com.spiderprivacybrowser.dns

import android.content.Intent
import android.net.VpnService
import android.os.ParcelFileDescriptor
import okhttp3.Dns
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.FileInputStream
import java.io.FileOutputStream
import java.net.InetAddress
import java.net.URL
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

/**
 * DNS-only VpnService: resolves DNS over HTTPS (DoH) fully in-app, so the
 * browser's DNS is encrypted without the user touching system settings.
 *
 * How it avoids capturing everything: it routes ONLY the fake DNS server
 * (DNS_SERVER/32) into the tunnel and sets it as the VPN's DNS. So only DNS
 * queries enter here; all other traffic (including our own DoH HTTPS to the
 * resolver's real IP) uses the normal network and bypasses the tunnel.
 *
 * Loop avoidance: resolving the DoH hostname would itself need DNS, which we now
 * capture — so we pre-resolve the DoH host with system DNS BEFORE the tunnel is
 * up and feed those IPs to OkHttp via a custom Dns, so DoH never needs a lookup.
 *
 * v1: IPv4 UDP DNS. TCP-DNS/IPv6 and a foreground notification are follow-ups.
 */
class DnsVpnService : VpnService() {
  private var tun: ParcelFileDescriptor? = null
  private var worker: Thread? = null
  private val pool = Executors.newFixedThreadPool(8)
  private var client: OkHttpClient? = null
  private var dohUrl: String = ""

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent?.action == ACTION_STOP) {
      stopSelf()
      return START_NOT_STICKY
    }
    val url = intent?.getStringExtra(EXTRA_DOH_URL)
    if (url.isNullOrEmpty()) {
      stopSelf()
      return START_NOT_STICKY
    }
    dohUrl = url
    try {
      startTunnel()
    } catch (e: Exception) {
      stopSelf()
    }
    // NOT_STICKY: never resurrect this VPN in the background. If the process is
    // gone (app closed/killed) the DNS tunnel stays down — no battery drain, no
    // silent background service. The user re-enables it on next launch.
    return START_NOT_STICKY
  }

  // The user swiped the app away from recents: stop the tunnel immediately so
  // nothing keeps running (and draining battery) once the app is closed.
  override fun onTaskRemoved(rootIntent: Intent?) {
    stopSelf()
    super.onTaskRemoved(rootIntent)
  }

  private fun startTunnel() {
    if (isRunning) return

    // Pre-resolve the DoH host with normal DNS before the tunnel captures DNS.
    val host = URL(dohUrl).host
    val resolved: List<InetAddress> = InetAddress.getAllByName(host).toList()
    client = OkHttpClient.Builder()
      .dns(object : Dns {
        override fun lookup(hostname: String): List<InetAddress> =
          if (hostname.equals(host, ignoreCase = true)) resolved else Dns.SYSTEM.lookup(hostname)
      })
      .connectTimeout(5, TimeUnit.SECONDS)
      .readTimeout(5, TimeUnit.SECONDS)
      .build()

    val pfd = Builder()
      .addAddress("10.111.222.2", 32)
      .addDnsServer(DNS_SERVER)
      .addRoute(DNS_SERVER, 32) // only DNS goes through the tunnel
      .setSession("Spider DNS")
      .setBlocking(true)
      .establish() ?: throw IllegalStateException("establish() returned null")
    tun = pfd
    isRunning = true

    val input = FileInputStream(pfd.fileDescriptor)
    val output = FileOutputStream(pfd.fileDescriptor)
    worker = Thread {
      val buf = ByteArray(32767)
      try {
        while (isRunning) {
          val n = input.read(buf)
          if (n <= 0) continue
          val pkt = buf.copyOf(n)
          pool.execute { handle(pkt, n, output) }
        }
      } catch (e: Exception) {
        // stopped / interrupted
      }
    }.also { it.start() }
  }

  private fun handle(pkt: ByteArray, len: Int, output: FileOutputStream) {
    val req = DnsPacket.parseIpv4Udp(pkt, len) ?: return
    if (req.dstPort != 53) return
    val resp = try {
      resolveDoh(req.dnsPayload)
    } catch (e: Exception) {
      null
    } ?: return
    val out = DnsPacket.buildResponse(req, resp)
    try {
      synchronized(output) {
        output.write(out)
        output.flush()
      }
    } catch (e: Exception) {
      // tunnel closing
    }
  }

  private fun resolveDoh(query: ByteArray): ByteArray? {
    val c = client ?: return null
    val body = query.toRequestBody("application/dns-message".toMediaType())
    val request = Request.Builder()
      .url(dohUrl)
      .header("Accept", "application/dns-message")
      .post(body)
      .build()
    c.newCall(request).execute().use { resp ->
      if (!resp.isSuccessful) return null
      return resp.body?.bytes()
    }
  }

  override fun onDestroy() {
    isRunning = false
    worker?.interrupt()
    try {
      tun?.close()
    } catch (e: Exception) {
    }
    tun = null
    pool.shutdownNow()
    super.onDestroy()
  }

  override fun onRevoke() {
    // System revoked the VPN (e.g. another VPN started).
    stopSelf()
    super.onRevoke()
  }

  companion object {
    @Volatile
    var isRunning = false
      private set

    const val ACTION_STOP = "com.spiderprivacybrowser.dns.STOP"
    const val EXTRA_DOH_URL = "doh_url"
    private const val DNS_SERVER = "10.111.222.3"
  }
}
