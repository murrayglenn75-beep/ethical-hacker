import tempfile
import unittest
from docker_repair_verifier import check_safe_changed_paths, docker_args
from pathlib import Path
GOOD="python@sha256:"+"a"*64
class DockerArgsTests(unittest.TestCase):
 def test_restrict_network(self):self.assertIn("none",docker_args(Path("/tmp/src"),GOOD))
 def test_readonly(self):self.assertIn("--read-only",docker_args(Path("/tmp/src"),GOOD))
 def test_drop_privileges(self):
  a=docker_args(Path("/tmp/src"),GOOD)
  self.assertIn("no-new-privileges",a)
  self.assertEqual(a[a.index("--cap-drop")+1],"ALL")
 def test_nonroot(self):
  a=docker_args(Path("/tmp/src"),GOOD);self.assertEqual(a[a.index("--user")+1],"65534:65534")
 def test_no_unpinned_image(self):
  with self.assertRaises(ValueError):docker_args(Path("/tmp/src"),"python:latest")
 def test_no_host_socket(self):self.assertNotIn("/var/run/docker.sock"," ".join(docker_args(Path("/tmp/src"),GOOD)))
 def test_readonly_workspace(self):self.assertIn("readonly"," ".join(docker_args(Path("/tmp/src"),GOOD)))
 def test_no_docker_privileged(self):self.assertNotIn("--privileged",docker_args(Path("/tmp/src"),GOOD))
class PathBoundaryTests(unittest.TestCase):
 def test_reject_git_metadata(self):
  with tempfile.TemporaryDirectory() as root:
   with self.assertRaises(ValueError):
    check_safe_changed_paths(root, [".git/config"])

 def test_reject_symlink(self):
  with tempfile.TemporaryDirectory() as root:
   base=Path(root)
   (base/"link").symlink_to(base, target_is_directory=True)
   with self.assertRaises(ValueError):
    check_safe_changed_paths(root, ["link/test.py"])

 def test_allow_normal_file(self):
  with tempfile.TemporaryDirectory() as root:
   check_safe_changed_paths(root, ["tests/test_example.py"])

if __name__=="__main__":unittest.main()
