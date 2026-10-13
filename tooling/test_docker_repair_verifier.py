import unittest
from docker_repair_verifier import docker_args
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
if __name__=="__main__":unittest.main()
