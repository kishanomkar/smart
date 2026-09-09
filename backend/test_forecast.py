import unittest

try:
    from forecast import ThreatForecaster
except ImportError:
    from .forecast import ThreatForecaster


class ThreatForecasterTests(unittest.TestCase):
    def test_forecasts_five_windows_and_normalizes_probabilities(self):
        forecaster = ThreatForecaster(window_seconds=10, horizon=5)
        forecaster.observe(1, [0.9, 0.1], ["BENIGN", "DDoS"])
        forecaster.observe(11, [0.2, 0.8], ["BENIGN", "DDoS"])
        forecaster.flush()
        forecast = forecaster.forecast()

        self.assertEqual(len(forecast), 5)
        self.assertEqual(forecast[0].label, "DDoS")
        for point in forecast:
            self.assertAlmostEqual(sum(point.probabilities.values()), 1.0)
            self.assertGreaterEqual(point.threat_probability, 0.0)
            self.assertLessEqual(point.threat_probability, 1.0)


if __name__ == "__main__":
    unittest.main()