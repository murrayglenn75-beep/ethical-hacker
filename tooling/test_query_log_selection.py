import hashlib
import unittest

from tooling.query_log_selection import select


class SelectionTests(unittest.TestCase):
    def test_query_relevance_without_missing_security(self):
        raw = b"intro\nnetwork timeout diagnostics\nother\nCRITICAL: unauthorized action\nother\n"
        result = select(raw, "network timeout", budget=2)
        self.assertIn("network timeout", result.preview)
        self.assertIn("CRITICAL: unauthorized action", result.preview)
        self.assertEqual(result.critical_total, result.critical_retained)
        self.assertEqual(result.sha256, hashlib.sha256(raw).hexdigest())

    def test_zero_critical_omissions_or_fail_closed(self):
        raw = b"ERROR: one\nFATAL: two\nINFO: three\n"
        with self.assertRaises(ValueError):
            select(raw, "INFO", budget=1)

    def test_keeps_line_order_and_source_indices(self):
        raw = b"alpha match\nbeta\nalpha match\n"
        result = select(raw, "alpha", budget=2)
        self.assertEqual(result.retained, (0, 2))
        self.assertIn("L1:", result.preview)
        self.assertIn("L3:", result.preview)

    def test_rejects_invalid_input(self):
        with self.assertRaises(ValueError):
            select(b"hi", "", budget=3)
        with self.assertRaises(ValueError):
            select(b"hi", "hi", budget=0)


if __name__ == "__main__":
    unittest.main()
