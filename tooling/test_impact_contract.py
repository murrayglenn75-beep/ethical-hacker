import unittest

from tooling.impact_contract import analyze


class ImpactTests(unittest.TestCase):
    def test_transitive_dependents_and_tests(self):
        r = analyze(["lib/schema.py"], {"api.py": ["lib/service.py"], "lib/service.py": ["lib/schema.py"]},
                    {"api.py": ["tests/test_api.py"], "lib/service.py": ["tests/test_service.py"]})
        self.assertEqual(r.related, ("api.py", "lib/service.py"))
        self.assertEqual(r.suggested_tests, ("tests/test_api.py", "tests/test_service.py"))
        self.assertFalse(r.requires_manual_review)

    def test_unknown_file_requires_review(self):
        self.assertTrue(analyze(["unexpected.py"], {}, {}).requires_manual_review)

    def test_no_diff_fails(self):
        with self.assertRaises(ValueError):
            analyze([], {}, {})

    def test_path_traversal_rejected(self):
        with self.assertRaises(ValueError):
            analyze(["../private"], {}, {})


if __name__ == "__main__":
    unittest.main()
