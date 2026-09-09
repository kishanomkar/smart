"""Per-window communication graphs and fixed-size graph summaries."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Iterable

try:
    import networkx as nx
except ImportError as error:  # pragma: no cover - exercised by environment setup
    nx = None
    _NETWORKX_ERROR = error


GRAPH_FEATURE_NAMES = [
    "graph_node_count",
    "graph_edge_count",
    "graph_unique_source_count",
    "graph_unique_destination_count",
    "graph_average_degree",
    "graph_max_degree",
    "graph_density",
    "graph_new_destination_count",
    "graph_new_source_count",
    "graph_destination_diversity",
]


@dataclass
class WindowGraph:
    window_id: int
    graph: Any
    summary: dict[str, float]


def build_relationship_graph(
    records: Iterable[dict[str, Any]],
    window_id: int,
    previous_nodes: set[str] | None = None,
) -> WindowGraph:
    """Build a directed host graph from completed flow records."""
    if nx is None:
        raise RuntimeError("NetworkX is required for relationship graphs. Install it with `pip install networkx`.") from _NETWORKX_ERROR
    graph = nx.MultiDiGraph()
    source_nodes: set[str] = set()
    destination_nodes: set[str] = set()
    for record in records:
        source = str(record.get("src_ip", "unknown"))
        destination = str(record.get("dst_ip", "unknown"))
        source_nodes.add(source)
        destination_nodes.add(destination)
        graph.add_node(source, role="source")
        graph.add_node(destination, role="destination")
        graph.add_edge(
            source,
            destination,
            protocol=str(record.get("protocol", "unknown")),
            destination_port=int(record.get("dst_port", 0) or 0),
            packets=float(record.get("packets", 0) or 0),
            bytes=float(record.get("bytes", 0) or 0),
            timestamp=record.get("timestamp"),
        )
    degrees = [degree for _, degree in graph.degree()]
    node_count = graph.number_of_nodes()
    edge_count = graph.number_of_edges()
    previous_nodes = previous_nodes or set()
    summary = {
        "graph_node_count": float(node_count),
        "graph_edge_count": float(edge_count),
        "graph_unique_source_count": float(len(source_nodes)),
        "graph_unique_destination_count": float(len(destination_nodes)),
        "graph_average_degree": sum(degrees) / node_count if node_count else 0.0,
        "graph_max_degree": float(max(degrees, default=0)),
        "graph_density": float(nx.density(graph)) if node_count > 1 else 0.0,
        "graph_new_destination_count": float(len(destination_nodes - previous_nodes)),
        "graph_new_source_count": float(len(source_nodes - previous_nodes)),
        "graph_destination_diversity": len(destination_nodes) / max(1, len(source_nodes)),
    }
    return WindowGraph(window_id, graph, summary)