import socket

env = 'local'

def get_base_url():
    if env == 'local':
        return "http://{}:5044".format(get_docker_container_ip())

def get_docker_container_ip():
    return socket.gethostbyname(socket.gethostname())