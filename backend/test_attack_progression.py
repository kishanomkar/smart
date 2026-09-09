import unittest

try:
    from attack_progression import AttackProgressionEngine, STAGES
    from live_detector import parse_args
except ImportError:
    from .attack_progression import AttackProgressionEngine, STAGES
    from .live_detector import parse_args


class AttackProgressionTests(unittest.TestCase):
    def setUp(self):
        self.engine = AttackProgressionEngine()

    def test_reconnaissance_scoring(self):
        result = self.engine.evaluate({"graph_new_destination_count": 6, "unique_destination_ports": 8})
        self.assertGreater(result.stage_scores["Reconnaissance"], 0.5)

    def test_initial_access_scoring(self):
        result = self.engine.evaluate({"average_threat_probability": 0.8, "maximum_threat_probability": 0.9, "malicious_flow_ratio": 0.8})
        self.assertGreater(result.stage_scores["Initial Access"], 0.5)

    def test_lateral_movement_scoring(self):
        result = self.engine.evaluate({"graph_new_source_count": 5, "graph_new_destination_count": 4, "unique_destination_ips": 8})
        self.assertGreater(result.stage_scores["Lateral Movement"], 0.5)

    def test_c2_scoring_uses_timing(self):
        result = self.engine.evaluate({"average_inter_arrival_time": 1.0, "inter_arrival_time_variance": 0.001})
        self.assertGreater(result.stage_scores["Command and Control"], 0.5)

    def test_exfiltration_requires_volume_and_malicious_evidence(self):
        benign = self.engine.evaluate({"bytes_total": 2_000_000, "malicious_flow_ratio": 0.0})
        attack = self.engine.evaluate({"bytes_total": 2_000_000, "malicious_flow_ratio": 0.8, "average_threat_probability": 0.7})
        self.assertEqual(benign.stage_scores["Exfiltration"], 0.0)
        self.assertGreater(attack.stage_scores["Exfiltration"], 0.5)

    def test_temporal_progression_and_transition(self):
        self.engine.evaluate({"graph_new_destination_count": 5})
        result = self.engine.evaluate(
            {"average_threat_probability": 0.7, "malicious_flow_ratio": 0.7},
            predicted_states=[{"graph_new_source_count": 5, "graph_new_destination_count": 5}],
            threat_trajectory=[0.7, 0.9],
        )
        self.assertEqual(result.current_stage, "Initial Access")
        self.assertEqual(result.next_likely_stage, "Lateral Movement")
        self.assertEqual(result.trajectory, "ESCALATING")

    def test_stable_benign_and_empty_values(self):
        result = self.engine.evaluate({})
        self.assertEqual(result.current_stage, "Undetermined")
        self.assertEqual(result.next_likely_stage, "Undetermined")
        self.assertEqual(result.trajectory, "STABLE")
        self.assertTrue(result.supporting_evidence)

    def test_single_benign_endpoint_does_not_imply_lateral_movement(self):
        result = self.engine.evaluate({
            "graph_new_source_count": 1,
            "graph_new_destination_count": 1,
            "unique_destination_ips": 1,
            "malicious_flow_ratio": 0.0,
            "average_threat_probability": 0.02,
        })
        self.assertNotEqual(result.current_stage, "Lateral Movement")
        self.assertLess(result.stage_scores["Lateral Movement"], 0.25)

    def test_single_benign_endpoint_does_not_imply_reconnaissance(self):
        result = self.engine.evaluate({
            "graph_new_destination_count": 1,
            "unique_destination_ports": 1,
            "unique_destination_ips": 1,
            "malicious_flow_ratio": 0.0,
            "average_threat_probability": 0.02,
        })
        self.assertNotEqual(result.current_stage, "Reconnaissance")
        self.assertLess(result.stage_scores["Reconnaissance"], 0.25)

    def test_invalid_values_are_safe(self):
        result = self.engine.evaluate({"bytes_total": "bad", "graph_new_source_count": None, "average_threat_probability": float("nan")})
        self.assertTrue(all(0.0 <= score <= 1.0 for score in result.stage_scores.values()))

    def test_cli_integration_is_optional(self):
        import sys
        from unittest.mock import patch
        with patch.object(sys, "argv", ["live_detector.py", "--attack-progression"]):
            arguments = parse_args()
        self.assertTrue(arguments.attack_progression)
        self.assertEqual(arguments.attack_progression_export.name, "live_attack_progression.csv")
        self.assertEqual(set(STAGES), set(result for result in STAGES))


if __name__ == "__main__":
    unittest.main()
