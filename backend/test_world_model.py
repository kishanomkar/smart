import unittest
from unittest.mock import patch

import numpy as np
import torch

try:
    from relationship_graph import build_relationship_graph
    from temporal_state import TemporalStateAccumulator, build_temporal_state, state_feature_names
    from world_model import TemporalWorldModel, WorldModelArtifact, make_sequences
    from world_model_forecast import recursive_forecast
    from live_detector import parse_args
except ImportError:
    from .relationship_graph import build_relationship_graph
    from .temporal_state import TemporalStateAccumulator, build_temporal_state, state_feature_names
    from .world_model import TemporalWorldModel, WorldModelArtifact, make_sequences
    from .world_model_forecast import recursive_forecast
    from .live_detector import parse_args


def record(timestamp, prediction="BENIGN", threat=0.2, source="10.0.0.1", destination="10.0.0.2"):
    return {
        "timestamp_epoch": timestamp,
        "src_ip": source,
        "dst_ip": destination,
        "src_port": 4000,
        "dst_port": 443,
        "protocol": "TCP",
        "prediction": prediction,
        "threat_probability": threat,
        "probability_BENIGN": 1.0 - threat,
        "probability_DDoS": threat,
        "packets": 4,
        "bytes": 400,
        "flow_duration": 0.5,
        "SYN Flag Count": 1,
        "ACK Flag Count": 2,
        "RST Flag Count": 0,
        "FIN Flag Count": 0,
    }


class WorldModelTests(unittest.TestCase):
    def test_temporal_windows_have_fixed_dimensions(self):
        accumulator = TemporalStateAccumulator(60, ["BENIGN", "DDoS"])
        self.assertIsNone(accumulator.observe(record(1)))
        state = accumulator.observe(record(61, "DDoS", 0.9))
        self.assertIsNotNone(state)
        self.assertEqual(len(state.vector), len(accumulator.feature_names))
        self.assertAlmostEqual(state.values["tcp_ratio"], 1.0)
        self.assertAlmostEqual(sum(state.attack_distribution.values()), 1.0)

    def test_graph_contains_nodes_edges_and_new_node_summary(self):
        graph = build_relationship_graph([record(1)], 0)
        self.assertEqual(graph.graph.number_of_nodes(), 2)
        self.assertEqual(graph.graph.number_of_edges(), 1)
        self.assertEqual(graph.summary["graph_new_destination_count"], 1.0)

    def test_sequences_preserve_chronological_order(self):
        states = np.arange(20, dtype=np.float32).reshape(10, 2)
        inputs, targets = make_sequences(states, 3)
        np.testing.assert_array_equal(inputs[0], states[:3])
        np.testing.assert_array_equal(targets[0], states[3])
        np.testing.assert_array_equal(inputs[-1], states[6:9])

    def test_lstm_shapes_and_recursive_forecast(self):
        names = state_feature_names(["BENIGN", "DDoS"])
        model = TemporalWorldModel(len(names), hidden_dim=8, output_dim=len(names))
        output = model(torch.zeros((2, 3, len(names))))
        self.assertEqual(tuple(output.shape), (2, len(names)))
        artifact = WorldModelArtifact(model, names, np.zeros(len(names)), np.ones(len(names)), 3)
        forecast = recursive_forecast(artifact, np.zeros((3, len(names)), dtype=np.float32), 5)
        self.assertEqual(len(forecast), 5)
        self.assertTrue(all(point.horizon == index for index, point in enumerate(forecast, 1)))

    def test_cli_preserves_momentum_and_accepts_world_model_mode(self):
        with patch("sys.argv", ["live_detector.py", "--forecast-mode", "world-model", "--history-windows", "5"]):
            arguments = parse_args()
        self.assertEqual(arguments.forecast_mode, "world-model")
        self.assertEqual(arguments.history_windows, 5)


if __name__ == "__main__":
    unittest.main()