# How to use this Dockerfile

This Dockerfile can be used to build an image of the FIWARE 3D-UI WebTundra GE, aka realXtend WebTundra.

The [Docker Hub repository](https://hub.docker.com/r/adminotech/webtundra/) contains a ready made image that you can pull with:

	docker pull adminotech/webtundra

The image includes an Apache server on port 80, minified and uglified WebTundra build with Interface Designer incordporated.

To build the image, build WebTundra as instructed in the "Installation and Administration guide", then run:

    docker build -t webtundra

To run the image in interactive mode (shell), with the container's ports exposed:

    docker run -p 12345:80 --rm webtundra