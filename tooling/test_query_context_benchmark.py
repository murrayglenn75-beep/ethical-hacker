import hashlib
import unittest

from tooling.query_context_benchmark import benchmark


class BenchmarkTests(unittest.TestCase):
    def test_synthetic_comparison(self):
        data = ("start\n" + "progress\n" * 20 + "CRITICAL: denied\n" + "network timeout\n").encode()
        report = benchmark(data, "network timeout", budget=3)
        self.assertEqual(report["input_sha256"], hashlib.sha256(data).hexdigest())
        self.assertEqual(report["critical_total"], 1)
        self.assertEqual(report["critical_missed"], 0)
        self.assertLess(report["query_retained_lines"], report["original_lines"])
        self.assertGreater(report["baseline_preview_bytes"], 0)

    def test_small_budget_refuses_omission_of_critical_lines(self):
        with self.assertRaises(ValueError):
            benchmark(b"ERROR: first\nERROR: second\n", "first", budget=1)


if __name__ == "__main__":
    unittest.main()
