import unittest
from scion_git_gates import parse_changes,evaluate
class ImpactTests(unittest.TestCase):
    def test_safe(self):self.assertEqual(evaluate(['docs/README.md'])['decision'],'TARGETED_PLUS_REQUIRED_BASELINE')
    def test_sensitive(self):self.assertEqual(evaluate(['supabase/migrations/001.sql'])['decision'],'FULL')
    def test_auth(self):self.assertEqual(evaluate(['src/auth/login.js'])['decision'],'FULL')
    def test_missing(self):self.assertEqual(evaluate([])['decision'],'FULL')
    def test_rename(self):self.assertEqual(parse_changes(b'R100\0old.js\0new.js\0'),['new.js','old.js'])
    def test_spaces(self):self.assertEqual(parse_changes(b'M\0hello world.js\0'),['hello world.js'])
    def test_unrecognized(self):
        with self.assertRaises(ValueError):parse_changes(b'Z\0foo\0')
if __name__=='__main__':unittest.main()
