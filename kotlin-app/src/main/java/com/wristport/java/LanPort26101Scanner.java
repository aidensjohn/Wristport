package com.wristport.java;

import java.io.IOException;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.NetworkInterface;
import java.net.Socket;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

/**
 * Multi-threaded Java TCP port 26101 LAN scanner that enumerates real active
 * non-loopback IPv4 /24 subnets and probes each host for an open Tizen SDB daemon.
 */
public final class LanPort26101Scanner {

    public static final class OpenEndpoint {
        public final String ip;
        public final int port;
        public final int latencyMs;

        public OpenEndpoint(String ip, int port, int latencyMs) {
            this.ip = ip;
            this.port = port;
            this.latencyMs = latencyMs;
        }
    }

    public static final class ScanResult {
        public final List<String> scannedSubnets;
        public final List<OpenEndpoint> endpoints;

        public ScanResult(List<String> scannedSubnets, List<OpenEndpoint> endpoints) {
            this.scannedSubnets = scannedSubnets;
            this.endpoints = endpoints;
        }
    }

    public List<String> detectLocalSubnets() {
        Set<String> prefixes = new LinkedHashSet<>();
        try {
            for (NetworkInterface nif : Collections.list(NetworkInterface.getNetworkInterfaces())) {
                if (!nif.isUp() || nif.isLoopback() || nif.isVirtual()) {
                    continue;
                }
                String displayName = nif.getDisplayName().toLowerCase();
                if (displayName.contains("docker") || displayName.contains("vethernet") || displayName.contains("wsl")) {
                    continue;
                }
                for (InetAddress addr : Collections.list(nif.getInetAddresses())) {
                    if (addr instanceof Inet4Address && !addr.isLoopbackAddress() && !addr.isLinkLocalAddress()) {
                        byte[] raw = addr.getAddress();
                        String prefix = (raw[0] & 0xFF) + "." + (raw[1] & 0xFF) + "." + (raw[2] & 0xFF);
                        prefixes.add(prefix);
                    }
                }
            }
        } catch (IOException ignored) {
        }
        return new ArrayList<>(prefixes);
    }

    public ScanResult scanPort26101(int port, int connectTimeoutMs) {
        List<String> subnets = detectLocalSubnets();
        if (subnets.isEmpty()) {
            return new ScanResult(Collections.emptyList(), Collections.emptyList());
        }

        // Probe up to the first 2 detected local /24 subnets cleanly
        List<String> targetsSubnets = subnets.size() > 2 ? subnets.subList(0, 2) : subnets;
        List<OpenEndpoint> found = new ArrayList<>();
        ExecutorService pool = Executors.newFixedThreadPool(64);
        List<Callable<OpenEndpoint>> tasks = new ArrayList<>();

        for (String prefix : targetsSubnets) {
            for (int lastOctet = 1; lastOctet <= 254; lastOctet++) {
                final String candidateIp = prefix + "." + lastOctet;
                tasks.add(() -> {
                    long start = System.nanoTime();
                    try (Socket socket = new Socket()) {
                        socket.connect(new InetSocketAddress(candidateIp, port), connectTimeoutMs);
                        int ms = (int) Math.max(1, (System.nanoTime() - start) / 1_000_000L);
                        return new OpenEndpoint(candidateIp, port, ms);
                    } catch (IOException e) {
                        return null;
                    }
                });
            }
        }

        try {
            List<Future<OpenEndpoint>> futures = pool.invokeAll(tasks, 10, TimeUnit.SECONDS);
            for (Future<OpenEndpoint> f : futures) {
                try {
                    OpenEndpoint ep = f.isDone() && !f.isCancelled() ? f.get() : null;
                    if (ep != null) {
                        found.add(ep);
                    }
                } catch (Exception ignored) {
                }
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        } finally {
            pool.shutdownNow();
        }

        found.sort(Comparator.comparingInt(a -> a.latencyMs));
        return new ScanResult(targetsSubnets, found);
    }
}
