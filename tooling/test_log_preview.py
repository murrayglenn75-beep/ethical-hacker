import hashlib
import unittest

from tooling.log_preview import reduce_log


class LogPreviewTests(unittest.TestCase):
    def test_retains_errors_and_traceable_line_numbers(self):
        data = ("start\n" + "routine\n" * 100 + "SECURITY: denied\n" + "end\n").encode()
        result = reduce_log(data, head=1, tail=1)
        self.assertIn("SECURITY: denied", result.preview)
        self.assertIn("L102:", result.preview)
        self.assertGreater(result.omitted_lines, 0)
        self.assertEqual(result.sha256, hashlib.sha256(data).hexdigest())

    def test_refuses_to_drop_security_findings(self):
        with self.assertRaises(ValueError):
            reduce_log(("CRITICAL failure\n" * 10).encode(), max_preview_lines=3)

    def test_reports_raw_byte_count_and_preserves_warning(self):
        raw = b"ok\nwarning: review\nok\n"
        result = reduce_log(raw, head=0, tail=0)
        self.assertEqual(result.original_bytes, len(raw))
        self.assertIn("warning: review", result.preview)

    def test_rejects_invalid_limits(self):
        with self.assertRaises(ValueError):
            reduce_log(b"hello", head=-1)


if __name__ == "__main__":
    unittest.main()
