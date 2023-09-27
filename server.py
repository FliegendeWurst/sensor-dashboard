import http.server
import os
import time
import math
import subprocess

class RefreshingHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # check whether x.csv is up to date
        if self.path.endswith("x.csv"):
            mtime = os.stat('/run/user/pi/x.csv').st_mtime
            current = math.floor(time.time() / (60 * 10)) * 60 * 10
            if mtime < current:
                print("refreshing data... old:", mtime, "now:", current)
                print("result", subprocess.run(['sh', '-c', './target/release/sensor-dashboard sensors.db > /run/user/pi/x.csv']))
        super().do_GET()

# derived from: https://github.com/python/cpython/blob/3.11/Lib/http/server.py
if __name__ == '__main__':
    import contextlib

    handler_class = RefreshingHandler
    directory = os.getcwd()

    # ensure dual-stack is not disabled; ref #38907
    class DualStackServer(http.server.ThreadingHTTPServer):

        def server_bind(self):
            # suppress exception when protocol is IPv4
            with contextlib.suppress(Exception):
                self.socket.setsockopt(
                    socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
            return super().server_bind()

        def finish_request(self, request, client_address):
            self.RequestHandlerClass(request, client_address, self,
                                     directory=directory)

    http.server.test(
        HandlerClass=handler_class,
        ServerClass=DualStackServer,
        port=24473,
        bind=None,
        protocol="HTTP/1.1",
    )
