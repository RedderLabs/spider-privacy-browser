package com.spiderprivacybrowser.dns

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import android.content.pm.ServiceInfo
import android.net.VpnService
import android.os.Build
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
 * How it avoids capturing everything: it routes ONLY the fake DNS servers
 * (DNS_SERVER_V4/32 and DNS_SERVER_V6/128) into the tunnel and sets them as the
 * VPN's DNS. So only DNS queries enter here; all other traffic (including our own
 * DoH HTTPS to the resolver's real IP) uses the normal network and bypasses it.
 *
 * Loop avoidance: resolving the DoH hostname would itself need DNS, which we now
 * capture — so we pre-resolve the DoH host with system DNS BEFORE the tunnel is
 * up and feed those IPs to OkHttp via a custom Dns, so DoH never needs a lookup.
 *
 * v2: IPv4 + IPv6, UDP + TCP. UDP answers larger than the tunnel MTU come back
 * truncated (TC=1) so the resolver retries over TCP ([DnsTcp]). A foreground
 * notification keeps the tunnel alive against background process death.
 */
class DnsVpnService : VpnService() {
  private var tun: ParcelFileDescriptor? = null
  private var setupThread: Thread? = null
  private var worker: Thread? = null
  private val pool = Executors.newFixedThreadPool(8)
  private var client: OkHttpClient? = null
  private var dohUrl: String = ""

  @Volatile private var output: FileOutputStream? = null
  private val writeLock = Any()
  private var tcp: DnsTcp? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent?.action == ACTION_STOP) {
      teardown()
      return START_NOT_STICKY
    }
    val url = intent?.getStringExtra(EXTRA_DOH_URL)
    if (url.isNullOrEmpty()) {
      stopSelf()
      return START_NOT_STICKY
    }
    dohUrl = url

    // Promote to a foreground service immediately (well within the 5s window) so
    // Android keeps the DNS tunnel alive and the user can see/stop it.
    startForegroundNotification()

    // Mark as running the moment we commit to starting — the actual tunnel setup
    // is async (below), so relying on it to flip the flag would leave a window
    // where start() has already returned but isRunning still reads false (the UI
    // toggle would bounce back off). If setup fails we reset it and stop.
    isRunning = true

    // The tunnel setup does blocking network I/O (pre-resolving the DoH host),
    // which must not run on the main thread — do all of it on a worker.
    setupThread = Thread {
      try {
        startTunnel()
      } catch (e: Exception) {
        isRunning = false
        stopSelf()
      }
    }.also { it.start() }

    // NOT_STICKY: never resurrect this VPN in the background. If the process is
    // gone (app closed/killed) the DNS tunnel stays down — no battery drain, no
    // silent background service. The user re-enables it on next launch.
    return START_NOT_STICKY
  }

  // The user swiped the app away from recents: stop the tunnel immediately so
  // nothing keeps running (and draining battery) once the app is closed.
  override fun onTaskRemoved(rootIntent: Intent?) {
    teardown()
    super.onTaskRemoved(rootIntent)
  }

  // Fully stop the tunnel and the service. Closing the tun fd is the important
  // part: a VpnService with an established tunnel is bound by the VPN framework,
  // so stopSelf() alone won't destroy it — closing the descriptor tears down the
  // interface and releases that binding, after which stopSelf() takes effect.
  private fun teardown() {
    isRunning = false
    worker?.interrupt()
    setupThread?.interrupt()
    try {
      tun?.close()
    } catch (e: Exception) {
    }
    tun = null
    output = null
    try {
      stopForeground(STOP_FOREGROUND_REMOVE)
    } catch (e: Exception) {
    }
    stopSelf()
  }

  private fun startTunnel() {
    if (tun != null) return // already established (isRunning is set earlier, in onStartCommand)

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

    // Prefer a dual-stack tunnel; if the platform can't establish IPv6, retry v4-only.
    val pfd = establish(withV6 = true) ?: establish(withV6 = false)
      ?: throw IllegalStateException("establish() returned null")
    tun = pfd

    val out = FileOutputStream(pfd.fileDescriptor)
    output = out
    tcp = DnsTcp(
      resolve = { q -> try { resolveDoh(q) } catch (e: Exception) { null } },
      write = { pkt -> writePacket(pkt) },
    )

    val input = FileInputStream(pfd.fileDescriptor)
    worker = Thread {
      val buf = ByteArray(32767)
      try {
        while (isRunning) {
          val n = input.read(buf)
          if (n <= 0) continue
          val pkt = buf.copyOf(n)
          pool.execute { route(pkt, n) }
        }
      } catch (e: Exception) {
        // stopped / interrupted
      }
    }.also { it.start() }
  }

  private fun establish(withV6: Boolean): ParcelFileDescriptor? {
    return try {
      val b = Builder()
        .setMtu(MTU)
        .addAddress(TUN_ADDR_V4, 32)
        .addDnsServer(DNS_SERVER_V4)
        .addRoute(DNS_SERVER_V4, 32) // only DNS goes through the tunnel
        .setSession("Spider DNS")
        .setBlocking(true)
      if (withV6) {
        b.addAddress(TUN_ADDR_V6, 128)
          .addDnsServer(DNS_SERVER_V6)
          .addRoute(DNS_SERVER_V6, 128)
      }
      b.establish()
    } catch (e: Exception) {
      null
    }
  }

  private fun route(pkt: ByteArray, len: Int) {
    when (val p = DnsPacket.parse(pkt, len)) {
      is DnsPacket.Udp -> if (p.dstPort == 53) handleUdp(p)
      is DnsPacket.Tcp -> if (p.dstPort == 53) tcp?.handle(p)
      else -> {}
    }
  }

  private fun handleUdp(q: DnsPacket.Udp) {
    val answer = try {
      resolveDoh(q.payload)
    } catch (e: Exception) {
      null
    } ?: return
    // If the answer won't fit in a single UDP datagram under our MTU, return a
    // truncated stub so the resolver retries over TCP where size isn't a limit.
    val maxUdp = if (q.ipv6) MTU - 48 else MTU - 28 // IP header + 8-byte UDP header
    val payload = if (answer.size > maxUdp) DnsPacket.truncatedResponse(q.payload, answer) else answer
    val out = DnsPacket.buildUdp(q.ipv6, q.dstIp, q.srcIp, q.dstPort, q.srcPort, payload)
    writePacket(out)
  }

  private fun writePacket(pkt: ByteArray) {
    val o = output ?: return
    try {
      synchronized(writeLock) {
        o.write(pkt)
        o.flush()
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

  private fun startForegroundNotification() {
    val notif = buildNotification()
    if (Build.VERSION.SDK_INT >= 34) {
      startForeground(NOTIF_ID, notif, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
    } else {
      startForeground(NOTIF_ID, notif)
    }
  }

  private fun buildNotification(): Notification {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val mgr = getSystemService(NotificationManager::class.java)
      if (mgr.getNotificationChannel(CHANNEL_ID) == null) {
        val ch = NotificationChannel(CHANNEL_ID, "DNS cifrado", NotificationManager.IMPORTANCE_LOW)
        ch.description = "Túnel DNS-over-HTTPS activo"
        ch.setShowBadge(false)
        mgr.createNotificationChannel(ch)
      }
    }
    val host = try { URL(dohUrl).host } catch (e: Exception) { "DoH" }

    @Suppress("DEPRECATION")
    val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      Notification.Builder(this, CHANNEL_ID)
    } else {
      Notification.Builder(this)
    }
    builder
      .setContentTitle("DNS cifrado activo")
      .setContentText("Resolviendo por $host")
      .setSmallIcon(android.R.drawable.ic_lock_lock)
      .setOngoing(true)

    packageManager.getLaunchIntentForPackage(packageName)?.let { launch ->
      builder.setContentIntent(PendingIntent.getActivity(this, 0, launch, pendingFlags()))
    }
    val stop = PendingIntent.getService(
      this,
      1,
      Intent(this, DnsVpnService::class.java).apply { action = ACTION_STOP },
      pendingFlags(),
    )
    @Suppress("DEPRECATION")
    builder.addAction(android.R.drawable.ic_menu_close_clear_cancel, "Detener", stop)

    return builder.build()
  }

  private fun pendingFlags(): Int {
    var f = PendingIntent.FLAG_UPDATE_CURRENT
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) f = f or PendingIntent.FLAG_IMMUTABLE
    return f
  }

  override fun onDestroy() {
    isRunning = false
    worker?.interrupt()
    setupThread?.interrupt()
    try {
      tun?.close()
    } catch (e: Exception) {
    }
    tun = null
    output = null
    pool.shutdownNow()
    super.onDestroy()
  }

  override fun onRevoke() {
    // System revoked the VPN (e.g. another VPN started).
    teardown()
    super.onRevoke()
  }

  companion object {
    @Volatile
    var isRunning = false
      private set

    const val ACTION_STOP = "com.spiderprivacybrowser.dns.STOP"
    const val EXTRA_DOH_URL = "doh_url"

    private const val MTU = 1500
    private const val TUN_ADDR_V4 = "10.111.222.2"
    private const val DNS_SERVER_V4 = "10.111.222.3"
    private const val TUN_ADDR_V6 = "fd00:111:222::2"
    private const val DNS_SERVER_V6 = "fd00:111:222::3"

    private const val CHANNEL_ID = "spider_dns_vpn"
    private const val NOTIF_ID = 0x5d15 // "SDNS"
  }
}
