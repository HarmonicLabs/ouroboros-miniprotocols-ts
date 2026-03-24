import { Metric } from "effect";

// Histogram bucket boundaries for latency metrics (milliseconds)
const latencyBoundaries = [
    1,
    5,
    10,
    25,
    50,
    100,
    250,
    500,
    1000,
    2500,
    5000,
    10000,
];

// ── Message counters (per protocol, per direction) ──

export const messagesSent = Metric.counter("ouroboros.messages.sent", {
    incremental: true,
});

export const messagesReceived = Metric.counter("ouroboros.messages.received", {
    incremental: true,
});

// ── Latency histograms ──

export const handshakeLatency = Metric.histogram(
    "ouroboros.handshake.latency_ms",
    { boundaries: latencyBoundaries },
);

export const blockFetchLatency = Metric.histogram(
    "ouroboros.block_fetch.latency_ms",
    { boundaries: latencyBoundaries },
);

export const keepAliveRtt = Metric.histogram("ouroboros.keepalive.rtt_ms", {
    boundaries: latencyBoundaries,
});

// ── Gauges ──

export const activeProtocols = Metric.gauge("ouroboros.protocols.active");
