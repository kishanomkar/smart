"""Bidirectional TCP/UDP flow aggregation from Scapy packets."""

from __future__ import annotations

import time
from collections import Counter
from dataclasses import dataclass, field
from typing import Any

from scapy.layers.inet import IP, TCP, UDP
from scapy.layers.inet6 import IPv6


@dataclass
class FlowRecord:
    src_ip: str
    dst_ip: str
    src_port: int
    dst_port: int
    protocol: str
    first_seen: float = 0.0
    last_seen: float = 0.0
    forward_lengths: list[int] = field(default_factory=list)
    backward_lengths: list[int] = field(default_factory=list)
    forward_timestamps: list[float] = field(default_factory=list)
    backward_timestamps: list[float] = field(default_factory=list)
    forward_headers: list[int] = field(default_factory=list)
    backward_headers: list[int] = field(default_factory=list)
    forward_segment_sizes: list[int] = field(default_factory=list)
    flag_counts: Counter = field(default_factory=Counter)
    forward_flag_counts: Counter = field(default_factory=Counter)
    backward_flag_counts: Counter = field(default_factory=Counter)
    forward_initial_window: int = 0
    backward_initial_window: int = 0
    forward_data_packets: int = 0

    @property
    def key(self) -> tuple[str, str, int, int, str]:
        return self.src_ip, self.dst_ip, self.src_port, self.dst_port, self.protocol

    @property
    def packets(self) -> int:
        return len(self.forward_lengths) + len(self.backward_lengths)

    @property
    def bytes(self) -> int:
        return sum(self.forward_lengths) + sum(self.backward_lengths)


class FlowAggregator:
    """Keep the first observed direction as forward and merge its reverse."""

    def __init__(self, timeout_seconds: float = 5.0):
        self.timeout_seconds = max(0.1, float(timeout_seconds))
        self.flows: dict[tuple[str, str, int, int, str], FlowRecord] = {}
        self.unsupported_packets = Counter()

    @staticmethod
    def packet_endpoint(packet: Any) -> tuple[str, str, int, int, str] | None:
        if IP in packet:
            source_ip, destination_ip = packet[IP].src, packet[IP].dst
        elif IPv6 in packet:
            source_ip, destination_ip = packet[IPv6].src, packet[IPv6].dst
        else:
            return None
        if TCP in packet:
            return source_ip, destination_ip, int(packet[TCP].sport), int(packet[TCP].dport), "TCP"
        if UDP in packet:
            return source_ip, destination_ip, int(packet[UDP].sport), int(packet[UDP].dport), "UDP"
        return None

    @staticmethod
    def _packet_time(packet: Any) -> float:
        packet_time = getattr(packet, "time", None)
        return float(packet_time) if packet_time is not None else time.time()

    @staticmethod
    def _network_length(packet: Any) -> int:
        if IP in packet:
            return len(packet[IP])
        if IPv6 in packet:
            return len(packet[IPv6])
        return len(packet)

    @staticmethod
    def _header_length(packet: Any) -> int:
        if IP in packet:
            network = packet[IP]
        elif IPv6 in packet:
            network = packet[IPv6]
        else:
            return 0
        network_header = len(network) - len(network.payload)
        if TCP in packet:
            transport = packet[TCP]
        elif UDP in packet:
            transport = packet[UDP]
        else:
            return network_header
        return network_header + len(transport) - len(transport.payload)

    def add_packet(self, packet: Any, now: float | None = None) -> FlowRecord | None:
        endpoint = self.packet_endpoint(packet)
        if endpoint is None:
            protocol = packet.lastlayer().name if getattr(packet, "lastlayer", None) else "unknown"
            self.unsupported_packets[protocol] += 1
            return None
        source_ip, destination_ip, source_port, destination_port, protocol = endpoint
        key = endpoint
        reverse_key = destination_ip, source_ip, destination_port, source_port, protocol
        direction = "forward"
        if key in self.flows:
            flow = self.flows[key]
        elif reverse_key in self.flows:
            flow = self.flows[reverse_key]
            direction = "backward"
        else:
            flow = FlowRecord(source_ip, destination_ip, source_port, destination_port, protocol)
            self.flows[key] = flow
        timestamp = self._packet_time(packet) if now is None else float(now)
        if not flow.first_seen:
            flow.first_seen = timestamp
        flow.last_seen = timestamp
        packet_length = self._network_length(packet)
        header_length = self._header_length(packet)
        transport = packet[TCP] if TCP in packet else packet[UDP]
        payload_length = len(transport.payload)
        flags = Counter()
        if TCP in packet:
            flag_text = str(packet[TCP].flags)
            for flag_name, flag_char in (("FIN", "F"), ("SYN", "S"), ("RST", "R"), ("PSH", "P"), ("ACK", "A"), ("URG", "U")):
                if flag_char in flag_text:
                    flags[flag_name] += 1
            if direction == "forward" and not flow.forward_initial_window:
                flow.forward_initial_window = int(packet[TCP].window)
            if direction == "backward" and not flow.backward_initial_window:
                flow.backward_initial_window = int(packet[TCP].window)
        if direction == "forward":
            flow.forward_lengths.append(packet_length)
            flow.forward_timestamps.append(timestamp)
            flow.forward_headers.append(header_length)
            flow.forward_segment_sizes.append(header_length)
            flow.forward_flag_counts.update(flags)
            if payload_length > 0:
                flow.forward_data_packets += 1
        else:
            flow.backward_lengths.append(packet_length)
            flow.backward_timestamps.append(timestamp)
            flow.backward_headers.append(header_length)
            flow.backward_flag_counts.update(flags)
        flow.flag_counts.update(flags)
        return flow

    def expire(self, now: float | None = None, force: bool = False) -> list[FlowRecord]:
        current = time.time() if now is None else float(now)
        expired = []
        for key, flow in list(self.flows.items()):
            if force or current - flow.last_seen >= self.timeout_seconds:
                expired.append(self.flows.pop(key))
        return expired
