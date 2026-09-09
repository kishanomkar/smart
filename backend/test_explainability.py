import json
import unittest
from unittest.mock import patch

import numpy as np

try:
    import shap
except ImportError:
    shap = None

try:
    from explainability import ExplainabilityUnavailable, build_dashboard_payload, explain_prediction, should_explain
    from features import FEATURE_COLUMNS
    from live_detector import parse_args
    from live_detector import load_model
except ImportError:
    from .explainability import ExplainabilityUnavailable, build_dashboard_payload, explain_prediction, should_explain
    from .features import FEATURE_COLUMNS
    from .live_detector import parse_args
    from .live_detector import load_model


@unittest.skipUnless(shap is not None, "SHAP is required for explanation tests")
class ExplainabilityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.model = load_model()
        cls.values = np.zeros(len(FEATURE_COLUMNS), dtype=float)

    def test_single_row_multiclass_explanation(self):
        result = explain_prediction(self.model, self.values, FEATURE_COLUMNS, top_k=5)
        self.assertIn(result["prediction"], [str(item) for item in self.model.classes_])
        self.assertEqual(len(result["classes"]), 6)
        self.assertEqual(len(result["top_features"]), 5)
        self.assertIsInstance(result["threat_probability"], float)

    def test_feature_order_and_values_are_preserved(self):
        values = np.arange(len(FEATURE_COLUMNS), dtype=float)
        result = explain_prediction(self.model, values, FEATURE_COLUMNS, top_k=3)
        self.assertTrue(all(item["raw_feature_name"] in FEATURE_COLUMNS for item in result["top_features"]))
        self.assertTrue(all(isinstance(item["shap_value"], float) for item in result["top_features"]))

    def test_top_n_and_direction(self):
        result = explain_prediction(self.model, self.values, FEATURE_COLUMNS, top_k=2)
        self.assertEqual([item["rank"] for item in result["top_features"]], [1, 2])
        self.assertTrue(all(item["impact_direction"] in {"increased_risk", "decreased_risk", "neutral"} for item in result["top_features"]))

    def test_threshold_and_explain_all_selection(self):
        self.assertFalse(should_explain(0.69, True, 0.70))
        self.assertTrue(should_explain(0.70, True, 0.70))
        self.assertTrue(should_explain(0.01, True, 0.70, explain_all=True))
        self.assertFalse(should_explain(0.99, False, 0.70, explain_all=True))

    def test_json_serialization_and_dashboard_payload(self):
        explanation = explain_prediction(self.model, self.values, FEATURE_COLUMNS, top_k=1)
        payload = build_dashboard_payload(explanation, {"current_stage": "Undetermined", "evidence": ["none"]})
        json.dumps(payload)
        self.assertEqual(payload["current_stage"], "Undetermined")
        self.assertEqual(payload["behavioural_evidence"], ["none"])

    def test_malformed_feature_vector_and_names_fail(self):
        with self.assertRaises(ValueError):
            explain_prediction(self.model, [0.0], FEATURE_COLUMNS)
        with self.assertRaises(ValueError):
            explain_prediction(self.model, self.values, FEATURE_COLUMNS[:-1])

    def test_cli_explain_flags_and_backward_defaults(self):
        with patch("sys.argv", ["live_detector.py", "--explain", "--explain-threshold", "0.8", "--explain-all", "--explain-top", "3"]):
            arguments = parse_args()
        self.assertTrue(arguments.explain)
        self.assertEqual(arguments.explain_threshold, 0.8)
        self.assertTrue(arguments.explain_all)
        self.assertEqual(arguments.explain_top, 3)
        with patch("sys.argv", ["live_detector.py"]):
            defaults = parse_args()
        self.assertFalse(defaults.explain)
        self.assertEqual(defaults.explain_threshold, 0.70)


class ExplainabilityDependencyTests(unittest.TestCase):
    def test_dependency_error_type_is_public(self):
        self.assertTrue(issubclass(ExplainabilityUnavailable, RuntimeError))


if __name__ == "__main__":
    unittest.main()
