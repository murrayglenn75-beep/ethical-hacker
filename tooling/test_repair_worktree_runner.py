import json,subprocess,tempfile,unittest
from pathlib import Path
from repair_worktree_runner import execute
class RepairRunnerTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup);self.root=Path(self.tmp.name);self.repo=self.root/'repo';self.repo.mkdir()
  subprocess.run(['git','init','-q',str(self.repo)],check=True)
  (self.repo/'tests').mkdir()
  (self.repo/'tests'/'test_math.py').write_text('import unittest\nfrom app import answer\nclass T(unittest.TestCase):\n def test_answer(self):self.assertEqual(answer(),42)\n')
  (self.repo/'app.py').write_text('def answer():return 41\n')
  subprocess.run(['git','-C',str(self.repo),'add','.'],check=True)
  subprocess.run(['git','-C',str(self.repo),'-c','user.name=test','-c','user.email=test@example.com','commit','-qm','initial'],check=True)
  self.patch=self.root/'change.diff';self.patch.write_text('diff --git a/app.py b/app.py\n--- a/app.py\n+++ b/app.py\n@@ -1 +1 @@\n-def answer():return 41\n+def answer():return 42\n')
  self.plan=self.root/'plan.json';self.plan.write_text(json.dumps({'task_id':'repair-'+'a'*20,'permission':'PROPOSE_PATCH_ONLY','approval_required':True,'auto_execute':False,'auto_merge':False,'auto_deploy':False}))
 def test_patch_isolated_and_tests_pass(self):
  self.assertTrue(execute(self.repo,self.plan,self.patch)['tests_passed'])
  self.assertIn('41',(self.repo/'app.py').read_text())
 def test_no_automerge(self):
  p=json.loads(self.plan.read_text());p['auto_merge']=True;self.plan.write_text(json.dumps(p))
  with self.assertRaises(ValueError):execute(self.repo,self.plan,self.patch)
 def test_no_traversal(self):
  self.patch.write_text('diff --git a/../x b/../x\n')
  with self.assertRaises(ValueError):execute(self.repo,self.plan,self.patch)
 def test_dirty_source(self):
  (self.repo/'app.py').write_text('dirty')
  with self.assertRaises(ValueError):execute(self.repo,self.plan,self.patch)
 def test_disallowed_profile(self):
  with self.assertRaises(ValueError):execute(self.repo,self.plan,self.patch,'shell')
if __name__=='__main__':unittest.main()
