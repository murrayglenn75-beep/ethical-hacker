import unittest
from ci_failure_collector import collect
BASE={"name":"test","conclusion":"failure","html_url":"https://github.com/owner/repo/actions/runs/123",
"jobs":[{"name":"unit","conclusion":"failure","steps":[{"name":"Run tests","conclusion":"failure"}]}]}
class CICollectorTests(unittest.TestCase):
 def test_realistic(self):
  x=collect(BASE)
  self.assertEqual(x["risk"],"HIGH_REVIEW_REQUIRED")
  self.assertFalse(x["auto_merge"])
  self.assertEqual(x["commands_executed"],0)
 def test_reject_success(self):
  with self.assertRaises(ValueError):collect({**BASE,"conclusion":"success"})
 def test_reject_invalid_url(self):
  with self.assertRaises(ValueError):collect({**BASE,"html_url":"file:///etc/passwd"})
 def test_empty_jobs(self):
  with self.assertRaises(ValueError):collect({**BASE,"jobs":[]})
 def test_deterministic(self):
  self.assertEqual(collect(BASE)["issue_fingerprint"],collect(BASE)["issue_fingerprint"])
if __name__=="__main__":unittest.main()
